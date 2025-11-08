import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Upload, Image as ImageIcon, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MandalartGridData } from '@/types'

interface InputMethodSelectorProps {
  onMethodSelect: (method: 'image' | 'text' | 'manual') => void
  onImageProcessComplete: (data: MandalartGridData, imageUrl: string) => void
  onTextProcessComplete: (data: MandalartGridData) => void
  disabled?: boolean
}

export default function InputMethodSelector({
  onMethodSelect,
  onImageProcessComplete,
  onTextProcessComplete,
  disabled = false
}: InputMethodSelectorProps) {
  const [inputMethod, setInputMethod] = useState<'image' | 'manual' | 'text' | null>(null)

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)

  // Text paste state
  const [pastedText, setPastedText] = useState('')
  const [isProcessingText, setIsProcessingText] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const handleMethodSelect = (method: 'image' | 'manual' | 'text') => {
    setInputMethod(method)
    if (method === 'manual') {
      // For manual input, immediately notify parent
      onMethodSelect(method)
    }
  }

  // Image upload handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하여야 합니다')
      return
    }

    setSelectedImage(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleProcessOCR = async () => {
    if (!selectedImage) return

    setIsProcessingOCR(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. Upload image to Supabase Storage
      const fileExt = selectedImage.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('mandalart-images')
        .upload(filePath, selectedImage, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mandalart-images')
        .getPublicUrl(filePath)

      // 2. Call OCR Edge Function
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) throw new Error('인증 오류가 발생했습니다')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-mandalart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: publicUrl,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'OCR 처리 실패')
      }

      const result = await response.json()

      // 3. Convert to MandalartGridData and notify parent
      const gridData = convertToGridData(result)
      onMethodSelect('image')
      onImageProcessComplete(gridData, publicUrl)

      setError(null)
    } catch (err) {
      console.error('OCR processing error:', err)
      setError(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다')
    } finally {
      setIsProcessingOCR(false)
    }
  }

  const handleProcessText = async () => {
    if (!pastedText.trim()) return

    setIsProcessingText(true)
    setError(null)

    try {
      // Call parse-mandalart-text Edge Function
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) throw new Error('인증 오류가 발생했습니다')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-mandalart-text`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: pastedText,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '텍스트 분석 실패')
      }

      const result = await response.json()

      // Convert to MandalartGridData and notify parent
      const gridData = convertToGridData(result)
      onMethodSelect('text')
      onTextProcessComplete(gridData)

      setError(null)
    } catch (err) {
      console.error('Text processing error:', err)
      setError(err instanceof Error ? err.message : '텍스트 분석 중 오류가 발생했습니다')
    } finally {
      setIsProcessingText(false)
    }
  }

  // Convert OCR/text parsing result to MandalartGridData
  const convertToGridData = (result: {
    center_goal?: string
    sub_goals?: Array<{ title?: string; actions?: string[] }>
  }): MandalartGridData => {
    const gridData: MandalartGridData = {
      center_goal: result.center_goal || '',
      sub_goals: []
    }

    if (result.sub_goals) {
      result.sub_goals.forEach((sg, index) => {
        if (index < 8 && sg.title) {
          const actions: Array<{ position: number; title: string }> = []

          if (sg.actions) {
            sg.actions.forEach((actionTitle, actionIndex) => {
              if (actionIndex < 8 && actionTitle) {
                actions.push({
                  position: actionIndex + 1,
                  title: actionTitle
                })
              }
            })
          }

          gridData.sub_goals.push({
            position: index + 1,
            title: sg.title,
            actions
          })
        }
      })
    }

    return gridData
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {/* Input Method Selection */}
      {!inputMethod && (
        <Card>
          <CardHeader>
            <CardTitle>입력 방식 선택</CardTitle>
            <CardDescription>어떤 방식으로 만다라트를 만들까요?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-32 flex-col gap-2"
              onClick={() => handleMethodSelect('image')}
              disabled={disabled}
            >
              <Upload className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">이미지 업로드</div>
                <div className="text-xs text-muted-foreground">
                  만다라트 이미지를 업로드하여 자동 인식
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex-col gap-2"
              onClick={() => handleMethodSelect('text')}
              disabled={disabled}
            >
              <FileText className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">텍스트 붙여넣기</div>
                <div className="text-xs text-muted-foreground">
                  ChatGPT 등에서 생성한 텍스트로 자동 생성
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex-col gap-2"
              onClick={() => handleMethodSelect('manual')}
              disabled={disabled}
            >
              <ImageIcon className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">직접 입력</div>
                <div className="text-xs text-muted-foreground">
                  목표와 실천 항목을 직접 입력
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Image Upload UI */}
      {inputMethod === 'image' && (
        <Card>
          <CardHeader>
            <CardTitle>이미지 업로드</CardTitle>
            <CardDescription>
              만다라트 이미지를 업로드하면 자동으로 텍스트를 추출합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!imagePreview ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                  disabled={isProcessingOCR || disabled}
                />
                <Label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    클릭하여 이미지 선택 (최대 5MB)
                  </div>
                </Label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedImage(null)
                      setImagePreview(null)
                    }}
                    disabled={isProcessingOCR || disabled}
                  >
                    다시 선택
                  </Button>
                  <Button
                    onClick={handleProcessOCR}
                    disabled={isProcessingOCR || disabled}
                    className="flex-1"
                  >
                    {isProcessingOCR ? 'OCR 처리 중...' : '텍스트 추출'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Text Paste UI */}
      {inputMethod === 'text' && (
        <Card>
          <CardHeader>
            <CardTitle>텍스트 붙여넣기</CardTitle>
            <CardDescription>
              ChatGPT, Claude 등에서 생성한 만다라트 텍스트를 붙여넣으세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pastedText">만다라트 텍스트</Label>
              <textarea
                id="pastedText"
                className="w-full min-h-[300px] p-3 border rounded-md text-sm font-mono resize-y"
                placeholder={`예시:

핵심 목표: 건강한 삶

1. 운동
   - 매일 30분 걷기
   - 주 3회 근력 운동
   - 스트레칭 하기
   - 요가 수업 듣기
   - 자전거 타기
   - 등산 가기
   - 수영 배우기
   - 홈트레이닝 루틴 만들기

2. 식습관
   - 아침 거르지 않기
   - 물 2L 마시기
   - 채소 많이 먹기
   - 가공식품 줄이기
   - 규칙적인 식사
   - 과식하지 않기
   - 건강한 간식
   - 영양소 균형 맞추기

... (8개 세부 목표, 각 8개 실천 항목)`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                disabled={isProcessingText || disabled}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPastedText('')
                }}
                disabled={isProcessingText || disabled}
              >
                지우기
              </Button>
              <Button
                onClick={handleProcessText}
                disabled={isProcessingText || !pastedText.trim() || disabled}
                className="flex-1"
              >
                {isProcessingText ? 'AI가 텍스트를 분석 중입니다...' : '텍스트 분석'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

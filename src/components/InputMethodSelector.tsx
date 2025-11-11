import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Image as ImageIcon, FileText, Pencil, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MandalartGridData } from '@/types'
import { suggestActionType } from '@/lib/actionTypes'

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

      // 3. Convert to MandalartGridData with AI classification
      const gridData = await convertToGridData(result)
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

      // Convert to MandalartGridData with AI classification
      const gridData = await convertToGridData(result)
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

  // Convert OCR/text parsing result to MandalartGridData with AI classification
  const convertToGridData = async (result: {
    center_goal?: string
    sub_goals?: Array<{ title?: string; actions?: string[] }>
  }): Promise<MandalartGridData> => {
    const gridData: MandalartGridData = {
      center_goal: result.center_goal || '',
      sub_goals: []
    }

    if (!result.sub_goals) {
      return gridData
    }

    // Get session for API calls
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      console.error('Auth error in convertToGridData:', authError)
      // Fallback to rule-based without throwing
      result.sub_goals.forEach((sg, index) => {
        if (index < 8 && sg.title) {
          const actions: Array<{ position: number; title: string; type?: 'routine' | 'mission' | 'reference' }> = []

          if (sg.actions) {
            sg.actions.forEach((actionTitle, actionIndex) => {
              if (actionIndex < 8 && actionTitle) {
                const suggestion = suggestActionType(actionTitle)
                actions.push({
                  position: actionIndex + 1,
                  title: actionTitle,
                  type: suggestion.type
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
      return gridData
    }

    // Collect all action titles for batch classification
    const actionTitles: Array<{ sgIndex: number; actionIndex: number; title: string }> = []
    result.sub_goals.forEach((sg, sgIndex) => {
      if (sgIndex < 8 && sg.title && sg.actions) {
        sg.actions.forEach((actionTitle, actionIndex) => {
          if (actionIndex < 8 && actionTitle) {
            actionTitles.push({ sgIndex, actionIndex, title: actionTitle })
          }
        })
      }
    })

    // Classify all actions using rule-based AI suggestion (fast and reliable)
    const classifications = actionTitles.map(({ title }) => {
      const suggestion = suggestActionType(title)
      return { type: suggestion.type }
    })

    // Build gridData with classified actions
    let classificationIndex = 0
    result.sub_goals.forEach((sg, sgIndex) => {
      if (sgIndex < 8 && sg.title) {
        const actions: Array<{ position: number; title: string; type?: 'routine' | 'mission' | 'reference' }> = []

        if (sg.actions) {
          sg.actions.forEach((actionTitle, actionIndex) => {
            if (actionIndex < 8 && actionTitle) {
              const classification = classifications[classificationIndex++]
              actions.push({
                position: actionIndex + 1,
                title: actionTitle,
                type: classification.type as 'routine' | 'mission' | 'reference'
              })
            }
          })
        }

        gridData.sub_goals.push({
          position: sgIndex + 1,
          title: sg.title,
          actions
        })
      }
    })

    return gridData
  }

  return (
    <>
      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {/* Input Method Selection */}
      {!inputMethod && (
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle>생성 방식 선택</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 py-4"
              onClick={() => handleMethodSelect('image')}
              disabled={disabled}
            >
              <ImageIcon className="w-7 h-7" />
              <div className="text-center space-y-1">
                <div className="font-semibold text-sm">이미지 업로드</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  만들어둔 만다라트가 있다면 사진 찍어 업로드
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 py-4"
              onClick={() => handleMethodSelect('text')}
              disabled={disabled}
            >
              <FileText className="w-7 h-7" />
              <div className="text-center space-y-1">
                <div className="font-semibold text-sm">텍스트 붙여넣기</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  AI로 만든 텍스트가 있다면 복사해서 붙여넣기
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 py-4"
              onClick={() => handleMethodSelect('manual')}
              disabled={disabled}
            >
              <Pencil className="w-7 h-7" />
              <div className="text-center space-y-1">
                <div className="font-semibold text-sm">직접 입력</div>
                <div className="text-xs text-muted-foreground leading-tight">
                  아직 없다면 빈 그리드에서 처음부터 작성
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Image Upload UI */}
      {inputMethod === 'image' && (
        <Card className="w-full">
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
            <Button
              variant="ghost"
              onClick={() => {
                setInputMethod(null)
                setSelectedImage(null)
                setImagePreview(null)
                setError(null)
              }}
              disabled={isProcessingOCR || disabled}
              className="w-full"
            >
              다른 방법 선택
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Text Paste UI */}
      {inputMethod === 'text' && (
        <Card className="w-full">
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
                className="w-full min-h-[200px] p-3 border rounded-md text-sm font-mono resize-y"
                placeholder={`(예시) 핵심 목표: 건강한 삶

1. 운동
   - 매일 30분 걷기
   - 주 3회 근력 운동
   - 스트레칭 루틴
   - 요가 수업
   - 등산 가기
   - 수영 배우기
   - 홈트레이닝
   - 자전거 타기

2. 식습관
   - 아침 거르지 않기
   - 물 2L 마시기
   - 채소 위주 식단
   - 가공식품 줄이기

... (총 8개 세부 목표, 각 8개 실천 항목)`}
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
            <Button
              variant="ghost"
              onClick={() => {
                setInputMethod(null)
                setPastedText('')
                setError(null)
              }}
              disabled={isProcessingText || disabled}
              className="w-full"
            >
              다른 방법 선택
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  )
}

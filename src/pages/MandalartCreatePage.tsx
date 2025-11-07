import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import { getActionTypeLabel, suggestActionType } from '@/lib/actionTypes'
import { Upload, Image as ImageIcon, FileText } from 'lucide-react'

interface ActionData {
  title: string
  typeData?: ActionTypeData
}

interface SubGoalData {
  title: string
  actions: ActionData[] // 8 actions per sub-goal
}

export default function MandalartCreatePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // Input method selection
  const [inputMethod, setInputMethod] = useState<'image' | 'manual' | 'text' | null>(null)

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  // Text paste state
  const [pastedText, setPastedText] = useState('')
  const [isProcessingText, setIsProcessingText] = useState(false)

  const [title, setTitle] = useState('')
  const [centerGoal, setCenterGoal] = useState('')
  const [subGoals, setSubGoals] = useState<SubGoalData[]>(
    Array(8).fill(null).map(() => ({
      title: '',
      actions: Array(8).fill(null).map(() => ({ title: '' }))
    }))
  )
  const [expandedSubGoal, setExpandedSubGoal] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Action type selector state
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<{ sgIndex: number; actionIndex: number } | null>(null)

  const updateSubGoalTitle = (index: number, value: string) => {
    const newSubGoals = [...subGoals]
    newSubGoals[index].title = value
    setSubGoals(newSubGoals)
  }

  const updateAction = (subGoalIndex: number, actionIndex: number, value: string) => {
    const newSubGoals = [...subGoals]
    newSubGoals[subGoalIndex].actions[actionIndex].title = value
    setSubGoals(newSubGoals)
  }

  const openTypeSelector = (sgIndex: number, actionIndex: number) => {
    setSelectedAction({ sgIndex, actionIndex })
    setTypeSelectorOpen(true)
  }

  const handleTypeSave = (typeData: ActionTypeData) => {
    if (!selectedAction) return

    const newSubGoals = [...subGoals]
    newSubGoals[selectedAction.sgIndex].actions[selectedAction.actionIndex].typeData = typeData
    setSubGoals(newSubGoals)
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
    if (!selectedImage || !user) return

    setIsProcessingOCR(true)
    setError(null)

    try {
      // 1. Upload image to Supabase Storage
      const fileExt = selectedImage.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      console.log('Uploading image:', { fileName, size: selectedImage.size, type: selectedImage.type })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mandalart-images')
        .upload(filePath, selectedImage, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
      }

      console.log('Upload successful:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mandalart-images')
        .getPublicUrl(filePath)

      console.log('Public URL:', publicUrl)
      setUploadedImageUrl(publicUrl)

      // 2. Call OCR Edge Function
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) throw new Error('Not authenticated')

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

      // 3. Populate form with OCR results
      populateFormWithParsedData(result)

      setError(null)
    } catch (err) {
      console.error('OCR processing error:', err)
      setError(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다')
    } finally {
      setIsProcessingOCR(false)
    }
  }

  const handleProcessText = async () => {
    if (!pastedText.trim() || !user) return

    setIsProcessingText(true)
    setError(null)

    try {
      // Call parse-mandalart-text Edge Function
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) throw new Error('Not authenticated')

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

      // Populate form with parsed results
      populateFormWithParsedData(result)

      setError(null)
    } catch (err) {
      console.error('Text processing error:', err)
      setError(err instanceof Error ? err.message : '텍스트 분석 중 오류가 발생했습니다')
    } finally {
      setIsProcessingText(false)
    }
  }

  const populateFormWithParsedData = (result: any) => {
    if (result.center_goal) setCenterGoal(result.center_goal)
    if (result.sub_goals) {
      const newSubGoals = [...subGoals]
      result.sub_goals.forEach((sg: any, index: number) => {
        if (index < 8) {
          newSubGoals[index].title = sg.title || ''
          if (sg.actions) {
            sg.actions.forEach((action: string, actionIndex: number) => {
              if (actionIndex < 8) {
                newSubGoals[index].actions[actionIndex].title = action || ''
              }
            })
          }
        }
      })
      setSubGoals(newSubGoals)
    }
  }

  const handleSave = async () => {
    if (!user) {
      setError('로그인이 필요합니다')
      return
    }

    if (!title.trim() || !centerGoal.trim()) {
      setError('제목과 핵심 목표를 입력해주세요')
      return
    }

    // Validate sub-goals
    const filledSubGoals = subGoals.filter(sg => sg.title.trim())
    if (filledSubGoals.length === 0) {
      setError('최소 1개의 세부 목표를 입력해주세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Create mandalart
      const { data: mandalart, error: mandalartError} = await supabase
        .from('mandalarts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          center_goal: centerGoal.trim(),
          input_method: inputMethod || 'manual',
          image_url: uploadedImageUrl,
        })
        .select()
        .single()

      if (mandalartError) throw mandalartError

      // 2. Create sub-goals
      const subGoalsToInsert = subGoals
        .map((sg, index) => ({
          mandalart_id: mandalart.id,
          position: index + 1,
          title: sg.title.trim()
        }))
        .filter(sg => sg.title)

      const { data: createdSubGoals, error: subGoalsError } = await supabase
        .from('sub_goals')
        .insert(subGoalsToInsert)
        .select()

      if (subGoalsError) throw subGoalsError

      // 3. Create actions
      const actionsToInsert = createdSubGoals.flatMap((sg, sgIndex) => {
        const originalSubGoal = subGoals.find((_, i) =>
          subGoalsToInsert[sgIndex].position === i + 1
        )
        if (!originalSubGoal) return []

        return originalSubGoal.actions
          .map((action, actionIndex) => {
            if (!action.title.trim()) return null

            // Use AI suggestion if no typeData is provided
            let finalTypeData: ActionTypeData | undefined
            let aiSuggestionStr: string | undefined

            if (action.typeData) {
              // User manually set the type
              finalTypeData = action.typeData
              aiSuggestionStr = action.typeData.ai_suggestion
                ? JSON.stringify(action.typeData.ai_suggestion)
                : undefined
            } else {
              // Use AI suggestion
              const aiSuggestion = suggestActionType(action.title.trim())
              finalTypeData = {
                type: aiSuggestion.type,
                routine_frequency: aiSuggestion.routineFrequency,
                mission_completion_type: aiSuggestion.missionCompletionType,
                mission_period_cycle: aiSuggestion.missionPeriodCycle,
              }
              aiSuggestionStr = JSON.stringify({
                type: aiSuggestion.type,
                confidence: aiSuggestion.confidence,
                reason: aiSuggestion.reason
              })
            }

            return {
              sub_goal_id: sg.id,
              position: actionIndex + 1,
              title: action.title.trim(),
              // Type data: use manual selection or AI suggestion
              type: finalTypeData?.type || 'routine',
              routine_frequency: finalTypeData?.routine_frequency,
              routine_weekdays: finalTypeData?.routine_weekdays,
              routine_count_per_period: finalTypeData?.routine_count_per_period,
              mission_completion_type: finalTypeData?.mission_completion_type,
              mission_period_cycle: finalTypeData?.mission_period_cycle,
              mission_current_period_start: finalTypeData?.mission_current_period_start,
              mission_current_period_end: finalTypeData?.mission_current_period_end,
              ai_suggestion: aiSuggestionStr
            }
          })
          .filter((action): action is NonNullable<typeof action> => action !== null)
      })

      if (actionsToInsert.length > 0) {
        const { error: actionsError } = await supabase
          .from('actions')
          .insert(actionsToInsert)

        if (actionsError) throw actionsError
      }

      // Success! Redirect to dashboard or mandalart view
      console.log('Mandalart created successfully!')
      navigate('/dashboard')
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">만다라트 만들기</h1>
          <p className="text-muted-foreground mt-1">
            이미지 업로드, 텍스트 붙여넣기 또는 직접 입력으로 만다라트를 만드세요
          </p>
        </div>

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
            <CardContent className="grid grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => setInputMethod('image')}
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
                onClick={() => setInputMethod('text')}
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
                onClick={() => setInputMethod('manual')}
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
                    disabled={isProcessingOCR}
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
                      disabled={isProcessingOCR}
                    >
                      다시 선택
                    </Button>
                    <Button
                      onClick={handleProcessOCR}
                      disabled={isProcessingOCR}
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
                  disabled={isProcessingText}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPastedText('')
                  }}
                  disabled={isProcessingText}
                >
                  지우기
                </Button>
                <Button
                  onClick={handleProcessText}
                  disabled={isProcessingText || !pastedText.trim()}
                  className="flex-1"
                >
                  {isProcessingText ? 'AI가 텍스트를 분석 중입니다...' : '텍스트 분석'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Title and Center Goal */}
        {inputMethod && (
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>만다라트 제목과 핵심 목표를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="예: 2025년 목표"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="centerGoal">핵심 목표 (중앙)</Label>
              <Input
                id="centerGoal"
                placeholder="예: 건강한 삶"
                value={centerGoal}
                onChange={(e) => setCenterGoal(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>
        )}

        {/* Sub Goals */}
        {inputMethod && (
        <Card>
          <CardHeader>
            <CardTitle>세부 목표 (8개)</CardTitle>
            <CardDescription>
              핵심 목표를 달성하기 위한 8개의 세부 목표를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subGoals.map((subGoal, sgIndex) => (
              <div key={sgIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="w-20">목표 {sgIndex + 1}</Label>
                  <Input
                    placeholder={`세부 목표 ${sgIndex + 1}`}
                    value={subGoal.title}
                    onChange={(e) => updateSubGoalTitle(sgIndex, e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedSubGoal(
                      expandedSubGoal === sgIndex ? null : sgIndex
                    )}
                    disabled={!subGoal.title.trim()}
                  >
                    {expandedSubGoal === sgIndex ? '접기' : '실천 항목'}
                  </Button>
                </div>

                {/* Actions for this sub-goal */}
                {expandedSubGoal === sgIndex && (
                  <div className="ml-24 space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">
                      실천 항목 (8개)
                    </p>
                    {subGoal.actions.map((action, actionIndex) => (
                      <div key={actionIndex} className="flex items-center gap-2">
                        <Label className="w-16 text-xs">항목 {actionIndex + 1}</Label>
                        <Input
                          placeholder={`실천 항목 ${actionIndex + 1}`}
                          value={action.title}
                          onChange={(e) => updateAction(sgIndex, actionIndex, e.target.value)}
                          disabled={isLoading}
                          className="flex-1"
                        />
                        {action.title.trim() && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openTypeSelector(sgIndex, actionIndex)}
                              disabled={isLoading}
                            >
                              {action.typeData
                                ? getActionTypeLabel(action.typeData.type)
                                : '타입 설정'}
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        )}

        {/* Actions */}
        {inputMethod && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/dashboard')}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </div>
        )}
      </div>

      {/* Action Type Selector Dialog */}
      {selectedAction && (
        <ActionTypeSelector
          open={typeSelectorOpen}
          onOpenChange={setTypeSelectorOpen}
          actionTitle={
            subGoals[selectedAction.sgIndex]?.actions[selectedAction.actionIndex]?.title || ''
          }
          initialData={
            subGoals[selectedAction.sgIndex]?.actions[selectedAction.actionIndex]?.typeData
          }
          onSave={handleTypeSave}
        />
      )}
    </div>
  )
}

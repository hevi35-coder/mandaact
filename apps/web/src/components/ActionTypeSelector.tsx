import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Info } from 'lucide-react'
import {
  ActionType,
  RoutineFrequency,
  MissionCompletionType,
  MissionPeriodCycle,
  suggestActionType,
  getActionTypeLabel,
  getRoutineFrequencyLabel,
  getPeriodCycleLabel,
  getWeekdayNames,
  getInitialPeriod,
} from '@/lib/actionTypes'
import { getTypeIcon } from '@/lib/iconUtils'
import { VALIDATION_MESSAGES } from '@/lib/notificationMessages'
import { showWarning } from '@/lib/notificationUtils'

export interface ActionTypeData {
  type: ActionType

  // Routine settings
  routine_frequency?: RoutineFrequency
  routine_weekdays?: number[]
  routine_count_per_period?: number

  // Mission settings
  mission_completion_type?: MissionCompletionType
  mission_period_cycle?: MissionPeriodCycle
  mission_current_period_start?: string
  mission_current_period_end?: string

  // AI suggestion
  ai_suggestion?: {
    type: string
    confidence: string
    reason: string
  }
}

interface ActionTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionTitle: string
  initialData?: ActionTypeData
  onSave: (data: ActionTypeData) => void
}

function ActionTypeSelector({
  open,
  onOpenChange,
  actionTitle,
  initialData,
  onSave,
}: ActionTypeSelectorProps) {
  const [type, setType] = useState<ActionType>(initialData?.type || 'routine')

  // Routine settings
  const [routineFrequency, setRoutineFrequency] = useState<RoutineFrequency>(
    initialData?.routine_frequency || 'daily'
  )
  const [routineWeekdays, setRoutineWeekdays] = useState<number[]>(
    initialData?.routine_weekdays || []
  )
  const [routineCountPerPeriod, setRoutineCountPerPeriod] = useState<number>(
    initialData?.routine_count_per_period || 1
  )
  const [isCustomMonthlyCount, setIsCustomMonthlyCount] = useState(false)

  // Mission settings
  const [missionCompletionType, setMissionCompletionType] = useState<MissionCompletionType>(
    initialData?.mission_completion_type || 'once'
  )
  const [missionPeriodCycle, setMissionPeriodCycle] = useState<MissionPeriodCycle>(
    initialData?.mission_period_cycle || 'monthly'
  )

  // AI suggestion
  const [aiSuggestion, setAiSuggestion] = useState(initialData?.ai_suggestion)

  const weekdays = getWeekdayNames()

  // Run auto suggestion when dialog opens
  useEffect(() => {
    if (!open || !actionTitle) return

    // Reset states when editing existing action (has initialData)
    if (initialData) {
      setType(initialData.type)
      setRoutineFrequency(initialData.routine_frequency || 'daily')
      setRoutineWeekdays(initialData.routine_weekdays || [])
      setRoutineCountPerPeriod(initialData.routine_count_per_period || 0)
      setMissionCompletionType(initialData.mission_completion_type || 'once')
      setMissionPeriodCycle(initialData.mission_period_cycle || 'monthly')
      // Don't return - still generate fresh AI suggestion below
    }

    // Always generate fresh AI suggestion using latest logic
    const freshSuggestion = suggestActionType(actionTitle)
    setAiSuggestion({
      type: freshSuggestion.type,
      confidence: freshSuggestion.confidence,
      reason: freshSuggestion.reason,
    })

    // Only auto-apply suggestion for NEW actions (no initialData)
    if (!initialData) {
      setType(freshSuggestion.type)
    }
  }, [open, actionTitle, initialData])

  const handleWeekdayToggle = (day: number) => {
    setRoutineWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSave = () => {
    const data: ActionTypeData = {
      type,
      ai_suggestion: aiSuggestion,
    }

    if (type === 'routine') {
      data.routine_frequency = routineFrequency

      if (routineFrequency === 'weekly') {
        // For weekly, either weekdays-based or count-based
        if (routineWeekdays.length > 0) {
          data.routine_weekdays = routineWeekdays
        } else {
          data.routine_count_per_period = routineCountPerPeriod || 1
        }
      } else if (routineFrequency === 'monthly') {
        data.routine_count_per_period = routineCountPerPeriod || 1
      }
    } else if (type === 'mission') {
      data.mission_completion_type = missionCompletionType

      if (missionCompletionType === 'periodic') {
        data.mission_period_cycle = missionPeriodCycle

        // Set initial period
        const { start, end } = getInitialPeriod(missionPeriodCycle)
        data.mission_current_period_start = start.toISOString()
        data.mission_current_period_end = end.toISOString()
      }
    }

    onSave(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>실천 항목 타입 설정</DialogTitle>
          <DialogDescription>
            "{actionTitle}"의 타입과 세부 설정을 선택하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Auto Suggestion */}
          {aiSuggestion && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                💡 자동 추천: {getActionTypeLabel(aiSuggestion.type as ActionType)}
              </p>
              <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                <Info className="h-3 w-3 flex-shrink-0" />
                <span>{aiSuggestion.reason} (신뢰도: {aiSuggestion.confidence === 'high' ? '높음' : aiSuggestion.confidence === 'medium' ? '중간' : '낮음'})</span>
              </p>
            </div>
          )}

          {/* Type Selection */}
          <div className="space-y-3">
            <Label>실천 항목 타입</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as ActionType)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="routine" id="routine" />
                <Label htmlFor="routine" className="flex-1 cursor-pointer">
                  <div className="font-medium flex items-center gap-2">
                    {getTypeIcon('routine')}
                    {getActionTypeLabel('routine')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    매일, 매주, 매월 등 반복적으로 실천하는 항목
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="mission" id="mission" />
                <Label htmlFor="mission" className="flex-1 cursor-pointer">
                  <div className="font-medium flex items-center gap-2">
                    {getTypeIcon('mission')}
                    {getActionTypeLabel('mission')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    끝이 있는 목표 (책 1권 읽기, 자격증 취득 등)
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="reference" id="reference" />
                <Label htmlFor="reference" className="flex-1 cursor-pointer">
                  <div className="font-medium flex items-center gap-2">
                    {getTypeIcon('reference')}
                    {getActionTypeLabel('reference')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    마음가짐, 가치관 등 체크가 필요없는 참고 항목
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Routine Settings */}
          {type === 'routine' && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <Label className="text-base font-semibold">루틴 설정</Label>

              <div className="space-y-2">
                <Label>반복 주기</Label>
                <Select value={routineFrequency} onValueChange={(value) => setRoutineFrequency(value as RoutineFrequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{getRoutineFrequencyLabel('daily')}</SelectItem>
                    <SelectItem value="weekly">{getRoutineFrequencyLabel('weekly')}</SelectItem>
                    <SelectItem value="monthly">{getRoutineFrequencyLabel('monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Weekly specific settings */}
              {routineFrequency === 'weekly' && (
                <div className="space-y-3">
                  <Label>주중 실천 요일 선택 (선택사항)</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {weekdays.map((day) => (
                      <div key={day.value} className="flex items-center space-x-1">
                        <Checkbox
                          id={`weekday-${day.value}`}
                          checked={routineWeekdays.includes(day.value)}
                          onCheckedChange={() => handleWeekdayToggle(day.value)}
                        />
                        <Label
                          htmlFor={`weekday-${day.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {day.short}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span>요일을 선택하지 않으면 주간 횟수 기반으로 설정됩니다 (기본 주1회)</span>
                  </p>

                  {routineWeekdays.length === 0 && (
                    <div className="space-y-2">
                      <Label>주간 목표 횟수</Label>
                      <Select
                        value={String(routineCountPerPeriod)}
                        onValueChange={(value) => setRoutineCountPerPeriod(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="횟수 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                            <SelectItem key={count} value={String(count)}>
                              주 {count}회
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Monthly specific settings */}
              {routineFrequency === 'monthly' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>월간 목표 횟수</Label>
                    <Select
                      value={isCustomMonthlyCount ? 'custom' : String(routineCountPerPeriod)}
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setIsCustomMonthlyCount(true)
                          setRoutineCountPerPeriod(1)
                        } else {
                          setIsCustomMonthlyCount(false)
                          setRoutineCountPerPeriod(Number(value))
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="횟수 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 8, 10, 15, 20, 30].map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            월 {count}회
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">직접 입력</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom input for monthly count */}
                  {isCustomMonthlyCount && (
                    <div className="space-y-2">
                      <Label>직접 입력 (1~30)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        placeholder="1~30 사이 숫자 입력"
                        value={routineCountPerPeriod === 0 ? '' : routineCountPerPeriod}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            setRoutineCountPerPeriod(0)
                          } else {
                            const num = Number(value)
                            if (num >= 0 && num <= 30) {
                              setRoutineCountPerPeriod(num)
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = Number(e.target.value)
                          if (!value || value < 1 || value > 30) {
                            showWarning(VALIDATION_MESSAGES.invalidNumber(1, 30))
                            setRoutineCountPerPeriod(1)
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        autoFocus
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span>매일 실천하는 항목은 반복 주기를 '매일'로 선택하세요</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mission Settings */}
          {type === 'mission' && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <Label className="text-base font-semibold">미션 설정</Label>

              <div className="space-y-2">
                <Label>완료 방식</Label>
                <RadioGroup
                  value={missionCompletionType}
                  onValueChange={(value) => setMissionCompletionType(value as MissionCompletionType)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="once" id="once" />
                    <Label htmlFor="once" className="cursor-pointer">
                      1회 완료 (예: 자격증 취득, 책 읽기)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="periodic" id="periodic" />
                    <Label htmlFor="periodic" className="cursor-pointer">
                      주기적 목표 (예: 월간 매출 목표, 분기별 평가)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Periodic mission settings */}
              {missionCompletionType === 'periodic' && (
                <div className="space-y-2">
                  <Label>반복 주기</Label>
                  <Select
                    value={missionPeriodCycle}
                    onValueChange={(value) => setMissionPeriodCycle(value as MissionPeriodCycle)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{getPeriodCycleLabel('daily')}</SelectItem>
                      <SelectItem value="weekly">{getPeriodCycleLabel('weekly')}</SelectItem>
                      <SelectItem value="monthly">{getPeriodCycleLabel('monthly')}</SelectItem>
                      <SelectItem value="quarterly">{getPeriodCycleLabel('quarterly')}</SelectItem>
                      <SelectItem value="yearly">{getPeriodCycleLabel('yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Reference Info */}
          {type === 'reference' && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>참고 타입은 달성률에 포함되지 않습니다</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default React.memo(ActionTypeSelector)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Grid3x3,
  ImagePlus,
  Type,
  Edit3,
  Repeat,
  CheckCircle2,
  BookmarkCheck,
  CalendarCheck,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react'

interface TutorialStep {
  id: number
  title: string
  description: string
  content: React.ReactNode
}

export default function TutorialPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [hasCompletedBefore, setHasCompletedBefore] = useState(false)

  useEffect(() => {
    // Check if user has completed tutorial before
    const completed = localStorage.getItem('tutorial_completed')
    if (completed === 'true') {
      setHasCompletedBefore(true)
    }
  }, [])

  const steps: TutorialStep[] = [
    {
      id: 1,
      title: '만다라트란?',
      description: '목표를 체계적으로 달성하는 프레임워크 (야구선수 오타니의 계획법으로 유명)',
      content: (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              {/* 9x9 Grid Visualization */}
              <div className="grid grid-cols-3 gap-2">
                {/* Top row */}
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 1</p>
                </div>
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 2</p>
                </div>
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 3</p>
                </div>
                {/* Middle row */}
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 4</p>
                </div>
                <div
                  className="aspect-square rounded-lg flex items-center justify-center p-2"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  <p className="text-xs text-center font-bold text-white">핵심 목표</p>
                </div>
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 5</p>
                </div>
                {/* Bottom row */}
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 6</p>
                </div>
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 7</p>
                </div>
                <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center p-2">
                  <p className="text-xs text-center font-medium text-blue-900">세부목표 8</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">중앙</span>에 달성하고 싶은 <span className="font-semibold text-foreground">핵심 목표</span>를 놓습니다
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-muted-foreground">
                주변 8칸에 핵심 목표를 이루기 위한 <span className="font-semibold text-foreground">세부 목표</span>를 배치합니다
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-muted-foreground">
                각 세부 목표마다 8개씩, 총 <span className="font-semibold text-foreground">64개의 실천 항목</span>을 만듭니다
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-900 leading-relaxed">
              💡 <span className="font-semibold">예시:</span> 핵심 목표가 "건강한 삶"이라면, 세부 목표는 "운동", "식단", "수면", "스트레스 관리" 등이 될 수 있어요.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'MandaAct 사용법',
      description: '3가지 방식으로 만다라트를 만들 수 있어요',
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            {/* Image Upload */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ImagePlus className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">이미지 업로드</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      이미 만들어 둔 만다라트 사진을 찍어 업로드하면 AI가 자동으로 텍스트를 추출해요
                    </p>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-700">
                      <Sparkles className="h-3 w-3" />
                      AI OCR 자동 인식
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Text Paste */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Type className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">텍스트 붙여넣기</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      GPT나 Claude, Gemini 같은 AI를 이용해서 만들어 둔 텍스트가 있다면 복사해서 붙여넣으세요
                    </p>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-700">
                      빠른 입력
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manual Input */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Edit3 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">직접 입력</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      아직 만들어 둔 만다라트가 없다면 그리드를 탭하며 하나씩 직접 입력할 수 있어요.
                    </p>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-700">
                      세밀한 작성
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-900 leading-relaxed">
              ✨ <span className="font-semibold">추천:</span> 처음이라면 <span className="font-semibold">직접 입력</span>으로 시작해보세요. 만다라트의 구조를 이해하는데 도움이 됩니다.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: '만다라트 직접 입력',
      description: '핵심 목표부터 실천 항목까지 단계별로 입력해요',
      content: (
        <div className="space-y-4">
          {/* Step 1: Core Goal */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <p className="font-semibold text-sm">핵심 목표 설정</p>
            </div>
            <Card className="ml-8 bg-gradient-to-br from-purple-50 to-transparent border-purple-200">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <p className="text-xs font-medium">중앙 셀 클릭 → 핵심 목표 입력</p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-purple-200">
                    <p className="text-xs text-muted-foreground italic">예: "2025년 건강하고 성공적인 삶"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Sub Goals */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <p className="font-semibold text-sm">세부 목표 설정 (8개)</p>
            </div>
            <Card className="ml-8 bg-gradient-to-br from-blue-50 to-transparent border-blue-200">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium">주변 8개 섹션에 세부 목표 입력</p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-blue-200 space-y-1">
                    <p className="text-xs text-muted-foreground">예: 운동, 식단, 수면, 독서, 인맥...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                3
              </div>
              <p className="font-semibold text-sm">실천 항목 입력 (각 8개)</p>
            </div>
            <Card className="ml-8 bg-gradient-to-br from-green-50 to-transparent border-green-200">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-medium">각 세부 목표마다 8개 실천 항목</p>
                  </div>
                  <div className="bg-white/80 rounded p-2 border border-green-200 space-y-1">
                    <p className="text-xs text-muted-foreground">예: "매일 30분 걷기", "주 3회 근력운동"...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-700 leading-relaxed">
              💡 <span className="font-semibold">팁:</span> 모든 칸을 다 채우지 않아도 괜찮아요. 중요한 항목부터 시작하고 나중에 추가할 수 있습니다.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: '실천 항목 타입 설정',
      description: 'AI가 자동으로 분류해주지만, 직접 수정할 수도 있어요',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            각 실천 항목은 3가지 타입으로 분류됩니다:
          </p>

          <div className="space-y-3">
            {/* Routine */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Repeat className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">루틴 (Routine)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        반복적으로 실천하는 습관
                      </p>
                    </div>
                    <div className="bg-white/80 rounded p-2 border border-blue-200">
                      <p className="text-xs text-blue-900">
                        <span className="font-medium">예시:</span> "매일 30분 운동", "주 3회 영어 공부"
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 bg-blue-100 rounded font-medium text-blue-700">매일</span>
                      <span className="px-2 py-0.5 bg-blue-100 rounded font-medium text-blue-700">주 N회</span>
                      <span className="px-2 py-0.5 bg-blue-100 rounded font-medium text-blue-700">특정 요일</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mission */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">미션 (Mission)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        완료해야 하는 목표
                      </p>
                    </div>
                    <div className="bg-white/80 rounded p-2 border border-green-200">
                      <p className="text-xs text-green-900">
                        <span className="font-medium">예시:</span> "책 10권 읽기", "자격증 취득"
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 bg-green-100 rounded font-medium text-green-700">1회 완료</span>
                      <span className="px-2 py-0.5 bg-green-100 rounded font-medium text-green-700">주기별 달성</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reference */}
            <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-400 flex items-center justify-center flex-shrink-0">
                    <BookmarkCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">참고 (Reference)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        마음가짐이나 원칙 (체크 불가)
                      </p>
                    </div>
                    <div className="bg-white/80 rounded p-2 border border-gray-200">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">예시:</span> "긍정적 마인드 유지", "감사하는 마음"
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 bg-gray-200 rounded font-medium text-gray-600">항상 표시</span>
                      <span className="px-2 py-0.5 bg-gray-200 rounded font-medium text-gray-600">체크 불가</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900 leading-relaxed">
                <span className="font-semibold">AI가 자동으로 분류:</span> 입력한 텍스트를 분석해서 가장 적합한 타입을 추천해드려요. 물론 언제든 수정 가능합니다!
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: '일일 실천 체크',
      description: '투데이 페이지에서 실천한 항목을 체크해요',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            {/* Today Page */}
            <Card className="border-2 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <CalendarCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-sm">투데이 페이지</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      활성화된 만다라트의 실천 항목이 자동으로 표시됩니다
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check Items */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700">오늘 할 일 예시:</p>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="w-5 h-5 rounded border-2 border-primary flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">매일 30분 운동하기</p>
                    <p className="text-xs text-muted-foreground">루틴 • 매일</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">영어 단어 10개 외우기</p>
                    <p className="text-xs text-muted-foreground">루틴 • 평일</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-5 h-5 rounded bg-gray-300 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600">긍정적 마인드 유지</p>
                    <p className="text-xs text-muted-foreground">참고 • 항상</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-white font-bold">✓</span>
              </div>
              <p className="text-muted-foreground">체크하면 진행률이 올라가고 XP를 획득해요</p>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-white font-bold">🔥</span>
              </div>
              <p className="text-muted-foreground">연속으로 달성하면 스트릭 보너스가 쌓여요</p>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-white font-bold">📊</span>
              </div>
              <p className="text-muted-foreground">리포트 페이지에서 AI 코칭을 받을 수 있어요</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-900 leading-relaxed">
              ⏰ <span className="font-semibold">체크 가능 시간:</span> 오늘과 어제만 체크할 수 있어요. 과거 날짜는 조회만 가능합니다.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: '시작하기',
      description: '지금 바로 첫 만다라트를 만들어보세요!',
      content: (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">준비 완료!</h3>
              <p className="text-sm text-muted-foreground">
                이제 MandaAct와 함께<br />
                목표를 관리하고 꾸준히 실천해보세요
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-primary/30 rounded-lg p-6 space-y-4">
            <p className="text-sm font-semibold text-center">첫 만다라트 만들기 추천 순서</p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <p className="text-sm text-gray-700 pt-0.5">
                  이루고 싶은 <span className="font-semibold">핵심 목표</span>를 정하세요
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <p className="text-sm text-gray-700 pt-0.5">
                  핵심 목표를 이루기 위한 <span className="font-semibold">세부 목표 3-8개</span>를 생각해보세요
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <p className="text-sm text-gray-700 pt-0.5">
                  각 세부 목표마다 <span className="font-semibold">구체적인 실천 항목</span>을 추가하세요
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <p className="text-sm text-gray-700 pt-0.5">
                  매일 <span className="font-semibold">"투데이"</span>에서 체크하며 실행하세요!
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                localStorage.setItem('tutorial_completed', 'true')
                navigate('/home')
              }}
            >
              나중에 하기
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              onClick={() => {
                localStorage.setItem('tutorial_completed', 'true')
                navigate('/mandalart/create')
              }}
            >
              만다라트 만들기
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            이 튜토리얼은 언제든 다시 볼 수 있어요
          </p>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('tutorial_completed', 'true')
    navigate('/home')
  }

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MandaAct 튜토리얼</h1>
              <p className="text-xs text-muted-foreground">
                단계 {currentStep + 1} / {steps.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            건너뛰기
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-primary to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-xl border-2 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Step Title */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{currentStepData.id}</span>
                    </div>
                    <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground ml-10">
                    {currentStepData.description}
                  </p>
                </div>

                {/* Step Content */}
                <div className="min-h-[400px]">
                  {currentStepData.content}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>

          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-primary w-6'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className="gap-2"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Revisit Note */}
        {hasCompletedBefore && (
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              💡 다시 보고 계시는군요! 궁금한 부분만 확인하고 건너뛰셔도 됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

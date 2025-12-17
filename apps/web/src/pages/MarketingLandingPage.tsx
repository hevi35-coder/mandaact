import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  CalendarCheck,
  Crown,
  Grid3x3,
  ImagePlus,
  Shield,
  Sparkles,
  Trophy,
} from 'lucide-react'

const APP_STORE_URL = 'https://apps.apple.com/app/id6756198473'
const SUPPORT_EMAIL = 'support@unwrittenbd.com'

type Screenshot = {
  src: string
  alt: string
  title: string
  description: string
}

const SCREENSHOTS: Screenshot[] = [
  {
    src: '/landing/ko/01_vision.png',
    alt: '만다라트 그리드 화면',
    title: 'Vision',
    description: '큰 목표를 9×9 만다라트로 구조화',
  },
  {
    src: '/landing/ko/02_action.png',
    alt: '오늘의 실천 체크리스트 화면',
    title: 'Action',
    description: '목표가 오늘의 체크리스트로 변환',
  },
  {
    src: '/landing/ko/03_magic.png',
    alt: 'AI OCR로 만다라트 입력하는 화면',
    title: 'Magic',
    description: '사진 업로드로 손글씨도 자동 인식',
  },
  {
    src: '/landing/ko/04_reward.png',
    alt: '레벨업과 배지 등 게임화 화면',
    title: 'Reward',
    description: 'XP·배지·스트릭으로 꾸준함을 보상',
  },
  {
    src: '/landing/ko/05_insight.png',
    alt: 'AI 주간 리포트 화면',
    title: 'Insight',
    description: 'AI 리포트로 루틴을 점검하고 개선',
  },
]

function SectionTitle(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="text-center space-y-3">
      <p className="text-xs font-semibold tracking-widest text-primary/80">{props.eyebrow}</p>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{props.title}</h2>
      <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        {props.description}
      </p>
    </div>
  )
}

function PrimaryCtas() {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <a href={APP_STORE_URL} target="_blank" rel="noreferrer" className="sm:min-w-52">
        <Button size="lg" className="w-full gap-2">
          App Store에서 시작하기
          <ArrowRight className="h-4 w-4" />
        </Button>
      </a>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="sm:min-w-52">
        <Button size="lg" variant="outline" className="w-full">
          지원 문의
        </Button>
      </a>
    </div>
  )
}

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-violet-50/50">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(800px circle at 20% 10%, rgba(99,102,241,0.18), transparent 45%), radial-gradient(900px circle at 80% 20%, rgba(168,85,247,0.16), transparent 50%), radial-gradient(700px circle at 50% 90%, rgba(236,72,153,0.12), transparent 45%)',
          }}
        />

        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/logo.png" alt="MandaAct" className="h-9 w-9 rounded-xl" />
              <div className="text-lg font-bold">
                <span className="text-gray-900">Manda</span>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Act
                </span>
              </div>
            </div>

            <div className="text-center space-y-5">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                목표는 세웠는데,
                <br className="hidden sm:block" /> 실천이 어렵다면
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                MandaAct는 만다라트(9×9)를 <span className="font-semibold text-gray-900">오늘의 할 일</span>로 바꿔주는
                목표 실천 앱입니다. AI OCR·게임화·리포트로 꾸준함을 설계하세요.
              </p>
              <PrimaryCtas />

              <div className="flex items-center justify-center gap-3 text-sm pt-2">
                <Link to="/terms" className="text-primary underline underline-offset-4">
                  이용약관
                </Link>
                <span className="text-muted-foreground">·</span>
                <Link to="/privacy" className="text-primary underline underline-offset-4">
                  개인정보처리방침
                </Link>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-gray-200/60">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Grid3x3 className="h-5 w-5 text-blue-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">만다라트 구조화</p>
                    <p className="text-sm text-muted-foreground">
                      큰 목표를 8개 세부목표와 실천 항목으로 자연스럽게 쪼개요.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-200/60">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-violet-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">오늘의 체크리스트</p>
                    <p className="text-sm text-muted-foreground">
                      활성 만다라트의 실천이 자동으로 “오늘” 화면에 모여요.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-200/60">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-pink-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">AI OCR · 리포트</p>
                    <p className="text-sm text-muted-foreground">
                      사진으로 빠르게 입력하고, 주간 리포트로 개선 포인트를 얻어요.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </header>

      {/* Screens */}
      <section className="container mx-auto px-4 py-14 md:py-18">
        <SectionTitle
          eyebrow="PRODUCT"
          title="계획 → 실천 → 성장, 한 흐름으로"
          description="만다라트 작성부터 오늘의 실천, 게임화 보상, AI 리포트까지. 목표를 ‘계속하게’ 만드는 경험을 설계했습니다."
        />

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {SCREENSHOTS.map((s) => (
            <div key={s.src} className="space-y-3">
              <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold tracking-wide text-gray-900">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 pb-14 md:pb-18">
        <SectionTitle
          eyebrow="HOW IT WORKS"
          title="만다라트를 더 쉽게 시작하는 방법"
          description="이미 만들어둔 만다라트가 있어도, 없어도 괜찮아요. 상황에 맞게 가장 편한 방식으로 입력하세요."
        />

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-200/60">
            <CardContent className="p-6 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-gray-50 flex items-center justify-center">
                <ImagePlus className="h-5 w-5 text-gray-700" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">사진 업로드로 자동 입력</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  손글씨 만다라트를 업로드하면 AI OCR이 텍스트를 추출해요.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200/60">
            <CardContent className="p-6 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-gray-50 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-gray-700" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">실천은 “오늘”에서만</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  목표는 복잡해도, 오늘은 단순해야 해요. 체크리스트로만 집중하세요.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200/60">
            <CardContent className="p-6 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-gray-50 flex items-center justify-center">
                <Crown className="h-5 w-5 text-gray-700" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">프리미엄으로 더 멀리</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  무제한 만다라트/리포트와 광고 제거로 몰입감을 높일 수 있어요.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing & Trust */}
      <section className="container mx-auto px-4 pb-14 md:pb-18">
        <SectionTitle
          eyebrow="PREMIUM"
          title="필요한 만큼, 더 몰입하게"
          description="무료로 시작하고, 더 많은 목표/리포트가 필요할 때 프리미엄으로 확장할 수 있어요."
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-gray-200/60 lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">프리미엄(구독)</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    무제한 만다라트, 무제한 AI 리포트, 광고 제거로 목표 실천에만 집중하세요.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-sm font-semibold">월간</p>
                  <p className="text-2xl font-bold mt-1">₩4,400</p>
                  <p className="text-xs text-muted-foreground mt-1">/ 월</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-sm font-semibold">연간</p>
                  <p className="text-2xl font-bold mt-1">₩33,000</p>
                  <p className="text-xs text-muted-foreground mt-1">/ 년 (약 38% 절약)</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                구독 결제/관리/취소는 App Store 계정 설정에서 진행됩니다. 가격은 지역/세금에 따라 표시가 달라질 수 있습니다.
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200/60">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-slate-700" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">신뢰 & 투명성</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    약관/개인정보처리방침을 공개하고, 앱 내에서 언제든 확인할 수 있어요.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">이용약관</span>
                  <Link to="/terms" className="text-primary underline underline-offset-4">
                    보기
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">개인정보처리방침</span>
                  <Link to="/privacy" className="text-primary underline underline-offset-4">
                    보기
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-14 md:pb-18">
        <SectionTitle
          eyebrow="FAQ"
          title="자주 묻는 질문"
          description="빠르게 확인하고 싶을 때를 위해 핵심만 정리했어요."
        />

        <div className="mt-10 max-w-3xl mx-auto space-y-3">
          <Card className="border-gray-200/60">
            <CardContent className="p-5 space-y-2">
              <p className="font-semibold">웹에서 서비스 기능을 사용할 수 있나요?</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                현재 웹은 소개/지원/문서 용도로 운영 중이며, 만다라트 기능은 모바일 앱에서 이용할 수 있어요.
              </p>
            </CardContent>
          </Card>
          <Card className="border-gray-200/60">
            <CardContent className="p-5 space-y-2">
              <p className="font-semibold">구독은 어디에서 관리/해지하나요?</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                App Store 계정 설정에서 구독을 관리/해지할 수 있어요.
              </p>
            </CardContent>
          </Card>
          <Card className="border-gray-200/60">
            <CardContent className="p-5 space-y-2">
              <p className="font-semibold">문의는 어디로 하면 되나요?</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {SUPPORT_EMAIL}로 메일 주시면 빠르게 도와드릴게요.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="font-semibold text-gray-900">MandaAct</p>
              <p className="text-sm text-muted-foreground">
                목표를 실천으로 바꾸는 만다라트 트래커
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <PrimaryCtas />
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3">
              <Link to="/terms" className="text-muted-foreground hover:text-gray-900">
                이용약관
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link to="/privacy" className="text-muted-foreground hover:text-gray-900">
                개인정보처리방침
              </Link>
            </div>
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} UnwrittenBD · {SUPPORT_EMAIL}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

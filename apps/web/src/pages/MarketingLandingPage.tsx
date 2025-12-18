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
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import ScrollReveal from '@/components/ScrollReveal'
import { useState, useEffect } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const APP_STORE_URL = 'https://apps.apple.com/app/id6756198473'
const SUPPORT_EMAIL = 'support@unwrittenbd.com'

function SectionTitle(props: { eyebrow: string; title: string; description: string; align?: 'center' | 'left' }) {
  const alignClass = props.align === 'left' ? 'text-left' : 'text-center'
  const marginClass = props.align === 'left' ? '' : 'mx-auto'

  return (
    <ScrollReveal className={`${alignClass} space-y-4`}>
      <p className="text-sm font-bold tracking-[0.2em] text-primary/60 uppercase">{props.eyebrow}</p>
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
        {props.title}
      </h2>
      <p className={`text-base md:text-xl text-muted-foreground max-w-2xl ${marginClass} leading-relaxed`}>
        {props.description}
      </p>
    </ScrollReveal>
  )
}

function PrimaryCtas({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      <ScrollReveal direction="none" delay={0.2}>
        <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
          <Button size="lg" className="h-14 px-8 text-lg font-bold w-full sm:w-auto bg-brand-gradient hover:opacity-90 transition-opacity gap-2 shadow-lg shadow-blue-500/20">
            앱스토어에서 무료로 시작하기
            <ArrowRight className="h-5 w-5" />
          </Button>
        </a>
      </ScrollReveal>
      <ScrollReveal direction="none" delay={0.3}>
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold w-full sm:w-auto">
            지원 문의
          </Button>
        </a>
      </ScrollReveal>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <ScrollReveal direction="up" className="border-b border-gray-100 last:border-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between py-6 text-left hover:text-primary transition-colors">
          <span className="text-lg font-bold text-gray-900">{question}</span>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-muted-foreground leading-relaxed">
            {answer}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </ScrollReveal>
  )
}

export default function MarketingLandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-lg border-b py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="MandaAct" className="h-10 w-10 rounded-xl shadow-sm group-hover:scale-105 transition-transform" />
            <span className="text-xl font-black tracking-tighter">
              Manda<span className="text-gradient">Act</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
              <Button size="sm" className="bg-brand-gradient hover:opacity-90 px-5 font-bold">
                시작하기
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-transparent" />
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <ScrollReveal direction="up" delay={0.1}>
              <h1 className="text-fluid-hero font-black tracking-tight text-gray-900">
                목표는 원대하게,<br />
                실천은 <span className="text-gradient">단순하게</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                MandaAct는 9×9 만다라트를 <span className="text-gray-900 underline decoration-blue-500/30 underline-offset-4">오늘의 할 일</span>로 바꿔주는 목표 실천 앱입니다.
              </p>
            </ScrollReveal>

            <PrimaryCtas className="justify-center" />

            <ScrollReveal direction="up" delay={0.4} className="flex items-center justify-center gap-5 text-sm font-medium text-muted-foreground pt-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                평생 무료 시작
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                AI 분석 리포트
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                광고 없는 몰입형 설계
              </div>
            </ScrollReveal>
          </div>
        </div>
      </header>

      {/* Narrative Section 1: Magic Input (OCR) */}
      <section className="py-24 md:py-32 bg-gray-50/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <SectionTitle
                align="left"
                eyebrow="Magic Input"
                title="손글씨 목표도 1초 만에 디지털로"
                description="이미 종이에 적어둔 만다라트가 있나요? 사진 한 장만 찍으세요. 강력한 AI OCR이 81개의 칸을 완벽하게 인식합니다."
              />
              <ScrollReveal direction="left" delay={0.2} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: ImagePlus, title: "사진 한 장으로", desc: "복잡한 타이핑 없이 찰칵" },
                  { icon: Sparkles, title: "지능형 인식", desc: "악필도 거뜬히 알아듣는 AI" },
                ].map((item, i) => (
                  <Card key={i} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ScrollReveal>
            </div>
            <ScrollReveal direction="right" className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-[2.5rem] blur-2xl transition-all group-hover:scale-105" />
              <img src="/landing/ko/03_magic.png" alt="AI OCR 인식 화면" className="relative rounded-3xl shadow-2xl border border-gray-100 h-auto w-full object-cover" />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Narrative Section 2: Vision (Structure) */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <SectionTitle
              eyebrow="Step 1: Planning"
              title="81개의 조각으로 그려내는 인생의 지도"
              description="막연했던 꿈을 8개의 세부 목표와 64개의 행동 아이템으로 구체화하세요. 만다라트 기법은 생각의 한계를 넘어 실현 가능한 계획을 만들어줍니다."
            />
          </div>
          <ScrollReveal direction="up" delay={0.2} className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-white">
            <img src="/landing/ko/01_vision.png" alt="만다라트 그리드 화면" className="w-full h-auto" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </ScrollReveal>
        </div>
      </section>

      {/* Narrative Section 3: Daily Action */}
      <section className="py-24 md:py-32 bg-gray-900 text-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="left" className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full" />
              <img src="/landing/ko/02_action.png" alt="오늘의 체크리스트" className="relative rounded-[2rem] shadow-2xl border border-white/10 w-full max-w-md mx-auto" />
            </ScrollReveal>
            <div className="space-y-8">
              <ScrollReveal className="space-y-4">
                <p className="text-sm font-bold tracking-[0.2em] text-blue-400 uppercase">Step 2: Action</p>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  오늘은 <span className="text-blue-400">오직 한 가지</span>에만 집중하세요
                </h2>
                <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
                  81개의 목표를 다 볼 필요는 없습니다. MandaAct가 활성화된 목표만 골라 매일 아침 '오늘의 체크리스트'를 배달해 드립니다. 당신은 행동하기만 하면 됩니다.
                </p>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.3} className="space-y-4">
                {[
                  { icon: Trophy, title: "게임화 보상", desc: "실천할 때마다 쌓이는 XP와 레벨업의 즐거움" },
                  { icon: CalendarCheck, title: "스마트 주기 관리", desc: "매일, 주간, 특정 요일 반복까지 완벽 지원" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Narrative Section 4: Insight (Growth) */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 order-2 lg:order-1">
              <SectionTitle
                align="left"
                eyebrow="Step 3: Growth"
                title="AI 코치가 분석하는 나의 일주일"
                description="내가 어떤 요일에 강한지, 어떤 시간대에 나태해지는지 AI가 정밀하게 분석하여 맞춤형 인사이트와 다음 주 성장 전략을 제안합니다."
              />
              <ScrollReveal direction="up" delay={0.2} className="p-6 rounded-2xl bg-brand-gradient/5 border border-blue-100">
                <div className="flex gap-4">
                  <Sparkles className="h-6 w-6 text-blue-600 shrink-0" />
                  <p className="text-lg font-medium text-gray-800 italic">
                    "지난주 목요일 실천율이 20% 상승했어요! 오전 시간대를 공략하는 전략이 주효했네요."
                  </p>
                </div>
              </ScrollReveal>
            </div>
            <div className="order-1 lg:order-2">
              <ScrollReveal direction="right" className="relative group">
                <img src="/landing/ko/05_insight.png" alt="AI 리포트 화면" className="rounded-3xl shadow-2xl border border-gray-100 w-full" />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Free-First Strategy: CTA Block */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-blue-400/10 blur-[120px] rounded-full -z-10" />
          <ScrollReveal direction="up" className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
              평생 무료로,<br className="sm:hidden" /> 지금 당장 시작하세요
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              만다라트 3개 생성, 주간 리포트까지.<br className="sm:hidden" /> 개인의 기본 성장에 필요한 모든 기능은 영구적으로 무료입니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <PrimaryCtas />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* User-Centric FAQ */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="mb-12">
            <SectionTitle
              eyebrow="FAQ"
              title="궁금하신 점들을 모았습니다"
              description="성장을 준비하는 분들이 가장 많이 묻는 질문들입니다."
            />
          </div>
          <div className="divide-y divide-gray-100 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <FaqItem
              question="정말 무료로 모든 기능을 쓸 수 있나요?"
              answer="네! 한 번에 최대 3개의 만다라트를 활성화할 수 있으며, 기본적인 할 일 관리와 주간 AI 리포트 기능은 영구적으로 무료입니다. 더 많은 목표를 한꺼번에 관리하고 싶을 때만 프리미엄 확장을 고려하세요."
            />
            <FaqItem
              question="기존에 종이에 쓰던 만다라트를 옮겨오고 싶어요."
              answer="모바일 앱의 '사진 업로드' 기능을 사용하세요. AI가 손글씨 이미지를 텍스트로 자동 변환하여 클릭 몇 번으로 앱에 등록해 드립니다."
            />
            <FaqItem
              question="웹 버전에서도 만다라트를 수정할 수 있나요?"
              answer="현재 웹사이트는 서비스 소개와 이용약관 안내 전용으로 운영되고 있습니다. 실제 목표 관리와 리포트 확인은 모바일 앱(iOS)에서 최고의 사용자 경험으로 제공됩니다."
            />
            <FaqItem
              question="구독 해지는 언제든 가능한가요?"
              answer="네, 물론입니다. App Store 구독 설정에서 언제든지 원클릭으로 해지할 수 있으며, 해지 후에도 결제된 기간까지는 모든 프리미엄 기능을 이용하실 수 있습니다."
            />
          </div>
        </div>
      </section>

      {/* Pricing: Scaling Strategy (Secondary emphasis) */}
      <section className="py-24 bg-gray-50/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
                더 높이, 더 멀리 가고 싶을 때<br />
                <span className="text-blue-600">MandaAct Premium</span>
              </h3>
              <p className="mt-4 text-muted-foreground text-lg">
                광고 없는 완벽한 몰입과 무제한 만다라트/리포트로 한계를 뛰어넘으세요.
              </p>
            </ScrollReveal>
            <ScrollReveal direction="right" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm hover:translate-y-[-4px] transition-transform">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                    <Crown className="h-4 w-4" /> 월간
                  </div>
                  <div className="text-2xl font-black text-gray-900">₩4,400 <span className="text-xs font-normal text-muted-foreground">/ 월</span></div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm ring-1 ring-blue-500 hover:translate-y-[-4px] transition-transform relative">
                <div className="absolute top-0 right-4 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">-38%</div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                    <Crown className="h-4 w-4" /> 연간
                  </div>
                  <div className="text-2xl font-black text-gray-900">₩33,000 <span className="text-xs font-normal text-muted-foreground">/ 년</span></div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-2">
              <p className="text-xl font-black tracking-tight text-gray-900">Manda<span className="text-gradient">Act</span></p>
              <p className="text-sm text-muted-foreground max-w-sm">
                당신의 원대한 목표를 현실로 바꾸는 가장 쉬운 방법. '실천'에만 집중하도록 돕습니다.
              </p>
            </div>
            <div className="flex gap-4">
              <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="font-bold border-gray-200">App Store 바로가기</Button>
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-gray-900 transition-colors">이용약관</Link>
              <Link to="/privacy" className="hover:text-gray-900 transition-colors">개인정보처리방침</Link>
            </div>
            <p>© {new Date().getFullYear()} UnwrittenBD • {SUPPORT_EMAIL}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

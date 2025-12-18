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
  Globe,
  Check,
} from 'lucide-react'
import ScrollReveal from '@/components/ScrollReveal'
import { useState, useEffect } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { locales, type Language } from '@/lib/locales'

const APP_STORE_URL = 'https://apps.apple.com/app/id6756198473'
const SUPPORT_EMAIL = 'support@unwrittenbd.com'

function SectionTitle(props: { eyebrow: string; title: string; description: string; align?: 'center' | 'left' }) {
  const alignClass = props.align === 'left' ? 'text-left' : 'text-center'
  const marginClass = props.align === 'left' ? '' : 'mx-auto'

  return (
    <ScrollReveal className={`${alignClass} space-y-4`}>
      <p className="text-sm font-bold tracking-[0.2em] text-primary/60 uppercase">{props.eyebrow}</p>
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight whitespace-pre-line">
        {props.title}
      </h2>
      <p className={`text-base md:text-xl text-muted-foreground max-w-2xl ${marginClass} leading-relaxed`}>
        {props.description}
      </p>
    </ScrollReveal>
  )
}

function PrimaryCtas({ lang, className = "" }: { lang: Language; className?: string }) {
  const t = locales[lang].common
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      <ScrollReveal direction="none" delay={0.2}>
        <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
          <Button size="lg" className="h-14 px-8 text-lg font-bold w-full sm:w-auto bg-brand-gradient hover:opacity-90 transition-opacity gap-2 shadow-lg shadow-blue-500/20">
            {t.freeStart}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </a>
      </ScrollReveal>
      <ScrollReveal direction="none" delay={0.3}>
        <a href={`mailto:${SUPPORT_EMAIL}`}>
          <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold w-full sm:w-auto">
            {t.support}
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
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {answer}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </ScrollReveal>
  )
}

export default function MarketingLandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('mandaact_lang') as Language
    if (saved === 'ko' || saved === 'en') return saved
    const browserLang = navigator.language.split('-')[0]
    return browserLang === 'ko' ? 'ko' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('mandaact_lang', lang)
  }, [lang])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const t = locales[lang]

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-lg border-b py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/app-icon.png" alt="MandaAct" className="h-10 w-10 rounded-xl shadow-sm group-hover:scale-105 transition-transform" />
            <span className="text-xl font-black tracking-tighter">
              Manda<span className="text-gradient">Act</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 rounded-full hover:bg-black/5">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase">{lang}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => setLang('ko')} className="flex items-center justify-between">
                  한국어 {lang === 'ko' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('en')} className="flex items-center justify-between">
                  English {lang === 'en' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-transparent" />
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <ScrollReveal direction="up" delay={0.1}>
              <h1 className="text-fluid-hero font-black tracking-tight text-gray-900 whitespace-pre-line leading-[1.1]">
                {t.hero.title.split(t.hero.highlight).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="text-gradient">{t.hero.highlight}</span>}
                  </span>
                ))}
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                {t.hero.subtitle.split(t.hero.today).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="text-gray-900 underline decoration-blue-500/30 underline-offset-4">{t.hero.today}</span>}
                  </span>
                ))}
              </p>
            </ScrollReveal>

            <PrimaryCtas lang={lang} className="justify-center" />

            <ScrollReveal direction="up" delay={0.4} className="flex flex-wrap items-center justify-center gap-5 text-sm font-medium text-muted-foreground pt-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t.common.lifetimeFree}
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t.common.aiReport}
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t.common.noAds}
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
                eyebrow={t.magic.eyebrow}
                title={t.magic.title}
                description={t.magic.description}
              />
              <ScrollReveal direction="left" delay={0.2} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: ImagePlus, title: t.magic.feature1, desc: t.magic.feature1Desc },
                  { icon: Sparkles, title: t.magic.feature2, desc: t.magic.feature2Desc },
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
              <img src={`/landing/${lang}/03_magic.png`} alt="AI OCR" className="relative rounded-3xl shadow-2xl border border-gray-100 h-auto w-full object-cover" />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Narrative Section 2: Vision (Structure) */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <SectionTitle
              eyebrow={t.vision.eyebrow}
              title={t.vision.title}
              description={t.vision.description}
            />
          </div>
          <ScrollReveal direction="up" delay={0.2} className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-white">
            <img src={`/landing/${lang}/01_vision.png`} alt="Mandalart Vision" className="w-full h-auto" />
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
              <img src={`/landing/${lang}/02_action.png`} alt="Daily Action" className="relative rounded-[2rem] shadow-2xl border border-white/10 w-full max-w-md mx-auto" />
            </ScrollReveal>
            <div className="space-y-8">
              <ScrollReveal className="space-y-4">
                <p className="text-sm font-bold tracking-[0.2em] text-blue-400 uppercase">{t.action.eyebrow}</p>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  {t.action.title}
                </h2>
                <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
                  {t.action.description}
                </p>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.3} className="space-y-4">
                {[
                  { icon: Trophy, title: t.action.feature1, desc: t.action.feature1Desc },
                  { icon: CalendarCheck, title: t.action.feature2, desc: t.action.feature2Desc },
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
                eyebrow={t.insight.eyebrow}
                title={t.insight.title}
                description={t.insight.description}
              />
              <ScrollReveal direction="up" delay={0.2} className="p-6 rounded-2xl bg-brand-gradient/5 border border-blue-100">
                <div className="flex gap-4">
                  <Sparkles className="h-6 w-6 text-blue-600 shrink-0" />
                  <p className="text-lg font-medium text-gray-800 italic">
                    {t.insight.quote}
                  </p>
                </div>
              </ScrollReveal>
            </div>
            <div className="order-1 lg:order-2">
              <ScrollReveal direction="right" className="relative group">
                <img src={`/landing/${lang}/05_insight.png`} alt="AI Insight" className="rounded-3xl shadow-2xl border border-gray-100 w-full" />
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
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 heading-tight whitespace-pre-line">
              {t.cta.title}
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed whitespace-pre-line">
              {t.cta.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <PrimaryCtas lang={lang} />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* User-Centric FAQ */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="mb-12">
            <SectionTitle
              eyebrow={t.faq.eyebrow}
              title={t.faq.title}
              description={t.faq.description}
            />
          </div>
          <div className="divide-y divide-gray-100 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <FaqItem question={t.faq.q1} answer={t.faq.a1} />
            <FaqItem question={t.faq.q2} answer={t.faq.a2} />
            <FaqItem question={t.faq.q3} answer={t.faq.a3} />
            <FaqItem question={t.faq.q4} answer={t.faq.a4} />
          </div>
        </div>
      </section>

      {/* Pricing: Scaling Strategy (Secondary emphasis) */}
      <section className="py-24 bg-gray-50/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
                {t.pricing.title}<br />
                <span className="text-blue-600">{t.pricing.subtitle}</span>
              </h3>
              <p className="mt-4 text-muted-foreground text-lg">
                {t.pricing.description}
              </p>
            </ScrollReveal>
            <ScrollReveal direction="right" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm hover:translate-y-[-4px] transition-transform">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                    <Crown className="h-4 w-4" /> {t.pricing.monthly}
                  </div>
                  <div className="text-2xl font-black text-gray-900">₩4,400 <span className="text-xs font-normal text-muted-foreground">{t.pricing.monthUnit}</span></div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm ring-1 ring-blue-500 hover:translate-y-[-4px] transition-transform relative">
                <div className="absolute top-0 right-4 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">-38%</div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                    <Crown className="h-4 w-4" /> {t.pricing.yearly}
                  </div>
                  <div className="text-2xl font-black text-gray-900">₩33,000 <span className="text-xs font-normal text-muted-foreground">{t.pricing.yearUnit}</span></div>
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
                {t.common.footerDesc}
              </p>
            </div>
            <div className="flex gap-4">
              <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="font-bold border-gray-200">{t.common.backToAppStore}</Button>
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-gray-900 transition-colors">{t.common.terms}</Link>
              <Link to="/privacy" className="hover:text-gray-900 transition-colors">{t.common.privacy}</Link>
            </div>
            <p>© {new Date().getFullYear()} UnwrittenBD • {SUPPORT_EMAIL}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

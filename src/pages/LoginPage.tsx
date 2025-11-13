import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'
import { Target, Sparkles, TrendingUp, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

const signUpSchema = z.object({
  nickname: z.string()
    .min(2, '닉네임은 최소 2자 이상이어야 합니다')
    .max(12, '닉네임은 최대 12자까지 가능합니다')
    .regex(/^[가-힣a-zA-Z0-9]+$/, '닉네임은 한글, 영문, 숫자만 사용 가능합니다'),
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

type LoginFormData = z.infer<typeof loginSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

const features = [
  {
    icon: Target,
    title: '9×9 만다라트',
    description: '체계적인 목표 설정',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: TrendingUp,
    title: '실천 추적',
    description: '꾸준한 실천 습관화',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    icon: Sparkles,
    title: 'AI 코칭',
    description: '맞춤형 인사이트 제공',
    gradient: 'from-purple-500 to-pink-500'
  }
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signUp } = useAuthStore()

  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isSignUpLoading, setIsSignUpLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const from = (location.state as { from?: string })?.from || '/'

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoginLoading(true)
    setLoginError(null)

    const { error } = await signIn(data.email, data.password)

    if (error) {
      setLoginError(error.message || '로그인 중 오류가 발생했습니다')
      setIsLoginLoading(false)
    } else {
      setIsLoginLoading(false)
      navigate(from, { replace: true })
    }
  }

  const onSignUpSubmit = async (data: SignUpFormData) => {
    setIsSignUpLoading(true)
    setSignUpError(null)

    const { error } = await signUp(data.email, data.password, data.nickname)

    if (error) {
      setSignUpError(error.message || '회원가입 중 오류가 발생했습니다')
      setIsSignUpLoading(false)
    } else {
      setSignUpSuccess(true)
      setIsSignUpLoading(false)
      setTimeout(() => {
        navigate('/home', { replace: true })
      }, 2000)
    }
  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">회원가입 완료!</CardTitle>
              <CardDescription>
                이메일로 전송된 인증 링크를 확인해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                잠시 후 홈으로 이동합니다...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex flex-col justify-center items-center p-12 text-white relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          {/* Logo & Tagline */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-5xl font-bold">MandaAct</h1>
            <p className="text-2xl font-light">목표를 행동으로,<br />만다라트로 실천</p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className={`p-3 bg-gradient-to-br ${feature.gradient} rounded-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-white/80">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-center text-white/90"
          >
            <p className="text-sm">많은 사용자들이 MandaAct와 함께<br />목표를 달성하고 있습니다</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Auth Section */}
      <div className="flex items-center justify-center p-4 lg:p-12 lg:bg-background">
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-white text-center">
            <h1 className="text-4xl font-bold">
              MandaAct
            </h1>
            <p className="text-sm text-white/90 mt-2">목표를 행동으로, 만다라트로 실천</p>
          </div>

          <Card className="lg:shadow-xl lg:border-2 backdrop-blur-sm lg:backdrop-blur-none bg-white/10 lg:bg-white border-white/20 lg:border-border text-white lg:text-foreground">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">시작하기</CardTitle>
              <CardDescription className="text-white/80 lg:text-muted-foreground text-sm">
                계정을 만들거나 로그인하세요
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3 h-10 bg-white/5 lg:bg-muted p-0.5">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white lg:data-[state=active]:bg-background lg:data-[state=active]:text-foreground data-[state=inactive]:text-white/50 lg:data-[state=inactive]:text-foreground/50 transition-all text-sm"
                  >
                    로그인
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white lg:data-[state=active]:bg-background lg:data-[state=active]:text-foreground data-[state=inactive]:text-white/50 lg:data-[state=inactive]:text-foreground/50 transition-all text-sm"
                  >
                    회원가입
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login" className="mt-0">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    {loginError && (
                      <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                        {loginError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-white lg:text-foreground">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10 bg-white text-foreground"
                          {...loginForm.register('email')}
                          disabled={isLoginLoading}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-white lg:text-foreground">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="비밀번호를 입력하세요"
                          className="pl-10 pr-10 bg-white text-foreground"
                          {...loginForm.register('password')}
                          disabled={isLoginLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoginLoading}>
                      {isLoginLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          로그인 중...
                        </>
                      ) : (
                        '로그인'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Sign Up Tab */}
                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                    {signUpError && (
                      <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                        {signUpError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-nickname" className="text-white lg:text-foreground">닉네임</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-nickname"
                          type="text"
                          placeholder="닉네임 (2-12자)"
                          className="pl-10 bg-white text-foreground"
                          {...signUpForm.register('nickname')}
                          disabled={isSignUpLoading}
                        />
                      </div>
                      {signUpForm.formState.errors.nickname && (
                        <p className="text-sm text-red-600">{signUpForm.formState.errors.nickname.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-white lg:text-foreground">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10 bg-white text-foreground"
                          {...signUpForm.register('email')}
                          disabled={isSignUpLoading}
                        />
                      </div>
                      {signUpForm.formState.errors.email && (
                        <p className="text-sm text-red-600">{signUpForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-white lg:text-foreground">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showSignUpPassword ? 'text' : 'password'}
                          placeholder="비밀번호 (6자 이상)"
                          className="pl-10 pr-10 bg-white text-foreground"
                          {...signUpForm.register('password')}
                          disabled={isSignUpLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signUpForm.formState.errors.password && (
                        <p className="text-sm text-red-600">{signUpForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password" className="text-white lg:text-foreground">비밀번호 확인</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="비밀번호 확인"
                          className="pl-10 pr-10 bg-white text-foreground"
                          {...signUpForm.register('confirmPassword')}
                          disabled={isSignUpLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signUpForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-600">{signUpForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isSignUpLoading}>
                      {isSignUpLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          가입 중...
                        </>
                      ) : (
                        '회원가입'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

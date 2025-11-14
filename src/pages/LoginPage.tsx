import { useState, useEffect } from 'react'
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
import { Target, Sparkles, TrendingUp, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

const signUpSchema = z.object({
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

  // Set body background to white on mount, restore on unmount
  useEffect(() => {
    const originalBackground = document.body.style.background
    document.body.style.background = '#ffffff'

    return () => {
      document.body.style.background = originalBackground
    }
  }, [])

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

    const { error } = await signUp(data.email, data.password)

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
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md text-center shadow-lg">
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
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 bg-white" style={{ minHeight: '100dvh' }}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-200 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          {/* Logo & Tagline */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-6"
          >
            <img
              src="/logo.png"
              alt="MandaAct"
              className="h-16 w-auto"
            />
            <p className="text-2xl font-light text-gray-700">목표를 행동으로,<br />만다라트로 실천</p>
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
                className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <div className={`p-3 bg-gradient-to-br ${feature.gradient} rounded-lg shadow-sm`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-center text-gray-600"
          >
            <p className="text-sm">많은 사용자들이 MandaAct와 함께<br />목표를 달성하고 있습니다</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Auth Section */}
      <div className="flex flex-col items-center justify-center p-4 py-8 lg:p-12 bg-white gap-6 flex-1">
        {/* Mobile Logo - Fixed Position */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="lg:hidden text-center"
        >
          <img
            src="/logo.png"
            alt="MandaAct"
            className="h-12 w-auto mx-auto mb-3"
          />
          <p className="text-sm text-gray-600">목표를 행동으로, 만다라트로 실천</p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl border-2 border-gray-200 bg-white">
            <CardHeader className="pb-4 space-y-2">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">시작하기</CardTitle>
              <CardDescription className="text-gray-600">
                계정을 만들거나 로그인하세요
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pb-4">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 h-11 bg-gray-100 p-1">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all"
                  >
                    로그인
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all"
                  >
                    회원가입
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login" className="mt-0">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    {loginError && (
                      <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                        {loginError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-gray-700 font-medium">이메일</Label>
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
                      <Label htmlFor="login-password" className="text-gray-700 font-medium">비밀번호</Label>
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

                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-medium" disabled={isLoginLoading}>
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
                      <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                        {signUpError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-gray-700 font-medium">이메일</Label>
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
                      <Label htmlFor="signup-password" className="text-gray-700 font-medium">비밀번호</Label>
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
                      <Label htmlFor="signup-confirm-password" className="text-gray-700 font-medium">비밀번호 확인</Label>
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

                    <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-medium" disabled={isSignUpLoading}>
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

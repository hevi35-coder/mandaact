import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'

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

type SignUpFormData = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const navigate = useNavigate()
  const signUp = useAuthStore((state) => state.signUp)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true)
    setError(null)

    console.log('Attempting signup with nickname:', data.nickname, 'email:', data.email)

    const { error } = await signUp(data.email, data.password, data.nickname)

    if (error) {
      console.error('Signup failed:', error)
      setError(error.message || '회원가입 중 오류가 발생했습니다')
      setIsLoading(false)
    } else {
      console.log('Signup successful')
      setSuccess(true)
      setIsLoading(false)
      // Show success message for 2 seconds, then redirect
      setTimeout(() => {
        navigate('/')
      }, 2000)
    }
  }

  if (success) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">회원가입 완료!</CardTitle>
            <CardDescription>
              이메일로 전송된 인증 링크를 확인해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              잠시 후 홈으로 이동합니다...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            MandaAct에 오신 것을 환영합니다! 계정을 만들어주세요.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}

            {/* Nickname Field */}
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="2~12자 (한글/영문/숫자)"
                {...register('nickname')}
                disabled={isLoading}
                maxLength={12}
              />
              {errors.nickname && (
                <p className="text-sm text-red-600">{errors.nickname.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="최소 6자 이상"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '처리 중...' : '회원가입'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

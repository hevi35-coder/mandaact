import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

// Pages will be created in Phase 1 implementation
function HomePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">MandaAct</h1>
          <p className="text-muted-foreground mb-2">
            AI-powered Mandalart Action Tracker
          </p>
          <div className="inline-flex gap-4 text-sm">
            <span>✅ Project setup complete</span>
            <span>✅ Git initialized</span>
            <span>✅ UI components ready</span>
          </div>
        </div>

        {/* UI Components Demo */}
        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui Components Demo</CardTitle>
            <CardDescription>
              Installed components: Button, Input, Card, Label, Form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buttons */}
            <div className="space-y-2">
              <Label>Buttons</Label>
              <div className="flex gap-2 flex-wrap">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Input</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password Input</Label>
              <Input id="password" type="password" placeholder="Enter password" />
            </div>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            🚀 Ready for Phase 1 implementation: Authentication System
          </CardFooter>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Phase 1 Development Roadmap:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Authentication System (회원가입/로그인)</li>
                <li>Mandalart Direct Input (9x9 그리드 템플릿)</li>
                <li>Today View & Checklist (일일 실천 체크)</li>
                <li>Image Upload & OCR (이미지 인식)</li>
              </ol>
            </div>
            <Button className="w-full">Start Phase 1: Authentication</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* More routes will be added in Phase 1 */}
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App

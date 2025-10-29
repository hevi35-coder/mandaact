import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Pages will be created in Phase 1 implementation
function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">MandaAct</h1>
        <p className="text-muted-foreground mb-8">
          AI-powered Mandalart Action Tracker
        </p>
        <div className="space-y-2 text-sm">
          <p>✅ Project setup complete</p>
          <p>🚀 Ready for Phase 1 implementation</p>
        </div>
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

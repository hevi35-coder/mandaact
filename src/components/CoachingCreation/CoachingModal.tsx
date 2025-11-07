import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import ChatArea from './ChatArea'
import ProgressSidebar from './ProgressSidebar'

interface CoachingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (mandalartData: any) => void
}

export default function CoachingModal({ isOpen, onClose, onComplete }: CoachingModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState('center_goal')
  const [progress, setProgress] = useState({
    center_goal_done: false,
    sub_goals_count: 0,
    actions_count: 0,
  })

  if (!isOpen) return null

  const handleLater = () => {
    // TODO: Implement auto-save logic
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">AI 코치와 만다라트 만들기</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLater}>
              나중에
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar: Progress */}
          <ProgressSidebar
            currentPhase={currentPhase}
            progress={progress}
          />

          {/* Right: Chat Area */}
          <div className="flex-1">
            <ChatArea
              sessionId={sessionId}
              onSessionStart={(id) => setSessionId(id)}
              onPhaseChange={(phase) => setCurrentPhase(phase)}
              onProgressUpdate={(prog) => setProgress(prog)}
              onComplete={onComplete}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { startCoachingSession, sendCoachingMessage } from '../../lib/coaching-api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatAreaProps {
  sessionId: string | null
  onSessionStart: (sessionId: string) => void
  onPhaseChange: (phase: string) => void
  onProgressUpdate: (progress: any) => void
  onComplete: (data: any) => void
}

export default function ChatArea({
  sessionId,
  onSessionStart,
  onPhaseChange,
  onProgressUpdate,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    // Initialize session on mount
    handleStartSession()
  }, [])

  const handleStartSession = async () => {
    try {
      setIsLoading(true)
      const response = await startCoachingSession()
      onSessionStart(response.session_id)
      setMessages([
        {
          role: 'assistant',
          content: response.message,
        },
      ])
      onPhaseChange(response.phase)
      onProgressUpdate(response.progress)
    } catch (error) {
      console.error('Failed to start session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !sessionId || isLoading) return

    const userMessage = inputText.trim()
    setInputText('')

    // Add user message to UI
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    try {
      setIsLoading(true)
      const response = await sendCoachingMessage(sessionId, userMessage)

      // Add assistant response
      setMessages((prev) => [...prev, { role: 'assistant', content: response.message }])

      // Update progress
      onPhaseChange(response.phase)
      onProgressUpdate(response.progress)

      // Check if completed
      if (response.phase_completed && response.phase === 'completed') {
        // TODO: Show completion actions
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !inputText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { ChatMessage, ChatSession } from '@/types'
import { getCurrentUTC } from '@/lib/timezone'

export default function ChatCoach() {
  const user = useAuthStore((state) => state.user)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Load last active session on mount
  useEffect(() => {
    if (user && isOpen) {
      loadLastSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen])

  const loadLastSession = async () => {
    if (!user) return

    try {
      const { data: sessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false })
        .limit(1)

      if (sessionError) throw sessionError

      if (sessions && sessions.length > 0) {
        const session = sessions[0] as ChatSession
        setCurrentSession(session)
        await loadMessages(session.id)
      }
    } catch (err) {
      console.error('Load session error:', err)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError
      setMessages((data || []) as ChatMessage[])
    } catch (err) {
      console.error('Load messages error:', err)
    }
  }

  const sendMessage = async () => {
    if (!user || !input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)
    setIsLoading(true)

    // Optimistic update: Show user message immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSession?.id || '',
      role: 'user',
      content: userMessage,
      created_at: getCurrentUTC(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      // Call Edge Function
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            session_id: currentSession?.id,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const result = await response.json()

      // Update session if new
      if (!currentSession && result.session_id) {
        const { data: newSession } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', result.session_id)
          .single()

        if (newSession) {
          setCurrentSession(newSession as ChatSession)
        }
      }

      // Add assistant response immediately
      const assistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        session_id: result.session_id,
        role: 'assistant',
        content: result.reply,
        created_at: getCurrentUTC(),
      }
      setMessages((prev) => [...prev, assistantMessage])

    } catch (err) {
      console.error('Send message error:', err)
      setError(err instanceof Error ? err.message : '메시지 전송에 실패했습니다')
      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNewSession = () => {
    setCurrentSession(null)
    setMessages([])
    setError(null)
  }

  if (!user) return null

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
          aria-label="AI 코치와 대화하기"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="font-semibold">AI 코치</h3>
              <p className="text-xs text-muted-foreground">
                {currentSession ? '대화 중' : '새로운 대화'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {currentSession && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewSession}
                  className="text-xs"
                >
                  새 대화
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">안녕하세요! 실천에 대해 이야기해볼까요?</p>
                  <p className="text-xs mt-1">무엇이든 물어보세요 🙂</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter로 전송 • Shift+Enter로 줄바꿈
            </p>
          </div>
        </div>
      )}
    </>
  )
}

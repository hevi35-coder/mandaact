import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native'

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

// Toast configuration
const TOAST_CONFIG: Record<ToastType, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  success: { icon: CheckCircle, color: '#22c55e', bgColor: '#f0fdf4' },
  error: { icon: XCircle, color: '#ef4444', bgColor: '#fef2f2' },
  warning: { icon: AlertCircle, color: '#f59e0b', bgColor: '#fffbeb' },
  info: { icon: Info, color: '#3b82f6', bgColor: '#eff6ff' },
}

// Single Toast Component
function ToastItem({
  toast,
  onHide,
}: {
  toast: Toast
  onHide: (id: string) => void
}) {
  const config = TOAST_CONFIG[toast.type]
  const Icon = config.icon

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onHide(toast.id)
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onHide])

  return (
    <Animated.View
      className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg"
      style={{ backgroundColor: config.bgColor }}
    >
      <View className="flex-row items-start p-4">
        <Icon size={20} color={config.color} />
        <View className="flex-1 ml-3">
          <Text className="text-sm font-semibold text-gray-900">{toast.title}</Text>
          {toast.message && (
            <Text className="text-sm text-gray-600 mt-1">{toast.message}</Text>
          )}
        </View>
        <Pressable onPress={() => onHide(toast.id)} className="p-1">
          <X size={16} color="#9ca3af" />
        </Pressable>
      </View>
    </Animated.View>
  )
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const insets = useSafeAreaInsets()

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message })
  }, [showToast])

  const error = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message, duration: 5000 })
  }, [showToast])

  const warning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message })
  }, [showToast])

  const info = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message })
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <View
        className="absolute left-0 right-0 z-50"
        style={{ top: insets.top + 8 }}
        pointerEvents="box-none"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

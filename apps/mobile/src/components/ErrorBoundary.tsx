import React, { Component, ErrorInfo, ReactNode } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native'
import { logger } from '../lib/logger'
import i18n from '../i18n'
import { resetToHome } from '../navigation/navigationRef'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log to error reporting service (Sentry via logger)
    logger.error('ErrorBoundary caught an error', error, { errorInfo })
    // Ensure something shows up in device logs even in release builds
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Use i18n directly since we can't use hooks in class components
      const t = (key: string) => i18n.t(key)

      return (
        <SafeAreaView className="flex-1 bg-gray-50">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          >
            {/* Error Icon */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center">
                <AlertTriangle size={40} color="#ef4444" />
              </View>
            </View>

            {/* Error Message */}
            <Text className="text-xl font-bold text-gray-900 text-center mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
              {t('errorBoundary.title')}
            </Text>
            <Text className="text-gray-500 text-center mb-6" style={{ fontFamily: 'Pretendard-Regular' }}>
              {t('errorBoundary.description')}
            </Text>

            {/* Error Details (Debug) */}
            {this.state.error && (
              <View className="bg-gray-100 rounded-xl p-4 mb-6">
                <Text className="text-xs font-mono text-red-600 mb-2">
                  {this.state.error.toString()}
                </Text>
                {__DEV__ && this.state.errorInfo?.componentStack && (
                  <Text className="text-xs font-mono text-gray-500" numberOfLines={10}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View className="gap-3">
              <Pressable
                className="bg-primary rounded-xl py-4 flex-row items-center justify-center"
                onPress={this.handleReset}
              >
                <RefreshCw size={20} color="white" />
                <Text className="text-white ml-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>{t('errorBoundary.retry')}</Text>
              </Pressable>

              <Pressable
                className="bg-gray-200 rounded-xl py-4 flex-row items-center justify-center"
                onPress={() => {
                  resetToHome()
                  this.handleReset()
                }}
              >
                <Home size={20} color="#374151" />
                <Text className="text-gray-700 ml-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>{t('errorBoundary.goHome')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping screens
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo)

        this.setState({
            error,
            errorInfo
        })

        // You can also log the error to an error reporting service here
        // Example: Sentry.captureException(error)
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-2xl mx-auto">
                        <Card className="border-destructive">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-6 w-6 text-destructive" />
                                    <CardTitle>문제가 발생했습니다</CardTitle>
                                </div>
                                <CardDescription>
                                    예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <div className="rounded-md bg-muted p-4">
                                        <p className="text-sm font-mono text-destructive mb-2">
                                            {this.state.error.toString()}
                                        </p>
                                        {this.state.errorInfo && (
                                            <details className="text-xs font-mono text-muted-foreground">
                                                <summary className="cursor-pointer">Stack trace</summary>
                                                <pre className="mt-2 whitespace-pre-wrap">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={this.handleReset} variant="default">
                                        다시 시도
                                    </Button>
                                    <Button
                                        onClick={() => window.location.href = '/'}
                                        variant="outline"
                                    >
                                        홈으로 가기
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary

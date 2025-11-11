// Action type suggestion badge with confidence-based UI feedback
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getActionTypeLabel } from '@/lib/actionTypes'
import type { ActionType, Confidence } from '@/lib/actionTypes'
import { AlertCircle, Info, CheckCircle } from 'lucide-react'

interface ActionTypeSuggestionBadgeProps {
  type: ActionType
  confidence: Confidence
  reason: string
  title: string
  onTypeChange?: (newType: ActionType) => void
}

export function ActionTypeSuggestionBadge({
  type,
  confidence,
  reason,
  title,
  onTypeChange
}: ActionTypeSuggestionBadgeProps) {
  // Badge color based on confidence
  const badgeVariant = confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'outline'

  // Only show detailed feedback for low/medium confidence
  const shouldShowFeedback = confidence === 'low' || confidence === 'medium'

  return (
    <div className="space-y-2">
      {/* Badge with type and confidence */}
      <div className="flex items-center gap-2">
        <Badge variant={badgeVariant} className="text-xs">
          {getActionTypeLabel(type)} (자동 분류)
        </Badge>
        {confidence === 'high' && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
      </div>

      {/* Feedback alert for low/medium confidence */}
      {shouldShowFeedback && (
        <Alert variant={confidence === 'low' ? 'destructive' : 'default'} className="text-sm">
          <div className="flex items-start gap-2">
            {confidence === 'low' ? (
              <AlertCircle className="h-4 w-4 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 mt-0.5" />
            )}
            <div className="flex-1">
              <AlertTitle className="text-sm font-semibold mb-1">
                {confidence === 'low' ? '⚠️ 분류 결과를 확인해주세요' : '💡 자동 분류 결과'}
              </AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p>
                  <strong>"{title}"</strong>을(를) <strong>{getActionTypeLabel(type)}</strong>로 분류했어요.
                </p>
                <p className="text-muted-foreground">{reason}</p>
                {onTypeChange && (
                  <p className="text-xs text-muted-foreground mt-2">
                    맞지 않으면 수동으로 수정해주세요.
                  </p>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Simple reason display for high confidence */}
      {confidence === 'high' && (
        <p className="text-xs text-muted-foreground">
          {reason}
        </p>
      )}
    </div>
  )
}

/**
 * Compact version for list views
 */
export function ActionTypeSuggestionBadgeCompact({
  type,
  confidence,
  reason
}: Pick<ActionTypeSuggestionBadgeProps, 'type' | 'confidence' | 'reason'>) {
  const badgeVariant = confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'outline'

  return (
    <div className="flex items-center gap-2">
      <Badge variant={badgeVariant} className="text-xs">
        {getActionTypeLabel(type)}
      </Badge>
      {confidence === 'high' ? (
        <CheckCircle className="h-3 w-3 text-green-600" />
      ) : confidence === 'medium' ? (
        <Info className="h-3 w-3 text-blue-600" />
      ) : (
        <AlertCircle className="h-3 w-3 text-orange-600" />
      )}
      <span className="text-xs text-muted-foreground" title={reason}>
        {confidence === 'low' && '확인 필요'}
      </span>
    </div>
  )
}

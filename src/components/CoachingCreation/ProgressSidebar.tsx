import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface ProgressSidebarProps {
  currentPhase: string
  progress: {
    center_goal_done: boolean
    sub_goals_count: number
    actions_count: number
  }
}

export default function ProgressSidebar({ currentPhase, progress }: ProgressSidebarProps) {
  const phases = [
    {
      id: 'center_goal',
      label: '핵심 목표',
      isDone: progress.center_goal_done,
      isCurrent: currentPhase === 'center_goal',
    },
    {
      id: 'sub_goals',
      label: '세부 목표',
      isDone: progress.sub_goals_count === 8,
      isCurrent: currentPhase === 'sub_goals',
      count: `${progress.sub_goals_count}/8`,
    },
    {
      id: 'actions',
      label: '실천 항목',
      isDone: progress.actions_count === 64,
      isCurrent: currentPhase === 'actions',
      count: `${progress.actions_count}/64`,
    },
    {
      id: 'immediate_action',
      label: '즉시 실행',
      isDone: currentPhase === 'completed',
      isCurrent: currentPhase === 'immediate_action',
    },
  ]

  return (
    <div className="w-64 border-r bg-gray-50 p-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-4">진행 상황</h3>
      <div className="space-y-3">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`flex items-start gap-2 ${
              phase.isCurrent ? 'text-blue-600' : phase.isDone ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <div className="mt-0.5">
              {phase.isDone ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : phase.isCurrent ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{phase.label}</div>
              {phase.count && (
                <div className="text-xs text-gray-500 mt-0.5">{phase.count} 완료</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { MandalartGridData } from '@/types'
import { Plus } from 'lucide-react'

interface MandalartGridProps {
  mode: 'view' | 'create'
  data: MandalartGridData
  onSectionClick?: (sectionPos: number) => void
  onCoreGoalClick?: () => void
  readonly?: boolean
  forDownload?: boolean
  forMobile?: boolean
}

export default function MandalartGrid({
  mode,
  data,
  onSectionClick,
  onCoreGoalClick,
  readonly = false,
  forDownload = false,
  forMobile = false,
}: MandalartGridProps) {

  // Get sub-goal by position
  const getSubGoalByPosition = (position: number) => {
    return data.sub_goals.find((sg) => sg.position === position)
  }

  // Render a single cell in the 9x9 grid
  const renderCell = (sectionPos: number, cellPos: number) => {
    // Center section (position 0)
    if (sectionPos === 0) {
      if (cellPos === 4) {
        // Center of center: Core goal
        return (
          <div
            className={`${
              forDownload
                ? 'grid place-items-center'
                : 'flex flex-col items-center justify-center'
            } h-full min-h-full ${
              forDownload ? 'p-2' : forMobile ? 'p-2' : 'p-2.5'
            } ${
              !forDownload && !readonly
                ? 'cursor-pointer hover:opacity-90 transition-opacity'
                : ''
            } ${
              !forDownload
                ? 'shadow-lg border-2 border-purple-200'
                : ''
            }`}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            onClick={
              !forDownload && !readonly && onCoreGoalClick
                ? onCoreGoalClick
                : undefined
            }
          >
            {data.center_goal ? (
              <p
                className={`${
                  forDownload ? 'text-6xl' : forMobile ? 'text-base' : 'text-xl'
                } font-bold ${
                  !forDownload ? 'line-clamp-4' : ''
                } text-white text-center`}
                style={
                  forDownload
                    ? {
                        margin: 0,
                        wordBreak: 'keep-all',
                        overflowWrap: 'break-word',
                        lineHeight: '1.4',
                        width: '100%',
                        display: 'block',
                        textAlign: 'center',
                      }
                    : { textAlign: 'center', margin: 0 }
                }
              >
                {data.center_goal}
              </p>
            ) : mode === 'create' && !forDownload ? (
              <Plus className="w-6 h-6 text-white/50" />
            ) : null}
          </div>
        )
      } else {
        // Surrounding cells: Sub-goal titles
        const subGoalPosition = cellPos < 4 ? cellPos + 1 : cellPos
        const subGoal = getSubGoalByPosition(subGoalPosition)
        return (
          <div
            className={`${
              forDownload ? 'grid place-items-center' : 'flex flex-col items-center justify-center'
            } h-full min-h-full ${
              forDownload ? 'p-2' : forMobile ? 'p-2' : 'p-2.5'
            } bg-blue-50 ${
              !forDownload ? 'hover:bg-blue-100 transition-colors' : ''
            }`}
          >
            {subGoal?.title && (
              <p
                className={`${
                  forDownload ? 'text-5xl' : forMobile ? 'text-base' : 'text-lg'
                } font-medium ${
                  !forDownload ? 'line-clamp-4' : ''
                } text-center`}
                style={
                  forDownload
                    ? {
                        margin: 0,
                        wordBreak: 'keep-all',
                        overflowWrap: 'break-word',
                        lineHeight: '1.4',
                        width: '100%',
                        display: 'block',
                        textAlign: 'center',
                      }
                    : { textAlign: 'center', margin: 0 }
                }
              >
                {subGoal.title}
              </p>
            )}
          </div>
        )
      }
    }

    // Outer sections (positions 1-8)
    const subGoal = getSubGoalByPosition(sectionPos)
    if (!subGoal || !subGoal.title) {
      // Empty sub-goal section: center blue + surrounding white (for handwriting)
      if (cellPos === 4) {
        // Center: blue background (same as filled sub-goal center)
        return (
          <div
            className={`${
              forDownload ? 'grid place-items-center' : 'flex flex-col items-center justify-center'
            } h-full min-h-full ${
              forDownload ? 'p-2' : forMobile ? 'p-2' : 'p-2.5'
            } bg-blue-50 ${
              !forDownload ? 'border border-blue-200' : ''
            }`}
          />
        )
      } else {
        // Surrounding cells: white background (for handwriting)
        return (
          <div
            className={`${
              forDownload ? 'grid place-items-center' : 'flex flex-col items-center justify-center'
            } h-full min-h-full ${
              forDownload ? 'p-2' : forMobile ? 'p-2' : 'p-2.5'
            } bg-white`}
          />
        )
      }
    }

    if (cellPos === 4) {
      // Center of section: Sub-goal title
      return (
        <div
          className={`${
            forDownload ? 'grid place-items-center' : 'flex flex-col items-center justify-center'
          } h-full min-h-full ${
            forDownload ? 'p-2' : forMobile ? 'p-2' : 'p-2.5'
          } bg-blue-50 ${
            !forDownload ? 'border border-blue-200' : ''
          }`}
        >
          <p
            className={`${
              forDownload ? 'text-5xl' : forMobile ? 'text-base' : 'text-lg'
            } font-semibold ${!forDownload ? 'line-clamp-4' : ''} text-center`}
            style={
              forDownload
                ? {
                    margin: 0,
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    lineHeight: '1.4',
                    width: '100%',
                    display: 'block',
                    textAlign: 'center',
                  }
                : { textAlign: 'center', margin: 0 }
            }
          >
            {subGoal.title}
          </p>
        </div>
      )
    } else {
      // Surrounding cells: Actions
      const actionIndex = cellPos < 4 ? cellPos : cellPos - 1
      const action = subGoal.actions[actionIndex]

      if (!action || !action.title) {
        return (
          <div
            className={`${
              forDownload ? 'grid place-items-center' : 'flex flex-col items-center justify-center'
            } h-full min-h-full ${
              forDownload ? 'p-2' : forMobile ? 'p-2' : 'p-2.5'
            } bg-white`}
          />
        )
      }

      return (
        <div
          className={`${
            forDownload ? 'grid place-items-center' : 'flex flex-col items-center justify-center'
          } h-full min-h-full ${
            forDownload ? 'p-2' : forMobile ? 'p-2' : 'p-2.5'
          } bg-white ${
            !forDownload ? 'hover:bg-gray-50 transition-colors' : ''
          }`}
        >
          <p
            className={`${
              forDownload ? 'text-4xl' : forMobile ? 'text-sm' : 'text-base'
            } ${forDownload ? '' : 'leading-tight'} ${
              !forDownload ? 'line-clamp-4' : ''
            } text-center`}
            style={
              forDownload
                ? {
                    margin: 0,
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    lineHeight: '1.4',
                    width: '100%',
                    display: 'block',
                    textAlign: 'center',
                  }
                : { textAlign: 'center', margin: 0 }
            }
          >
            {action.title}
          </p>
        </div>
      )
    }
  }

  // Render a 3x3 section
  const renderSection = (sectionPos: number) => {
    const isCenter = sectionPos === 0

    return (
      <div
        key={sectionPos}
        className={`
          grid grid-cols-3 grid-rows-3 ${
            forDownload ? '' : 'gap-px bg-gray-300'
          } rounded
          ${forDownload ? 'aspect-square' : ''}
          ${
            !forDownload && !isCenter && !readonly && onSectionClick
              ? 'cursor-pointer hover:ring-2 hover:ring-primary/50'
              : ''
          }
          ${!forDownload ? 'transition-all' : ''}
        `}
        style={forDownload ? { gap: 0 } : undefined}
        onClick={
          !forDownload && !readonly && !isCenter && onSectionClick
            ? () => onSectionClick(sectionPos)
            : undefined
        }
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cellPos) => (
          <div
            key={cellPos}
            className={`bg-white aspect-square ${
              forDownload ? 'border border-gray-300' : ''
            }`}
          >
            {renderCell(sectionPos, cellPos)}
          </div>
        ))}
      </div>
    )
  }

  // Section position mapping for 3x3 layout of sections
  const sectionPositions = [1, 2, 3, 4, 0, 5, 6, 7, 8]

  return (
    <div
      className={`grid grid-cols-3 ${forDownload ? '' : 'gap-4'}`}
      style={forDownload ? { gap: 0 } : undefined}
    >
      {sectionPositions.map((sectionPos) => renderSection(sectionPos))}
    </div>
  )
}

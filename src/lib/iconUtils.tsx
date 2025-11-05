import { Repeat, Target, Lightbulb } from 'lucide-react'

/**
 * Get icon component for action type
 * Centralized icon utility to maintain consistency across the app
 */
export const getTypeIcon = (type: string, size: number = 16) => {
  const className = `w-${Math.floor(size / 4)} h-${Math.floor(size / 4)}`

  switch (type) {
    case 'routine':
      return <Repeat className={`${className} text-blue-500`} />
    case 'mission':
      return <Target className={`${className} text-green-500`} />
    case 'reference':
      return <Lightbulb className={`${className} text-amber-500`} />
    default:
      return null
  }
}

/**
 * Get icon color for action type
 */
export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'routine':
      return 'text-blue-500'
    case 'mission':
      return 'text-green-500'
    case 'reference':
      return 'text-amber-500'
    default:
      return 'text-gray-400'
  }
}

/**
 * Get background color for action type
 */
export const getTypeBgColor = (type: string): string => {
  switch (type) {
    case 'routine':
      return 'bg-blue-50'
    case 'mission':
      return 'bg-green-50'
    case 'reference':
      return 'bg-amber-50'
    default:
      return 'bg-gray-50'
  }
}

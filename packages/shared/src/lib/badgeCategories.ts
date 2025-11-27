/**
 * Badge System v5.0 - Narrative Category System
 * Organizes badges by emotional journey themes instead of technical categories
 *
 * Shared between web and mobile apps
 */

export interface BadgeCategory {
  key: string
  icon: string
  title: string
  subtitle: string
  description: string
}

export const BADGE_CATEGORIES: BadgeCategory[] = [
  {
    key: 'first_steps',
    icon: '🌱',
    title: '시작의 용기',
    subtitle: 'First Steps',
    description: '천 리 길도 한 걸음부터'
  },
  {
    key: 'streak',
    icon: '🔥',
    title: '시간의 여정',
    subtitle: 'The Journey of Time',
    description: '3일의 시작에서 150일의 마스터까지'
  },
  {
    key: 'volume',
    icon: '💯',
    title: '반복의 미학',
    subtitle: 'The Art of Repetition',
    description: '첫 50회에서 5000회까지의 여정'
  },
  {
    key: 'achievement',
    icon: '⭐',
    title: '특별한 순간',
    subtitle: 'Special Moments',
    description: '오늘의 완성과 성장의 나무'
  },
  {
    key: 'monthly',
    icon: '🏆',
    title: '매달의 도전',
    subtitle: 'Monthly Challenge',
    description: '매달 새로운 도전, 반복되는 성취'
  },
  {
    key: 'secret',
    icon: '🌙',
    title: '숨겨진 이야기',
    subtitle: 'Hidden Stories',
    description: '예상치 못한 순간의 발견'
  }
]

/**
 * Categorize badges by narrative themes (v5.0)
 * Generic function that works with any badge type that has 'key' property
 */
export function categorizeBadges<T extends { id: string; key?: string }>(badges: T[]): Array<BadgeCategory & { badges: T[] }> {
  const result: Array<BadgeCategory & { badges: T[] }> = []

  for (const category of BADGE_CATEGORIES) {
    let categoryBadges: T[] = []

    switch (category.key) {
      case 'streak':
        categoryBadges = badges.filter(b => b.key?.startsWith('streak_'))
        break
      case 'volume':
        categoryBadges = badges.filter(b => b.key?.startsWith('checks_'))
        break
      case 'monthly':
        categoryBadges = badges.filter(b => b.key?.startsWith('monthly_'))
        break
      case 'secret':
        categoryBadges = badges.filter(b =>
          ['midnight_warrior', 'mandalart_rainbow', 'night_owl'].includes(b.key || '')
        )
        break
      case 'achievement':
        categoryBadges = badges.filter(b =>
          ['perfect_day', 'level_10'].includes(b.key || '')
        )
        break
      case 'first_steps':
        categoryBadges = badges.filter(b =>
          ['first_check', 'first_mandalart'].includes(b.key || '')
        )
        break
    }

    if (categoryBadges.length > 0) {
      result.push({
        ...category,
        badges: categoryBadges
      })
    }
  }

  return result
}

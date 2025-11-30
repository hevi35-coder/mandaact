/**
 * PostHog Analytics - Shared Event Types
 * 
 * Web과 Mobile에서 공통으로 사용하는 이벤트 타입 및 헬퍼 함수
 */

// ========================================
// 이벤트 데이터 타입 정의
// ========================================

export interface MandalartCreatedData {
    mandalart_id: string
    input_method: 'image' | 'text' | 'manual'
    sub_goals_count: number
    actions_count: number
}

export interface ActionCheckedData {
    action_id: string
    action_type: 'routine' | 'mission' | 'reference'
    sub_goal_id: string
    mandalart_id: string
    checked_at: Date
}

export interface BadgeUnlockedData {
    badge_id: string
    badge_title: string
    badge_category: string
    xp_reward: number
    current_level: number
}

export interface TutorialCompletedData {
    completed_steps: number
    total_steps: number
    time_spent_seconds?: number
    skipped: boolean
}

export interface NotificationClickedData {
    notification_type: string
    source: 'pwa_push' | 'push' | 'in_app'
}

export interface LevelUpData {
    old_level: number
    new_level: number
    total_xp: number
}

export interface WeeklyReportGeneratedData {
    week_start: string
    completion_rate?: number
    total_checks?: number
    generated?: boolean
}

export interface GoalDiagnosisViewedData {
    mandalart_id: string
    diagnosis_type?: 'SMART' | 'general'
    generated?: boolean
}

export interface LoginData {
    method: 'email' | 'google' | 'apple'
}

// ========================================
// 이벤트 이름 상수
// ========================================

export const POSTHOG_EVENTS = {
    MANDALART_CREATED: 'mandalart_created',
    ACTION_CHECKED: 'action_checked',
    BADGE_UNLOCKED: 'badge_unlocked',
    TUTORIAL_COMPLETED: 'tutorial_completed',
    NOTIFICATION_CLICKED: 'notification_clicked',
    LEVEL_UP: 'level_up',
    WEEKLY_REPORT_GENERATED: 'weekly_report_generated',
    GOAL_DIAGNOSIS_VIEWED: 'goal_diagnosis_viewed',
    APP_OPENED: 'app_opened',
    USER_LOGGED_IN: 'user_logged_in',
    USER_SIGNED_UP: 'user_signed_up',
    PAGEVIEW: '$pageview',
} as const

// ========================================
// 이벤트 속성 빌더 함수
// ========================================

/**
 * 만다라트 생성 이벤트 속성
 */
export function buildMandalartCreatedProps(
    data: MandalartCreatedData,
    platform: 'web' | 'mobile'
) {
    return {
        mandalart_id: data.mandalart_id,
        input_method: data.input_method,
        sub_goals_count: data.sub_goals_count,
        actions_count: data.actions_count,
        platform,
        timestamp: new Date().toISOString(),
    }
}

/**
 * 액션 체크 이벤트 속성
 */
export function buildActionCheckedProps(
    data: ActionCheckedData,
    platform: 'web' | 'mobile'
) {
    return {
        action_id: data.action_id,
        action_type: data.action_type,
        sub_goal_id: data.sub_goal_id,
        mandalart_id: data.mandalart_id,
        hour: data.checked_at.getHours(),
        day_of_week: data.checked_at.getDay(),
        platform,
        timestamp: data.checked_at.toISOString(),
    }
}

/**
 * 배지 획득 이벤트 속성
 */
export function buildBadgeUnlockedProps(
    data: BadgeUnlockedData,
    platform: 'web' | 'mobile'
) {
    return {
        badge_id: data.badge_id,
        badge_title: data.badge_title,
        badge_category: data.badge_category,
        xp_reward: data.xp_reward,
        current_level: data.current_level,
        platform,
        timestamp: new Date().toISOString(),
    }
}

/**
 * 튜토리얼 완료 이벤트 속성
 */
export function buildTutorialCompletedProps(
    data: TutorialCompletedData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean> = {
        completed_steps: data.completed_steps,
        total_steps: data.total_steps,
        skipped: data.skipped,
        completion_rate: (data.completed_steps / data.total_steps) * 100,
        platform,
        timestamp: new Date().toISOString(),
    }

    // Include time_spent_seconds only if it's defined
    if (data.time_spent_seconds !== undefined) {
        props.time_spent_seconds = data.time_spent_seconds
    }

    return props
}

/**
 * 알림 클릭 이벤트 속성
 */
export function buildNotificationClickedProps(
    data: NotificationClickedData,
    platform: 'web' | 'mobile'
) {
    return {
        notification_type: data.notification_type,
        source: data.source,
        platform,
        timestamp: new Date().toISOString(),
    }
}

/**
 * 레벨 업 이벤트 속성
 */
export function buildLevelUpProps(
    data: LevelUpData,
    platform: 'web' | 'mobile'
) {
    return {
        old_level: data.old_level,
        new_level: data.new_level,
        total_xp: data.total_xp,
        platform,
        timestamp: new Date().toISOString(),
    }
}

/**
 * 주간 리포트 생성 이벤트 속성
 */
export function buildWeeklyReportGeneratedProps(
    data: WeeklyReportGeneratedData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean> = {
        week_start: data.week_start,
        platform,
        timestamp: new Date().toISOString(),
    }

    // Include optional fields only if they're defined
    if (data.completion_rate !== undefined) {
        props.completion_rate = data.completion_rate
    }
    if (data.total_checks !== undefined) {
        props.total_checks = data.total_checks
    }
    if (data.generated !== undefined) {
        props.generated = data.generated
    }

    return props
}

/**
 * 목표 진단 조회 이벤트 속성
 */
export function buildGoalDiagnosisViewedProps(
    data: GoalDiagnosisViewedData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean> = {
        mandalart_id: data.mandalart_id,
        platform,
        timestamp: new Date().toISOString(),
    }

    // Include optional fields only if they're defined
    if (data.diagnosis_type !== undefined) {
        props.diagnosis_type = data.diagnosis_type
    }
    if (data.generated !== undefined) {
        props.generated = data.generated
    }

    return props
}

/**
 * 로그인 이벤트 속성
 */
export function buildLoginProps(
    data: LoginData,
    platform: 'web' | 'mobile'
) {
    return {
        method: data.method,
        platform,
        timestamp: new Date().toISOString(),
    }
}

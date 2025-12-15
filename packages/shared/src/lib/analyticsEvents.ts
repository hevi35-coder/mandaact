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
// Monetization event data types
// ========================================

export interface PaywallViewedData {
    source_screen: string
}

export interface PurchaseStartedData {
    product_id: string
    package_id?: string
    price?: number
    currency?: string
}

export interface PurchaseResultData {
    product_id: string
    plan?: 'monthly' | 'yearly' | null
    is_sandbox?: boolean
    price?: number
    currency?: string
    error_code?: string
}

export interface RestoreResultData {
    trigger: 'manual' | 'auto'
    is_sandbox?: boolean
    restored?: boolean
    error_code?: string
}

export interface PremiumStateChangedData {
    from: 'free' | 'premium' | 'loading'
    to: 'free' | 'premium'
    reason:
        | 'rc_entitlement'
        | 'rc_active_subscription_fallback'
        | 'supabase_fallback'
        | 'restore_manual'
        | 'restore_auto'
    plan?: 'monthly' | 'yearly' | null
    is_sandbox?: boolean
}

export type AdFormat = 'banner' | 'interstitial' | 'rewarded'

export interface AdEventBaseData {
    ad_format: AdFormat
    placement: string
    ad_unit_id?: string
}

export interface AdRevenueData extends AdEventBaseData {
    revenue_micros?: number
    currency?: string
    precision?: string
}

export interface AdFailedData extends AdEventBaseData {
    error_code?: string
}

export interface RewardEarnedData extends AdEventBaseData {
    reward_type: string
    reward_amount: number
}

// ========================================
// Type suggestion event data types
// ========================================

export interface ActionTypeSuggestedData {
    source_screen: string
    input_language: 'en' | 'ko'
    suggested_type: 'routine' | 'mission' | 'reference'
    confidence: 'high' | 'medium' | 'low'
    reason_code: string
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
    ACTION_TYPE_SUGGESTED: 'action_type_suggested',
    APP_OPENED: 'app_opened',
    USER_LOGGED_IN: 'user_logged_in',
    USER_SIGNED_UP: 'user_signed_up',
    PAYWALL_VIEWED: 'paywall_viewed',
    PURCHASE_STARTED: 'purchase_started',
    PURCHASE_SUCCESS: 'purchase_success',
    PURCHASE_FAILED: 'purchase_failed',
    PURCHASE_RESTORE_STARTED: 'purchase_restore_started',
    PURCHASE_RESTORE_SUCCESS: 'purchase_restore_success',
    PURCHASE_RESTORE_FAILED: 'purchase_restore_failed',
    PREMIUM_STATE_CHANGED: 'premium_state_changed',
    AD_IMPRESSION: 'ad_impression',
    AD_CLICKED: 'ad_clicked',
    AD_REVENUE: 'ad_revenue',
    AD_FAILED: 'ad_failed',
    REWARD_EARNED: 'reward_earned',
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
 * 액션 타입 추천 이벤트 속성
 */
export function buildActionTypeSuggestedProps(
    data: ActionTypeSuggestedData,
    platform: 'web' | 'mobile'
) {
    return {
        source_screen: data.source_screen,
        input_language: data.input_language,
        suggested_type: data.suggested_type,
        confidence: data.confidence,
        reason_code: data.reason_code,
        platform,
        timestamp: new Date().toISOString(),
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

export function buildPaywallViewedProps(
    data: PaywallViewedData,
    platform: 'web' | 'mobile'
) {
    return {
        source_screen: data.source_screen,
        platform,
        timestamp: new Date().toISOString(),
    }
}

export function buildPurchaseStartedProps(
    data: PurchaseStartedData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean | null> = {
        product_id: data.product_id,
        platform,
        timestamp: new Date().toISOString(),
    }

    if (data.package_id !== undefined) props.package_id = data.package_id
    if (data.price !== undefined) props.price = data.price
    if (data.currency !== undefined) props.currency = data.currency

    return props
}

export function buildPurchaseResultProps(
    data: PurchaseResultData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean | null> = {
        product_id: data.product_id,
        plan: data.plan ?? null,
        platform,
        timestamp: new Date().toISOString(),
    }

    if (data.is_sandbox !== undefined) props.is_sandbox = data.is_sandbox
    if (data.price !== undefined) props.price = data.price
    if (data.currency !== undefined) props.currency = data.currency
    if (data.error_code !== undefined) props.error_code = data.error_code

    return props
}

export function buildRestoreResultProps(
    data: RestoreResultData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean | null> = {
        trigger: data.trigger,
        platform,
        timestamp: new Date().toISOString(),
    }

    if (data.restored !== undefined) props.restored = data.restored
    if (data.is_sandbox !== undefined) props.is_sandbox = data.is_sandbox
    if (data.error_code !== undefined) props.error_code = data.error_code

    return props
}

export function buildPremiumStateChangedProps(
    data: PremiumStateChangedData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean | null> = {
        from: data.from,
        to: data.to,
        reason: data.reason,
        plan: data.plan ?? null,
        platform,
        timestamp: new Date().toISOString(),
    }

    if (data.is_sandbox !== undefined) props.is_sandbox = data.is_sandbox

    return props
}

export function buildAdEventBaseProps(
    data: AdEventBaseData,
    platform: 'web' | 'mobile'
) {
    const props: Record<string, string | number | boolean | null> = {
        ad_format: data.ad_format,
        placement: data.placement,
        platform,
        timestamp: new Date().toISOString(),
    }

    if (data.ad_unit_id !== undefined) props.ad_unit_id = data.ad_unit_id

    return props
}

export function buildAdRevenueProps(
    data: AdRevenueData,
    platform: 'web' | 'mobile'
) {
    const props = buildAdEventBaseProps(data, platform) as Record<string, string | number | boolean | null>
    if (data.revenue_micros !== undefined) props.revenue_micros = data.revenue_micros
    if (data.currency !== undefined) props.currency = data.currency
    if (data.precision !== undefined) props.precision = data.precision
    return props
}

export function buildAdFailedProps(
    data: AdFailedData,
    platform: 'web' | 'mobile'
) {
    const props = buildAdEventBaseProps(data, platform) as Record<string, string | number | boolean | null>
    if (data.error_code !== undefined) props.error_code = data.error_code
    return props
}

export function buildRewardEarnedProps(
    data: RewardEarnedData,
    platform: 'web' | 'mobile'
) {
    return {
        ...buildAdEventBaseProps(data, platform),
        reward_type: data.reward_type,
        reward_amount: data.reward_amount,
    } as Record<string, string | number | boolean | null>
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

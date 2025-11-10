/**
 * Centralized notification messages for consistent UX
 *
 * Design principles:
 * - Emojis: ✅ success, ❌ error, ⚠️ warning, ℹ️ info, 🎉 celebration
 * - Tone: Polite Korean (~습니다, ~해주세요)
 * - Punctuation: Period for all except celebrations (!)
 * - Duration: 3s general, 5s important/celebration
 */

export type NotificationVariant = 'default' | 'destructive'

export interface NotificationMessage {
  title: string
  description: string
  variant?: NotificationVariant
  duration?: number
}

// Validation messages
export const VALIDATION_MESSAGES = {
  emptyField: (fieldName: string): NotificationMessage => ({
    title: 'ℹ️ 입력 필요',
    description: `${fieldName}을(를) 입력해주세요.`,
    variant: 'destructive',
    duration: 3000,
  }),
  emptyTitle: (): NotificationMessage => ({
    title: 'ℹ️ 입력 필요',
    description: '제목을 입력해주세요.',
    variant: 'destructive',
    duration: 3000,
  }),
  emptyCenterGoal: (): NotificationMessage => ({
    title: 'ℹ️ 입력 필요',
    description: '핵심목표를 입력해주세요.',
    variant: 'destructive',
    duration: 3000,
  }),
  emptySubGoalTitle: (): NotificationMessage => ({
    title: 'ℹ️ 입력 필요',
    description: '세부목표 제목을 입력해주세요.',
    variant: 'destructive',
    duration: 3000,
  }),
  emptyActionTitle: (): NotificationMessage => ({
    title: 'ℹ️ 입력 필요',
    description: '실천항목 제목을 입력해주세요.',
    variant: 'destructive',
    duration: 3000,
  }),
  maxActionsReached: (): NotificationMessage => ({
    title: '⚠️ 최대 개수 도달',
    description: '실천항목은 최대 8개까지 추가할 수 있습니다.',
    variant: 'destructive',
    duration: 3000,
  }),
  invalidNumber: (min: number, max: number): NotificationMessage => ({
    title: '⚠️ 잘못된 입력',
    description: `${min}~${max} 사이의 숫자를 입력해주세요.`,
    variant: 'destructive',
    duration: 3000,
  }),
  emptyBothFields: (): NotificationMessage => ({
    title: 'ℹ️ 입력 필요',
    description: '만다라트 제목과 핵심목표를 모두 입력해주세요.',
    variant: 'destructive',
    duration: 3000,
  }),
  noData: (): NotificationMessage => ({
    title: '❌ 데이터 없음',
    description: '만다라트 정보가 없습니다.',
    variant: 'destructive',
    duration: 3000,
  }),
}

// Success messages
export const SUCCESS_MESSAGES = {
  saved: (): NotificationMessage => ({
    title: '✅ 저장 완료',
    description: '변경사항이 저장되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  updated: (): NotificationMessage => ({
    title: '✅ 업데이트 완료',
    description: '정보가 업데이트되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  deleted: (): NotificationMessage => ({
    title: '✅ 삭제 완료',
    description: '항목이 삭제되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  created: (): NotificationMessage => ({
    title: '✅ 생성 완료',
    description: '새 항목이 생성되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  settingsSaved: (): NotificationMessage => ({
    title: '✅ 저장 완료',
    description: '설정이 저장되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  deactivated: (): NotificationMessage => ({
    title: '✅ 비활성화 완료',
    description: '만다라트가 비활성화되었습니다. 언제든지 다시 활성화할 수 있습니다.',
    variant: 'default',
    duration: 3000,
  }),
  permanentlyDeleted: (): NotificationMessage => ({
    title: '✅ 영구 삭제 완료',
    description: '만다라트와 모든 관련 데이터가 삭제되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  typeUpdated: (): NotificationMessage => ({
    title: '✅ 타입 변경',
    description: '실천항목 타입이 업데이트되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  nicknameUpdated: (): NotificationMessage => ({
    title: '✅ 닉네임 변경',
    description: '닉네임이 업데이트되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
}

// Error messages
export const ERROR_MESSAGES = {
  saveFailed: (): NotificationMessage => ({
    title: '❌ 저장 실패',
    description: '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  updateFailed: (): NotificationMessage => ({
    title: '❌ 업데이트 실패',
    description: '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  deleteFailed: (): NotificationMessage => ({
    title: '❌ 삭제 실패',
    description: '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  createFailed: (): NotificationMessage => ({
    title: '❌ 생성 실패',
    description: '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  checkToggleFailed: (): NotificationMessage => ({
    title: '❌ 체크 실패',
    description: '체크 상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  activateToggleFailed: (): NotificationMessage => ({
    title: '❌ 활성화 실패',
    description: '활성화 상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  titleSaveFailed: (): NotificationMessage => ({
    title: '❌ 제목 저장 실패',
    description: '제목 저장 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  centerGoalSaveFailed: (): NotificationMessage => ({
    title: '❌ 핵심목표 저장 실패',
    description: '핵심목표 저장 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  subGoalCreateFailed: (): NotificationMessage => ({
    title: '❌ 세부목표 생성 실패',
    description: '세부목표 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  subGoalSaveFailed: (): NotificationMessage => ({
    title: '❌ 세부목표 저장 실패',
    description: '세부목표 저장 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  actionUpdateFailed: (): NotificationMessage => ({
    title: '❌ 실천항목 수정 실패',
    description: '실천항목 수정 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  actionDeleteFailed: (): NotificationMessage => ({
    title: '❌ 실천항목 삭제 실패',
    description: '실천항목 삭제 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  actionAddFailed: (): NotificationMessage => ({
    title: '❌ 실천항목 추가 실패',
    description: '실천항목 추가 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  reorderFailed: (): NotificationMessage => ({
    title: '❌ 순서 변경 실패',
    description: '순서 재정렬 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  typeUpdateFailed: (): NotificationMessage => ({
    title: '❌ 타입 변경 실패',
    description: '타입 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
  deactivateFailed: (): NotificationMessage => ({
    title: '❌ 비활성화 실패',
    description: '비활성화 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
}

// Achievement/Celebration messages
export const ACHIEVEMENT_MESSAGES = {
  perfectDay: (xpAwarded: number): NotificationMessage => ({
    title: '🎉 완벽한 하루!',
    description: `모든 실천을 완료했습니다! (+${xpAwarded} XP)`,
    variant: 'default',
    duration: 5000,
  }),
  badgeUnlocked: (badgeTitle: string, xpAwarded: number): NotificationMessage => ({
    title: '🎉 새로운 배지 획득!',
    description: `${badgeTitle} (+${xpAwarded} XP)`,
    variant: 'default',
    duration: 5000,
  }),
}

// Notification permission messages
export const PERMISSION_MESSAGES = {
  granted: (): NotificationMessage => ({
    title: '✅ 권한 허용',
    description: '알림을 받으실 수 있습니다.',
    variant: 'default',
    duration: 3000,
  }),
  denied: (): NotificationMessage => ({
    title: '❌ 권한 거부',
    description: '알림 권한이 거부되었습니다. 브라우저 설정에서 변경하실 수 있습니다.',
    variant: 'destructive',
    duration: 5000,
  }),
  required: (): NotificationMessage => ({
    title: '⚠️ 알림 권한 필요',
    description: '먼저 알림 권한을 허용해주세요.',
    variant: 'destructive',
    duration: 3000,
  }),
  testSent: (): NotificationMessage => ({
    title: '✅ 테스트 전송',
    description: '테스트 알림이 전송되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
  testFailed: (error: string): NotificationMessage => ({
    title: '❌ 전송 실패',
    description: `테스트 알림 전송 실패: ${error}`,
    variant: 'destructive',
    duration: 5000,
  }),
}

// Download messages
export const DOWNLOAD_MESSAGES = {
  processing: (): NotificationMessage => ({
    title: 'ℹ️ 이미지 생성 중',
    description: '잠시만 기다려주세요.',
    variant: 'default',
    duration: 3000,
  }),
  success: (): NotificationMessage => ({
    title: '✅ 다운로드 완료!',
    description: '고해상도 이미지 (3840×3840px) • 화면 & 인쇄용',
    variant: 'default',
    duration: 3000,
  }),
  failed: (): NotificationMessage => ({
    title: '❌ 다운로드 실패',
    description: '이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
    variant: 'destructive',
    duration: 5000,
  }),
}

// Deletion messages
export const DELETION_MESSAGES = {
  cancelled: (): NotificationMessage => ({
    title: '⚠️ 취소됨',
    description: '"비활성화" 또는 "영구 삭제"를 정확히 입력해주세요.',
    variant: 'destructive',
    duration: 3000,
  }),
}

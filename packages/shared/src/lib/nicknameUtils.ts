/**
 * Nickname validation utilities
 * Shared between web and mobile apps
 */

export interface NicknameValidationResult {
  isValid: boolean
  error: string | null
}

/**
 * Validate nickname format
 * Rules:
 * - 2-12 characters
 * - Korean, English, numbers only
 */
export function validateNickname(nickname: string): NicknameValidationResult {
  if (nickname.length < 2) {
    return { isValid: false, error: '닉네임은 최소 2자 이상이어야 합니다' }
  }
  if (nickname.length > 12) {
    return { isValid: false, error: '닉네임은 최대 12자까지 가능합니다' }
  }
  if (!/^[가-힣a-zA-Z0-9]+$/.test(nickname)) {
    return { isValid: false, error: '닉네임은 한글, 영문, 숫자만 사용 가능합니다' }
  }
  return { isValid: true, error: null }
}

/**
 * Nickname validation error messages
 */
export const NICKNAME_ERRORS = {
  TOO_SHORT: '닉네임은 최소 2자 이상이어야 합니다',
  TOO_LONG: '닉네임은 최대 12자까지 가능합니다',
  INVALID_CHARS: '닉네임은 한글, 영문, 숫자만 사용 가능합니다',
  ALREADY_TAKEN: '이미 사용 중인 닉네임입니다',
  SAVE_ERROR: '닉네임 저장 중 오류가 발생했습니다',
  UPDATE_ERROR: '닉네임 변경 중 오류가 발생했습니다',
} as const

/**
 * Nickname dialog text constants
 */
export const NICKNAME_DIALOG = {
  TITLE: '닉네임 변경',
  DESCRIPTION: '새로운 닉네임을 입력해주세요 (2~12자, 한글/영문/숫자)',
  LABEL: '닉네임',
  PLACEHOLDER: '2~12자 (한글/영문/숫자)',
  SAVE: '저장',
  SAVING: '저장 중...',
  CANCEL: '취소',
} as const

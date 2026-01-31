/**
 * Nickname validation utilities
 * Shared between web and mobile apps
 */

export interface NicknameValidationResult {
  isValid: boolean
  error: string | null
  errorCode?: keyof typeof NICKNAME_ERRORS
}

/**
 * Validate nickname format
 * Rules:
 * - 2-12 characters
 * - Emojis and special characters allowed
 */
export function validateNickname(nickname: string): NicknameValidationResult {
  if (!nickname || nickname.trim().length === 0) {
    return { isValid: false, error: 'Nickname is required.', errorCode: 'TOO_SHORT' }
  }

  // Count characters (Note: Some emojis are 2 chars in length, which is acceptable for limit)
  if (nickname.length < 2) {
    return { isValid: false, error: 'Nickname must be at least 2 characters.', errorCode: 'TOO_SHORT' }
  }
  if (nickname.length > 20) {
    return { isValid: false, error: 'Nickname can be up to 20 characters.', errorCode: 'TOO_LONG' }
  }

  // Allowed all characters
  return { isValid: true, error: null }
}

/**
 * Nickname validation error messages
 */
export const NICKNAME_ERRORS = {
  TOO_SHORT: 'home.nickname.errors.tooShort',
  TOO_LONG: 'home.nickname.errors.tooLong',
  INVALID_CHARS: 'home.nickname.errors.invalidChars', // Reused for restricted words
  ALREADY_TAKEN: 'home.nickname.errors.alreadyTaken',
  SAVE_ERROR: 'home.nickname.errors.saveError',
  UPDATE_ERROR: 'home.nickname.errors.updateError',
} as const

/**
 * Nickname dialog text constants
 */
export const NICKNAME_DIALOG = {
  TITLE: 'home.nickname.title',
  DESCRIPTION: 'home.nickname.description',
  LABEL: 'home.nickname.label',
  PLACEHOLDER: 'home.nickname.placeholder',
  SAVE: 'home.nickname.save',
  SAVING: 'home.nickname.saving',
  CANCEL: 'home.nickname.cancel',
} as const

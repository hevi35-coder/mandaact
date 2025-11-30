import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

import ko from './locales/ko.json'
import en from './locales/en.json'

const LANGUAGE_KEY = '@app_language'

export const resources = {
  ko: { translation: ko },
  en: { translation: en },
}

export const supportedLanguages = [
  { code: 'ko', name: '한국어', nativeName: '한국어' },
  { code: 'en', name: 'English', nativeName: 'English' },
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]['code']

// Get device locale
const getDeviceLocale = (): SupportedLanguage => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'ko'
  // Check if device locale is supported, otherwise fallback to Korean
  if (deviceLocale === 'en' || deviceLocale === 'ko') {
    return deviceLocale
  }
  return 'ko'
}

// Initialize i18n
const initI18n = async () => {
  // Try to get saved language preference
  let savedLanguage: string | null = null
  try {
    savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY)
  } catch (error) {
    console.warn('Failed to get saved language:', error)
  }

  const initialLanguage = savedLanguage || getDeviceLocale()

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

  return i18n
}

// Change language and persist preference
export const changeLanguage = async (language: SupportedLanguage) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language)
    await i18n.changeLanguage(language)
  } catch (error) {
    console.error('Failed to change language:', error)
  }
}

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || 'ko'
}

export { initI18n }
export default i18n

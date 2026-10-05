/** vue-i18n setup: locale persisted in localStorage, default 'en'. */
import { createI18n } from 'vue-i18n'

import en from './en'
import es from './es'

export type Locale = 'en' | 'es'

const STORAGE_KEY = 'mvp_locale'

function resolveInitialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'es') return saved
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, es },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.setAttribute('lang', locale)
}

export default i18n

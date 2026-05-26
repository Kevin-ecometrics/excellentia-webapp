'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Locale, type TranslationKey } from '@/app/lib/i18n'

const LangContext = createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}>({ locale: 'en', setLocale: () => {}, t: key => translations.en[key] })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved === 'es' || saved === 'en') setLocaleState(saved)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }

  const t = (key: TranslationKey) => translations[locale][key]

  return <LangContext.Provider value={{ locale, setLocale, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

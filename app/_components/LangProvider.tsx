'use client'

import { createContext, useContext } from 'react'
import { translations, type TranslationKey } from '@/app/lib/i18n'

const LangContext = createContext<{
  t: (key: TranslationKey) => string
}>({ t: key => translations.en[key] })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const t = (key: TranslationKey) => translations.en[key]

  return <LangContext.Provider value={{ t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

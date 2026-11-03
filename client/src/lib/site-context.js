import { createContext, useContext } from 'react'

export const SiteContext = createContext({ studio: null, portfolio: null, loading: true, error: null })

export const useSite = () => useContext(SiteContext)

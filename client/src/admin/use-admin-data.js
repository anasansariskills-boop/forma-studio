import { useCallback, useEffect, useRef, useState } from 'react'
import { useApi } from '../lib/hooks.js'
import { runAdmin } from './admin-api.js'
import { useAdminAuth } from './auth.jsx'

/**
 * useApi, but a 401 from any admin GET (expired / forged token) transparently
 * bounces the whole app back to the login screen instead of stranding the
 * page on an error state.
 */
export function useAdminData(loader, deps = []) {
  const { forcedLogout } = useAdminAuth()
  const state = useApi(loader, deps)
  const bounced = useRef(false)

  useEffect(() => {
    if (state.error?.status === 401 && !bounced.current) {
      bounced.current = true
      forcedLogout()
    }
  }, [state.error, forcedLogout])

  return state
}

/**
 * Mutation helper for writes. Tracks a single in-flight flag, normalises the
 * thrown value to an ApiError, and forces logout on 401. Returns
 * `{ ok, data, error }` so callers branch without try/catch noise.
 */
export function useAdminMutation() {
  const { forcedLogout } = useAdminAuth()
  const [pending, setPending] = useState(false)

  const execute = useCallback(
    async (mutation) => {
      setPending(true)
      const result = await runAdmin(mutation, { onUnauthorized: forcedLogout })
      setPending(false)
      return result
    },
    [forcedLogout],
  )

  return { execute, pending }
}

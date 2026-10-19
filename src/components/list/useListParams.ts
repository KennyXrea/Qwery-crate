import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  isSameListParams,
  parseListParams,
  serializeListParams,
  updateListParams,
  type ListParams,
} from './list-params'

export type UpdateListParams = (
  patch: Partial<ListParams>,
  options?: {
    /** Replace the current history entry instead of adding one (e.g. while refining a search). */
    replace?: boolean
  },
) => void

/**
 * The list page's state from the URL, and a function to change it. Every change is a normal
 * navigation (so Back / Forward step through it) that keeps the scroll position; changing a
 * filter goes back to page 1 (see updateListParams). A change that leaves the URL as it is does
 * nothing, so no duplicate history entries pile up.
 */
export function useListParams(): { params: ListParams; update: UpdateListParams } {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseListParams(searchParams), [searchParams])

  const update = useCallback<UpdateListParams>(
    (patch, { replace = false } = {}) => {
      const next = updateListParams(params, patch)
      if (isSameListParams(next, params)) return
      setSearchParams(serializeListParams(next), { replace, preventScrollReset: true })
    },
    [params, setSearchParams],
  )

  return { params, update }
}

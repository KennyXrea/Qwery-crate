import { useEffect, useEffectEvent, useState } from 'react'
import type { FormEvent } from 'react'
import { MAX_SEARCH_LENGTH } from '../../lib/search'
import { IconSearch } from '../ui/icons'
import { Input } from '../ui/Input'
import { SEARCH_DEBOUNCE_MS, tidySearchText } from './list-params'

type ListSearchBoxProps = {
  /** The search text in the URL. */
  value: string
  /** Called with the tidied text 300ms after typing stops (or at once on Enter). */
  onCommit: (q: string) => void
  className?: string
}

/**
 * The list's search box. What you type shows at once; the URL (and so the list) follows
 * SEARCH_DEBOUNCE_MS after the last key press, or straight away on Enter. When the URL changes
 * some other way (Back / Forward, a shared link, "Clear filters"), the box shows its text.
 */
export function ListSearchBox({ value, onCommit, className }: ListSearchBoxProps) {
  const [draft, setDraft] = useState(value)
  // The URL value this box last caught up with, and the text it last sent itself.
  const [seenValue, setSeenValue] = useState(value)
  const [sentValue, setSentValue] = useState<string | null>(null)

  // Adjusting state while rendering (instead of in an effect) when the URL changes:
  // React re-renders straight away, before anything is painted.
  if (value !== seenValue) {
    setSeenValue(value)
    if (value === sentValue) {
      // Our own change arriving: keep whatever was typed since it was sent.
      setSentValue(null)
    } else if (tidySearchText(draft) !== value) {
      setDraft(value)
    }
  }

  function commit(text: string) {
    const q = tidySearchText(text)
    if (q === value) return
    setSentValue(q)
    onCommit(q)
  }

  const commitAfterPause = useEffectEvent((text: string) => commit(text))

  useEffect(() => {
    const timer = window.setTimeout(() => commitAfterPause(draft), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commit(draft)
  }

  return (
    <form role="search" aria-label="Search the list" onSubmit={handleSubmit} className={className}>
      <Input
        type="search"
        label="Search"
        placeholder="Level name…"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={MAX_SEARCH_LENGTH}
        leftIcon={<IconSearch className="size-4" />}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </form>
  )
}

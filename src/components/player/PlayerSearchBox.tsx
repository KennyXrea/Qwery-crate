import { useEffect, useEffectEvent, useState } from 'react'
import type { FormEvent } from 'react'
import { normalizeSearch } from '../../lib/search'
import { IconSearch } from '../ui/icons'
import { Input } from '../ui/Input'
import { PLAYER_SEARCH_DELAY_MS } from './player-page-visuals'

type PlayerSearchBoxProps = {
  /** The search that is applied right now (the page's ?q=). */
  value: string
  /**
   * Called with the cleaned-up text (normalizeSearch: '' means "no search") once typing has
   * paused for `delay` ms, or straight away on Enter. Only called when it differs from `value`.
   */
  onSearch: (search: string) => void
  delay?: number
  className?: string
}

/**
 * The leaderboard's search field. What you type shows at once; the search itself (`onSearch`,
 * which updates the URL) waits until typing pauses. When `value` changes from outside — Back /
 * Forward, a "Clear search" button — the field follows it; the URL echoing back a search this
 * box sent itself never overwrites what is being typed.
 */
export function PlayerSearchBox({
  value,
  onSearch,
  delay = PLAYER_SEARCH_DELAY_MS,
  className,
}: PlayerSearchBoxProps) {
  const [text, setText] = useState(value)
  // The last `value` this box has seen, and the last search it sent itself.
  const [seenValue, setSeenValue] = useState(value)
  const [sentValue, setSentValue] = useState<string | null>(null)

  // Adjusting state while rendering (React's pattern for "props changed"), not in an effect.
  if (value !== seenValue) {
    setSeenValue(value)
    if (value === sentValue) setSentValue(null)
    else setText(value)
  }

  function send(next: string) {
    if (next === value) return
    setSentValue(next)
    onSearch(next)
  }

  const sendLatest = useEffectEvent((next: string) => send(next))

  useEffect(() => {
    const timer = window.setTimeout(() => sendLatest(normalizeSearch(text)), delay)
    return () => window.clearTimeout(timer)
  }, [text, delay])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send(normalizeSearch(text))
  }

  return (
    <form role="search" aria-label="Players" onSubmit={handleSubmit} className={className}>
      <Input
        type="search"
        label="Search players"
        hideLabel
        placeholder="Search players…"
        leftIcon={<IconSearch className="size-4" />}
        value={text}
        onChange={(event) => setText(event.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={200}
      />
    </form>
  )
}

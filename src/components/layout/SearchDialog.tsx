import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSearch } from '../../hooks/useSearch'
import { cn } from '../../lib/cn'
import { MAX_SEARCH_LENGTH, normalizeSearch } from '../../lib/search'
import { PlayerAvatar } from '../player/PlayerAvatar'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { IconChevronRight, IconSearch } from '../ui/icons'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { RankNumber } from '../ui/RankNumber'
import { Spinner } from '../ui/Spinner'
import {
  SEARCH_DEBOUNCE_MS,
  groupSearchResults,
  moveActiveIndex,
  resultsAnnouncement,
  useDebouncedValue,
} from './search-utils'
import type { SearchOption } from './search-utils'

type SearchDialogProps = {
  open: boolean
  onClose: () => void
}

/**
 * Site-wide search, opened from the header button or the "/" shortcut (Header.tsx).
 *
 * The field is a combobox with a listbox of results (levels, then players), using
 * aria-activedescendant: focus stays in the field while ↑ / ↓ move the highlighted result,
 * Enter opens it, and Escape closes the dialog. Results can also be hovered and clicked (they
 * are real links, so Ctrl/Cmd-click opens a new tab). The dialog closes on any navigation, and
 * focus returns to whatever opened it (Modal).
 */
export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { key: locationKey } = useLocation()
  const lastLocationKey = useRef(locationKey)

  // Any navigation while it is open — a result, Back / Forward — closes the dialog.
  useEffect(() => {
    if (lastLocationKey.current === locationKey) return
    lastLocationKey.current = locationKey
    if (open) onClose()
  }, [locationKey, open, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Search" initialFocusRef={inputRef}>
      {/* Mounted only while open, so every search starts with an empty field. */}
      <SearchPanel inputRef={inputRef} onClose={onClose} />
    </Modal>
  )
}

type SearchPanelProps = {
  inputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
}

function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function SearchPanel({ inputRef, onClose }: SearchPanelProps) {
  const navigate = useNavigate()
  const listboxId = useId()
  const hintId = useId()
  const [query, setQuery] = useState('')
  // The result the user moved to (↑ / ↓ / hover). null → the first result is highlighted.
  const [activeKey, setActiveKey] = useState<string | null>(null)
  // Enter pressed before the results for this text arrived: open the top one once they do.
  const [enterTerm, setEnterTerm] = useState<string | null>(null)

  const term = normalizeSearch(query)
  const debounced = useDebouncedValue(term, SEARCH_DEBOUNCE_MS)
  // Under 2 characters there is nothing to search, so don't wait for the pause to say so.
  const searchTerm = term === '' ? '' : debounced
  const search = useSearch(searchTerm)

  // Results on screen can be for an older text while typing goes on (the hook keeps them).
  const fresh = term !== '' && term === searchTerm && search.isSuccess && !search.isPlaceholderData
  const searching = term !== '' && (term !== debounced || search.isFetching)
  const { levels, players, options } = groupSearchResults(term === '' ? [] : (search.data ?? []))
  const chosenIndex = options.findIndex((option) => option.key === activeKey)
  const activeIndex = chosenIndex >= 0 ? chosenIndex : options.length > 0 ? 0 : -1
  const active = options[activeIndex]
  const expanded = options.length > 0
  const optionId = (key: string) => `${listboxId}-${key}`

  function choose(option: SearchOption) {
    navigate(option.path)
    onClose()
  }

  const pendingPath = enterTerm !== null && enterTerm === term && fresh ? active?.path : undefined
  useEffect(() => {
    if (!pendingPath) return
    navigate(pendingPath)
    onClose()
  }, [pendingPath, navigate, onClose])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!expanded) return
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const next = options[moveActiveIndex(activeIndex, delta, options.length)]
      if (!next) return
      setActiveKey(next.key)
      document.getElementById(optionId(next.key))?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (fresh) {
        if (active) choose(active)
      } else if (term !== '') {
        // Still waiting for the results of what was just typed.
        setEnterTerm(term)
      }
    }
  }

  let message: ReactNode = null
  if (term === '') {
    message = (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <IconSearch className="size-6 text-muted" />
        <p id={hintId} className="max-w-xs text-sm text-muted">
          Type at least 2 characters to search levels and players.
        </p>
      </div>
    )
  } else if (search.isError) {
    message = (
      <ErrorState
        size="sm"
        titleAs="p"
        title="Search isn't working right now"
        message={search.error.message}
        onRetry={() => void search.refetch()}
        retrying={search.isFetching}
      />
    )
  } else if (!expanded) {
    message =
      searching || !fresh ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted">
          <Spinner size="sm" decorative className="text-accent" />
          Searching…
        </div>
      ) : (
        <EmptyState
          size="sm"
          titleAs="p"
          icon={<IconSearch />}
          title={`No results for “${term}”`}
          description="Check the spelling, or try a shorter part of the name."
        />
      )
  }

  return (
    <>
      {/* Keeps the field in view while a long list of results scrolls. */}
      <div className="sticky top-0 z-10 -mx-1 -mt-1 bg-surface px-1 pt-1 pb-3">
        <form role="search" onSubmit={(event) => event.preventDefault()}>
          <Input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            aria-activedescendant={expanded && active ? optionId(active.key) : undefined}
            aria-describedby={term === '' ? hintId : undefined}
            label="Search levels and players"
            hideLabel
            leftIcon={searching ? <Spinner size="sm" decorative /> : <IconSearch />}
            placeholder="Search levels and players…"
            value={query}
            maxLength={MAX_SEARCH_LENGTH}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveKey(null)
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="search"
          />
        </form>
      </div>

      <div
        role="listbox"
        id={listboxId}
        aria-label="Search results"
        hidden={!expanded}
        className="space-y-3"
      >
        <ResultGroup label="Levels" listboxId={listboxId}>
          {levels.map((option) => (
            <ResultOption
              key={option.key}
              id={optionId(option.key)}
              option={option}
              active={option.key === active?.key}
              label={`${option.result.name}, rank ${option.result.position}`}
              onActivate={setActiveKey}
              onChoose={onClose}
            >
              <span className="min-w-10 shrink-0 text-right">
                <RankNumber rank={option.result.position} size="sm" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{option.result.name}</span>
            </ResultOption>
          ))}
        </ResultGroup>
        <ResultGroup label="Players" listboxId={listboxId}>
          {players.map((option) => (
            <ResultOption
              key={option.key}
              id={optionId(option.key)}
              option={option}
              active={option.key === active?.key}
              onActivate={setActiveKey}
              onChoose={onClose}
            >
              <PlayerAvatar player={{ id: option.result.id, name: option.result.name }} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{option.result.name}</span>
            </ResultOption>
          ))}
        </ResultGroup>
      </div>

      {message}

      {/* What screen readers hear once the results for the current text are in. */}
      <p role="status" className="sr-only">
        {fresh ? resultsAnnouncement(levels.length, players.length) : ''}
      </p>

      <p className="mt-4 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:flex">
        <span className="inline-flex items-center gap-1.5">
          <Key>↑</Key>
          <Key>↓</Key>
          to move
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Key>Enter</Key>
          to open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Key>Esc</Key>
          to close
        </span>
      </p>
    </>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.7rem] text-text">
      {children}
    </kbd>
  )
}

/** "Levels" / "Players": a labelled group inside the listbox; nothing when it has no results. */
function ResultGroup({
  label,
  listboxId,
  children,
}: {
  label: string
  listboxId: string
  children: ReactNode[]
}) {
  if (children.length === 0) return null
  const headingId = `${listboxId}-${label.toLowerCase()}`
  return (
    <div role="presentation">
      {/* Names the group (aria-labelledby); hidden itself so it isn't read twice. */}
      <div
        id={headingId}
        role="presentation"
        aria-hidden="true"
        className="px-3 pb-1 font-mono text-xs font-medium tracking-widest text-muted uppercase"
      >
        {label}
      </div>
      <div role="group" aria-labelledby={headingId} className="space-y-0.5">
        {children}
      </div>
    </div>
  )
}

type ResultOptionProps = {
  id: string
  option: SearchOption
  active: boolean
  /** Accessible name when the visible text alone doesn't say enough. */
  label?: string
  onActivate: (key: string) => void
  /** Called when a plain click opens the result (the link itself does the navigating). */
  onChoose: () => void
  children: ReactNode
}

/**
 * One result: a real link (so it can be opened in a new tab) acting as a listbox option. It is
 * never focused itself — the field keeps focus and points at it with aria-activedescendant.
 */
function ResultOption({
  id,
  option,
  active,
  label,
  onActivate,
  onChoose,
  children,
}: ResultOptionProps) {
  return (
    <Link
      to={option.path}
      id={id}
      role="option"
      aria-selected={active}
      aria-label={label}
      tabIndex={-1}
      // Hovering highlights it (onMouseMove, not onMouseEnter: a list scrolled by the keyboard
      // under a resting mouse must not steal the highlight).
      onMouseMove={() => {
        if (!active) onActivate(option.key)
      }}
      // Keep focus in the field.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        if (!isModifiedClick(event)) onChoose()
      }}
      className={cn(
        'flex min-h-11 scroll-mt-16 scroll-mb-2 items-center gap-3 rounded-xl px-3 py-1.5 text-sm text-muted outline-none',
        active &&
          'bg-surface-2 text-text ring-1 ring-accent/50 ring-inset forced-colors:outline-2 forced-colors:-outline-offset-2',
      )}
    >
      {children}
      <IconChevronRight
        className={cn('size-4 shrink-0', active ? 'text-accent' : 'text-muted opacity-0')}
      />
    </Link>
  )
}

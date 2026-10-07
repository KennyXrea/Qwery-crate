import { useRef, useState } from 'react'
import { IconSearch } from '../ui/icons'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

type SearchDialogProps = {
  open: boolean
  onClose: () => void
}

/**
 * Site-wide search, opened from the header button or the "/" shortcut.
 * For now it only collects the query; results are wired up once the database exists.
 */
export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="Search" initialFocusRef={inputRef}>
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <Input
          ref={inputRef}
          type="search"
          label="Search levels and players"
          hideLabel
          leftIcon={<IconSearch />}
          placeholder="Search levels and players…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <IconSearch className="size-6 text-muted" />
        <p className="max-w-xs text-sm text-muted">
          Search will be connected once the database is set up.
        </p>
      </div>

      <p className="mt-4 hidden items-center gap-1.5 text-xs text-muted sm:flex">
        <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.7rem] text-text">
          Esc
        </kbd>
        to close
      </p>
    </Modal>
  )
}

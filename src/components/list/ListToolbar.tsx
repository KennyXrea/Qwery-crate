import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { IconChevronDown } from '../ui/icons'
import { Select } from '../ui/Select'
import { IconFilter } from './ListIcons'
import { ListSearchBox } from './ListSearchBox'
import { PlayerFilter } from './PlayerFilter'
import {
  DIFFICULTY_OPTIONS,
  difficultyFromValue,
  SORT_OPTIONS,
  sortFromValue,
} from './list-options'
import { hiddenFilterCount, tidySearchText, type ListParams } from './list-params'
import type { UpdateListParams } from './useListParams'
import { ViewToggle } from './ViewToggle'

type ListToolbarProps = {
  params: ListParams
  onChange: UpdateListParams
  className?: string
}

/**
 * Search, difficulty, "beaten by" player, sort and the Cards / Table switch.
 * On phones the three selects fold away behind a "Filters & sort" button (with a count of the
 * ones in use) so the levels stay near the top; from `sm` up they are always shown.
 */
export function ListToolbar({ params, onChange, className }: ListToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const panelId = useId()
  const hiddenCount = hiddenFilterCount(params)

  function commitSearch(q: string) {
    // Refining a search replaces the history entry, so Back leaves the search in one step.
    const refining = tidySearchText(params.q) !== '' && q !== ''
    onChange({ q }, { replace: refining })
  }

  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-3 sm:p-4', className)}>
      <div className="flex flex-wrap items-end gap-3">
        <ListSearchBox
          value={params.q}
          onCommit={commitSearch}
          className="min-w-0 basis-full sm:flex-1 sm:basis-auto"
        />
        <Button
          variant="secondary"
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          onClick={() => setFiltersOpen((open) => !open)}
          leftIcon={<IconFilter />}
          rightIcon={
            <IconChevronDown className={cn('transition-transform', filtersOpen && 'rotate-180')} />
          }
          className="min-w-0 flex-1 sm:hidden"
        >
          <span className="truncate">Filters &amp; sort</span>
          {hiddenCount > 0 ? (
            <>
              {' '}
              <Badge tone="accent">
                <span className="sr-only">(</span>
                {hiddenCount} <span className="sr-only">in use)</span>
              </Badge>
            </>
          ) : null}
        </Button>
        <ViewToggle value={params.view} onChange={(view) => onChange({ view })} />
      </div>

      <div
        id={panelId}
        className={cn('mt-3 grid gap-3 sm:grid-cols-3', !filtersOpen && 'max-sm:hidden')}
      >
        <Select
          label="Difficulty"
          placeholder="Any difficulty"
          options={DIFFICULTY_OPTIONS}
          value={params.difficulty ?? ''}
          onChange={(event) => onChange({ difficulty: difficultyFromValue(event.target.value) })}
        />
        <PlayerFilter slug={params.player} onChange={(player) => onChange({ player })} />
        <Select
          label="Sort by"
          options={SORT_OPTIONS}
          value={params.sort}
          onChange={(event) => onChange({ sort: sortFromValue(event.target.value) })}
        />
      </div>
    </div>
  )
}

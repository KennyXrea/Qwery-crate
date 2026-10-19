import { useParams } from 'react-router'
import { PageShell } from '../components/layout/PageShell'
import { isEmbeddableVideo, pickLevelVideo } from '../components/level/level-detail'
import { LevelHeader } from '../components/level/LevelHeader'
import { LevelNav } from '../components/level/LevelNav'
import { LevelNotes } from '../components/level/LevelNotes'
import { LevelNotFound } from '../components/level/LevelNotFound'
import { LevelPageSkeleton } from '../components/level/LevelPageSkeleton'
import { LevelRecordsSection } from '../components/level/LevelRecordsSection'
import { LevelStatGrid } from '../components/level/LevelStatGrid'
import { LevelVideo } from '../components/level/LevelVideo'
import { PositionHistorySection } from '../components/level/PositionHistorySection'
import { ButtonLink } from '../components/ui/ButtonLink'
import { ErrorState } from '../components/ui/ErrorState'
import { IconChevronLeft } from '../components/ui/icons'
import { useLevel } from '../hooks/useLevel'
import { usePageTitle } from '../hooks/usePageTitle'
import { cn } from '../lib/cn'
import type { Level } from '../types/models'

/** The page is one centered reading column, so the video and tables keep a sensible width. */
const COLUMN = 'mx-auto w-full max-w-4xl'

/**
 * /level/:slug — one level: header, video, stats, records, position history, notes and the
 * previous / next levels. A slug that matches no level shows "Level not found".
 */
export function LevelPage() {
  const { slug = '' } = useParams()
  const { data: level, isPending, error, refetch, isFetching } = useLevel(slug)
  // Nothing is fetched for an empty slug, so it would otherwise stay "pending" for ever.
  const notFound = level === null || slug.trim() === ''

  usePageTitle(level ? level.name : notFound ? 'Level not found' : 'Level')

  if (notFound) {
    return (
      <PageShell>
        <LevelNotFound />
      </PageShell>
    )
  }

  if (level) {
    return (
      <PageShell>
        {/* key: moving to another level starts its sections (copy button, folded history…) fresh. */}
        <LevelDetails key={level.id} level={level} />
      </PageShell>
    )
  }

  if (isPending) {
    return (
      <PageShell>
        <LevelPageSkeleton className={COLUMN} />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className={cn(COLUMN, 'space-y-6')}>
        <h1 className="sr-only">Level</h1>
        <ErrorState
          title="Couldn't load this level"
          message={error?.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
        <div className="flex justify-center">
          <ButtonLink to="/list" variant="ghost" leftIcon={<IconChevronLeft />}>
            Back to the list
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  )
}

function LevelDetails({ level }: { level: Level }) {
  const video = pickLevelVideo(level)
  const notes = level.notes?.trim() || null

  return (
    <div className={cn(COLUMN, 'space-y-8 sm:space-y-10')}>
      <LevelHeader level={level} showThumbnail={!isEmbeddableVideo(video)} />

      {video ? <LevelVideo video={video} levelName={level.name} /> : null}

      <LevelStatGrid level={level} />

      <LevelRecordsSection level={level} />

      <div className={cn('grid items-start gap-6', notes && 'lg:grid-cols-2')}>
        <PositionHistorySection levelId={level.id} />
        {notes ? <LevelNotes notes={notes} /> : null}
      </div>

      <LevelNav position={level.position} />
    </div>
  )
}

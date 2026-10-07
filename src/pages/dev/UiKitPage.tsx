import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router'
import { PageShell } from '../../components/layout/PageShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import type { ButtonSize, ButtonVariant } from '../../components/ui/button-styles'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { STRETCHED_LINK } from '../../components/ui/card-link'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import {
  IconAlert,
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconExternal,
  IconHome,
  IconInbox,
  IconInfo,
  IconMenu,
  IconSearch,
} from '../../components/ui/icons'
import type { IconProps } from '../../components/ui/icons'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { RankNumber } from '../../components/ui/RankNumber'
import { Select } from '../../components/ui/Select'
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton'
import { Spinner } from '../../components/ui/Spinner'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/useToast'
import { usePageTitle } from '../../hooks/usePageTitle'

const SECTIONS = [
  { id: 'colors', title: 'Colors' },
  { id: 'type', title: 'Type' },
  { id: 'buttons', title: 'Buttons' },
  { id: 'ranks', title: 'Rank numbers' },
  { id: 'badges', title: 'Badges' },
  { id: 'cards', title: 'Cards' },
  { id: 'forms', title: 'Form fields' },
  { id: 'overlays', title: 'Modal & toasts' },
  { id: 'loading', title: 'Loading' },
  { id: 'states', title: 'Empty & error' },
  { id: 'pagination', title: 'Pagination' },
  { id: 'icons', title: 'Icons' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const COLORS = [
  { name: 'bg', swatch: 'bg-bg', hex: '#0a0e17' },
  { name: 'surface', swatch: 'bg-surface', hex: '#111826' },
  { name: 'surface-2', swatch: 'bg-surface-2', hex: '#182133' },
  { name: 'border', swatch: 'bg-border', hex: '#243049' },
  { name: 'border-strong', swatch: 'bg-border-strong', hex: '#5a6c94' },
  { name: 'text', swatch: 'bg-text', hex: '#f4f7fd' },
  { name: 'muted', swatch: 'bg-muted', hex: '#8d99b3' },
  { name: 'accent', swatch: 'bg-accent', hex: '#4f8cff' },
  { name: 'accent-strong', swatch: 'bg-accent-strong', hex: '#2f6fed' },
  { name: 'accent-hover', swatch: 'bg-accent-hover', hex: '#2a62d6' },
  { name: 'accent-soft', swatch: 'bg-accent-soft', hex: '#7aa8ff' },
  { name: 'gold', swatch: 'bg-gold', hex: '#f5c542' },
  { name: 'silver', swatch: 'bg-silver', hex: '#c0c7d4' },
  { name: 'bronze', swatch: 'bg-bronze', hex: '#d08a4a' },
  { name: 'success', swatch: 'bg-success', hex: '#3ddc97' },
  { name: 'danger', swatch: 'bg-danger', hex: '#ff5d6c' },
] as const

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger']
const BUTTON_SIZES: Array<{ size: ButtonSize; label: string }> = [
  { size: 'sm', label: 'Small' },
  { size: 'md', label: 'Medium' },
  { size: 'lg', label: 'Large' },
]

const RANK_SIZES = ['sm', 'md', 'lg'] as const
const BADGE_TONES = ['neutral', 'accent', 'success', 'danger', 'gold', 'silver', 'bronze'] as const

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy demon' },
  { value: 'medium', label: 'Medium demon' },
  { value: 'hard', label: 'Hard demon' },
  { value: 'insane', label: 'Insane demon' },
  { value: 'extreme', label: 'Extreme demon' },
]

const ICONS: Array<{ name: string; Icon: ComponentType<IconProps> }> = [
  { name: 'IconSearch', Icon: IconSearch },
  { name: 'IconMenu', Icon: IconMenu },
  { name: 'IconClose', Icon: IconClose },
  { name: 'IconChevronLeft', Icon: IconChevronLeft },
  { name: 'IconChevronRight', Icon: IconChevronRight },
  { name: 'IconChevronDown', Icon: IconChevronDown },
  { name: 'IconAlert', Icon: IconAlert },
  { name: 'IconCheck', Icon: IconCheck },
  { name: 'IconInfo', Icon: IconInfo },
  { name: 'IconInbox', Icon: IconInbox },
  { name: 'IconExternal', Icon: IconExternal },
  { name: 'IconArrowRight', Icon: IconArrowRight },
  { name: 'IconArrowUp', Icon: IconArrowUp },
  { name: 'IconArrowDown', Icon: IconArrowDown },
  { name: 'IconHome', Icon: IconHome },
]

/** Developer-only gallery of every UI building block (route /dev/ui, not in production). */
export function UiKitPage() {
  usePageTitle('UI kit')

  return (
    <PageShell
      eyebrow="Developer only"
      title="UI kit"
      description="Every building block of the site in one place, so the design can be checked at a glance. This page only exists while developing — it is left out of the published site."
    >
      <nav aria-label="UI kit sections" className="mb-8">
        <ul className="flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <Link
                to={{ hash: section.id }}
                className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6">
        <ColorsSection />
        <TypeSection />
        <ButtonsSection />
        <RanksSection />
        <BadgesSection />
        <CardsSection />
        <FormsSection />
        <OverlaysSection />
        <LoadingSection />
        <StatesSection />
        <PaginationSection />
        <IconsSection />
      </div>
    </PageShell>
  )
}

/* ---------- layout helpers ---------- */

function KitSection({
  id,
  description,
  children,
}: {
  id: SectionId
  description?: string
  children: ReactNode
}) {
  const title = SECTIONS.find((section) => section.id === id)?.title ?? id

  return (
    <Card as="section" id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      <h2 id={`${id}-title`} className="text-xl font-semibold text-text">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-6 space-y-6">{children}</div>
    </Card>
  )
}

function KitGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-mono text-xs font-medium tracking-widest text-muted uppercase">
        {label}
      </h3>
      {children}
    </div>
  )
}

/* ---------- sections ---------- */

function ColorsSection() {
  return (
    <KitSection
      id="colors"
      description="The only colors that exist. Tailwind's default palette is switched off."
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {COLORS.map((color) => (
          <li key={color.name} className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={`size-10 shrink-0 rounded-lg border border-white/10 ${color.swatch}`}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text">{color.name}</span>
              <span className="block font-mono text-xs text-muted">{color.hex}</span>
            </span>
          </li>
        ))}
      </ul>
    </KitSection>
  )
}

function TypeSection() {
  return (
    <KitSection
      id="type"
      description="Space Grotesk for headings, Inter for text, JetBrains Mono for numbers."
    >
      <div className="space-y-3">
        <p className="font-display text-4xl font-bold text-text">Display heading</p>
        <p className="font-display text-2xl font-semibold text-text">Section heading</p>
        <p className="max-w-prose text-text">
          Body text in Inter. Our friend group's Geometry Dash list — ranked by us, beaten by us.
        </p>
        <p className="max-w-prose text-muted">Muted text for secondary details and descriptions.</p>
        <p className="font-mono text-text tabular-nums">12,345 attempts · 250.00 pts · 7.5 / 10</p>
        <p>
          <Link
            to={{ hash: 'type' }}
            className="text-accent transition-colors hover:text-accent-soft"
          >
            A text link
          </Link>{' '}
          <span className="text-muted">and a keyboard hint</span>{' '}
          <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
            /
          </kbd>
        </p>
      </div>
    </KitSection>
  )
}

function ButtonsSection() {
  return (
    <KitSection
      id="buttons"
      description="Every variant and size, plus loading, disabled and icons."
    >
      {BUTTON_VARIANTS.map((variant) => (
        <KitGroup key={variant} label={variant}>
          <div className="flex flex-wrap items-center gap-3">
            {BUTTON_SIZES.map(({ size, label }) => (
              <Button key={size} variant={variant} size={size}>
                {label}
              </Button>
            ))}
          </div>
        </KitGroup>
      ))}

      <KitGroup label="States">
        <div className="flex flex-wrap items-center gap-3">
          <Button loading>Saving</Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button variant="danger" disabled>
            Disabled
          </Button>
        </div>
      </KitGroup>

      <KitGroup label="With icons">
        <div className="flex flex-wrap items-center gap-3">
          <Button leftIcon={<IconSearch />}>Search</Button>
          <Button variant="secondary" rightIcon={<IconArrowRight />}>
            Next
          </Button>
          <Button variant="ghost" leftIcon={<IconChevronLeft />}>
            Back
          </Button>
          <Button variant="secondary" iconOnly aria-label="Close">
            <IconClose />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Open menu">
            <IconMenu />
          </Button>
        </div>
      </KitGroup>

      <KitGroup label="Full width">
        <Button variant="secondary" fullWidth>
          Full-width button
        </Button>
      </KitGroup>

      <KitGroup label="ButtonLink (router links styled as buttons)">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink to="/list" rightIcon={<IconArrowRight />}>
            View the list
          </ButtonLink>
          <ButtonLink to="/" variant="secondary" leftIcon={<IconHome />}>
            Home
          </ButtonLink>
          <ButtonLink to="/about" variant="ghost">
            About
          </ButtonLink>
        </div>
      </KitGroup>
    </KitSection>
  )
}

function RanksSection() {
  return (
    <KitSection
      id="ranks"
      description="A plain bold number. Gold, silver and bronze for the top three."
    >
      {RANK_SIZES.map((size) => (
        <KitGroup key={size} label={size}>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
            {[1, 2, 3, 4, 5].map((rank) => (
              <RankNumber key={rank} rank={rank} size={size} />
            ))}
          </div>
        </KitGroup>
      ))}
    </KitSection>
  )
}

function BadgesSection() {
  return (
    <KitSection id="badges">
      <KitGroup label="Small">
        <div className="flex flex-wrap items-center gap-2">
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </KitGroup>
      <KitGroup label="Medium, with icons">
        <div className="flex flex-wrap items-center gap-2">
          <Badge size="md" tone="accent" icon={<IconInfo />}>
            Main list
          </Badge>
          <Badge size="md" tone="success" icon={<IconCheck />}>
            Verified
          </Badge>
          <Badge size="md" tone="danger" icon={<IconArrowDown />}>
            Moved down
          </Badge>
          <Badge size="md" tone="gold">
            First victor
          </Badge>
          <Badge size="md">Legacy</Badge>
        </div>
      </KitGroup>
    </KitSection>
  )
}

function CardsSection() {
  return (
    <KitSection id="cards">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-text">Plain card</h3>
          <p className="mt-1 text-sm text-muted">A raised surface for grouping content.</p>
        </Card>
        <Card interactive className="group relative">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-text">
              <Link to="/list" className={STRETCHED_LINK}>
                Interactive card
              </Link>
            </h3>
            <IconArrowRight className="shrink-0 text-muted transition-colors group-hover:text-accent" />
          </div>
          <p className="mt-1 text-sm text-muted">
            Hover it, or tab to its link. The whole card is clickable.
          </p>
        </Card>
      </div>
      <KitGroup label="Padding">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card padding="sm" className="text-sm text-muted">
            padding=&quot;sm&quot;
          </Card>
          <Card className="text-sm text-muted">padding=&quot;md&quot; (default)</Card>
          <Card padding="lg" className="text-sm text-muted">
            padding=&quot;lg&quot;
          </Card>
        </div>
      </KitGroup>
    </KitSection>
  )
}

function FormsSection() {
  return (
    <KitSection
      id="forms"
      description="Every field has a real label, and hints and errors are read out by screen readers."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Input label="Level name" placeholder="e.g. Sample Level 1" />
        <Input
          label="Slug"
          hint="Used in the address, like /level/sample-level-1."
          defaultValue="sample-level-1"
        />
        <Input
          label="GD level ID"
          inputMode="numeric"
          defaultValue="12ab"
          error="Use numbers only."
        />
        <Input
          label="Search"
          leftIcon={<IconSearch />}
          placeholder="Search levels…"
          type="search"
        />
        <Input label="Creator" required placeholder="Required field" />
        <Input label="Disabled" disabled defaultValue="Can't edit this" />
        <Select label="Difficulty" options={DIFFICULTY_OPTIONS} defaultValue="extreme" />
        <Select
          label="Filter by difficulty"
          placeholder="Any difficulty"
          options={DIFFICULTY_OPTIONS}
          hint="Leave empty to show every level."
        />
        <Select
          label="In-game difficulty"
          options={DIFFICULTY_OPTIONS}
          placeholder="Choose one…"
          error="Pick a difficulty."
        />
        <Textarea label="Notes" placeholder="Anything worth remembering about this level…" />
        <Textarea label="Description" hint="Shown at the top of the level page." rows={3} />
        <Textarea
          label="Bio"
          rows={3}
          defaultValue="Way too long…"
          error="Keep it under 280 characters."
        />
      </div>
    </KitSection>
  )
}

function OverlaysSection() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)

  function confirmDelete() {
    setModalOpen(false)
    toast.success('Sample Level 1 deleted', {
      description: 'Just a demo, nothing was really deleted.',
    })
  }

  return (
    <KitSection
      id="overlays"
      description="Dialogs trap focus and close with Esc. Toasts are announced to screen readers."
    >
      <KitGroup label="Modal">
        <Button variant="danger" onClick={() => setModalOpen(true)}>
          Delete a level…
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Delete Sample Level 1?"
          description="This also deletes its 3 records. It can't be undone."
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Confirm
              </Button>
            </>
          }
        >
          <Input label="Reason (optional)" placeholder="Why is it being removed?" />
        </Modal>
      </KitGroup>

      <KitGroup label="Toasts">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={<IconCheck />}
            onClick={() =>
              toast.success('Level saved', { description: 'Sample Level 1 is now #1.' })
            }
          >
            Success
          </Button>
          <Button
            variant="secondary"
            leftIcon={<IconAlert />}
            onClick={() =>
              toast.error("Couldn't save", { description: 'Check your connection and try again.' })
            }
          >
            Error
          </Button>
          <Button
            variant="secondary"
            leftIcon={<IconInfo />}
            onClick={() =>
              toast.info('Heads up', {
                description: 'Points update by themselves when levels move.',
              })
            }
          >
            Info
          </Button>
        </div>
      </KitGroup>
    </KitSection>
  )
}

function LoadingSection() {
  return (
    <KitSection id="loading">
      <KitGroup label="Spinner">
        <div className="flex flex-wrap items-center gap-6">
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" />
        </div>
      </KitGroup>
      <div className="grid gap-6 md:grid-cols-2">
        <KitGroup label="Skeleton">
          <div className="flex gap-4">
            <Skeleton rounded="xl" className="aspect-video w-28 shrink-0 sm:w-40" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton rounded="full" className="h-6 w-20" />
                <Skeleton rounded="full" className="h-6 w-14" />
              </div>
            </div>
          </div>
        </KitGroup>
        <KitGroup label="SkeletonText">
          <SkeletonText lines={4} />
        </KitGroup>
      </div>
    </KitSection>
  )
}

function StatesSection() {
  const [retrying, setRetrying] = useState(false)

  // Pretend the retry takes a moment, then "fails" again so it can be tried repeatedly.
  useEffect(() => {
    if (!retrying) return
    const timer = window.setTimeout(() => setRetrying(false), 1500)
    return () => window.clearTimeout(timer)
  }, [retrying])

  return (
    <KitSection id="states">
      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          titleAs="h3"
          title="No levels yet"
          description="Levels appear here as soon as an admin adds the first one."
          action={
            <ButtonLink to="/about" variant="secondary">
              How the list works
            </ButtonLink>
          }
        />
        <ErrorState
          titleAs="h3"
          title="Couldn't load the list"
          message="The database didn't answer. Check your connection and try again."
          onRetry={() => setRetrying(true)}
          retrying={retrying}
        />
      </div>
    </KitSection>
  )
}

function PaginationSection() {
  const [page, setPage] = useState(1)

  return (
    <KitSection id="pagination" description="Numbers collapse into “Page X of Y” on phones.">
      <Pagination page={page} totalPages={12} onPageChange={setPage} label="Demo pagination" />
      <p className="text-center text-sm text-muted">
        Showing page <span className="font-mono text-text">{page}</span> of 12
      </p>
    </KitSection>
  )
}

function IconsSection() {
  return (
    <KitSection id="icons" description="Inline SVG, 24 × 24, drawn with the current text color.">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ICONS.map(({ name, Icon }) => (
          <li
            key={name}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-3"
          >
            <Icon className="size-6 shrink-0 text-accent" />
            <span className="truncate font-mono text-xs text-muted">{name}</span>
          </li>
        ))}
      </ul>
    </KitSection>
  )
}

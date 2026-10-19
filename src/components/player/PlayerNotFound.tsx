import { ButtonLink } from '../ui/ButtonLink'
import { IconArrowRight, IconUsers } from '../ui/icons'

type PlayerNotFoundProps = {
  /** The address part that didn't match a player (shown so typos are easy to spot). */
  slug: string
}

/** The "Player not found" screen for /player/<unknown slug>, with ways back. */
export function PlayerNotFound({ slug }: PlayerNotFoundProps) {
  return (
    <div className="mx-auto flex max-w-xl animate-fade-in flex-col items-center py-10 text-center sm:py-16">
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent"
      >
        <IconUsers className="size-8" />
      </div>

      <h1 className="mt-5 text-3xl font-bold text-text sm:text-4xl">Player not found</h1>
      <p className="mt-3 max-w-md text-muted">
        There's no player at this address. They may have been renamed or removed, or the link has a
        typo.
      </p>

      {slug ? (
        <div className="mt-6 flex w-full max-w-full flex-col items-center gap-2">
          <span className="text-xs font-medium tracking-widest text-muted uppercase">
            You looked for
          </span>
          <code className="max-w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm break-all text-text">
            {slug}
          </code>
        </div>
      ) : null}

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <ButtonLink to="/players" leftIcon={<IconUsers />} className="w-full sm:w-auto">
          All players
        </ButtonLink>
        <ButtonLink
          to="/list"
          variant="secondary"
          rightIcon={<IconArrowRight />}
          className="w-full sm:w-auto"
        >
          Browse the list
        </ButtonLink>
      </div>
    </div>
  )
}

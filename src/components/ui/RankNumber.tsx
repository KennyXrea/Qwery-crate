import { cn } from '../../lib/cn'

type RankSize = 'sm' | 'md' | 'lg'

type RankNumberProps = {
  rank: number
  size?: RankSize
  className?: string
}

const SIZES: Record<RankSize, string> = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-4xl sm:text-5xl',
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-gold'
  if (rank === 2) return 'text-silver'
  if (rank === 3) return 'text-bronze'
  return 'text-text'
}

/**
 * A list position shown as a plain bold number, e.g. "#1".
 * Gold, silver and bronze for the top three; white for everyone else.
 * Screen readers hear "Rank 1".
 */
export function RankNumber({ rank, size = 'md', className }: RankNumberProps) {
  return (
    <span
      className={cn(
        'font-display leading-none font-bold whitespace-nowrap tabular-nums',
        rankColor(rank),
        SIZES[size],
        className,
      )}
    >
      <span className="sr-only">Rank </span>
      <span aria-hidden="true" className="opacity-70">
        #
      </span>
      {rank}
    </span>
  )
}

import { cn } from '../../lib/cn'
import { countryFlagEmoji, countryName } from '../../lib/country'

type CountryFlagProps = {
  /** A 2-letter country code such as "US" (players.country_code). */
  code: string | null | undefined
  className?: string
}

/**
 * The flag emoji for a country code, named for screen readers ("Flag: United States") and
 * with the country as a tooltip. Renders nothing for a missing or invalid code.
 * (Windows shows the two letters instead of a flag picture; the name is still right.)
 */
export function CountryFlag({ code, className }: CountryFlagProps) {
  const flag = countryFlagEmoji(code)
  const name = countryName(code)
  if (!flag || !name) return null

  return (
    <span
      role="img"
      aria-label={`Flag: ${name}`}
      title={name}
      className={cn('inline-block shrink-0 leading-none select-none', className)}
    >
      {flag}
    </span>
  )
}

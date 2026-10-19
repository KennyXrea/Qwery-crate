import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { IconArrowRight } from '../ui/icons'
import { TEXT_LINK } from '../ui/link-styles'

type ViewAllLinkProps = {
  to: string
  /** What "all" is, read by screen readers only: "View all <label>". */
  label: string
  /** Visible text. Default "View all". */
  children?: string
  className?: string
}

/** The "View all →" link in a box header (40px tall tap area). */
export function ViewAllLink({ to, label, children = 'View all', className }: ViewAllLinkProps) {
  return (
    <Link to={to} className={cn(TEXT_LINK, 'text-sm', className)}>
      <span>
        {children}
        <span className="sr-only"> {label}</span>
      </span>
      <IconArrowRight />
    </Link>
  )
}

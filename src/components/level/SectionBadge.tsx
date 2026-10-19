import type { LevelSection } from '../../types/models'
import { Badge } from '../ui/Badge'
import { SECTION_LABELS, SECTION_TONES } from './level-visuals'

type SectionBadgeProps = {
  section: LevelSection
  size?: 'sm' | 'md'
  className?: string
}

/** Which part of the list a level is in: Main (blue), Extended (silver) or Legacy (grey). */
export function SectionBadge({ section, size = 'sm', className }: SectionBadgeProps) {
  return (
    <Badge tone={SECTION_TONES[section]} size={size} className={className}>
      {SECTION_LABELS[section]}
      <span className="sr-only"> list</span>
    </Badge>
  )
}

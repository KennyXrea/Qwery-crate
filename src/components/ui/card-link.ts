/**
 * Classes for the one real link inside a clickable `Card` ("stretched link"): its `::after`
 * covers the whole card, so a click anywhere on the card follows the link. Give the Card
 * `relative` (and `interactive`).
 *
 * The keyboard focus ring is drawn on that `::after` too, around the whole card with its
 * rounded corners. A ring on the link text itself would be clipped by a `truncate` heading,
 * and outlines (unlike box-shadow rings) stay visible in forced-colors mode.
 */
export const STRETCHED_LINK =
  'after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent'

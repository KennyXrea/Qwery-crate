/**
 * The About page's sections, in page order. The ids are the <h2> ids, so links can jump to a
 * section: `/about#about-points` opens the page at "How points work" (React Router's
 * ScrollRestoration scrolls to the hash).
 */
export const ABOUT_SECTIONS = [
  { id: 'about-what', title: 'What this is' },
  { id: 'about-ranking', title: 'How the ranking works' },
  { id: 'about-points', title: 'How points work' },
  { id: 'about-disclaimer', title: 'The small print' },
] as const

export type AboutSectionId = (typeof ABOUT_SECTIONS)[number]['id']

/** The title of an About page section. */
export function aboutSectionTitle(id: AboutSectionId): string {
  return ABOUT_SECTIONS.find((section) => section.id === id)?.title ?? ''
}

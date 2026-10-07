/**
 * Module-level bookkeeping for open modals, shared by every <Modal>.
 *
 * - The first modal to open locks page scrolling and makes the app (`#root`) inert, so
 *   neither the mouse, Tab, nor a screen reader can reach the page behind it.
 * - A nested modal makes the modal below it inert too, and only the top-most one reacts
 *   to Escape / Tab.
 * - The last modal to close puts everything back exactly as it was.
 *
 * Only call these from effects or event handlers, never during render.
 */

type SavedPage = {
  overflow: string
  paddingRight: string
  root: HTMLElement | null
  rootWasInert: boolean
}

const stack: HTMLElement[] = []
let saved: SavedPage | null = null

/**
 * Registers an open modal (its outermost element, already in the document).
 * Returns a release function for when it closes; calling it more than once is harmless.
 */
export function pushModal(element: HTMLElement): () => void {
  if (stack.length === 0) lockPage()
  stack.at(-1)?.setAttribute('inert', '')
  stack.push(element)

  let released = false
  return () => {
    if (released) return
    released = true

    const index = stack.indexOf(element)
    if (index === -1) return
    const wasTop = index === stack.length - 1
    stack.splice(index, 1)

    if (stack.length === 0) unlockPage()
    else if (wasTop) stack.at(-1)?.removeAttribute('inert')
  }
}

/** Whether this modal is the one on top (the only one that handles keys). */
export function isTopModal(element: HTMLElement): boolean {
  return stack.at(-1) === element
}

/** How many modals are open right now — e.g. to ignore global shortcuts while one is open. */
export function openModalCount(): number {
  return stack.length
}

function lockPage(): void {
  const { body, documentElement } = document
  const root = document.getElementById('root')
  // Width of the page scrollbar that is about to disappear (0 on phones / overlay scrollbars).
  const scrollbarWidth =
    documentElement.clientWidth > 0 ? window.innerWidth - documentElement.clientWidth : 0

  saved = {
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
    root,
    rootWasInert: root?.hasAttribute('inert') ?? false,
  }

  body.style.overflow = 'hidden'
  // Fill the gap the scrollbar leaves so the page doesn't jump sideways.
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
  if (root && !saved.rootWasInert) root.setAttribute('inert', '')
}

function unlockPage(): void {
  if (!saved) return
  const { body } = document
  body.style.overflow = saved.overflow
  body.style.paddingRight = saved.paddingRight
  if (saved.root && !saved.rootWasInert) saved.root.removeAttribute('inert')
  saved = null
}

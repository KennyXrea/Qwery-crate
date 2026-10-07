import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from '../components/ui/Modal'
import { openModalCount } from '../components/ui/modal-stack'

afterEach(() => {
  cleanup()
  document.getElementById('root')?.remove()
})

type HarnessProps = {
  onClose?: () => void
  closeOnBackdrop?: boolean
  withInitialFocus?: boolean
  children?: ReactNode
}

/** A page with a trigger button that opens a confirm-style dialog. */
function Harness({ onClose, closeOnBackdrop, withInitialFocus = false, children }: HarnessProps) {
  const [open, setOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  function close() {
    onClose?.()
    setOpen(false)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal
        open={open}
        onClose={close}
        title="Delete level"
        description="This also deletes 4 records."
        closeOnBackdrop={closeOnBackdrop}
        initialFocusRef={withInitialFocus ? nameRef : undefined}
        footer={
          <>
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button type="button">Confirm</button>
          </>
        }
      >
        {children}
        {withInitialFocus ? (
          <label>
            Level name <input ref={nameRef} />
          </label>
        ) : null}
      </Modal>
    </>
  )
}

/** Renders inside a `#root` element, like the real app, and opens the dialog. */
function renderOpen(props: HarnessProps = {}) {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
  const result = render(<Harness {...props} />, { container: root })

  const trigger = screen.getByRole('button', { name: 'Open dialog' })
  act(() => trigger.focus())
  fireEvent.click(trigger)
  return { ...result, root, trigger, dialog: screen.getByRole('dialog') }
}

function NestedHarness({ onOuterClose }: { onOuterClose: () => void }) {
  const [innerOpen, setInnerOpen] = useState(false)
  return (
    <Modal open onClose={onOuterClose} title="Edit level">
      <button type="button" onClick={() => setInnerOpen(true)}>
        Discard changes
      </button>
      <Modal open={innerOpen} onClose={() => setInnerOpen(false)} title="Discard changes?">
        <button type="button">Discard</button>
      </Modal>
    </Modal>
  )
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        <p>Secret content</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })

  it('renders an accessible, modal dialog in a portal when open', () => {
    const { dialog, root } = renderOpen()

    expect(dialog).toHaveAccessibleName('Delete level')
    expect(dialog).toHaveAccessibleDescription('This also deletes 4 records.')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(root).not.toContainElement(dialog)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('keeps the title for screen readers when hideTitle is set', () => {
    render(
      <Modal open onClose={() => {}} title="Search" hideTitle>
        <p>Body</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Search' })
    expect(screen.getByRole('heading', { name: 'Search' })).toHaveClass('sr-only')
    expect(dialog).not.toHaveAttribute('aria-describedby')
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    const { dialog } = renderOpen({ onClose })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lets a control inside claim Escape first', () => {
    const onClose = vi.fn()
    renderOpen({
      onClose,
      children: (
        <input
          aria-label="Combobox"
          onKeyDown={(event) => {
            if (event.key === 'Escape') event.preventDefault()
          }}
        />
      ),
    })

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Combobox' }), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves focus into the dialog, preferring its content over the close button', () => {
    const { dialog } = renderOpen()

    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    // No focusable body content here, so the first footer action (the safe one) gets focus.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('focuses initialFocusRef when given', () => {
    renderOpen({ withInitialFocus: true })
    expect(screen.getByRole('textbox', { name: 'Level name' })).toHaveFocus()
  })

  it('wraps Tab from the last element to the first, and Shift+Tab from the first to the last', () => {
    renderOpen()
    const closeButton = screen.getByRole('button', { name: 'Close' })
    const confirm = screen.getByRole('button', { name: 'Confirm' })

    act(() => confirm.focus())
    fireEvent.keyDown(confirm, { key: 'Tab' })
    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()
  })

  it('leaves Tab alone between elements in the middle', () => {
    renderOpen()
    const cancel = screen.getByRole('button', { name: 'Cancel' })

    act(() => cancel.focus())
    const notPrevented = fireEvent.keyDown(cancel, { key: 'Tab' })
    expect(notPrevented).toBe(true)
  })

  it('pulls focus back in when Tab is pressed while focus is outside', () => {
    renderOpen()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    act(() => outside.focus())

    fireEvent.keyDown(outside, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()

    act(() => outside.focus())
    fireEvent.keyDown(outside, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus()
    outside.remove()
  })

  it('restores focus to the trigger after closing', () => {
    const { trigger } = renderOpen()
    expect(trigger).not.toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('locks page scroll and makes the app inert while open, then restores both', () => {
    document.body.style.overflow = 'scroll'
    const { root } = renderOpen()

    expect(document.body.style.overflow).toBe('hidden')
    expect(root).toHaveAttribute('inert')
    expect(openModalCount()).toBe(1)

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

    expect(document.body.style.overflow).toBe('scroll')
    expect(root).not.toHaveAttribute('inert')
    expect(openModalCount()).toBe(0)
    document.body.style.overflow = ''
  })

  it('closes on a backdrop click, but not when the press started inside the panel', () => {
    const onClose = vi.fn()
    const { dialog } = renderOpen({ onClose })
    const backdrop = dialog.parentElement as HTMLElement

    // Press inside the panel, release on the backdrop (e.g. selecting text): stays open.
    fireEvent.mouseDown(dialog)
    fireEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores backdrop clicks when closeOnBackdrop is false', () => {
    const onClose = vi.fn()
    const { dialog } = renderOpen({ onClose, closeOnBackdrop: false })
    const backdrop = dialog.parentElement as HTMLElement

    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('only closes the top-most dialog on Escape when dialogs are nested', () => {
    const outerClose = vi.fn()
    render(<NestedHarness onOuterClose={outerClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    const outer = screen.getByRole('dialog', { name: 'Edit level' })
    const inner = screen.getByRole('dialog', { name: 'Discard changes?' })
    expect(inner).toContainElement(document.activeElement as HTMLElement)
    // The dialog underneath is out of reach while the nested one is open.
    expect(outer.parentElement).toHaveAttribute('inert')

    fireEvent.keyDown(inner, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Discard changes?' })).not.toBeInTheDocument()
    expect(outerClose).not.toHaveBeenCalled()
    expect(outer.parentElement).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Discard changes' })).toHaveFocus()

    fireEvent.keyDown(outer, { key: 'Escape' })
    expect(outerClose).toHaveBeenCalledTimes(1)
  })
})

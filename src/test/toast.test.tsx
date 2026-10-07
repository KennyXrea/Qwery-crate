import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ui/ToastProvider'
import type { ToastApi } from '../components/ui/toast-context'
import { useToast } from '../components/ui/useToast'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Renders a provider and hands back the toast api so tests can call it directly. */
function setup() {
  let api: ToastApi | undefined
  function Capture() {
    const toast = useToast()
    useEffect(() => {
      api = toast
    }, [toast])
    return null
  }
  render(
    <ToastProvider>
      <Capture />
    </ToastProvider>,
  )
  if (!api) throw new Error('toast api was not captured')
  const toast = api
  return {
    toast,
    politeRegion: getPoliteRegion(),
    alertRegion: screen.getByRole('alert'),
  }
}

function getPoliteRegion(): HTMLElement {
  const region = document.querySelector<HTMLElement>('[aria-live="polite"]')
  if (!region) throw new Error('polite live region not found')
  return region
}

describe('toasts', () => {
  it('renders both live regions, empty, before any toast is shown', () => {
    const { politeRegion, alertRegion } = setup()

    expect(politeRegion).toBeEmptyDOMElement()
    expect(alertRegion).toBeEmptyDOMElement()
    expect(alertRegion).toHaveAttribute('aria-live', 'assertive')
  })

  it('puts success and info toasts in the polite region', () => {
    const { toast, politeRegion, alertRegion } = setup()

    act(() => {
      toast.success('Level saved', { description: 'Bloodbath is now #1.' })
      toast.info('Heads up')
    })

    expect(within(politeRegion).getByText('Level saved')).toBeInTheDocument()
    expect(within(politeRegion).getByText('Bloodbath is now #1.')).toBeInTheDocument()
    expect(within(politeRegion).getByText('Heads up')).toBeInTheDocument()
    expect(alertRegion).toBeEmptyDOMElement()
  })

  it('puts error toasts in the assertive alert region', () => {
    const { toast, politeRegion, alertRegion } = setup()

    act(() => {
      toast.error('Could not save', { description: 'Are you still logged in?' })
    })

    expect(within(alertRegion).getByText('Could not save')).toBeInTheDocument()
    expect(within(alertRegion).getByText('Are you still logged in?')).toBeInTheDocument()
    expect(politeRegion).toBeEmptyDOMElement()
  })

  it('removes a toast with its dismiss button', () => {
    const { toast, politeRegion } = setup()
    act(() => {
      toast.success('Level saved')
    })

    fireEvent.click(within(politeRegion).getByRole('button', { name: 'Dismiss notification' }))

    expect(screen.queryByText('Level saved')).not.toBeInTheDocument()
  })

  it('describes each dismiss button by its toast title', () => {
    const { toast } = setup()
    act(() => {
      toast.success('Level saved')
      toast.info('Heads up')
    })

    const buttons = screen.getAllByRole('button', { name: 'Dismiss notification' })
    expect(buttons[0]).toHaveAccessibleDescription('Level saved')
    expect(buttons[1]).toHaveAccessibleDescription('Heads up')
  })

  it('keeps keyboard focus in a sensible place when focused toasts are dismissed', () => {
    let api: ToastApi | undefined
    function Page() {
      const toast = useToast()
      useEffect(() => {
        api = toast
      }, [toast])
      return <button type="button">Save</button>
    }
    render(
      <ToastProvider>
        <Page />
      </ToastProvider>,
    )
    const save = screen.getByRole('button', { name: 'Save' })
    act(() => save.focus())
    act(() => {
      api?.info('One', { duration: 0 })
      api?.info('Two', { duration: 0 })
      api?.info('Three', { duration: 0 })
    })
    const [one, two, three] = screen.getAllByRole('button', { name: 'Dismiss notification' })

    // Tab into the notifications, then close "Two" with its button: focus moves to the next one.
    act(() => two.focus())
    fireEvent.click(two)
    expect(screen.queryByText('Two')).not.toBeInTheDocument()
    expect(three).toHaveFocus()

    // Escape on the last toast: focus moves back to the previous toast.
    fireEvent.keyDown(three, { key: 'Escape' })
    expect(screen.queryByText('Three')).not.toBeInTheDocument()
    expect(one).toHaveFocus()

    // The last toast: focus goes back to where it was before entering the notifications.
    fireEvent.click(one)
    expect(screen.queryByText('One')).not.toBeInTheDocument()
    expect(save).toHaveFocus()
  })

  it('removes a toast by id with dismiss()', () => {
    const { toast } = setup()
    let id = ''
    act(() => {
      id = toast.info('Uploading…', { duration: 0 })
    })
    expect(screen.getByText('Uploading…')).toBeInTheDocument()

    act(() => toast.dismiss(id))
    expect(screen.queryByText('Uploading…')).not.toBeInTheDocument()
  })

  it('auto-dismisses success after 5s and errors after 8s', () => {
    vi.useFakeTimers()
    const { toast } = setup()
    act(() => {
      toast.success('Level saved')
      toast.error('Could not save')
    })

    act(() => vi.advanceTimersByTime(4999))
    expect(screen.getByText('Level saved')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Level saved')).not.toBeInTheDocument()
    expect(screen.getByText('Could not save')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(3000))
    expect(screen.queryByText('Could not save')).not.toBeInTheDocument()
  })

  it('respects a custom duration, and duration 0 keeps the toast until dismissed', () => {
    vi.useFakeTimers()
    const { toast } = setup()
    act(() => {
      toast.info('Quick one', { duration: 1000 })
      toast.info('Sticky one', { duration: 0 })
    })

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Quick one')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByText('Sticky one')).toBeInTheDocument()
  })

  it('pauses the timer while hovered with a mouse or focused', () => {
    vi.useFakeTimers()
    const { toast, politeRegion } = setup()
    act(() => {
      toast.success('Level saved')
    })
    const dismissButton = within(politeRegion).getByRole('button', { name: 'Dismiss notification' })
    const card = dismissButton.parentElement as HTMLElement

    act(() => vi.advanceTimersByTime(2000))
    fireEvent.pointerEnter(card, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(20_000))
    expect(screen.getByText('Level saved')).toBeInTheDocument()

    fireEvent.pointerLeave(card, { pointerType: 'mouse' })
    act(() => dismissButton.focus())
    act(() => vi.advanceTimersByTime(20_000))
    expect(screen.getByText('Level saved')).toBeInTheDocument()

    act(() => dismissButton.blur())
    act(() => vi.advanceTimersByTime(2999))
    expect(screen.getByText('Level saved')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Level saved')).not.toBeInTheDocument()
  })

  it('shows at most 4 toasts, dropping the oldest', () => {
    const { toast } = setup()
    act(() => {
      for (let n = 1; n <= 5; n += 1) toast.info(`Toast ${n}`)
    })

    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(4)
    expect(screen.getByText('Toast 5')).toBeInTheDocument()
  })

  it('replaces an identical toast instead of stacking duplicates', () => {
    const { toast } = setup()
    act(() => {
      toast.error('Could not save')
      toast.error('Could not save')
    })
    expect(screen.getAllByText('Could not save')).toHaveLength(1)
  })

  it('returns unique ids and keeps the api object stable across renders', () => {
    const { result, rerender } = renderHook(() => useToast(), { wrapper: ToastProvider })
    const first = result.current
    let a = ''
    let b = ''
    act(() => {
      a = first.info('One')
      b = first.info('Two')
    })
    rerender()

    expect(a).not.toBe(b)
    expect(result.current).toBe(first)
  })

  it('useToast throws a clear error outside <ToastProvider>', () => {
    // React logs the thrown error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/)
  })
})

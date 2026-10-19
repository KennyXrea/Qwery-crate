import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { IconCheck, IconCopy } from '../ui/icons'
import { useToast } from '../ui/useToast'

type CopyLevelIdButtonProps = {
  /** The in-game level ID (levels.gd_level_id). */
  gdLevelId: number
  className?: string
}

/** How long the button shows a check mark after copying, in milliseconds. */
const COPIED_FOR = 2000

/**
 * Copies the GD level ID to the clipboard (to paste into the game's search) and says so with a
 * toast. If the browser blocks the clipboard (old browser, page not on https…), an error toast
 * shows the ID so it can be copied by hand.
 */
export function CopyLevelIdButton({ gdLevelId, className }: CopyLevelIdButtonProps) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const text = String(gdLevelId)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_FOR)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      // navigator.clipboard is missing outside secure contexts (plain http), so check first.
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard not available')
      }
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Level ID copied', { description: `${text} is ready to paste in the game.` })
    } catch {
      toast.error("Couldn't copy the level ID", {
        description: `Your browser blocked the clipboard. The ID is ${text}.`,
      })
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      aria-label="Copy GD level ID"
      title="Copy level ID"
      onClick={() => void copy()}
      className={className}
    >
      {copied ? <IconCheck className="text-success" /> : <IconCopy />}
    </Button>
  )
}

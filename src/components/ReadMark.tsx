import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircleIcon, CheckIcon, CoinsIcon } from '@phosphor-icons/react'
import { Button } from './ui.tsx'

/**
 * Opening a page isn't reading it: the user says so with this button (like Du Chinese's
 * "mark as read"). Once read, it shows when, and can be undone.
 */
export function ReadMark({ readAt, onRead, onUnread }: { readAt?: number; onRead: () => Promise<number | void>; onUnread: () => void }) {
  const [coins, setCoins] = useState(0)
  if (readAt)
    return (
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="tile flex items-center gap-3 p-4">
        <CheckCircleIcon size={34} weight="fill" className="shrink-0 text-lv" />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-black">读完了</div>
          <div className="flex items-center gap-1 text-sm font-bold text-mute">
            {new Date(readAt).toLocaleDateString('zh-CN')}
            {coins > 0 && (
              <span className="ml-1 flex items-center gap-0.5 font-black text-huang-dark">
                <CoinsIcon size={14} weight="fill" />+{coins}
              </span>
            )}
          </div>
        </div>
        <button onClick={onUnread} className="h-10 shrink-0 rounded-xl px-2 text-sm font-extrabold text-mute active:bg-sunken">
          标成没读
        </button>
      </motion.div>
    )
  return (
    <Button tone="lv" className="w-full" onClick={async () => setCoins((await onRead()) || 0)}>
      <CheckIcon size={22} weight="bold" /> 我读完了
    </Button>
  )
}

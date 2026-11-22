import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadPhotos, useLoad } from '../lib/content.ts'
import type { Photo as PhotoInfo } from '../lib/types.ts'

const BASE = import.meta.env.BASE_URL

/**
 * The photo for a key (place/sichuan, city/leshan, feed/duanqiao …), once photos.json has loaded.
 * Given several keys, the first that has a photo wins.
 */
export function usePhoto(key?: string | string[]): PhotoInfo | undefined {
  const { data } = useLoad(loadPhotos, 'photos')
  if (!data || !key) return undefined
  for (const k of Array.isArray(key) ? key : [key]) if (data[k]) return data[k]
  return undefined
}

const parseRatio = (r: string) => {
  const [w, h] = r.split('/').map(Number)
  return h ? w / h : w || 16 / 9
}

/**
 * A photo with its credit. Renders nothing when there's no photo for the key, or it can't load
 * (offline and never seen before), so callers don't need to check.
 *
 * `ratio="auto"` (the default) uses the photo's own shape, kept between 4:3 and 2.4:1 so a tall
 * photo doesn't fill the screen. When the frame would cut off much of the photo, the whole photo
 * is shown over a blurred copy of itself instead. Tapping a big photo opens it full screen.
 */
export function Photo({
  k,
  ratio = 'auto',
  fit,
  credit = true,
  className = '',
}: {
  k?: string | string[]
  ratio?: string
  /** force cropping (small thumbnails) or showing all of it */
  fit?: 'cover' | 'contain'
  credit?: boolean
  className?: string
}) {
  const photo = usePhoto(k)
  const [failed, setFailed] = useState<string>()
  const [big, setBig] = useState(false)
  if (!photo || failed === photo.src) return null
  const natural = photo.w / photo.h
  const frame = ratio === 'auto' ? Math.min(Math.max(natural, 4 / 3), 2.4) : parseRatio(ratio)
  const contain = fit ? fit === 'contain' : Math.abs(Math.log(natural / frame)) > Math.log(1.12)
  const src = `${BASE}${photo.src}`
  return (
    <figure
      className={`relative overflow-hidden bg-line ${credit ? 'cursor-zoom-in' : ''} ${className}`}
      style={{ aspectRatio: `${frame}` }}
      onClick={credit ? () => setBig(true) : undefined}
    >
      {contain && <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl" />}
      <img
        src={src}
        width={photo.w}
        height={photo.h}
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 h-full w-full ${contain ? 'object-contain' : 'object-cover'}`}
        onError={() => setFailed(photo.src)}
      />
      {credit && (
        <a
          href={photo.page}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="photo-credit"
          aria-label={`照片来源：${photo.by}，${photo.lic}`}
        >
          {photo.by} · {photo.lic}
        </a>
      )}
      {big && <PhotoViewer photo={photo} onClose={() => setBig(false)} />}
    </figure>
  )
}

/** The whole photo on a dark screen. Tap anywhere (or Esc) to close. */
function PhotoViewer({ photo, onClose }: { photo: PhotoInfo; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return createPortal(
    <div
      role="dialog"
      aria-label="照片"
      className="safe-top safe-bottom fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center bg-black/90 p-3"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <img src={`${BASE}${photo.src}`} alt="" className="max-h-[85dvh] max-w-full rounded-lg object-contain" />
      <a href={photo.page} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-3 text-xs font-semibold text-white/75 underline">
        {photo.by} · {photo.lic}
      </a>
    </div>,
    document.body,
  )
}

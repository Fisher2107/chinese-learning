import { useState } from 'react'
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

/**
 * A photo with its credit. Renders nothing when there's no photo for the key, or it can't load
 * (offline and never seen before), so callers don't need to check.
 */
export function Photo({
  k,
  ratio = '16 / 9',
  credit = true,
  className = '',
}: {
  k?: string | string[]
  ratio?: string
  credit?: boolean
  className?: string
}) {
  const photo = usePhoto(k)
  const [failed, setFailed] = useState<string>()
  if (!photo || failed === photo.src) return null
  return (
    <figure className={`relative overflow-hidden bg-line ${className}`} style={{ aspectRatio: ratio }}>
      <img
        src={`${BASE}${photo.src}`}
        width={photo.w}
        height={photo.h}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
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
    </figure>
  )
}

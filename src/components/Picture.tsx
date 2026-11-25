import type { WordSource } from '../lib/db.ts'
import type { Picture as Pic } from '../lib/types.ts'
import { Photo, usePhoto } from './Photo.tsx'
import { ZhText } from './ZhText.tsx'

/**
 * A picture in the text, under the paragraph it belongs to, whole (never cropped) with its caption.
 * Shows nothing until its photo has been downloaded.
 */
export function InlinePicture({ pic, glossary, source, id }: { pic: Pic; glossary: Record<string, string>; source: WordSource; id: string }) {
  const photo = usePhoto(pic.key)
  if (!photo) return null
  return (
    <figure className="my-5 font-ui">
      <Photo k={pic.key} className="rounded-xl" />
      <figcaption className="mt-1.5 px-1">
        <ZhText ui id={id} paras={[{ kind: 'p', sentences: pic.caption }]} glossary={glossary} source={source} className="text-[14px] leading-snug font-bold text-mute" />
      </figcaption>
    </figure>
  )
}

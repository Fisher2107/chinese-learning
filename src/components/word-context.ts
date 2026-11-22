import { createContext, useContext } from 'react'
import type { Token } from '../lib/types.ts'
import type { WordSource } from '../lib/db.ts'

export interface WordTarget {
  token: Token
  /** English gloss from the content's glossary, if known */
  gloss?: string
  sentence: Token[]
  source: WordSource
  /** identifies the tapped spot so it can be highlighted */
  key: string
}

export interface WordSheetApi {
  open(target: WordTarget): void
  /** key of the word currently shown in the sheet or the peek bubble */
  active?: string
  /** DuChinese-style: show pinyin and meaning above the word while it's pressed */
  peek(target: WordTarget, rect: DOMRect): void
  /** hide the peek bubble, now or after a moment */
  unpeek(afterMs?: number): void
}

export const WordSheetContext = createContext<WordSheetApi>({ open: () => {}, peek: () => {}, unpeek: () => {} })
export const useWordSheet = () => useContext(WordSheetContext)

export const sentenceText = (tokens: Token[]) => tokens.map((t) => t.t).join('')

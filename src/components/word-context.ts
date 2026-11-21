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
  /** key of the word currently shown in the sheet */
  active?: string
}

export const WordSheetContext = createContext<WordSheetApi>({ open: () => {} })
export const useWordSheet = () => useContext(WordSheetContext)

export const sentenceText = (tokens: Token[]) => tokens.map((t) => t.t).join('')

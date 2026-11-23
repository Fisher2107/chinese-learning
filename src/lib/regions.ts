import { MAP_BY_ID, boxOf, regionColor } from './places.ts'
import type { Place, RegionInfo } from './types.ts'

/** The 分区 a province is in, and the names people use that include it (江浙沪…). */
export function blocksOf(id: string, regions: RegionInfo[]) {
  return {
    region: regions.find((r) => r.kind === '分区' && r.provinces.includes(id)),
    common: regions.filter((r) => r.kind === '常说' && r.provinces.includes(id)),
  }
}

/** A block's colour: its region's; for 江浙沪 and the like, the region of its first province. */
export function blockColor(r: RegionInfo, places: Place[]) {
  if (r.kind === '分区') return regionColor(r.name)
  return regionColor(places.find((p) => p.id === r.provinces[0])?.region ?? '')
}

/** Hand-placed names where the middle of the provinces would crowd a neighbour (华东 and 华中 sit side by side). */
const NAME_AT: Record<string, [number, number]> = { huadong: [836, 572], huazhong: [664, 566] }

/** Where a block's name goes on the map: the middle of its provinces, bigger ones counting more. */
export function blockCentre(r: RegionInfo): [number, number] {
  if (NAME_AT[r.id]) return NAME_AT[r.id]
  let [x, y, total] = [0, 0, 0]
  for (const id of r.provinces) {
    const p = MAP_BY_ID.get(id)
    if (!p) continue
    const w = Math.max((p.box[2] - p.box[0]) * (p.box[3] - p.box[1]), 1)
    x += p.cx * w
    y += p.cy * w
    total += w
  }
  return total ? [x / total, y / total] : [0, 0]
}

export const blockBox = (r: RegionInfo) => boxOf(r.provinces, 30)

/** The 网上的说法 a province's page shows: the first block whose note is for it, 江浙沪-style names before regions. */
export function onlineNoteFor(id: string, regions: RegionInfo[]) {
  const { region, common } = blocksOf(id, regions)
  return [...common, ...(region ? [region] : [])].find((r) => r.online.length && r.onlineFor.includes(id))
}

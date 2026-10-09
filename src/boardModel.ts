import { HORIZONS, type Horizon, type RoadmapItem } from './types'

export type BoardLane = {
  product: string
  cells: Record<Horizon, RoadmapItem[]>
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function buildBoard(items: RoadmapItem[]): BoardLane[] {
  const products: string[] = []
  const seen = new Set<string>()

  for (const item of items) {
    if (!seen.has(item.product)) {
      seen.add(item.product)
      products.push(item.product)
    }
  }

  return products.map((product) => {
    const cells = Object.fromEntries(
      HORIZONS.map((horizon) => [
        horizon,
        items
          .filter((item) => item.product === product && item.horizon === horizon)
          .sort(compareMonths),
      ]),
    ) as Record<Horizon, RoadmapItem[]>

    return { product, cells }
  })
}

export function formatMonth(value: string): string {
  const iso = value.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (iso) {
    const year = iso[1]
    const month = Number(iso[2])
    if (month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`
    }
  }

  const named = value.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (named) {
    const index = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase().startsWith(named[1].toLowerCase()),
    )
    if (index >= 0) return `${MONTH_NAMES[index].slice(0, 3)} ${named[2]}`
  }

  return value
}

export function statusTone(status: string): 'ok' | 'warn' | 'risk' | 'neutral' {
  const key = status.toLowerCase().replace(/\s+/g, ' ').trim()
  if (
    /^(on track|in progress|done|complete|completed|shipped|green|healthy)$/.test(
      key,
    )
  ) {
    return 'ok'
  }
  if (/^(at risk|delayed|slipping|yellow|watch)$/.test(key)) return 'warn'
  if (/^(blocked|off track|red|paused|slipped)$/.test(key)) return 'risk'
  return 'neutral'
}

export const HORIZON_COPY: Record<Horizon, { label: string; note: string }> = {
  now: { label: 'Now', note: 'Highest ranked' },
  next: { label: 'Next', note: 'Middle band' },
  later: { label: 'Later', note: 'Further out' },
}

function compareMonths(a: RoadmapItem, b: RoadmapItem): number {
  const left = monthSortKey(a.month)
  const right = monthSortKey(b.month)
  if (left !== right) return left.localeCompare(right)
  return a.title.localeCompare(b.title)
}

function monthSortKey(value: string): string {
  const iso = value.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}`
  return value
}

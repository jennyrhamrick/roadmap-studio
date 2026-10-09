import Papa from 'papaparse'
import {
  FIELDS,
  HORIZONS,
  REQUIRED_FIELDS,
  type ColumnMapping,
  type Field,
  type Horizon,
  type MappedSheet,
  type RawRow,
  type RoadmapItem,
  type RowIssue,
} from './types'

const HEADER_ALIASES: Record<Field, string[]> = {
  title: ['title', 'name', 'initiative', 'item', 'feature', 'work', 'epic'],
  horizon: [
    'horizon',
    'now/next/later',
    'now next later',
    'timeframe',
    'bucket',
    'phase',
    'when',
    'priority',
    'prio',
    'rank',
    'ranking',
  ],
  month: ['month', 'date', 'start', 'start month', 'target month', 'ship month'],
  product: ['product', 'products', 'area', 'line'],
  status: ['status', 'state', 'health'],
  owner: ['owner', 'lead', 'pm', 'dribble'],
}

const HORIZON_ALIASES: Record<string, Horizon> = {
  now: 'now',
  current: 'now',
  'in progress': 'now',
  this: 'now',
  next: 'next',
  upcoming: 'next',
  soon: 'next',
  later: 'later',
  future: 'later',
  someday: 'later',
  backlog: 'later',
}

export function emptyMapping(): ColumnMapping {
  return {
    title: '',
    horizon: '',
    month: '',
    product: '',
    status: '',
    owner: '',
  }
}

export function parseCsvText(text: string): { headers: string[]; rows: RawRow[] } {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => String(value ?? '').trim(),
  })

  if (result.errors.length && !result.data.length) {
    const first = result.errors[0]
    throw new Error(first.message || 'Could not parse this CSV.')
  }

  const headers = (result.meta.fields ?? []).filter(Boolean)
  const rows = result.data.filter((row) =>
    Object.values(row).some((value) => value.length > 0),
  )

  return { headers, rows }
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping = emptyMapping()
  const used = new Set<string>()

  for (const field of FIELDS) {
    const match = headers.find((header) => {
      if (used.has(header)) return false
      return HEADER_ALIASES[field].includes(normalizeHeader(header))
    })
    if (match) {
      mapping[field] = match
      used.add(match)
    }
  }

  return mapping
}

export function applyMapping(
  rows: RawRow[],
  mapping: ColumnMapping,
): MappedSheet {
  const items: RoadmapItem[] = []
  const issues: RowIssue[] = []
  const rawHorizons = rows.map((row) =>
    mapping.horizon ? (row[mapping.horizon] ?? '').trim() : '',
  )
  const ranked = rankHorizons(rawHorizons)

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const values = Object.fromEntries(
      FIELDS.map((field) => [field, mapping[field] ? (row[mapping[field]] ?? '') : '']),
    ) as Record<Field, string>

    const missingRequired = REQUIRED_FIELDS.filter((field) => !values[field])
    for (const field of missingRequired) {
      issues.push({
        rowNumber,
        field,
        message: `Missing ${field}`,
      })
    }

    const horizon = ranked[index]
    if (values.horizon && !horizon) {
      issues.push({
        rowNumber,
        field: 'horizon',
        message: `Priority “${values.horizon}” could not be ranked into now, next, or later`,
      })
    }

    if (missingRequired.length || (values.horizon && !horizon)) {
      return
    }

    items.push({
      rowNumber,
      title: values.title,
      horizon: horizon as Horizon,
      month: values.month,
      product: values.product,
      status: values.status,
      owner: values.owner,
    })
  })

  return { items, issues }
}

export function mappingReady(mapping: ColumnMapping): boolean {
  return REQUIRED_FIELDS.every((field) => mapping[field].length > 0)
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseHorizon(value: string): Horizon | null {
  const key = value.toLowerCase().replace(/\s+/g, ' ').trim()
  if ((HORIZONS as readonly string[]).includes(key)) return key as Horizon
  return HORIZON_ALIASES[key] ?? null
}

const NAMED_PRIORITY: Record<string, number> = {
  p0: 0,
  p1: 1,
  p2: 2,
  p3: 3,
  critical: 0,
  high: 1,
  urgent: 1,
  medium: 2,
  med: 2,
  low: 3,
}

function parsePriorityScore(value: string): number | null {
  const key = value.toLowerCase().replace(/\s+/g, ' ').trim()
  if (key in NAMED_PRIORITY) return NAMED_PRIORITY[key]
  const stripped = key.replace(/^p(?=\d)/, '')
  const num = Number(stripped)
  return Number.isFinite(num) ? num : null
}

function bandScores(scores: number[]): Map<number, Horizon> {
  const unique = [...new Set(scores)].sort((a, b) => a - b)
  const bands = new Map<number, Horizon>()
  if (unique.length === 1) {
    bands.set(unique[0], 'now')
    return bands
  }
  if (unique.length === 2) {
    bands.set(unique[0], 'now')
    bands.set(unique[1], 'later')
    return bands
  }
  const nowEnd = Math.ceil(unique.length / 3)
  const nextEnd = Math.ceil((2 * unique.length) / 3)
  unique.forEach((score, index) => {
    const horizon = index < nowEnd ? 'now' : index < nextEnd ? 'next' : 'later'
    bands.set(score, horizon)
  })
  return bands
}

export function rankHorizons(values: string[]): (Horizon | null)[] {
  const explicit = values.map((value) => (value ? parseHorizon(value) : null))
  const scores = values.map((value, index) =>
    explicit[index] || !value ? null : parsePriorityScore(value),
  )
  const numeric = scores.filter((score): score is number => score !== null)
  const bands = bandScores(numeric)

  return values.map((value, index) => {
    if (!value) return null
    if (explicit[index]) return explicit[index]
    const score = scores[index]
    if (score === null) return null
    return bands.get(score) ?? null
  })
}

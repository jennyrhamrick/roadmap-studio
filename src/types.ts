export const HORIZONS = ['now', 'next', 'later'] as const
export type Horizon = (typeof HORIZONS)[number]

export const REQUIRED_FIELDS = [
  'title',
  'horizon',
  'month',
  'product',
  'status',
] as const

export const OPTIONAL_FIELDS = ['owner'] as const

export const FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const
export type Field = (typeof FIELDS)[number]

export type ColumnMapping = Record<Field, string | ''>

export type RawRow = Record<string, string>

export type RoadmapItem = {
  rowNumber: number
  title: string
  horizon: Horizon
  month: string
  product: string
  status: string
  owner: string
}

export type RowIssue = {
  rowNumber: number
  field: Field | 'row'
  message: string
}

export type MappedSheet = {
  items: RoadmapItem[]
  issues: RowIssue[]
}

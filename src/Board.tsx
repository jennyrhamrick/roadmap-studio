import { useRef, useState } from 'react'
import { HORIZONS, type Horizon, type RoadmapItem } from './types'
import { HORIZON_COPY, buildBoard, formatMonth, statusTone } from './boardModel'
import { downloadPdf, downloadPng, exportFileBase } from './export'

const HORIZON_COUNT: Record<Horizon, number> = {
  now: 0,
  next: 0,
  later: 0,
}

type BoardProps = {
  items: RoadmapItem[]
}

export function Board({ items }: BoardProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)
  const [notice, setNotice] = useState('')
  const lanes = buildBoard(items)
  const counts = items.reduce(
    (acc, item) => {
      acc[item.horizon] += 1
      return acc
    },
    { ...HORIZON_COUNT },
  )
  const fileBase = exportFileBase(items)

  async function exportAs(kind: 'png' | 'pdf') {
    if (!sheetRef.current || busy) return
    setBusy(kind)
    setNotice('')
    try {
      if (kind === 'png') await downloadPng(sheetRef.current, fileBase)
      else await downloadPdf(sheetRef.current, fileBase)
      setNotice(`Saved ${fileBase}.${kind}`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `Could not export ${kind.toUpperCase()}.`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="board-shell" aria-label="Roadmap board">
      <div className="board-head">
        <div className="board-head-copy">
          <h2>Presentation board</h2>
          <p>
            Products as swimlanes. Priority ranks into Now, Next, and Later.
            Color is status.
          </p>
          {notice ? <p className="export-notice">{notice}</p> : null}
        </div>
        <div className="export-actions">
          <button
            type="button"
            className="btn primary"
            disabled={Boolean(busy)}
            onClick={() => void exportAs('png')}
          >
            {busy === 'png' ? 'Saving PNG…' : 'Export PNG'}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={Boolean(busy)}
            onClick={() => void exportAs('pdf')}
          >
            {busy === 'pdf' ? 'Saving PDF…' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="export-sheet" ref={sheetRef}>
        <div className="export-mast">
          <p>Roadmap Studio</p>
          <h3>Now · Next · Later</h3>
        </div>
        <div className="board">
          <div className="board-grid">
            <div className="board-corner">Product</div>
            {HORIZONS.map((horizon) => (
              <div key={horizon} className={`horizon-col ${horizon}`}>
                <span className="horizon-label">{HORIZON_COPY[horizon].label}</span>
                <span className="horizon-note">
                  {counts[horizon]} · {HORIZON_COPY[horizon].note}
                </span>
              </div>
            ))}

            {lanes.map((lane) => (
              <LaneRow key={lane.product} lane={lane} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function LaneRow({ lane }: { lane: ReturnType<typeof buildBoard>[number] }) {
  return (
    <>
      <div className="lane-label">
        <span>{lane.product}</span>
      </div>
      {HORIZONS.map((horizon) => (
        <div key={`${lane.product}-${horizon}`} className="lane-cell">
          {lane.cells[horizon].length ? (
            lane.cells[horizon].map((item) => (
              <Card key={item.rowNumber} item={item} />
            ))
          ) : (
            <p className="empty-cell">—</p>
          )}
        </div>
      ))}
    </>
  )
}

function Card({ item }: { item: RoadmapItem }) {
  const tone = statusTone(item.status)

  return (
    <article className={`card tone-${tone}`}>
      <h3>{item.title}</h3>
      <p className="card-month">{formatMonth(item.month)}</p>
      <div className="card-meta">
        <span className={`chip tone-${tone}`}>{item.status}</span>
        {item.owner ? <span className="owner">{item.owner}</span> : null}
      </div>
    </article>
  )
}

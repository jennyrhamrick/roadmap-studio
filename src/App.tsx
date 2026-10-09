import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Board } from './Board.tsx'
import { applyMapping, mappingReady, parseCsvText, suggestMapping } from './csv'
import { FIELDS, REQUIRED_FIELDS, type ColumnMapping, type Field, type RawRow } from './types'
import './App.css'

const REQUIRED_SET = new Set<string>(REQUIRED_FIELDS)

const FIELD_LABELS: Record<Field, string> = {
  title: 'Title',
  horizon: 'Priority → Now / Next / Later',
  month: 'Month',
  product: 'Product',
  status: 'Status',
  owner: 'Owner',
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>(suggestMapping([]))
  const [parseError, setParseError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [view, setView] = useState<'board' | 'table'>('board')
  const [mappingOpen, setMappingOpen] = useState(true)

  const mapped = useMemo(() => applyMapping(rows, mapping), [rows, mapping])
  const ready = mappingReady(mapping)

  async function ingestText(name: string, text: string) {
    setParseError('')
    try {
      const parsed = parseCsvText(text)
      if (!parsed.headers.length) {
        setParseError('That file has no header row.')
        return
      }
      setFileName(name)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      const nextMapping = suggestMapping(parsed.headers)
      setMapping(nextMapping)
      setView('board')
      setMappingOpen(!mappingReady(nextMapping))
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Could not read that file.')
    }
  }

  async function ingestFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a .csv file.')
      return
    }
    await ingestText(file.name, await file.text())
  }

  async function loadSample() {
    const response = await fetch('/sample-roadmap.csv')
    if (!response.ok) {
      setParseError('Could not load the sample CSV.')
      return
    }
    await ingestText('sample-roadmap.csv', await response.text())
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void ingestFile(file)
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file) void ingestFile(file)
  }

  function reset() {
    setFileName('')
    setHeaders([])
    setRows([])
    setMapping(suggestMapping([]))
    setParseError('')
    setView('board')
    setMappingOpen(true)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`app${rows.length && view === 'board' && ready ? ' wide' : ''}`}>
      <header className="mast">
        <p className="kicker">Slice 3 · Export</p>
        <h1>Roadmap Studio</h1>
        <p className="lede">
          Upload a CSV, present a Now / Next / Later board, then export a
          one-pager PNG or landscape PDF for an exec deck.
        </p>
      </header>

      {!rows.length ? (
        <section
          className={`dropzone${dragOver ? ' is-over' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="drop-title">Drop a roadmap CSV here</p>
          <p className="drop-copy">
            Expected columns: title, priority, month, product, status.
            Priority is ranked into now / next / later (1 is highest). Owner is
            optional.
          </p>
          <div className="drop-actions">
            <label className="btn primary">
              Choose file
              <input
                ref={inputRef}
                className="file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={onInputChange}
              />
            </label>
            <button type="button" className="btn ghost" onClick={() => void loadSample()}>
              Load sample
            </button>
          </div>
          {parseError ? <p className="error">{parseError}</p> : null}
        </section>
      ) : (
        <div className="workspace">
          <div className="toolbar">
            <div>
              <p className="file-name">{fileName}</p>
              <p className="meta">
                {rows.length} row{rows.length === 1 ? '' : 's'} · {headers.length}{' '}
                columns
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={reset}>
              Replace file
            </button>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>Column map</h2>
              <button
                type="button"
                className="text-btn"
                onClick={() => setMappingOpen((open) => !open)}
              >
                {mappingOpen ? 'Hide' : 'Edit mapping'}
              </button>
            </div>
            {mappingOpen ? (
              <>
                <p className="hint">
                  Match your sheet to the fields the board will use. Map Priority
                  (or Now / Next / Later) onto the horizon field. Lower numbers
                  rank as now, then next, then later.
                </p>
                <div className="map-grid">
                  {FIELDS.map((field) => (
                    <label key={field} className="field">
                      <span>
                        {FIELD_LABELS[field]}
                        {REQUIRED_SET.has(field) ? (
                          <em> required</em>
                        ) : (
                          <em> optional</em>
                        )}
                      </span>
                      <select
                        value={mapping[field]}
                        onChange={(event) =>
                          setMapping((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      >
                        <option value="">— skip —</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="hint compact">Mapping saved for this file.</p>
            )}
          </section>

          {!ready ? (
            <p className="banner">Map every required field to preview rows.</p>
          ) : (
            <>
              <section className="stats">
                <div>
                  <strong>{mapped.items.length}</strong>
                  <span>ready</span>
                </div>
                <div>
                  <strong>{mapped.issues.length}</strong>
                  <span>issues</span>
                </div>
                <div>
                  <strong>{new Set(mapped.items.map((item) => item.product)).size}</strong>
                  <span>products</span>
                </div>
              </section>

              {mapped.issues.length ? (
                <section className="panel issues">
                  <h2>Issues</h2>
                  <ul>
                    {mapped.issues.map((issue) => (
                      <li key={`${issue.rowNumber}-${issue.field}-${issue.message}`}>
                        Row {issue.rowNumber}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="banner ok">All rows look usable.</p>
              )}

              {mapped.items.length ? (
                <>
                  <div className="view-toggle" role="tablist" aria-label="View">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === 'board'}
                      className={view === 'board' ? 'is-active' : ''}
                      onClick={() => setView('board')}
                    >
                      Board
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === 'table'}
                      className={view === 'table' ? 'is-active' : ''}
                      onClick={() => setView('table')}
                    >
                      Table
                    </button>
                  </div>

                  {view === 'board' ? (
                    <Board items={mapped.items} />
                  ) : (
                    <section className="panel">
                      <h2>Preview</h2>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Title</th>
                              <th>Horizon</th>
                              <th>Month</th>
                              <th>Product</th>
                              <th>Status</th>
                              <th>Owner</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mapped.items.map((item) => (
                              <tr key={item.rowNumber}>
                                <td>{item.rowNumber}</td>
                                <td>{item.title}</td>
                                <td className="horizon">{item.horizon}</td>
                                <td>{item.month}</td>
                                <td>{item.product}</td>
                                <td>{item.status}</td>
                                <td>{item.owner || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <section className="panel">
                  <h2>Preview</h2>
                  <p className="hint">No valid rows yet. Fix the issues above.</p>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App

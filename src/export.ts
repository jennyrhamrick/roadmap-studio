import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { RoadmapItem } from './types'

const PAPER = '#f6f1e8'

export function exportFileBase(items: RoadmapItem[]): string {
  const keys = items
    .map((item) => monthKey(item.month))
    .filter((key): key is string => Boolean(key))
    .sort()
  const earliest = keys[0]
  if (!earliest) {
    const now = new Date()
    return `roadmap-${now.getFullYear()}-q${Math.floor(now.getMonth() / 3) + 1}`
  }
  const [year, month] = earliest.split('-').map(Number)
  return `roadmap-${year}-q${Math.floor((month - 1) / 3) + 1}`
}

export async function captureBoardPng(node: HTMLElement): Promise<string> {
  node.classList.add('is-capturing')
  try {
    return await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: PAPER,
    })
  } finally {
    node.classList.remove('is-capturing')
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function downloadPng(node: HTMLElement, base: string) {
  const dataUrl = await captureBoardPng(node)
  downloadDataUrl(dataUrl, `${base}.png`)
}

export async function downloadPdf(node: HTMLElement, base: string) {
  const dataUrl = await captureBoardPng(node)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 28
  const maxWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin * 2
  const image = pdf.getImageProperties(dataUrl)
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
  const width = image.width * scale
  const height = image.height * scale
  const x = (pageWidth - width) / 2
  const y = (pageHeight - height) / 2
  pdf.addImage(dataUrl, 'PNG', x, y, width, height)
  pdf.save(`${base}.pdf`)
}

function monthKey(value: string): string | null {
  const iso = value.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}`
  const named = value.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (!named) return null
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]
  const index = months.findIndex((name) => name.startsWith(named[1].toLowerCase()))
  if (index < 0) return null
  return `${named[2]}-${String(index + 1).padStart(2, '0')}`
}

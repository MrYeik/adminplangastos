// Exportación de reportes a PDF (jsPDF) y Excel (SheetJS).

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface ReporteData {
  titulo: string
  subtitulo?: string
  resumen: { label: string; valor: string }[]
  columnas: string[]
  filas: (string | number)[][]
}

const MARCA: [number, number, number] = [13, 148, 136]

function nombreArchivo(titulo: string, ext: string): string {
  const slug = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'reporte'}.${ext}`
}

export function exportarPDF(rep: ReporteData): void {
  const doc = new jsPDF()
  const margen = 14

  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(rep.titulo, margen, 18)

  let y = 25
  if (rep.subtitulo) {
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(rep.subtitulo, margen, y)
    y += 8
  }

  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  for (const item of rep.resumen) {
    doc.text(`${item.label}: ${item.valor}`, margen, y)
    y += 6
  }

  autoTable(doc, {
    startY: y + 3,
    head: [rep.columnas],
    body: rep.filas.map((f) => f.map((c) => String(c))),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: MARCA, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  doc.save(nombreArchivo(rep.titulo, 'pdf'))
}

export function exportarExcel(rep: ReporteData): void {
  const aoa: (string | number)[][] = [
    [rep.titulo],
    ...(rep.subtitulo ? [[rep.subtitulo]] : []),
    [],
    ...rep.resumen.map((r) => [r.label, r.valor]),
    [],
    rep.columnas,
    ...rep.filas,
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  XLSX.writeFile(wb, nombreArchivo(rep.titulo, 'xlsx'))
}

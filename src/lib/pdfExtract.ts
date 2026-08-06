// Extracción de texto de un PDF en el navegador, preservando la posición x de
// cada fragmento (necesaria para distinguir columnas, ej. pesos vs. dólares).

import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { LineaPDF, CeldaTexto } from './parseResumenNaranja'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

/** Lee un PDF y devuelve sus líneas (texto + celdas con posición x), por página. */
export async function extraerLineasPDF(file: File): Promise<LineaPDF[]> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })
  const doc = await loadingTask.promise
  const lineas: LineaPDF[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    const filas = new Map<number, CeldaTexto[]>()

    for (const it of tc.items) {
      if (!('transform' in it) || !('str' in it)) continue
      const str = (it.str ?? '').trim()
      if (!str) continue
      const y = Math.round(it.transform[5])
      const x = it.transform[4]
      if (!filas.has(y)) filas.set(y, [])
      filas.get(y)!.push({ x, str })
    }

    for (const [, items] of [...filas.entries()].sort((a, b) => b[0] - a[0])) {
      items.sort((a, b) => a.x - b.x)
      const texto = items
        .map((i) => i.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (texto) lineas.push({ pagina: p, texto, items })
    }
  }

  await loadingTask.destroy()
  return lineas
}

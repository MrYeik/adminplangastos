import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { documentosRepo } from '@/db/repos/documentos'
import type { Documento } from '@/models'

interface Props {
  entidadTipo: string
  entidadId: number
  titulo?: string
}

function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Botón con contador de adjuntos que abre un modal para gestionarlos. */
export default function BotonAdjuntos({ entidadTipo, entidadId, titulo = 'Adjuntos' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const docs = useLiveQuery(
    () => documentosRepo.deEntidad(entidadTipo, entidadId),
    [entidadTipo, entidadId],
    [] as Documento[],
  )

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      await documentosRepo.agregar({
        entidadTipo,
        entidadId,
        nombre: file.name,
        mime: file.type || 'application/octet-stream',
        blob: file,
      })
    }
    e.target.value = ''
  }

  const abrir = (doc: Documento) => {
    const url = URL.createObjectURL(doc.blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className={`relative rounded-lg p-1.5 transition-colors ${
          docs.length > 0
            ? 'text-brand-600 hover:bg-brand-50'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
        aria-label="Adjuntos"
        title="Adjuntos"
      >
        <Paperclip size={16} />
        {docs.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {docs.length}
          </span>
        )}
      </button>

      <Modal abierto={abierto} titulo={titulo} onCerrar={() => setAbierto(false)} ancho="max-w-md">
        <div className="space-y-4">
          {docs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
              Sin comprobantes adjuntos.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {docs.map((d) => {
                const esImagen = d.mime.startsWith('image/')
                return (
                  <li key={d.id} className="flex items-center justify-between py-2.5">
                    <button
                      onClick={() => abrir(d)}
                      className="flex min-w-0 items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          esImagen ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {esImagen ? <ImageIcon size={16} /> : <FileText size={16} />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 truncate text-sm font-medium text-slate-800">
                          {d.nombre} <ExternalLink size={12} className="shrink-0 text-slate-400" />
                        </span>
                        <span className="text-xs text-slate-400">{tamano(d.blob.size)}</span>
                      </span>
                    </button>
                    <button
                      onClick={() => d.id != null && documentosRepo.eliminar(d.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Eliminar adjunto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div>
            <Button variante="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Adjuntar comprobante
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              hidden
              onChange={subir}
            />
            <p className="mt-2 text-xs text-slate-400">Imágenes o PDF. Se guardan en este navegador.</p>
          </div>
        </div>
      </Modal>
    </>
  )
}

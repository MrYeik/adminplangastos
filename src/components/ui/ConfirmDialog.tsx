import Modal from './Modal'
import Button from './Button'

interface Props {
  abierto: boolean
  titulo?: string
  mensaje: string
  textoConfirmar?: string
  onConfirmar: () => void
  onCancelar: () => void
}

export default function ConfirmDialog({
  abierto,
  titulo = 'Confirmar',
  mensaje,
  textoConfirmar = 'Eliminar',
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={onCancelar} ancho="max-w-sm">
      <p className="text-sm text-slate-600">{mensaje}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variante="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button variante="danger" onClick={onConfirmar}>
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  )
}

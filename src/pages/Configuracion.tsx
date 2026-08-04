import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, Download, Upload, Trash2, Database, FileUp } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EditableList from '@/components/ui/EditableList'
import { Campo, TextInput } from '@/components/ui/Form'
import { useConfigStore } from '@/store/configStore'
import { descargarBackup, restaurarBackup, borrarTodo, esBackupValido } from '@/db/backup'
import { etiquetaMes } from '@/lib/dates'

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-slate-800">{titulo}</h2>
      {children}
    </div>
  )
}

export default function Configuracion() {
  const config = useConfigStore((s) => s.config)
  const actualizar = useConfigStore((s) => s.actualizar)
  const cargar = useConfigStore((s) => s.cargar)

  const [simbolo, setSimbolo] = useState('')
  const [moneda, setMoneda] = useState('')
  const [mesInicio, setMesInicio] = useState('')
  const [guardado, setGuardado] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [pendienteRestaurar, setPendienteRestaurar] = useState<unknown | null>(null)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setSimbolo(config.simboloMoneda)
      setMoneda(config.moneda)
      setMesInicio(config.mesInicioProyeccion)
    }
  }, [config])

  if (!config) {
    return (
      <PageShell titulo="Configuración">
        <p className="text-sm text-slate-400">Cargando…</p>
      </PageShell>
    )
  }

  const guardarGeneral = async () => {
    await actualizar({ simboloMoneda: simbolo || '$', moneda: moneda || 'ARS', mesInicioProyeccion: mesInicio })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const setLista = (campo: 'categorias' | 'bancos' | 'personas' | 'mediosPago', items: string[]) =>
    actualizar({ [campo]: items })

  const setDias = (items: string[]) => {
    const dias = Array.from(new Set(items.map((s) => parseInt(s, 10)).filter((n) => n > 0))).sort(
      (a, b) => b - a,
    )
    actualizar({ notificacionDias: dias })
  }

  const onArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (!esBackupValido(data)) {
          setAviso('El archivo no es un backup válido de GASTOS.')
          return
        }
        setPendienteRestaurar(data)
      } catch {
        setAviso('No se pudo leer el archivo (¿JSON inválido?).')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <PageShell titulo="Configuración" descripcion="Preferencias, listas y respaldo de datos">
      <div className="space-y-6">
        {/* General */}
        <Seccion titulo="General">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Símbolo de moneda">
              <TextInput value={simbolo} onChange={(e) => setSimbolo(e.target.value)} placeholder="$" />
            </Campo>
            <Campo label="Código de moneda">
              <TextInput value={moneda} onChange={(e) => setMoneda(e.target.value)} placeholder="ARS" />
            </Campo>
            <Campo label="Inicio de proyección" hint={`Ventana de 12 meses desde ${etiquetaMes(mesInicio || config.mesInicioProyeccion, true)}`}>
              <TextInput type="month" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} />
            </Campo>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={guardarGeneral}>
              <Save size={16} /> Guardar
            </Button>
            {guardado && <span className="text-sm text-emerald-600">✓ Guardado</span>}
          </div>
        </Seccion>

        {/* Listas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Seccion titulo="Categorías de gastos">
            <EditableList items={config.categorias} onChange={(i) => setLista('categorias', i)} placeholder="Nueva categoría" />
          </Seccion>
          <Seccion titulo="Bancos / emisores">
            <EditableList items={config.bancos} onChange={(i) => setLista('bancos', i)} placeholder="Nuevo banco" />
          </Seccion>
          <Seccion titulo="Personas">
            <EditableList items={config.personas} onChange={(i) => setLista('personas', i)} placeholder="Nueva persona" />
          </Seccion>
          <Seccion titulo="Medios de pago">
            <EditableList items={config.mediosPago} onChange={(i) => setLista('mediosPago', i)} placeholder="Nuevo medio de pago" />
          </Seccion>
        </div>

        {/* Notificaciones */}
        <Seccion titulo="Recordatorios">
          <p className="mb-3 text-sm text-slate-500">
            Días de anticipación para avisar sobre vencimientos.
          </p>
          <EditableList
            items={config.notificacionDias.map(String)}
            onChange={setDias}
            placeholder="Días (ej: 7)"
          />
        </Seccion>

        {/* Backup */}
        <Seccion titulo="Respaldo de datos">
          <p className="mb-4 text-sm text-slate-500">
            Tus datos se guardan solo en este navegador. Descargá un respaldo para no perderlos o
            para pasarlos a otra computadora.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variante="secondary" onClick={() => descargarBackup()}>
              <Download size={16} /> Exportar backup (JSON)
            </Button>
            <Button variante="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Importar backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={onArchivo} />
            <Button variante="danger" onClick={() => setConfirmarBorrar(true)}>
              <Trash2 size={16} /> Borrar todos los datos
            </Button>
          </div>
          {aviso && <p className="mt-3 text-sm text-rose-600">{aviso}</p>}
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
            <Database size={14} /> Los adjuntos (comprobantes) no se incluyen en el backup JSON.
          </div>
        </Seccion>

        {/* Importación */}
        <Seccion titulo="Importar movimientos">
          <p className="mb-4 text-sm text-slate-500">
            Cargá ingresos o gastos en lote desde un archivo CSV o Excel, evitando la carga manual.
          </p>
          <Link to="/importar">
            <Button variante="secondary">
              <FileUp size={16} /> Importar desde CSV / Excel
            </Button>
          </Link>
        </Seccion>
      </div>

      {/* Confirmaciones */}
      <ConfirmDialog
        abierto={pendienteRestaurar != null}
        titulo="Importar backup"
        mensaje="Esto reemplazará TODOS los datos actuales por los del archivo. ¿Continuar?"
        textoConfirmar="Importar y reemplazar"
        onCancelar={() => setPendienteRestaurar(null)}
        onConfirmar={async () => {
          if (esBackupValido(pendienteRestaurar)) {
            await restaurarBackup(pendienteRestaurar)
            await cargar()
            setAviso('Backup importado correctamente.')
          }
          setPendienteRestaurar(null)
        }}
      />

      <ConfirmDialog
        abierto={confirmarBorrar}
        titulo="Borrar todos los datos"
        mensaje="Se eliminarán ingresos, gastos, tarjetas, préstamos y presupuestos. Esta acción no se puede deshacer."
        textoConfirmar="Borrar todo"
        onCancelar={() => setConfirmarBorrar(false)}
        onConfirmar={async () => {
          await borrarTodo()
          setConfirmarBorrar(false)
          setAviso('Todos los datos fueron borrados.')
        }}
      />
    </PageShell>
  )
}

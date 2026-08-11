# Aura+ — Finanzas del Hogar

Aplicación web para la administración y planificación financiera personal/familiar.
Registra ingresos, gastos, tarjetas, préstamos y compromisos, y arma automáticamente
la proyección mensual y anual de la economía del hogar. Reemplaza la planilla de Excel.

Todo funciona **local en el navegador** (sin cuentas ni servidor): los datos se guardan
en IndexedDB de tu equipo.

---

## Cómo correrla

Requiere [Node.js](https://nodejs.org) 18+.

```bash
npm install        # instalar dependencias (una sola vez)
npm run dev        # servidor de desarrollo → http://localhost:5190
```

Otros comandos:

```bash
npm run build      # build de producción (genera la carpeta dist/)
npm run preview    # sirve el build de producción localmente
npm test           # corre los tests (Vitest)
```

Para publicarla, alcanza con servir el contenido de `dist/` en cualquier hosting estático.

### Instalar como app (PWA)

GASTOS es una **PWA**: se puede instalar y funciona **sin conexión**.

- Desde el navegador (Chrome/Edge/Android): botón **Instalar** en la barra de
  direcciones, o menú → *Instalar aplicación*.
- En iPhone/iPad (Safari): *Compartir → Agregar a inicio*.

Una vez instalada abre en su propia ventana, sin barra del navegador, y todo el
contenido queda cacheado para usarla aunque no haya internet. Se actualiza sola
cuando publicás una nueva versión.

> Los íconos se generan con `npm run generate-pwa-assets` a partir de
> `public/app-icon.svg` (solo hace falta si cambiás el logo).

---

## Funciones

- **Dashboard** — ingresos, gastos, disponible, comprometido en cuotas, deuda y
  capacidad de ahorro, con gráficos de distribución, evolución e ingresos vs. egresos.
- **Ingresos** y **Gastos** — alta/baja/modificación, con repetición mensual y
  clasificación fijo/variable por categoría.
- **Tarjetas** — cada tarjeta con sus compras en cuotas; el sistema genera el
  cronograma y las cuotas desaparecen solas al terminar.
- **Préstamos** — calcula cuotas restantes, saldo pendiente y próximo vencimiento.
- **Prestado** — dinero prestado a personas, con pagos parciales y estado
  (pendiente / parcial / cancelado).
- **Calendario financiero** — vista mensual con los vencimientos coloreados por tipo.
- **Presupuesto mensual** — flujo del mes y comparación real vs. presupuestado.
- **Proyección anual** — grilla de 12 meses que se recalcula sola.
- **Escenarios** — simulá "¿qué pasaría si…?" (subir el sueldo, agregar un préstamo)
  sin tocar tus datos reales.
- **Reportes** — mensual o anual, exportables a **PDF** y **Excel**, con indicadores
  financieros (% comprometido, endeudamiento, fijos vs. variables, etc.).
- **Búsquedas** — por descripción, comercio, persona, tarjeta, categoría o fecha.
- **Recordatorios** — avisos de vencimientos a 10 / 5 / 2 / 1 días (dentro de la app).
- **Gestión documental** — adjuntá comprobantes, facturas o contratos (PDF o imagen)
  a cada movimiento.
- **Configuración** — moneda, categorías, bancos, personas, medios de pago y días de aviso.

---

## Tus datos

Los datos viven **solo en este navegador** (IndexedDB). No se envían a ningún servidor.

- **Respaldo:** en *Configuración → Respaldo de datos* podés **exportar** toda la base a
  un archivo JSON e **importarlo** en otra computadora o navegador.
  > Los adjuntos (comprobantes) no se incluyen en el backup JSON.
- **Borrar los datos del navegador** (limpiar el sitio) elimina toda la información:
  exportá un respaldo antes.

### Importar desde CSV/Excel

En *Configuración → Importar movimientos* podés cargar ingresos o gastos en lote.
El archivo debe tener una fila de encabezados; la app detecta las columnas
automáticamente (Descripción, Importe, Fecha, Categoría, …) y te deja ajustarlas.

- Fechas admitidas: `DD/MM/AAAA`, `DD-MM-AAAA`, `AAAA-MM-DD`.
- Importes en formato local (`40.000` o `1.234,56`).
- CSV con separador `,` o `;`.

---

## Stack técnico

- **React 18 + Vite + TypeScript**
- **Tailwind CSS v4** para estilos
- **Dexie** (IndexedDB) para la persistencia local
- **Zustand** para estado global (configuración)
- **Recharts** para los gráficos
- **jsPDF** + **SheetJS (xlsx)** para exportar reportes
- **Vitest** para los tests de la lógica de negocio

### Estructura

```
src/
├── db/          # esquema Dexie, repos y backup
├── models/      # tipos de dominio
├── lib/         # lógica pura: cuotas, agregación, eventos, simulación… (+ tests)
├── store/       # hooks/estado (config, datos financieros, recordatorios)
├── components/  # UI reutilizable
└── pages/       # una página por módulo
```

La lógica de negocio (motor de cuotas, agregación mensual, proyección, presupuesto,
simulación, importación) está en `src/lib/` como funciones puras con tests en Vitest.

> Nota: los importes se guardan en **centavos (enteros)** para evitar errores de
> redondeo; se formatean al mostrarlos.

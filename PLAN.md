# GASTOS — Plan de arquitectura e implementación

App web de administración y planificación financiera personal/familiar.
Reemplaza la planilla Excel actual, automatizando cálculos (cuotas, proyecciones, vencimientos).

> **Estado:** propuesta para revisar. Nada de código todavía.
> Marcá con ✅ / ❌ / ✏️ (cambios) cada punto que quieras ajustar.

---

## 1. Decisiones de base (ya acordadas)

| Decisión | Elección | Motivo |
|---|---|---|
| Alcance | Local, un hogar, sin login | Rápido de tener funcionando, cero infraestructura |
| Framework | **React + Vite + TypeScript** | Moderno, rápido; TS evita errores con dinero/fechas |
| Persistencia | **IndexedDB vía Dexie.js** | Soporta volumen, consultas, adjuntos (blobs) y offline |
| Arranque | Plan completo antes de codear | Revisar arquitectura y fases juntos |

### Stack propuesto (a confirmar)

- **UI / build:** React 18 + Vite + TypeScript
- **Estilos:** Tailwind CSS (rápido y consistente) *(alternativa: CSS Modules si preferís)*
- **Ruteo:** React Router
- **Estado:** Zustand (store simple) + Dexie para persistencia
- **Base de datos:** Dexie.js sobre IndexedDB
- **Gráficos:** Recharts (dashboard, evolución, distribución)
- **Fechas:** date-fns (liviano; maneja bien el ejercicio Jul–Jun)
- **Dinero:** guardar en **enteros (centavos)** para evitar errores de coma flotante; formatear al mostrar
- **Export PDF:** jsPDF + jspdf-autotable
- **Export Excel:** SheetJS (xlsx)
- **Import CSV/Excel:** SheetJS + PapaParse
- **Iconos:** lucide-react

---

## 2. Modelo de datos

Cada entidad es una tabla en Dexie. Los importes se guardan en **centavos (enteros)**.
Las fechas como ISO `YYYY-MM-DD`.

### Ingresos
`id, descripcion, categoria, fecha, importe, repeticionMensual (bool), observaciones`

### Gastos
`id, descripcion, categoria, fecha, importe, medioPago, responsable, observaciones, repetitivoMensual (bool), tipo (fijo | variable)`
Categorías: Vivienda, Servicios, Alimentación, Transporte, Salud, Educación, Seguros, Entretenimiento, Impuestos, Otros (configurables).

### Tarjetas
`id, nombre, banco, color`  (Nativa, Naranja, Visa, Mastercard, …)

### ComprasTarjeta
`id, tarjetaId, descripcion, fechaCompra, comercio, cantidadCuotas, cuotaActual, importePorCuota, fechaFinalizacion (derivada), observaciones`

### Préstamos
`id, entidad, fecha, capital, cantidadCuotas, valorCuota, cuotaActual, fechaFinalizacion (derivada)`

### Prestado (dinero entre personas — hoja "Prestado")
`id, persona, concepto, importe, fecha, estado (pendiente | parcial | cancelado), pagos[]`

### Presupuesto (metas estimadas)
`id, categoria, mes, montoEstimado`  → para comparar real vs. presupuesto

### Documentos (adjuntos)
`id, entidadTipo, entidadId, nombre, mime, blob`  → comprobantes/facturas en IndexedDB

### Configuración (singleton)
`mesInicioProyeccion (mes/año elegible; la proyección muestra siempre 12 meses desde ahí), moneda (ARS), formatoMoneda, colores, categorias[], bancos[], tarjetas[], personas[], notificaciones{dias:[10,5,2,1]}`

---

## 3. El motor de cuotas (el corazón de la app)

En vez de guardar una fila por cada cuota, se **guarda la compra/préstamo** y el cronograma se **calcula** a partir de:
`fechaInicio + cantidadCuotas + importePorCuota + cuotaActual`.

Ventajas:
- La **proyección se actualiza sola**.
- Cuando se completan las cuotas, **desaparecen automáticamente** de los meses futuros (sin borrar nada a mano).
- "Cuota actual" permite cargar compras que ya vienen empezadas.

Funciones puras centrales (con tests):
- `cuotasDeCompra(compra) → [{ mes, nroCuota, importe }]`
- `obligacionesDelMes(mes) → { tarjetas, prestamos, servicios, impuestos }`
- `proyeccion(mesInicio, 12) → matriz mensual` (vista de 12 meses desde el mes de inicio configurable)
- `saldoEsperado(mes) = ingresos − gastosFijos − gastosVariables − cuotas`

---

## 4. Módulos / pantallas (mapeo al spec)

| # | Módulo | Contenido |
|---|---|---|
| 1 | **Dashboard** | Ingreso mensual, total gastos, disponible, comprometido en cuotas, próximos vencimientos, fijos, variables, deuda pendiente, gráfico distribución, evolución mensual, ingresos vs gastos |
| 2 | **Ingresos** | ABM + repetición mensual |
| 3 | **Gastos** | ABM + fijo/variable + repetitivo mensual |
| 4 | **Tarjetas** | Cada tarjeta independiente + compras con cuotas autogeneradas |
| 5 | **Préstamos** | ABM + cuotas restantes, total pendiente, próximo vencimiento (autocalculado) |
| 6 | **Prestado** | Dinero entre personas + estados y pagos parciales |
| 7 | **Calendario** | Vista mensual con colores por tipo (sueldo, vencimientos, tarjetas, préstamos, servicios, impuestos) |
| 8 | **Presupuesto mensual** | Ingresos → Fijos → Variables → Cuotas → Saldo, vs presupuesto estimado |
| 9 | **Proyección anual** | Jul–Jun; filas: servicios, tarjetas, préstamos, fijos, variables, total; se actualiza sola |
| 10 | **Reportes** | Por mes/año/categoría/tarjeta/préstamo/persona → export PDF y Excel |
| 11 | **Búsquedas** | Por descripción, comercio, persona, tarjeta, categoría, fecha |
| 12 | **Recordatorios** | Alertas a 10/5/2/1 días (tarjetas, servicios, préstamos, impuestos) |
| 13 | **Configuración** | Mes inicial, moneda, colores, categorías, bancos, tarjetas, personas, notificaciones |

### Funciones extra (del spec)
- **Historial de cuotas** — fin automático de cada préstamo/compra
- **Centro de obligaciones** — vista única de todos los vencimientos
- **Indicadores financieros** — % de sueldo comprometido, capacidad de ahorro, endeudamiento mensual, fijos vs variables, evolución del patrimonio
- **Escenarios / simulación** — "¿y si agrego un préstamo de $5.000.000 en 36 cuotas?", "¿y si sube el sueldo 10%?"
- **Gestión documental** — adjuntar comprobantes/facturas/contratos (PDF o imagen)
- **Importación automática** — CSV/Excel para evitar carga manual

> **Nota sobre recordatorios:** al ser app local sin backend, las alertas son **dentro de la app** (badges + centro de notificaciones al abrirla). Notificaciones push/mail reales requerirían servidor — se puede sumar después si migrás a nube.

---

## 5. Estructura de carpetas

```
GASTOS/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── db/                # Dexie: esquema, migraciones, seed
    ├── models/            # tipos TypeScript de cada entidad
    ├── lib/               # motor de cuotas, proyección, dinero, fechas
    │   ├── cuotas.ts
    │   ├── proyeccion.ts
    │   ├── money.ts
    │   └── indicadores.ts
    ├── store/             # Zustand stores
    ├── components/        # UI reutilizable (tablas, formularios, gráficos)
    ├── pages/             # una carpeta por módulo (dashboard, ingresos, …)
    ├── features/          # lógica por módulo
    └── utils/
```

---

## 6. Fases de implementación

- **Fase 0 — Scaffold:** Vite + React + TS + Tailwind + Router, capa Dexie, layout/nav, configuración inicial y datos de ejemplo.
- **Fase 1 — Núcleo:** Ingresos y Gastos (ABM + repetición mensual) + **motor de cuotas** con tests.
- **Fase 2 — Deuda:** Tarjetas + compras/cuotas, Préstamos, Prestado.
- **Fase 3 — Dashboard:** métricas + gráficos (distribución, evolución, ingresos vs gastos).
- **Fase 4 — Planificación:** Presupuesto mensual + Proyección anual (Jul–Jun).
- **Fase 5 — Agenda:** Calendario financiero + Centro de obligaciones + Recordatorios in-app.
- **Fase 6 — Reportes:** PDF/Excel + Búsquedas + Indicadores financieros.
- **Fase 7 — Avanzado:** Escenarios/simulación, gestión documental, importación CSV/Excel, configuración avanzada.

Cada fase deja algo **usable y verificable** en el navegador antes de pasar a la siguiente.

---

## 7. Puntos a confirmar antes de codear

1. **Tailwind** vs. CSS Modules → ✅ Tailwind.
2. **Moneda:** ARS con formato `$1.234.567`. ✅
3. **Ejercicio financiero:** ✅ el mes/año de inicio es **elegible** en Configuración; la proyección muestra **siempre 12 meses** desde ahí.
4. **Backup:** ✅ export/import de toda la base a archivo JSON.
5. **Idioma UI:** español (Argentina). ✅
6. Prioridad de módulos: sin preferencia → se sigue el orden de fases.

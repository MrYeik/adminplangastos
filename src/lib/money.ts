// Utilidades de dinero. Interno: CENTAVOS (enteros). Presentación: formato ARS.

/** Convierte un número de pesos (float) a centavos enteros. */
export function aCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

/** Convierte centavos a pesos (float) para mostrar/editar. */
export function aPesos(centavos: number): number {
  return centavos / 100
}

const nf = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const nfDec = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formatea centavos como moneda ARS: $1.234.567
 * @param conDecimales si true muestra los centavos ($1.234.567,89)
 */
export function formatMoney(
  centavos: number,
  simbolo = '$',
  conDecimales = false,
): string {
  const signo = centavos < 0 ? '-' : ''
  const pesos = Math.abs(aPesos(centavos))
  const cuerpo = conDecimales ? nfDec.format(pesos) : nf.format(Math.round(pesos))
  return `${signo}${simbolo}${cuerpo}`
}

const nfCompact = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Formato compacto para ejes de gráficos: $1,5 M, $600 k. */
export function formatMoneyCompact(centavos: number, simbolo = '$'): string {
  const signo = centavos < 0 ? '-' : ''
  return `${signo}${simbolo}${nfCompact.format(Math.abs(aPesos(centavos)))}`
}

/**
 * Parsea texto ingresado por el usuario a centavos, con heurística es-AR:
 *  - La coma es siempre separador decimal: "1.234,56" -> 1234.56
 *  - Sin coma, el punto es separador de miles cuando hay más de uno
 *    o cuando va seguido de exactamente 3 dígitos: "50.000" -> 50000
 *  - Sin coma y con un punto seguido de 1-2 dígitos, es decimal: "1234.56" -> 1234.56
 */
export function parseMoney(texto: string): number {
  if (!texto) return 0
  const limpio = texto.trim().replace(/[^\d.,-]/g, '')
  if (!limpio) return 0

  let normalizado: string
  if (limpio.includes(',')) {
    // coma = decimal, punto = miles
    normalizado = limpio.replace(/\./g, '').replace(',', '.')
  } else if (limpio.includes('.')) {
    const cantidadPuntos = (limpio.match(/\./g) || []).length
    const decimales = limpio.slice(limpio.lastIndexOf('.') + 1).length
    if (cantidadPuntos > 1 || decimales === 3) {
      // punto(s) como separador de miles
      normalizado = limpio.replace(/\./g, '')
    } else {
      // punto como separador decimal
      normalizado = limpio
    }
  } else {
    normalizado = limpio
  }

  const valor = parseFloat(normalizado)
  return Number.isFinite(valor) ? aCentavos(valor) : 0
}

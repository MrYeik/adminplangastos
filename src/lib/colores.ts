// Paleta categórica para gráficos (consistente con la marca, buen contraste).
export const PALETA = [
  '#0d9488', // brand teal
  '#4f46e5', // indigo
  '#db2777', // pink
  '#ea580c', // orange
  '#0891b2', // cyan
  '#9333ea', // purple
  '#16a34a', // green
  '#ca8a04', // yellow
  '#dc2626', // red
  '#475569', // slate
]

export function colorCategoria(indice: number): string {
  return PALETA[indice % PALETA.length]
}

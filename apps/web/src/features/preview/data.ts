import type { MockReward } from '../../types/preview'

// TASK 01: datos visuales fijos, sin cálculo económico ni persistencia.
// No reutilizar como catálogo real, saldo o política de fidelización.
export const mockPoints = { balanceLabel: '84', unit: 'pts' }
export const mockTransactions = [
  { id: 'mock-t1', title: 'Compra', detail: 'Ejemplo de movimiento', deltaLabel: '+10 pts', positive: true },
  { id: 'mock-t2', title: 'Compra', detail: 'Ejemplo de movimiento', deltaLabel: '+6 pts', positive: true },
  { id: 'mock-t3', title: 'Canje', detail: 'Ejemplo de movimiento', deltaLabel: '−30 pts', positive: false },
]
export const mockRewards: MockReward[] = [
  { id: 'mock-r1', title: '$1.000 OFF', detail: 'Un pequeño premio para tu próxima visita.', costLabel: '10 pts' },
  { id: 'mock-r2', title: '$2.000 OFF', detail: 'Más noches compartidas. Más motivos para volver.', costLabel: '30 pts' },
  { id: 'mock-r3', title: '50% OFF', detail: 'Descuento de ejemplo · máximo $3.000.', costLabel: '60 pts' },
]
export const mockProfile = { name: 'Alex', initials: 'A', caption: 'Perfil de demostración' }

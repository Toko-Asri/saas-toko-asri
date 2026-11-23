export type NadaStatus = 'netral' | 'info' | 'sukses' | 'peringatan' | 'bahaya'

export const STATUS_PO: Record<string, { teks: string; nada: NadaStatus }> = {
  draft: { teks: 'Draft', nada: 'netral' },
  dipesan: { teks: 'Dipesan', nada: 'info' },
  diterima: { teks: 'Diterima', nada: 'sukses' },
  dibatalkan: { teks: 'Dibatalkan', nada: 'bahaya' },
}

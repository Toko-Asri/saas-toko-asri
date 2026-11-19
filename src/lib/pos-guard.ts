// Aturan tombol Bayar di POS. Pelanggan terpilih yang sudah tidak tersedia (mis. dinonaktifkan) memblokir
// pembayaran sampai kasir memilih pelanggan lain atau memilih tamu secara eksplisit.
export function bisaBayar(s: { jumlahItem: number; memproses: boolean; kembalian: number | null; pelangganHilang: boolean }): boolean {
  return s.jumlahItem > 0 && !s.memproses && s.kembalian !== null && !s.pelangganHilang
}

// Penjaga klik ganda: menjalankan fungsi async hanya satu kali pada satu waktu. Panggilan saat masih
// berjalan diabaikan (mengembalikan undefined); kunci dilepas setelah selesai atau gagal. Tidak bergantung
// pada render ulang, sehingga klik ganda dalam satu tick pun hanya menjalankan fungsi sekali.
export function buatPenjaga() {
  let berjalan = false
  return {
    async jalankan<T>(fn: () => Promise<T>): Promise<T | undefined> {
      if (berjalan) return undefined
      berjalan = true
      try {
        return await fn()
      } finally {
        berjalan = false
      }
    },
  }
}

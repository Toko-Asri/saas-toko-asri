// Aturan tombol Bayar di POS. Pelanggan terpilih yang sudah tidak tersedia (mis. dinonaktifkan) memblokir
// pembayaran sampai kasir memilih pelanggan lain atau memilih tamu secara eksplisit.
export function bisaBayar(s: { jumlahItem: number; memproses: boolean; kembalian: number | null; pelangganHilang: boolean }): boolean {
  return s.jumlahItem > 0 && !s.memproses && s.kembalian !== null && !s.pelangganHilang
}

// Penjaga klik ganda: menjalankan fungsi async hanya satu kali pada satu waktu. Panggilan saat masih
// berjalan diabaikan (mengembalikan undefined); kunci dilepas setelah selesai atau gagal. Tidak bergantung
// pada render ulang, sehingga klik ganda dalam satu tick pun hanya menjalankan fungsi sekali.
//
// Opsi `kunciSetelahSukses`: bila fungsi selesai dan predikat ini bernilai true, penjaga TETAP terkunci sampai
// `lepas()` dipanggil. Dipakai pada Bayar agar kasir tidak dapat membuat transaksi kedua selagi halaman struk dimuat.
export function buatPenjaga() {
  let berjalan = false
  return {
    async jalankan<T>(fn: () => Promise<T>, opsi?: { kunciSetelahSukses?: (hasil: T) => boolean }): Promise<T | undefined> {
      if (berjalan) return undefined
      berjalan = true
      let tetapTerkunci = false
      try {
        const hasil = await fn()
        tetapTerkunci = opsi?.kunciSetelahSukses?.(hasil) === true
        return hasil
      } finally {
        if (!tetapTerkunci) berjalan = false
      }
    },
    lepas() {
      berjalan = false
    },
  }
}

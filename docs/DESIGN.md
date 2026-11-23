# Design system Toko Asri

Aplikasi internal ERP/SCM/CRM di balik login, jadi tampilannya mengutamakan **keterbacaan angka, kecepatan kerja, dan kenyamanan layar sentuh**, dengan nuansa "frozen fresh": biru sky yang bersih, navy dingin, dan aksen mint. Seluruh perubahan desain hanya menyentuh lapisan tampilan; logika bisnis, database, RPC, dan hak akses per peran tidak berubah.

## Token (`src/app/globals.css`, blok `@theme`)

| Token | Nilai / fungsi |
|---|---|
| `brand-50…950` | Biru sky (sama dengan palet awal, disempurnakan dengan 950). Warna aksi utama = `brand-700`. |
| `ink-700…950` | Navy dingin untuk sidebar, intro, dan hero. |
| `ice` | Latar halaman `#f4f9fc` (putih kebiruan, lebih lembut dari putih murni). |
| `mint-50/100/600/700` | Aksen positif (laba, sukses, kembalian). |
| `slate-500`, `slate-400` | Dioverride sedikit lebih gelap agar teks redup lolos kontras WCAG AA (≥ 4,5:1) di atas latar es dan putih. |
| `--radius-card` | `1rem` (kartu `rounded-2xl`, kontrol `rounded-xl`). |
| `shadow-card`, `shadow-pop`, `shadow-glow` | Bayangan halus untuk kartu, kartu yang terangkat (hover/popup), dan cincin fokus input. |
| Font | **Plus Jakarta Sans** (`next/font`, di-host sendiri saat build) + Geist Mono untuk kode batch/nomor. |

Hierarki tipografi: judul halaman `text-2xl/[1.7rem] font-bold tracking-tight`; judul bagian `text-lg font-bold`; isi `text-sm`; keterangan `text-xs text-slate-500`; angka memakai kelas `tabular`.

## Komponen

| Berkas | Isi |
|---|---|
| `src/components/ui.tsx` | `Card`, `Table`, `Field`, `Banner`, `PageHeader`, `Badge` (nada: netral/info/sukses/peringatan/bahaya/emas), `LencanaTier`, `EmptyState`, `BarisKosong`, `Skeleton`, `KpiCard`, `Stat`, `pilCls`, kelas tombol (`btnCls`, `btnSoftCls`, `btnGhostCls`, `btnDangerCls`, `btnWaCls`), `inputCls`. |
| `src/components/shell/app-shell.tsx` | Sidebar yang dapat diciutkan (status disimpan di `localStorage`), indikator halaman aktif, header nama + peran, drawer mobile (Esc menutup, scroll latar dikunci), tautan "Lewati ke konten". |
| `src/lib/nav.ts` | `itemAktif`, `kelompokMenu`, `inisial`, `perluIntro` (diuji unit). Pengelompokan hanya tampilan; hak akses tetap di `src/lib/roles.ts`. |
| `src/components/logo.tsx` | Logo (kristal es + wordmark). |
| `src/components/grafik.tsx` | Grafik batang harian (grid, sumbu Y bulat lewat `batasAtas`, tooltip hover/fokus). |
| `src/components/tren.tsx`, `perlu-tindakan.tsx`, `skeletons.tsx` | Chip tren, panel "Perlu tindakan", kerangka pemuatan (`loading.tsx` di `(app)/` dan `kasir/`). |

Ikon: **lucide-react**, ukuran `size-4` (inline) / `size-5` (menu, KPI) / `size-6` (empty state), `strokeWidth` bawaan, selalu `aria-hidden` bila dekoratif.

## Aturan gerak

Gerak dipakai **hanya bila punya tujuan** dan tidak serentak:

- **Opening login** (2,4 dtk + 0,45 dtk memudar): sekali per sesi (`sessionStorage`), tombol *Lewati* dan tombol Esc, dilewati penuh bila `prefers-reduced-motion`. Keputusan "lewati" dibuat sebelum paint oleh skrip kecil di `login/page.tsx` agar tidak berkedip.
- **Transisi halaman**: `template.tsx` memberi fade-up singkat (0,5 dtk) pada konten setiap navigasi.
- **Staggered reveal**: hanya kartu KPI dan panel dashboard (`style="--i:N"`, jeda 70 ms per item); batang grafik tumbuh bertahap (jeda 22 ms, maksimal 20 batang).
- **Micro-interaction**: hover kartu terangkat 2 px, tombol `active:scale-[0.98]`, ikon menu membesar sedikit saat hover, sidebar menciut dengan transisi lebar 300 ms.
- **Reduced motion**: satu aturan global di `globals.css` mematikan semua animasi dan transisi.

## Cetak

Struk (`/kasir/riwayat/[id]`): saat dicetak sidebar, header, banner, dan tombol disembunyikan (`.no-print`); lebar struk dibatasi **80 mm** (`.struk`); header memakai teks nama toko karena latar gradien logo tidak ikut tercetak. Untuk printer termal, pilih kertas 80 mm di dialog cetak.

## Aksesibilitas

- Kontras teks memenuhi WCAG 2.1 AA; pemeriksaan axe-core pada halaman login, dashboard, kasir, inventori, pelanggan, laporan, dan struk: **0 pelanggaran**.
- Fokus terlihat (`:focus-visible`), navigasi `aria-current="page"`, drawer `role="dialog"`, grup metode bayar `role="radiogroup"`, target sentuh POS ≥ 40 px.

## Menambah halaman baru

1. Bungkus judul dengan `PageHeader`; isi dengan `Card`/`Table`; gunakan `Badge` untuk status, bukan kelas warna manual.
2. Tabel kosong: `BarisKosong`; blok kosong: `EmptyState`.
3. Tombol dan input: kelas dari `ui.tsx` (jangan menulis ulang `rounded border …`).
4. Warna hanya lewat token (`brand-*`, `mint-*`, `ink-*`, `slate-*`), bukan hex.
5. Tambahkan item menu di `src/lib/roles.ts` (akses) **dan** pemetaan kelompok/ikon di `src/lib/nav.ts`; tes `nav.test.ts` memastikan tidak ada item menu yang hilang.
6. Bila halaman lambat, tambahkan `loading.tsx` dengan `SkeletonHalaman`.

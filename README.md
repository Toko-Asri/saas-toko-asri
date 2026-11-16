# SaaS Toko Asri — ERP, SCM & CRM

Aplikasi web terintegrasi untuk **Toko Asri** (retail frozen food) yang menggabungkan tiga modul dalam satu aplikasi:

| Modul | Fokus |
|---|---|
| **ERP** | Penjualan & kasir, keuangan, karyawan, laporan |
| **SCM** | Supplier, pembelian (PO), stok & gudang, kedaluwarsa & suhu |
| **CRM** | Data pelanggan, riwayat belanja, promo & poin, keluhan |

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Supabase](https://supabase.com) (PostgreSQL + Auth) lewat `@supabase/ssr`
- ESLint

## Menjalankan di komputer sendiri

Butuh **Node.js 20 atau lebih baru**.

```bash
git clone https://github.com/Toko-Asri/saas-toko-asri.git
cd saas-toko-asri
npm install
cp .env.example .env.local   # lalu isi nilai Supabase (boleh dilewati dulu)
npm run dev
```

Buka <http://localhost:3000>.

Perintah lain:

```bash
npm run lint    # cek kode
npm run build   # build produksi
```

## Struktur folder

```
src/
├── app/
│   ├── page.tsx              # beranda (pilih modul)
│   └── (dashboard)/
│       ├── erp/page.tsx      # halaman modul ERP
│       ├── scm/page.tsx      # halaman modul SCM
│       └── crm/page.tsx      # halaman modul CRM
├── components/               # komponen UI bersama
├── lib/supabase/
│   ├── client.ts             # klien Supabase untuk browser
│   └── server.ts             # klien Supabase untuk server
└── modules/
    ├── index.ts              # daftar modul & fitur
    ├── erp/                  # logika bisnis ERP
    ├── scm/                  # logika bisnis SCM
    └── crm/                  # logika bisnis CRM
supabase/
└── migrations/               # file SQL skema database (tahap berikutnya)
```

## Alur kerja Git

- Jangan push langsung ke `main`. Buat branch baru, lalu ajukan Pull Request.
- Jangan menjalankan migration ke database produksi atau deploy publik tanpa persetujuan pemilik proyek.
- File `.env.local` berisi kunci rahasia dan tidak boleh di-commit.

## Status

Tahap saat ini: **kerangka proyek**. Skema database, autentikasi, dan fitur tiap modul akan ditambahkan bertahap.

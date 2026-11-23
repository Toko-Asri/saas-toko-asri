// Template dibuat ulang tiap navigasi: memberi transisi masuk halus pada setiap halaman tanpa kode klien.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>
}

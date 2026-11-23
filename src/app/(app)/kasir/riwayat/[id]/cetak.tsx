'use client'
import { Printer } from 'lucide-react'
import { btnCls } from '@/components/ui'

export function TombolCetak() {
  return <button type="button" onClick={() => window.print()} className={btnCls + ' no-print w-full !py-3'}><Printer aria-hidden className="size-4" />Cetak struk</button>
}

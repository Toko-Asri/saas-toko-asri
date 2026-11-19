'use client'
import { btnCls } from '@/components/ui'

export function TombolCetak() {
  return <button type="button" onClick={() => window.print()} className={btnCls + ' print:hidden'}>Cetak struk</button>
}

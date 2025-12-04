"use client"
import * as React from 'react'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function UploadSessionsDialog({ existing }: { existing: string[] }) {
  const [selectedNames, setSelectedNames] = React.useState<string[]>([])
  const [files, setFiles] = React.useState<File[]>([])
  const [hasDuplicates, setHasDuplicates] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? [])
    setFiles(list)
    const names = list.map((f) => f.name)
    setSelectedNames(names)
    const dup = names.filter((n) => existing.includes(n))
    setHasDuplicates(dup.length > 0)
  }

  const onUpload = async () => {
    if (hasDuplicates || files.length === 0) return
    try {
      setUploading(true)
      setErrorMsg(null)
      for (const f of files) {
        const text = await f.text()
        let json: Record<string, unknown> | null = null
        try { json = JSON.parse(text) } catch {
          setErrorMsg(`El archivo "${f.name}" no es JSON válido.`)
          throw new Error('invalid_json')
        }
        const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-filename': f.name }
        if (adminToken) headers['x-admin-token'] = adminToken
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers,
          body: JSON.stringify(json),
        })
        if (!res.ok) {
          let detail = ''
          try {
            const j = await res.json()
            detail = typeof j?.error === 'string' ? j.error : ''
            if (typeof j?.detail === 'string') detail = `${detail} ${j.detail}`.trim()
          } catch {
            detail = await res.text().catch(() => '')
          }
          setErrorMsg(detail || `Error ${res.status}`)
          throw new Error('upload_failed')
        }
      }
      toast.success('Sesiones subidas correctamente')
      window.location.href = '/sessions'
    } catch {
      setUploading(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Subir archivos de sesión (.json)</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <Input type="file" multiple accept=".json" onChange={onFilesChange} />
        {selectedNames.length > 0 ? (
          <div className="rounded-md border divide-y">
            {selectedNames.map((n) => {
              const dup = existing.includes(n)
              return (
                <div key={n} className="px-2 py-1 text-xs flex items-center justify-between">
                  <span className={dup ? 'text-destructive font-medium' : ''}>{n}</span>
                  {dup ? <Badge variant="outline" className="text-[10px] px-2 py-0.5">Duplicado</Badge> : null}
                </div>
              )
            })}
          </div>
        ) : null}
        {hasDuplicates ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs p-2">
            ¡Estos archivos ya existen y no se pueden subir!
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Se suben al almacenamiento remoto de sesiones.</div>
        )}
        {errorMsg ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs p-2">
            {errorMsg}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={onUpload} className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90" disabled={uploading || hasDuplicates || selectedNames.length === 0}>
            {uploading ? 'Subiendo…' : 'Subir'}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  )
}

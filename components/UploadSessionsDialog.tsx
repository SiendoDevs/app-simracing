"use client"
import * as React from 'react'
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function UploadSessionsDialog({ existing }: { existing: string[] }) {
  const [selectedNames, setSelectedNames] = React.useState<string[]>([])
  const [hasDuplicates, setHasDuplicates] = React.useState(false)

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const names = files.map((f) => f.name)
    setSelectedNames(names)
    const dup = names.filter((n) => existing.includes(n))
    setHasDuplicates(dup.length > 0)
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Subir archivos de sesión (.json)</DialogTitle>
      </DialogHeader>
      <form action="/api/upload-sessions" method="post" encType="multipart/form-data" className="space-y-3">
        <Input type="file" name="files" multiple accept=".json" onChange={onFilesChange} />
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
          <div className="text-xs text-muted-foreground">Los archivos se guardan en la carpeta <code>sessions</code> dentro de la app.</div>
        )}
        <DialogFooter>
          <Button type="submit" className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90" disabled={hasDuplicates || selectedNames.length === 0}>
            Subir
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

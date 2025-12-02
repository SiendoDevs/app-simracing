"use client"
import { useUser } from '@clerk/nextjs'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import UploadSessionsDialog from '@/components/UploadSessionsDialog'
import { UploadCloud } from 'lucide-react'

export default function SessionsToolbar({ existing }: { existing: string[] }) {
  const { user } = useUser()
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = !!user && (
    (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
    user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
  )
  if (!isAdmin) return null
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadCloud className="size-4" />
          Subir sesiones
        </Button>
      </DialogTrigger>
      <UploadSessionsDialog existing={existing} />
    </Dialog>
  )
}


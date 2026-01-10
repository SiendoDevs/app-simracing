import { getProfileData } from '@/lib/profileData'
import DriverProfileContent from '@/components/DriverProfileContent'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
}

export default async function DriverProfilePage({ params }: Props) {
  const { id } = await params
  const steamId = decodeURIComponent(id)
  const { table, sessionsWithPoints } = await getProfileData()

  if (table.length === 0 && sessionsWithPoints.length === 0) {
    return (
      <div className="py-6 space-y-4">
        <h1 className="text-2xl font-bold">Perfil de Piloto</h1>
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">No hay resultados oficiales publicados aún.</div>
      </div>
    )
  }

  return <DriverProfileContent table={table} sessions={sessionsWithPoints} driverId={steamId} />
}

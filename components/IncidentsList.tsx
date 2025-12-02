import type { Incident } from '@/types/Incident'

export default function IncidentsList({ incidents }: { incidents: Incident[] }) {
  if (!incidents?.length) return null
  return (
    <div className="rounded-md border p-4 space-y-2">
      <h2 className="text-lg font-semibold">Incidentes</h2>
      <ul className="space-y-1">
        {incidents.map((i, idx) => (
          <li key={idx} className="text-sm">
            {i.type} {i.lapNumber != null ? `V${i.lapNumber}` : ''} {i.description ?? ''}
          </li>
        ))}
      </ul>
    </div>
  )
}


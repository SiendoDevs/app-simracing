import { Input } from '@/components/ui/input'

export default function DriverCompare() {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <h2 className="text-lg font-semibold">Comparar Pilotos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input placeholder="Piloto A" />
        <Input placeholder="Piloto B" />
      </div>
      <div className="text-sm text-muted-foreground">Próximamente</div>
    </div>
  )
}

import { currentUser } from "@clerk/nextjs/server"

export default async function AdminUsers() {
  const user = await currentUser()
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const isAdmin = !!user && (
    (user.publicMetadata as Record<string, unknown>)?.role === "admin" ||
    user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
  )

  return (
    <div className="space-y-3">
      <h1 className="text-xl md:text-2xl font-bold">Usuarios</h1>
      {!user ? (
        <div className="text-sm text-muted-foreground">Debes iniciar sesión para ver esta sección.</div>
      ) : !isAdmin ? (
        <div className="text-sm text-muted-foreground">No tienes permisos para ver esta sección.</div>
      ) : (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-sm">Usuario actual: {user.firstName} {user.lastName} ({user.emailAddresses?.[0]?.emailAddress})</div>
          <div className="text-xs text-muted-foreground">Gestión avanzada (roles, listado) se puede integrar con Clerk Admin API.</div>
        </div>
      )}
    </div>
  )
}

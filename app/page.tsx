import Link from "next/link";
import Image from "next/image";
import { loadLocalSessions } from "@/lib/loadLocalSessions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Eye, Users, Timer, Trophy, Clock, MessageCircle, UserPlus } from "lucide-react";

export default async function Home() {
  if (process.env.NODE_ENV === 'development') await new Promise((r) => setTimeout(r, 600))
  const sessions = await loadLocalSessions();
  let playersOnline: number | null = null
  try {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_BASE_URL
      : undefined
    const fromVercel = process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0
      ? `https://${process.env.VERCEL_URL}`
      : undefined
    const origin = fromEnv ?? fromVercel ?? 'http://localhost:3000'
    const res = await fetch(`${origin}/api/live-timing?server=2`, { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      if (typeof j?.playersOnline === 'number') playersOnline = j.playersOnline
    }
  } catch {}
  const sessionDateKey = (s: { id: string; date?: string }) => {
    if (typeof s.date === 'string') {
      const d = new Date(s.date)
      if (!isNaN(d.getTime())) {
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yy}-${mm}-${dd}`
      }
    }
    const m = s.id.match(/^(\d{4})_(\d{2})_(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    return 'Sin-fecha'
  }
  const raceIndexMap = new Map<string, number>()
  {
    const grouped = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const k = sessionDateKey(s)
      const arr = grouped.get(k) ?? []
      arr.push(s)
      grouped.set(k, arr)
    }
    for (const [, list] of grouped) {
      const races = list.filter((x) => x.type.toUpperCase() === 'RACE').sort((a, b) => a.id.localeCompare(b.id))
      for (let i = 0; i < races.length; i++) raceIndexMap.set(races[i].id, i + 1)
    }
  }
  const schedule = [
    { idx: 1, label: 'Zárate 1' },
    { idx: 2, label: 'Baradero' },
    { idx: 3, label: 'Buenos Aires 2 Invertido' },
    { idx: 4, label: 'Ciudad Evita', extra: 'Especial – 40 vueltas', nuevo: true },
    { idx: 5, label: 'Zárate 4' },
    { idx: 6, label: 'Buenos Aires 1' },
    { idx: 7, label: 'Mar del Plata', extra: 'Especial – 40 vueltas', nuevo: true },
    { idx: 8, label: 'Zárate 9', extra: 'Especial – 40 vueltas', nuevo: true },
  ]
  const formatId = (id: string) => {
    const m = id.match(/^(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})/);
    if (!m) return id;
    const [, y, mo, d, h, mi] = m;
    return `${d}/${mo}/${y} ${h}:${mi}`;
  };
  const formatDate = (date?: string, fallbackId?: string) => {
    if (typeof date === "string") {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${dd}/${mm}/${yy} ${hh}:${mi}`;
      }
    }
    return fallbackId ? formatId(fallbackId) : "";
  };
  const labelType = (t: string) => {
    const up = t.toUpperCase();
    if (up === 'RACE') return 'Carrera';
    if (up === 'QUALIFY') return 'Clasificación';
    if (up === 'PRACTICE') return 'Práctica';
    return t;
  };
  const niceTrack = (raw?: string) => {
    if (!raw) return '';
    let t = raw.replace(/[_-]+/g, ' ').trim();
    t = t.replace(/^jotracks\s*/i, '');
    // Common collapsed names
    t = t.replace(/\bciudadevita\b/i, 'ciudad evita');
    t = t.replace(/\bbuenosaires\b/i, 'buenos aires');
    t = t.replace(/\bmardelplata\b/i, 'mar del plata');
    const small = new Set(['del', 'de', 'la', 'las', 'los', 'y']);
    const words = t.split(/\s+/).filter(Boolean);
    const map = (w: string) => {
      const lw = w.toLowerCase();
      if (lw === 'kartodromo') return 'Kartódromo';
      if (lw === 'zarate') return 'Zárate';
      if (lw === 'zn') return 'ZN';
      if (small.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    };
    return words.map(map).join(' ');
  };
  
  return (
    <div className="space-y-6">
      
      <section className="relative rounded-xl overflow-hidden border">
        <div className="h-56 md:h-72 bg-cover bg-center" style={{ backgroundImage: 'url(/assets/fondo-inicio-2.jpg)' }} />
        <div className="absolute inset-0 bg-linear-to-t from-background/80 to-transparent" />
        <Image
          src="/assets/Assetto_Corsa_Logo.png"
          alt="Assetto Corsa"
          height={48}
          width={160}
          className="absolute top-6 right-6 h-10 w-auto md:h-12 opacity-90"
        />
        {playersOnline !== null && playersOnline > 0 ? (
          <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-md border bg-background/80 px-2 py-1 text-xs">
            <Users className="h-4 w-4" />
            {`${playersOnline} piloto/s en linea`}
          </div>
        ) : null}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h1 className="text-2xl md:text-4xl font-bold">Liga de Karting | Asseto Corsa</h1>
          <p className="mt-3 mb-3 text-md md:text-base">Noticias, resultados, sesiones y campeonatos.</p>
          <div className="mt-4 flex gap-2">
            <Button className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90" asChild>
              <Link href="https://siendostudio.com/timing" target="_blank" rel="noopener noreferrer">
                <Timer className="size-4" />
                Livetiming Server
              </Link>
            </Button>
            <Button variant="secondary" className="hidden md:inline-flex" asChild>
              <Link href="/championship">
                <Trophy className="size-4" />
                Ver campeonato
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
        <div className="rounded-lg border p-3 md:p-4 h-full flex flex-col">
          <div className="flex-1 space-y-3">
            <div className="text-xl md:text-2xl font-bold">Edición #2 · Kart KZ 125cc</div>
            <div className="text-sm text-muted-foreground inline-flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> Miércoles 21:30 hs.</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Comenzó el 26 de Noviembre</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Requisitos</div>
                <p className="text-sm text-muted-foreground">PC, Asseto Corsa, Content Manager, CSP, Real Penalty.</p>
                <div className="text-sm font-semibold">Pistas</div>
                <p className="text-sm text-muted-foreground">Jotracks (Modder Oficial)</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Inscripción</div>
                <p className="text-sm text-muted-foreground">Gratis (incluye mod y pistas para todo el campeonato).</p>
                <div className="text-sm font-semibold">Cupo</div>
                <p className="text-sm text-muted-foreground">Máximo 35 pilotos.</p>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-2 flex gap-2">
            <Button className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90" asChild>
              <Link href="https://docs.google.com/forms/d/e/1FAIpQLScjoch5V5d-BjkwS_wq7jDCCAu9r_KyU5QyJ_1MwsK_7HTLcw/viewform?usp=header" target="_blank" rel="noopener noreferrer">
                <UserPlus className="size-4" />
                Inscripciones
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="https://chat.whatsapp.com/FYY7DU9mPchIUAYl1FAuzP" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                Comunidad Whatsapp
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border h-full flex flex-col">
          <div className="px-3 md:px-4 py-2 text-sm md:text-base font-semibold border-b">Fechas del campeonato</div>
          <ul className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
            {schedule.map((f) => (
              <li key={f.idx} className="flex items-center justify-between rounded-md border bg-muted/10 hover:bg-muted/30 transition-colors p-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-9 w-12 rounded-md font-bold shrink-0 bg-[#d8552b] text-white">{String(f.idx).padStart(2, '0')}</span>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium inline-flex items-center gap-2">
                      <span>{f.label}</span>
                      {f.nuevo ? <span className="px-2 py-0.5 rounded-full border text-[#d8552b] border-[#d8552b] text-sm">Nuevo</span> : null}
                    </div>
                    {f.extra ? <div className="text-xs text-muted-foreground">{f.extra}</div> : null}
                  </div>
                </div>
                <Link href="/sessions" className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Ver sesiones">
                  <Eye className="h-5 w-5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold inline-flex items-center gap-2">
          <Timer className="h-6 w-6 text-foreground" />
          Sesiones recientes
        </h1>
        <div className="hidden md:flex gap-2 text-sm">
          <Link href="/championship" className="underline">Ver campeonato</Link>
          <Link href="/drivers" className="underline">Ver pilotos</Link>
        </div>
      </div>
      <ul className="rounded-lg border divide-y">
        {sessions.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No se encontraron archivos JSON de sesiones.</li>
        )}
        {sessions.map((s) => (
          <li key={s.id} className="p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  className={
                    s.type === 'RACE'
                      ? 'text-sm md:text-base px-3 py-0.5 bg-[#d8552b] text-white'
                      : s.type === 'QUALIFY'
                      ? 'text-sm md:text-base px-3 py-0.5'
                      : 'text-xs px-3 py-0.5'
                  }
                  variant={s.type === 'RACE' ? 'default' : s.type === 'QUALIFY' ? 'secondary' : 'outline'}
                >
                  {s.type.toUpperCase() === 'RACE' ? `Carrera ${raceIndexMap.get(s.id) ?? 1}` : labelType(s.type)}
                </Badge>
                <span className="font-medium text-sm">{niceTrack(s.track) }</span>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {s.drivers.length}
                </span>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(s.date, s.id)}
                </span>
              </div>
            </div>
            <Link href={`/sessions/${s.id}`} aria-label="Ver sesión" className="text-muted-foreground hover:text-foreground">
              <Eye className="h-5 w-5" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="text-sm hidden md:block">
        <Link href="/sessions" className="underline">Ver todas las sesiones</Link>
      </div>
      
    </div>
  );
}

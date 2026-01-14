import Link from "next/link";
import Image from "next/image";
import { loadLocalSessions } from "@/lib/loadLocalSessions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Eye, Users, Timer, Trophy, Clock, MessageCircle, UserPlus, Check, Globe } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";
import { currentChampionship } from "@/data/championships";

export const metadata = {
  title: "ZN Kart SimRacing | 2026 – English",
  description: "Official results, championships and public server for ZN Kart SimRacing.",
};

export default async function HomeEnglish() {
  if (process.env.NODE_ENV === "development") await new Promise((r) => setTimeout(r, 600));

  const allSessions = await loadLocalSessions();

  const sessions = allSessions.filter((s) => {
    let sDate = "";
    if (typeof s.date === "string") {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) {
        sDate = d.toISOString().split("T")[0];
      }
    }
    if (!sDate) {
      const m = s.id.match(/^(\d{4})_(\d{2})_(\d{2})/);
      if (m) sDate = `${m[1]}-${m[2]}-${m[3]}`;
    }

    if (!sDate) return false;

    if (sDate < currentChampionship.startDate) return false;
    if (currentChampionship.endDate && sDate > currentChampionship.endDate) return false;

    return true;
  });

  const user = await currentUser().catch(() => null);
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdminRaw =
    !!user &&
    (((user?.publicMetadata as Record<string, unknown>)?.role === "admin") ||
      user?.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase())));
  const devBypass =
    process.env.DEV_ALLOW_ANON_UPLOAD === "1" ||
    (process.env.NODE_ENV === "development" && process.env.DEV_ALLOW_ANON_UPLOAD !== "0");
  const isAdmin = isAdminRaw || devBypass;
  const sessionDateKey = (s: { id: string; date?: string }) => {
    if (typeof s.date === "string") {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
      }
    }
    const m = s.id.match(/^(\d{4})_(\d{2})_(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return "No-date";
  };
  const fromVercel =
    process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0 ? `https://${process.env.VERCEL_URL}` : undefined;
  const fromEnv =
    process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_BASE_URL
      : undefined;
  const origin = fromVercel ?? fromEnv ?? "http://localhost:3000";
  const publishedRemote = await (async () => {
    try {
      const r1 = await fetch("/api/published", { cache: "no-store" });
      if (r1.ok) {
        const j = await r1.json();
        if (Array.isArray(j)) return j;
        if (j && typeof j === "object") return Object.values(j as Record<string, unknown>);
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/published`, { cache: "no-store" });
      if (r2.ok) {
        const j = await r2.json();
        if (Array.isArray(j)) return j;
        if (j && typeof j === "object") return Object.values(j as Record<string, unknown>);
      }
    } catch {}
    return null;
  })();
  const pubRaw = publishedRemote ?? [];
  const pubEntries = Array.isArray(pubRaw)
    ? pubRaw.filter((x) => x && typeof (x as { sessionId?: unknown }).sessionId === "string")
    : [];
  const toBool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";
  const hasPublishConfig = pubEntries.length > 0;
  const publishedSet = new Set(
    pubEntries.filter((p) => toBool((p as { published?: unknown }).published)).map(
      (p) => (p as { sessionId: string }).sessionId,
    ),
  );
  const sessionsForViewer = isAdmin ? sessions : hasPublishConfig ? sessions.filter((s) => publishedSet.has(s.id)) : sessions;
  const raceIndexMap = new Map<string, number>();
  {
    const grouped = new Map<string, typeof sessionsForViewer>();
    for (const s of sessionsForViewer) {
      const k = sessionDateKey(s);
      const arr = grouped.get(k) ?? [];
      arr.push(s);
      grouped.set(k, arr);
    }
    for (const [, list] of grouped) {
      const races = list
        .filter((x) => x.type.toUpperCase() === "RACE")
        .sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 0; i < races.length; i++) raceIndexMap.set(races[i].id, i + 1);
    }
  }
  const schedule = currentChampionship.schedule;
  const plannedCounts = currentChampionship.plannedCounts;
  const relevant = sessionsForViewer.filter((s) => {
    const t = s.type.toUpperCase();
    return t === "RACE" || t === "QUALIFY";
  });
  const byDate = new Map<string, typeof relevant>();
  for (const s of relevant) {
    const k = sessionDateKey(s);
    const arr = byDate.get(k) ?? [];
    arr.push(s);
    byDate.set(k, arr);
  }
  const sortedKeys = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  const statusByIdx = new Map<number, boolean>();
  for (let i = 0; i < plannedCounts.length; i++) {
    const list = byDate.get(sortedKeys[i]) ?? [];
    statusByIdx.set(i + 1, list.length >= plannedCounts[i]);
  }
  const latestDateKey = sortedKeys.length > 0 ? sortedKeys[sortedKeys.length - 1] : null;
  const sessionsRecent = latestDateKey ? sessionsForViewer.filter((s) => sessionDateKey(s) === latestDateKey) : sessionsForViewer;
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
    if (up === "RACE") return "Race";
    if (up === "QUALIFY") return "Qualifying";
    if (up === "PRACTICE") return "Practice";
    return t;
  };
  const niceTrack = (raw?: string) => {
    if (!raw) return "";
    let t = raw.replace(/[_-]+/g, " ").trim();
    t = t.replace(/^jotracks\s*/i, "");
    t = t.replace(/\bciudadevita\b/i, "ciudad evita");
    t = t.replace(/\bbuenosaires\b/i, "buenos aires");
    t = t.replace(/\bmardelplata\b/i, "mar del plata");
    const small = new Set(["del", "de", "la", "las", "los", "y"]);
    const words = t.split(/\s+/).filter(Boolean);
    const map = (w: string) => {
      const lw = w.toLowerCase();
      if (lw === "kartodromo") return "Kartódromo";
      if (lw === "zarate") return "Zárate";
      if (lw === "zn") return "ZN";
      if (small.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    };
    return words.map(map).join(" ");
  };

  return (
    <div className="space-y-6">
      <section className="relative rounded-xl overflow-hidden border">
        <div
          className="h-[400px] bg-cover bg-center animate-hero-zoom"
          style={{ backgroundImage: `url(${currentChampionship.assets.background})` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/30 to-transparent" />
        <Image
          src={currentChampionship.assets.logo}
          alt="Assetto Corsa"
          height={48}
          width={160}
          className="absolute top-6 right-6 h-10 w-auto md:h-12 opacity-90"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-md">
            {currentChampionship.subtitle}
          </h1>
          <p className="mt-3 mb-3 text-lg md:text-md font-medium text-white/90 drop-shadow-sm">
            {currentChampionship.description}
          </p>
          <div className="mt-4 flex gap-2">
            <Button className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90" asChild>
              <Link href={currentChampionship.links.liveTiming || "#"} target="_blank" rel="noopener noreferrer">
                <Timer className="size-4" />
                Live timing server
              </Link>
            </Button>
            <Button variant="secondary" className="hidden md:inline-flex" asChild>
              <Link href={currentChampionship.links.championship || "/championship"}>
                <Trophy className="size-4" />
                View championship
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
        <div className="rounded-lg border p-3 md:p-4 h-full flex flex-col">
          <div className="flex-1 space-y-3">
            <div className="text-xl md:text-2xl font-bold">{currentChampionship.title}</div>
            <div className="text-sm text-muted-foreground inline-flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" /> {currentChampionship.rules.schedule}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Started on{" "}
                {new Date(currentChampionship.startDate).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Requirements</div>
                <p className="text-sm text-muted-foreground">{currentChampionship.rules.requirements}</p>
                <div className="text-sm font-semibold">Tracks</div>
                <p className="text-sm text-muted-foreground">{currentChampionship.rules.tracks}</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Registration</div>
                <p className="text-sm text-muted-foreground">{currentChampionship.rules.inscription}</p>
                <div className="text-sm font-semibold">Slots</div>
                <p className="text-sm text-muted-foreground">{currentChampionship.rules.quota}</p>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-2 flex gap-2">
            <Button className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90" asChild>
              <Link href={currentChampionship.links.inscriptions || "#"} target="_blank" rel="noopener noreferrer">
                <UserPlus className="size-4" />
                Registration
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={currentChampionship.links.whatsapp || "#"} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp community
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border h-full flex flex-col">
          <div className="px-3 md:px-4 py-2 text-sm md:text-base font-semibold border-b">Championship dates</div>
          <ul className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
            {schedule.map((f, index) => {
              const isLast = index === schedule.length - 1;
              return (
                <li
                  key={f.idx}
                  className="group relative flex items-center justify-start rounded-md border p-2 shadow-sm overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 transition-colors ${
                      isLast
                        ? "bg-linear-to-r from-[#d8552b]/20 via-[#d8552b]/40 to-[#d8552b]/20 animate-pulse"
                        : "bg-[#d8552b]/10 group-hover:bg-[#d8552b]/20"
                    }`}
                  />
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-9 w-12 rounded-md font-bold shrink-0 bg-[#d8552b] text-white">
                      {String(f.idx).padStart(2, "0")}
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium inline-flex items-center gap-2">
                        {statusByIdx.get(f.idx) ? (
                          <span className="flex items-center justify-center h-5 w-5 rounded-full border border-[#9ca3af] text-[#9ca3af]">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                        <span>{f.label}</span>
                      </div>
                      {f.extra ? <div className="text-xs text-muted-foreground">{f.extra}</div> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold inline-flex items-center gap-2">
          <Timer className="h-6 w-6 text-foreground" />
          Recent sessions
        </h1>
        <div className="hidden md:flex gap-2 text-sm">
          <Link href="/championship" className="underline">
            View championship
          </Link>
          <Link href="/drivers" className="underline">
            View drivers
          </Link>
        </div>
      </div>

      <ul className="rounded-lg border divide-y">
        {sessionsRecent.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No session JSON files found.</li>
        )}
        {sessionsRecent
          .slice()
          .sort((a, b) => b.id.localeCompare(a.id))
          .map((s) => (
            <li key={s.id} className="p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={
                      s.type === "RACE"
                        ? "text-sm md:text-base px-3 py-0.5 bg-[#d8552b] text-white"
                        : s.type === "QUALIFY"
                        ? "text-sm md:text-base px-3 py-0.5"
                        : "text-xs px-3 py-0.5"
                    }
                    variant={s.type === "RACE" ? "default" : s.type === "QUALIFY" ? "secondary" : "outline"}
                  >
                    {s.type.toUpperCase() === "RACE" ? `Race ${raceIndexMap.get(s.id) ?? 1}` : labelType(s.type)}
                  </Badge>
                  <span className="font-medium text-sm">{niceTrack(s.track)}</span>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {s.results.length}
                  </span>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(s.date, s.id)}
                  </span>
                </div>
              </div>
              <Link
                href={`/sessions/${s.id}`}
                aria-label="View session"
                className="text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-5 w-5" />
              </Link>
            </li>
          ))}
      </ul>

      <div className="text-sm hidden md:block">
        <Link href="/sessions" className="underline">
          View all sessions
        </Link>
      </div>

      <section className="rounded-xl border bg-muted/40 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-3">
            <Globe className="h-8 w-8 text-[#d8552b]" />
            Join the public server
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Train, have fun and race with friends 24/7. Our server is open for everyone, with no passwords or previous
            registration.
          </p>
          <p className="text-sm font-medium text-foreground/80">
            Search for <span className="text-[#d8552b] font-bold">&quot;ZN Simracing&quot;</span> in Content Manager and
            jump in.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            size="lg"
            className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90 text-lg px-8 h-12 shadow-lg shadow-[#d8552b]/20"
            asChild
          >
            <Link href={currentChampionship.links.serverPublic || "/server-publico"}>
              View server status
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}


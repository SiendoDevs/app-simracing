
export interface RaceEvent {
  idx: number
  label: string
  extra?: string
  nuevo?: boolean
}

export interface Championship {
  id: string
  title: string
  subtitle?: string
  description?: string
  status: 'active' | 'completed' | 'upcoming'
  startDate: string // ISO date string YYYY-MM-DD
  endDate?: string // ISO date string YYYY-MM-DD
  schedule: RaceEvent[]
  plannedCounts: number[] // Cantidad de carreras esperadas por fecha
  assets: {
    background: string
    logo: string
  }
  links: {
    liveTiming?: string
    serverPublic?: string
    championship?: string
    inscriptions?: string
    whatsapp?: string
  }
  rules: {
    requirements: string
    tracks: string
    inscription: string
    quota: string
    schedule: string // Texto de horarios (ej: "Miércoles 21:30 hs.")
  }
}

export const championships: Championship[] = [
  {
    id: 'season-2',
    title: 'Edición #2 · Kart KZ 125cc',
    subtitle: 'Liga de Karting | Asseto Corsa',
    description: 'Noticias, resultados, sesiones y campeonatos.',
    status: 'completed',
    startDate: '2025-11-26',
    endDate: '2026-01-14',
    schedule: [
      { idx: 1, label: 'Zárate 1' },
      { idx: 2, label: 'Baradero' },
      { idx: 3, label: 'Buenos Aires 2 Invertido' },
      { idx: 4, label: 'Ciudad Evita', extra: 'Especial – 40 vueltas', nuevo: true },
      { idx: 5, label: 'Zárate 4' },
      { idx: 6, label: 'Buenos Aires 1' },
      { idx: 7, label: 'Mar del Plata' },
      { idx: 8, label: 'Zárate 9', extra: 'Especial – 40 vueltas', nuevo: true },
    ],
    plannedCounts: [3, 3, 3, 2, 3, 3, 2, 2],
    assets: {
      background: '/assets/hero-1.jpg',
      logo: '/assets/Assetto_Corsa_Logo.png'
    },
    links: {
      liveTiming: 'https://siendostudio.com/timing',
      serverPublic: '/server-publico',
      championship: '/championship',
      inscriptions: 'https://docs.google.com/forms/d/e/1FAIpQLScjoch5V5d-BjkwS_wq7jDCCAu9r_KyU5QyJ_1MwsK_7HTLcw/viewform?usp=header',
      whatsapp: 'https://chat.whatsapp.com/FYY7DU9mPchIUAYl1FAuzP'
    },
    rules: {
      requirements: 'PC, Assetto Corsa, Content Manager, CSP, Jotracks Race Director (App).',
      tracks: 'Jotracks (Modder Oficial)',
      inscription: 'Gratis (incluye mod y pistas para todo el campeonato).',
      quota: 'Máximo 35 pilotos.',
      schedule: 'Miércoles 21:30 hs.'
    }
  },
  {
    id: 'season-3',
    title: 'Edición #3 · Kart Solid K+ 390cc',
    subtitle: 'Karting Simracing | Assetto Corsa',
    description: 'La primer Liga de Karting Simracing Argentina.',
    status: 'upcoming',
    startDate: '2026-02-17',
    endDate: '2026-05-31',
    schedule: [
      { idx: 1, label: 'Baradero', extra: 'Pretemporada – 1', nuevo: true },
      { idx: 2, label: 'Trenque Lauquen', extra: 'Pretemporada – 2', nuevo: true },
      { idx: 3, label: 'Zárate #4' },
      { idx: 4, label: 'Ciudad Evita' },
      { idx: 5, label: 'Buenos Aires #1', extra: 'Especial – 40 vueltas', nuevo: true },
      { idx: 6, label: 'Baradero' },
      { idx: 7, label: 'Mar del Plata', extra: 'Especial – 40 vueltas', nuevo: true },
      { idx: 8, label: 'Zárate #1' }
    ],
    plannedCounts: [2, 2, 2, 2],
    assets: {
      background: '/assets/hero-1.jpg',
      logo: '/assets/Assetto_Corsa_Logo.png'
    },
    links: {
      liveTiming: 'https://siendostudio.com/timing',
      serverPublic: '/server-publico',
      championship: '/championship',
      inscriptions: 'https://docs.google.com/forms/d/e/1FAIpQLScjoch5V5d-BjkwS_wq7jDCCAu9r_KyU5QyJ_1MwsK_7HTLcw/viewform?usp=header',
      whatsapp: 'https://chat.whatsapp.com/FYY7DU9mPchIUAYl1FAuzP'
    },
    rules: {
      requirements: 'PC, Assetto Corsa, Content Manager, CSP, Jotracks Race Director (App).',
      tracks: 'Jotracks (Modder Oficial)',
      inscription: '$25.000 Incluye Mod y Pistas',
      quota: 'Máximo 50 pilotos.',
      schedule: 'Martes 20:00 hs.'
    }
  }
]

export const currentChampionship =
  championships.find((c) => c.status === 'active') ||
  championships.find((c) => c.status === 'upcoming') ||
  championships[0]

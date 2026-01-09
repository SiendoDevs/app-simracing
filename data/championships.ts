
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
    status: 'active',
    startDate: '2024-11-26', // "Comenzó el 26 de Noviembre"
    // endDate no definido aún porque está en curso
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
      background: '/assets/fondo-inicio-2.jpg',
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
      requirements: 'PC, Asseto Corsa, Content Manager, CSP, Real Penalty.',
      tracks: 'Jotracks (Modder Oficial)',
      inscription: 'Gratis (incluye mod y pistas para todo el campeonato).',
      quota: 'Máximo 35 pilotos.',
      schedule: 'Miércoles 21:30 hs.'
    }
  }
]

export const currentChampionship = championships.find(c => c.status === 'active') || championships[0]

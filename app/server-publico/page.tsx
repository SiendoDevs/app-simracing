import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Timer, Flag } from 'lucide-react'

export default function ServerPublicoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[400px] w-full overflow-hidden rounded-xl">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/assets/tn-c3.jpg"
            alt="Fondo SimRacing"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-center px-6 md:px-12 text-white">
          <div className="flex items-center gap-2 mb-2">
             {/* Optional: Add a logo or small text if needed, matching the top right logo in the screenshot if we had one */}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Server Público | Asseto Corsa
          </h1>
          
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl">
            Servidor con carreras las 24 horas.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              asChild 
              className="bg-[#d8552b] hover:bg-[#b04220] text-white font-semibold"
              size="lg"
            >
              <Link href="https://br2.assettohosting.com:10251/live-timing" target="_blank">
                <Timer className="mr-2 h-5 w-5" />
                Livetiming Server
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="secondary"
              className="bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-sm"
              size="lg"
            >
              <Link href="https://acstuff.ru/s/q:race/online/join?httpPort=8251&ip=24.152.39.252" target="_blank" rel="noopener noreferrer">
                <Flag className="h-5 w-5" />
                Unirse
              </Link>
            </Button>
          </div>

           {/* Assetto Corsa Logo placeholder - if we want to mimic the top right logo in the screenshot
               We can position it absolutely if needed, but for now let's keep it simple.
           */}
        </div>
      </section>

      {/* Content Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8">
        {/* Server Info Block */}
        <div className="flex flex-col space-y-4 h-full">
          <h2 className="text-2xl font-bold">Información del Servidor</h2>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex-1">
            <p className="text-muted-foreground">
              Servidor de libre acceso con contenido oficial de Kunos. Los autos y pistas van rotando regularmente. 
              <br /><br />Cuando haya contenido adicional para descargar, lo encontrarás aquí mismo.
            </p>
          </div>
        </div>
        
        {/* Empty Block */}
        <div className="flex flex-col space-y-4 h-full">
          {/* Spacer to align with the title of the first block */}
          <h2 className="text-2xl font-bold invisible" aria-hidden="true">Placeholder</h2>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex-1 min-h-[200px]">
            {/* Espacio reservado */}
          </div>
        </div>
      </div>
    </div>
  )
}

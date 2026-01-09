import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Timer, Flag, Info, Shield, Cpu, MessageCircle } from 'lucide-react'
import { currentChampionship } from '../../data/championships'

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
            className="object-cover animate-hero-zoom"
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
        
        {/* Block 1: Info */}
        <div className="flex flex-col space-y-4 h-full">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-linear-to-br from-orange-500/30 to-orange-500/10 border border-orange-500/20 rounded-lg shadow-[0_0_15px_rgba(216,85,43,0.15)]">
                <Info className="h-6 w-6 text-[#d8552b]" />
             </div>
             <h2 className="text-xl font-bold">Acerca del Server</h2>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex-1 hover:shadow-md transition-shadow">
            <p className="text-muted-foreground leading-relaxed">
              Disfruta de carreras casuales las 24 horas en nuestro servidor público. 
              La rotación de pistas y categorías es automática, ofreciendo variedad constante.
              <br/><br/>
              Ideal para entrenar, probar setups o simplemente divertirte con amigos sin presiones.
            </p>
          </div>
        </div>

        {/* Block 2: Normas */}
        <div className="flex flex-col space-y-4 h-full">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-linear-to-br from-[#d8552b]/30 to-[#d8552b]/10 border border-[#d8552b]/20 rounded-lg shadow-[0_0_15px_rgba(216,85,43,0.15)]">
                <Shield className="h-6 w-6 text-[#d8552b]" />
             </div>
             <h2 className="text-xl font-bold">Normas de Convivencia</h2>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex-1 hover:shadow-md transition-shadow">
            <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span> Respeto ante todo (Fair Play).
                </li>
                <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span> Ceder el paso con banderas azules.
                </li>
                <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span> Evitar el chat ofensivo.
                </li>
                <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span> Reincorporarse a pista con precaución.
                </li>
            </ul>
          </div>
        </div>

        {/* Block 3: Requisitos */}
        <div className="flex flex-col space-y-4 h-full">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-gradient-to-br from-[#d8552b]/30 to-[#d8552b]/10 border border-[#d8552b]/20 rounded-lg shadow-[0_0_15px_rgba(216,85,43,0.15)]">
                <Cpu className="h-6 w-6 text-[#d8552b]" />
             </div>
             <h2 className="text-xl font-bold">Requisitos Técnicos</h2>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex-1 hover:shadow-md transition-shadow">
            <p className="text-muted-foreground mb-4">
              Para la mejor experiencia, recomendamos utilizar <strong>Content Manager</strong> y <strong>Custom Shaders Patch (CSP)</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Si al intentar entrar te falta contenido (coches o pistas), Content Manager te ofrecerá descargarlo automáticamente si está disponible en el servidor.
            </p>
          </div>
        </div>

        {/* Block 4: Comunidad */}
        <div className="flex flex-col space-y-4 h-full">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-gradient-to-br from-[#d8552b]/30 to-[#d8552b]/10 border border-[#d8552b]/20 rounded-lg shadow-[0_0_15px_rgba(216,85,43,0.15)]">
                <MessageCircle className="h-6 w-6 text-[#d8552b]" />
             </div>
             <h2 className="text-xl font-bold">Comunidad y Soporte</h2>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex-1 hover:shadow-md transition-shadow flex flex-col justify-between">
            <p className="text-muted-foreground mb-4">
              ¿Tienes dudas, sugerencias o problemas para conectar? Únete a nuestra comunidad en WhatsApp.
            </p>
            <Button variant="outline" className="w-full gap-2" asChild>
                <Link href={currentChampionship.links.whatsapp || "#"} target="_blank">
                    <MessageCircle className="h-4 w-4" />
                    Unirse al Grupo de WhatsApp
                </Link>
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

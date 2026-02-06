"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShoppingCart, CreditCard, Gift } from "lucide-react"
import Link from "next/link"
import { currentChampionship } from "@/data/championships"

export default function AcquireModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-[#d8552b] hover:bg-[#b04220] text-white font-semibold gap-2">
          <ShoppingCart className="h-4 w-4" />
          ¡Adquirilo ahora!
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-[#d8552b]/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">Elige tu opción</DialogTitle>
          <DialogDescription>
            Selecciona el plan que mejor se adapte a lo que buscas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* Option 1: Premium/Bundle */}
          <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow hover:border-[#d8552b] hover:shadow-lg transition-all cursor-pointer p-6 flex flex-col gap-4">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Gift className="h-24 w-24 text-[#d8552b]" />
            </div>
            
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
              <Gift className="h-6 w-6 text-[#d8552b]" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-bold text-lg leading-none">Pack Completo</h3>
              <div className="text-xl font-bold text-[#d8552b]">$25.000</div>
              <p className="text-sm text-muted-foreground">Mod + Full Skin Template + Inscripción a la liga</p>
            </div>
            
            <div className="mt-auto pt-2">
              <Button className="w-full bg-[#d8552b] hover:bg-[#b04220] text-white" asChild>
                <Link href={currentChampionship.links.inscriptions || "#"} target="_blank" rel="noopener noreferrer">Inscribirse a la Liga</Link>
              </Button>
            </div>
          </div>

          {/* Option 2: Basic/Individual */}
          <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow hover:border-[#d8552b] hover:shadow-lg transition-all cursor-pointer p-6 flex flex-col gap-4">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <CreditCard className="h-24 w-24 text-[#d8552b]" />
            </div>
            
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
              <CreditCard className="h-6 w-6 text-[#d8552b]" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-bold text-lg leading-none">Mod Individual</h3>
              <div className="text-xl font-bold text-[#d8552b]">5 US$/mes</div>
              <p className="text-sm text-muted-foreground">Acceso al Kart y a todo el contenido de Jotracks por subscripción mensual en su Patreon</p>
            </div>
            
            <div className="mt-auto pt-2">
              <Button className="w-full" variant="outline" asChild>
                <Link href="https://www.patreon.com/jotracks" target="_blank" rel="noopener noreferrer">Ir a Patreon</Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import Image from "next/image";
import { Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-3 md:px-4 py-4 md:py-6">
        <div className="flex flex-col items-center gap-3 md:gap-4">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            <a
              href="https://www.patreon.com/cw/jotracks/posts"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Jotracks Patreon"
              className="group rounded-md ring-1 ring-border/60 bg-muted/10 px-3 py-2 md:px-4 md:py-3 transition hover:bg-muted/20"
            >
              <Image
                src="/assets/logo_JOTRACKS.png"
                alt="Jotracks"
                height={56}
                width={128}
                className="h-10 md:h-12 w-auto opacity-90 group-hover:opacity-100 grayscale group-hover:grayscale-0"
              />
            </a>
            <a
              href="https://siendostudio.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Siendo Studio"
              className="group rounded-md ring-1 ring-border/60 bg-muted/10 px-3 py-2 md:px-4 md:py-3 transition hover:bg-muted/20"
            >
              <Image
                src="/assets/logo_SIENDO.png"
                alt="Siendo"
                height={56}
                width={128}
                className="h-10 md:h-12 w-auto opacity-90 group-hover:opacity-100 grayscale group-hover:grayscale-0"
              />
            </a>
            <a
              href="http://kartzn.com.ar/Home/Index#index"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kart ZN"
              className="group rounded-md ring-1 ring-border/60 bg-muted/10 px-3 py-2 md:px-4 md:py-3 transition hover:bg-muted/20"
            >
              <Image
                src="/assets/logo_ZN%20SPORT.png"
                alt="ZN Sport"
                height={56}
                width={128}
                className="h-10 md:h-12 w-auto opacity-90 group-hover:opacity-100 grayscale group-hover:grayscale-0"
              />
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <a
              href="https://www.instagram.com/znvirtual/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-full h-8 w-8 md:h-9 md:w-9 border border-border/60 hover:border-[#d8552b] hover:text-[#d8552b] transition-colors"
              aria-label="Instagram de la liga"
            >
              <Instagram className="h-4 w-4 md:h-5 md:w-5" />
            </a>
            <a
              href="https://discord.gg/sfRhuzQuhM"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-full h-8 w-8 md:h-9 md:w-9 border border-border/60 hover:border-[#d8552b] hover:text-[#d8552b] transition-colors"
              aria-label="Discord de la liga"
            >
              <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

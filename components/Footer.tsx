import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-3 md:px-4 py-4 md:py-6">
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
      </div>
    </footer>
  );
}

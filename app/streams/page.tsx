import { Youtube, Play, Calendar, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stream {
  id: string;
  title: string;
  thumbnail: string;
  publishedTimeText?: string;
  viewCountText?: string;
  isLive?: boolean;
}

async function getStreams(): Promise<Stream[]> {
  try {
    const url = 'https://www.youtube.com/@torneoskartzn/streams';
    // Usamos headers para simular un navegador real y evitar bloqueos simples
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch streams: ${res.status}`);
      return [];
    }
    
    const html = await res.text();
    
    // Extraer ytInitialData
    // Buscamos el inicio de la variable y cortamos hasta encontrar el patrón de cierre
    const startPattern = 'var ytInitialData = ';
    const startIndex = html.indexOf(startPattern);
    if (startIndex === -1) return [];
    
    let jsonStr = '';
    let braceCount = 0;
    let foundStart = false;
    
    // Parseo manual de llaves para extraer el objeto JSON correctamente
    for (let i = startIndex + startPattern.length; i < html.length; i++) {
      const char = html[i];
      if (char === '{') {
        braceCount++;
        foundStart = true;
      } else if (char === '}') {
        braceCount--;
      }
      
      jsonStr += char;
      
      if (foundStart && braceCount === 0) {
        break;
      }
    }
    
    // Limpiar posible punto y coma al final si el loop se pasó
    if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

    const data = JSON.parse(jsonStr);
    
    // Navegar el JSON para encontrar los items
    const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs;
    // Buscamos la pestaña seleccionada (debería ser Streams/En directo)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const streamsTab = tabs?.find((t: any) => t.tabRenderer?.selected);
    
    const contents = streamsTab?.tabRenderer?.content?.richGridRenderer?.contents;
    
    if (!Array.isArray(contents)) return [];
    
    const streams: Stream[] = [];
    
    for (const item of contents) {
      const video = item.richItemRenderer?.content?.videoRenderer;
      if (!video) continue;
      
      const title = video.title?.runs?.[0]?.text || '';
      const id = video.videoId;
      
      // Thumbnails: buscar la mejor calidad
      const thumbnails = video.thumbnail?.thumbnails || [];
      const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';
      
      const publishedTimeText = video.publishedTimeText?.simpleText || '';
      const viewCountText = video.viewCountText?.simpleText || '';
      
      // Detectar si está en vivo (a veces cambia la estructura, pero suele haber un badge)
      const badges = video.badges || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isLive = badges.some((b: any) => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_LIVE_NOW');
      
      if (id && title) {
        streams.push({
          id,
          title,
          thumbnail,
          publishedTimeText,
          viewCountText,
          isLive
        });
      }
    }
    
    return streams;
  } catch (e) {
    console.error('Error parsing streams:', e);
    return [];
  }
}

export default async function StreamsPage() {
  const allStreams = await getStreams();
  
  // Filtrar por título (case insensitive)
  const filteredStreams = allStreams.filter(s => {
    const t = s.title.toLowerCase();
    // Ampliamos el filtro para incluir variaciones como "ZN PRO SimRacing"
    return t.includes('simracing') || t.includes('virtual');
  });

  return (
    <div className="flex flex-col min-h-screen py-6 space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Play className="h-6 w-6 text-[#d8552b] fill-current" />
          <h1 className="text-3xl font-bold">Streams</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Revive las transmisiones oficiales de la liga. Carreras completas, clasificaciones y eventos especiales del canal oficial.
        </p>
        <div className="mt-2">
           <Button variant="outline" asChild className="gap-2">
             <Link href="https://www.youtube.com/@torneoskartzn" target="_blank" rel="noopener noreferrer">
               <ExternalLink className="h-4 w-4" />
               Visitar canal @torneoskartzn
             </Link>
           </Button>
        </div>
      </div>
      
      {filteredStreams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border rounded-xl bg-muted/20">
          <Youtube className="h-12 w-12 text-muted-foreground/50" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">No se encontraron streams recientes</h3>
            <p className="text-muted-foreground">
              No hemos podido cargar los streams o no hay transmisiones recientes que coincidan con los filtros.
            </p>
            <Button asChild className="mt-4 bg-[#FF0000] hover:bg-[#FF0000]/90 text-white">
              <Link href="https://www.youtube.com/@torneoskartzn/streams" target="_blank">
                Ver en YouTube
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStreams.map((stream) => (
            <Link key={stream.id} href={`https://www.youtube.com/watch?v=${stream.id}`} target="_blank" className="group">
              <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-muted bg-card hover:border-[#d8552b]/50 group-hover:-translate-y-1">
                <div className="relative aspect-video bg-black/10 overflow-hidden">
                  {stream.thumbnail ? (
                    <Image 
                      src={stream.thumbnail} 
                      alt={stream.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized // YouTube thumbnails son externos
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <Youtube className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                    <Play className="h-12 w-12 text-white drop-shadow-lg transform scale-90 group-hover:scale-100 transition-transform" />
                  </div>
                  
                  {stream.isLive && (
                     <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-sm animate-pulse">
                       EN VIVO
                     </div>
                  )}
                  
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-sm backdrop-blur-sm">
                    YouTube
                  </div>
                </div>
                
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-[#d8552b] transition-colors">
                    {stream.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{stream.publishedTimeText || 'Reciente'}</span>
                    </div>
                    {stream.viewCountText && (
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{stream.viewCountText}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

'use client'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { Trophy } from 'lucide-react'
import * as React from 'react'

export default function TopThreeCard({
  name,
  idx,
  previewUrl,
}: {
  name: string
  idx: number
  previewUrl?: string
}) {
  const [loaded, setLoaded] = React.useState(false)
  const place = idx === 0 ? '1°' : idx === 1 ? '2°' : '3°'
  const isFirst = idx === 0
  const isSecond = idx === 1
  const isThird = idx === 2
  const borderClass = isFirst ? 'border-[#b9902e]' : isSecond ? 'border-[#a9b0b8]' : isThird ? 'border-[#8c5a2d]' : 'border-black'
  const iconColor = isFirst ? 'text-[#e6c463]' : isSecond ? 'text-[#cfd5d9]' : isThird ? 'text-[#d79b5a]' : 'text-white'
  const textSize = 'text-xl md:text-2xl'
  const textGradient =
    isFirst
      ? 'bg-linear-to-r from-[#e6c463] via-[#d4b24c] to-[#b9902e] bg-clip-text text-transparent drop-shadow-sm'
      : isSecond
        ? 'bg-linear-to-r from-[#e7e9ea] via-[#cfd5d9] to-[#a9b0b8] bg-clip-text text-transparent drop-shadow-sm'
        : isThird
          ? 'bg-linear-to-r from-[#d79b5a] via-[#b6793c] to-[#8c5a2d] bg-clip-text text-transparent drop-shadow-sm'
          : ''
  return (
    <Card className={`relative overflow-hidden aspect-video ${borderClass}`}>
      {previewUrl ? (
        <>
          <Image
            src={previewUrl}
            alt={`Preview ${idx + 1}° · ${name}`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
            onLoadingComplete={() => setLoaded(true)}
            priority={idx === 0}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse" />
          )}
        </>
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
      <div className="absolute top-0 left-0 z-10 p-4">
        <span className="inline-flex items-center gap-2 text-xl md:text-2xl font-bold">
          <Trophy className={`h-5 w-5 md:h-6 md:w-6 ${iconColor}`} />
          {textGradient
            ? <span className={`${textSize} ${textGradient}`}>{place}</span>
            : <span className={`${textSize} text-white`}>{place}</span>
          }
        </span>
      </div>
      <div className="absolute bottom-0 left-0 z-10 p-4">
        {textGradient
          ? <span className={`font-extrabold text-md md:text-lg uppercase italic ${textGradient}`}>{name}</span>
          : <span className="font-extrabold text-white text-md md:text-lg uppercase italic">{name}</span>
        }
      </div>
    </Card>
  )
}

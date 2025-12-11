"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ChampionshipRow } from '@/components/ChampionshipTable'
import { Image as ImageIcon } from 'lucide-react'

export default function ExportChampionshipButton({ data }: { data: ChampionshipRow[] }) {
  const [exporting, setExporting] = useState(false)
  async function handleExport() {
    try {
      setExporting(true)
      const w = 1080
      const h = 1920
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const isDark = document.documentElement.classList.contains('dark')
      const bgGrad = ctx.createLinearGradient(0, h, 0, 0)
      bgGrad.addColorStop(0.00, '#d8552b')
      bgGrad.addColorStop(0.08, '#d8552b')
      bgGrad.addColorStop(0.18, '#a94732')
      bgGrad.addColorStop(0.28, '#5a2d26')
      bgGrad.addColorStop(0.40, '#1a1a1a')
      bgGrad.addColorStop(1.00, '#000000')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)
      const tile = document.createElement('canvas')
      tile.width = 64
      tile.height = 64
      const tctx = tile.getContext('2d') as CanvasRenderingContext2D
      const id = tctx.createImageData(tile.width, tile.height)
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 127 + Math.floor((Math.random() - 0.5) * 90)
        const g = Math.max(0, Math.min(255, v))
        id.data[i] = g
        id.data[i + 1] = g
        id.data[i + 2] = g
        id.data[i + 3] = 255
      }
      tctx.putImageData(id, 0, 0)
      const pat = ctx.createPattern(tile, 'repeat')
      if (pat) {
        ctx.save()
        ctx.globalCompositeOperation = 'overlay'
        ctx.globalAlpha = 0.35
        ctx.fillStyle = pat
        ctx.fillRect(0, 0, w, h)
        ctx.restore()
      }
      const tile2 = document.createElement('canvas')
      tile2.width = 256
      tile2.height = 256
      const tctx2 = tile2.getContext('2d') as CanvasRenderingContext2D
      const id2 = tctx2.createImageData(tile2.width, tile2.height)
      for (let i = 0; i < id2.data.length; i += 4) {
        const v2 = 127 + Math.floor((Math.random() - 0.5) * 50)
        const g2 = Math.max(0, Math.min(255, v2))
        id2.data[i] = g2
        id2.data[i + 1] = g2
        id2.data[i + 2] = g2
        id2.data[i + 3] = 255
      }
      tctx2.putImageData(id2, 0, 0)
      const pat2 = ctx.createPattern(tile2, 'repeat')
      if (pat2) {
        ctx.save()
        ctx.globalCompositeOperation = 'soft-light'
        ctx.globalAlpha = 0.10
        ctx.fillStyle = pat2
        ctx.fillRect(0, 0, w, h)
        ctx.restore()
      }
      async function loadFirst(srcs: string[]) {
        for (const s of srcs) {
          try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const im = new Image()
              im.onload = () => resolve(im)
              im.onerror = reject
              im.src = s
            })
            return img
          } catch {}
        }
        return null
      }
      const topLogo = await loadFirst([
        '/assets/logo-light.svg',
      ])
      if (topLogo) {
        const maxW = 540
        const maxH = 160
        const scale = Math.min(maxW / topLogo.width, maxH / topLogo.height)
        const lw = Math.floor(topLogo.width * scale)
        const lh = Math.floor(topLogo.height * scale)
        const lx = Math.floor((w - lw) / 2)
        const ly = 190
        ctx.drawImage(topLogo, lx, ly, lw, lh)
      }
      const rows = data.slice(0, 10)
      const col1 = 72
      const col2 = 220
      const col3 = w - 120
      const pillH = 72
      const rowGap = 108
      const rowsBlockH = (rows.length - 1) * rowGap + pillH
      const startY = Math.floor((h - rowsBlockH) / 2)
      const accent = '#d8552b'
      const grey = '#9ca3af'
      function roundedRect(ctx2: CanvasRenderingContext2D, x: number, y: number, w2: number, h2: number, r: number) {
        ctx2.beginPath()
        ctx2.moveTo(x + r, y)
        ctx2.lineTo(x + w2 - r, y)
        ctx2.quadraticCurveTo(x + w2, y, x + w2, y + r)
        ctx2.lineTo(x + w2, y + h2 - r)
        ctx2.quadraticCurveTo(x + w2, y + h2, x + w2 - r, y + h2)
        ctx2.lineTo(x + r, y + h2)
        ctx2.quadraticCurveTo(x, y + h2, x, y + h2 - r)
        ctx2.lineTo(x, y + r)
        ctx2.quadraticCurveTo(x, y, x + r, y)
        ctx2.closePath()
      }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const y = startY + i * rowGap
        const isTop = i === 0
        const pillW = 124
        const pillX = col1
        const pillY = y - 6
        if (isTop) {
          const grad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY)
          grad.addColorStop(0, '#e6c463')
          grad.addColorStop(0.5, '#d4b24c')
          grad.addColorStop(1, '#b9902e')
          ctx.fillStyle = grad
        } else {
          ctx.fillStyle = accent
        }
        roundedRect(ctx, pillX, pillY, pillW, pillH, 12)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'italic 800 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const lineY = pillY + pillH / 2
        ctx.fillText(String(i + 1), pillX + pillW / 2, lineY)
        if (isTop) {
          const grad2 = ctx.createLinearGradient(col2, y, col2 + 600, y)
          grad2.addColorStop(0, '#e6c463')
          grad2.addColorStop(0.5, '#d4b24c')
          grad2.addColorStop(1, '#b9902e')
          ctx.fillStyle = grad2
        } else {
          ctx.fillStyle = isDark ? '#ffffff' : '#111827'
        }
        ctx.font = 'italic 800 52px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText((r.name || '').toUpperCase(), col2, lineY)
        const pts = Math.max(0, Math.floor(r.points || 0))
        ctx.fillStyle = pts > 0 ? accent : grey
        ctx.font = '800 52px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(pts).padStart(3, '0'), col3, lineY)
        if (y + rowGap > h - 120) break
      }
      const bottomLogos = await Promise.all([
        loadFirst(['/assets/logo_JOTRACKS.png']),
        loadFirst(['/assets/logo_SIENDO.png']),
        loadFirst(['/assets/logo_ZN%20SPORT.png']),
      ])
      const bl = bottomLogos.filter(Boolean) as HTMLImageElement[]
      if (bl.length > 0) {
        const areaH = 140
        const ay = h - areaH - 96
        const gap = 48
        const eachW = Math.floor((w - gap * (bl.length + 1)) / bl.length)
        let x = gap
        for (const img of bl) {
          const maxH = areaH
          const scale = Math.min(eachW / img.width, maxH / img.height)
          const iw = Math.floor(img.width * scale)
          const ih = Math.floor(img.height * scale)
          const ox = x + Math.floor((eachW - iw) / 2)
          const oy = ay + Math.floor((areaH - ih) / 2)
          ctx.drawImage(img, ox, oy, iw, ih)
          x += eachW + gap
        }
      }
      const url = canvas.toDataURL('image/jpeg', 0.92)
      const a = document.createElement('a')
      a.href = url
      a.download = 'campeonato_1080x1920.jpg'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
    } finally {
      setExporting(false)
    }
  }
  return (
    <Button disabled={exporting} onClick={handleExport} className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90 inline-flex items-center gap-2">
      <ImageIcon className="h-4 w-4" />
      Exportar TOP 10
    </Button>
  )
}

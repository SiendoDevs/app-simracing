import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  Award,
  CalendarDays,
  Clock,
  Flag,
  Gavel,
  MessageCircle,
  ScrollText,
  Shield,
} from "lucide-react";

export default function ReglamentoPage() {
  return (
    <div className="py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ScrollText className="h-7 w-7 text-[#d8552b]" />
          Reglamento oficial | Temporada 3 | 2026
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Liga ZN SimRacing 2026 · Assetto Corsa · Kart K+ 4T 390cc.
        </p>
      </div>


      <div className="space-y-4">
        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 1: Disposiciones generales</h2>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
            <li>1.1. Plataforma y Software obligatorio: PC, Assetto Corsa, Content Manager, CSP, Jotracks Race Director (App).</li>
            <li>1.2. Vehículo: Kart K+ 4T 390cc.</li>
            <li>1.3. Temporada oficial: 8 fechas, una por semana (Martes desde las 20 hs.).</li>
            <li>1.4. Cupo máximo: 50 pilotos.</li>
            <li>1.5. Inscripción: $25.000.</li>
            <li>1.6. Setup: Fijo (solo frenos y presión de cubiertas).</li>
            <li>1.7. Pistas: circuitos oficiales Jotracks.</li>
            <li>1.8. Premios: 1 fecha ZN Rental 390cc para el campeón.</li>
            <li>1.9. App ZN Flags (Banderas): obligatorio (aplicación oficial de la liga).</li>
            <li>1.10. Lastre: sistema activo para equilibrar la competencia (ver Art. 9).</li>
            <li>1.11. Cambios en el reglamento solo por fuerza mayor con aviso previo.</li>
          </ul>
        </Card>

        <Card className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 2: Sistema de campeonato</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="space-y-1">
              <h3 className="font-semibold">2.1. Formato general</h3>
              <p className="font-medium">Fechas regulares:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clasificación: 5 minutos.</li>
                <li>Carrera 1: 20 vueltas.</li>
                <li>Carrera 2: 20 vueltas, grilla invertida hasta el puesto 10.</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Fechas especiales (4, 7 y 8):</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clasificación: 5 minutos.</li>
                <li>Carrera única: 40 vueltas.</li>
                <li>Parada obligatoria en boxes.</li>
                <li>Ventana de pits definida por comisariado.</li>
                <li>Puntaje bonificado x2.</li>
              </ul>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">2.2. Puntuación (fechas regulares)</h3>
              <ul className="list-disc list-inside space-y-0.5">
                <li>1º – 25 puntos.</li>
                <li>2º – 20 puntos.</li>
                <li>3º – 18 puntos.</li>
                <li>4º – 16 puntos.</li>
                <li>5º – 14 puntos.</li>
                <li>6º – 12 puntos.</li>
                <li>7º – 10 puntos.</li>
                <li>8º – 8 puntos.</li>
                <li>9º – 6 puntos.</li>
                <li>10º – 5 puntos.</li>
                <li>11º – 4 puntos.</li>
                <li>12º – 3 puntos.</li>
                <li>13º – 2 puntos.</li>
                <li>14º – 1 punto.</li>
                <li>15º al 35º – 0 puntos.</li>
              </ul>
              <p className="mt-2">Bonus clasificación: Pole position = +3 puntos.</p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">2.3. Campeón</h3>
              <p>
                Será campeón quien acumule más puntos al finalizar las 8 fechas. Es requisito indispensable haber obtenido
                al menos un primer puesto (victoria) en una carrera final para poder ser campeón.
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">2.4. Desempates</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Más victorias.</li>
                <li>Más podios.</li>
                <li>Mejor posición final en la última carrera.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 3: Configuración técnica</h2>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
            <li>Servidor oficial: Jotracks.</li>
            <li>Setup Fijo: solo se permite modificar presión de neumáticos y reparto de frenos.</li>
            <li>Largada detenida en todas las carreras.</li>
            <li>Daños: 50/100.</li>
            <li>Climas: variables de sesión a sesión.</li>
            <li>Neumáticos: según configuración oficial de la liga, presión libre.</li>
          </ul>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 4: Formato de carrera</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="space-y-1">
              <p className="font-medium">Fechas regulares:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clasificación: 5 minutos.</li>
                <li>Carrera 1: 20 vueltas.</li>
                <li>Carrera 2: 20 vueltas, grilla invertida hasta P10.</li>
                <li>Sin paradas obligatorias.</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Fechas especiales (4, 7 y 8):</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clasificación: 6 minutos.</li>
                <li>Carrera única: 40 vueltas.</li>
                <li>Parada obligatoria en pits en ventana oficial.</li>
                <li>Acción obligatoria en pits: cualquier acción válida excepto cambiar presión de neumáticos.</li>
                <li>Puntaje especial x2.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 5: Horarios oficiales</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">Martes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>20:00 → Práctica libre (30 minutos).</li>
              <li>20:30 → Clasificación.</li>
              <li>20:40 → Carrera 1.</li>
              <li>21:10 → Carrera 2.</li>
            </ul>
            <p className="font-medium mt-2">Fechas especiales:</p>
            <p>20:00 P1 / 20:30 Qualy / 20:40 Carrera larga.</p>
            <p className="mt-2">
              Reunión de pilotos obligatoria por Discord a las 20:15 hs.
            </p>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 6: Conducta y sanciones</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>6.1. Respeto total entre pilotos.</p>
            <div className="space-y-1">
              <p className="font-medium">6.2. Prohibido:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Cortes reiterados.</li>
                <li>Reincorporaciones peligrosas.</li>
                <li>Chat en pista.</li>
                <li>Maniobras temerarias.</li>
                <li>Venganza o “justicia por mano propia” (expulsión inmediata).</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium">6.3. Sanciones posibles:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Advertencia.</li>
                <li>Pérdida de posiciones.</li>
                <li>Recargos de tiempo.</li>
                <li>Aumento de lastre.</li>
                <li>Exclusión de la fecha.</li>
                <li>Exclusión del campeonato.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 7: Denuncias y apelaciones</h2>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
            <li>Las denuncias se realizan solo por el formulario oficial de la liga.</li>
            <li>Tiempo máximo para denunciar: hasta 12 horas después de la carrera.</li>
            <li>Las apelaciones se permiten una sola vez por incidente.</li>
            <li>El comisariado dará resolución final dentro de las 72 hs.</li>
          </ul>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 8: Premios</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">🏆 Campeón:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Fecha real en la ZN Rental 390cc.</li>
              <li>1 vuelta de reconocimiento.</li>
              <li>3 vueltas de clasificación.</li>
              <li>Final de 16 vueltas en Zárate.</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 9: Lastre disciplinario</h2>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
            <li>9.1. No existe sistema de lastre por rendimiento deportivo.</li>
            <li>
              9.2. El lastre solo podrá aplicarse como sanción disciplinaria por incidentes, conductas antideportivas o
              reincidencias.
            </li>
            <li>
              9.3. La cantidad de kilos, duración de la sanción y su aplicación quedarán exclusivamente a criterio del
              comisariado.
            </li>
            <li>9.4. El lastre disciplinario podrá combinarse con otras sanciones.</li>
          </ul>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 10: Sistema de rating y licencias</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              El ZN Rating es un indicador del nivel y constancia del piloto. Se calcula a partir de los puntos obtenidos
              en el campeonato y de un plus de rendimiento basado en las estadísticas del piloto, según la fórmula general:{' '}
              <span className="font-mono">ZN Rating = 1000 + (Puntos x 10) + Bonificación de rendimiento - Penalizaciones</span>.
            </p>
            <p>
              Los puntos de campeonato se suman en base a los resultados oficiales de clasificaciones y carreras, luego de
              aplicar exclusiones, DNF y reordenamientos por penalizaciones de tiempo. Todas las sanciones que modifiquen
              posiciones o dejen a un piloto sin puntos afectarán directamente su ZN Rating.
            </p>
            <p>
              La bonificación de rendimiento se obtiene en función de las estadísticas acumuladas del piloto en el campeonato:
              cantidad de victorias, podios, resultados en Top 5 y Top 10, así como su promedio de posición final. Un mayor
              número de buenos resultados y un mejor promedio de posición incrementan la bonificación y, por lo tanto, el ZN Rating.
            </p>
            <p>
              Adicionalmente, el total de penalizaciones de tiempo acumuladas en carreras y clasificaciones, así como las
              ausencias a fechas oficiales, reducen el ZN Rating según los siguientes criterios:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Por cada <span className="font-mono">5 segundos</span> de penalización acumulada se descontarán{" "}
                <span className="font-mono">20 puntos</span> de ZN Rating.
              </li>
              <li>
                Por cada carrera oficial del campeonato en la que el piloto no se presente (ausencia) se descontarán{" "}
                <span className="font-mono">100 puntos</span> de ZN Rating.
              </li>
              <li>
                Estos descuentos se aplican sobre el rating base calculado por puntos, y nunca podrán dejar el ZN Rating
                por debajo de 0.
              </li>
            </ul>
            <p>
              Las licencias se asignan automáticamente en función del ZN Rating alcanzado por cada piloto. Los rangos son
              los siguientes:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded border p-2 flex items-center gap-3 bg-[#020617]">
                <span className="inline-flex items-center justify-center h-6 w-8 rounded bg-[#1f2937] text-white font-bold text-xs">R</span>
                <span className="text-xs">Rating &lt; 1200 (menos de 20 pts de campeonato)</span>
              </div>
              <div className="rounded border border-[#1d4ed8] p-2 flex items-center gap-3 bg-[#1d4ed8]/10">
                <span className="inline-flex items-center justify-center h-6 w-8 rounded bg-[#1d4ed8] text-white font-bold text-xs">D</span>
                <span className="text-xs">Rating ≥ 1200 (desde 20 pts)</span>
              </div>
              <div className="rounded border border-[#16a34a] p-2 flex items-center gap-3 bg-[#16a34a]/10">
                <span className="inline-flex items-center justify-center h-6 w-8 rounded bg-[#16a34a] text-white font-bold text-xs">C</span>
                <span className="text-xs">Rating ≥ 1600 (desde 60 pts)</span>
              </div>
              <div className="rounded border border-[#f59e0b] p-2 flex items-center gap-3 bg-[#f59e0b]/10">
                <span className="inline-flex items-center justify-center h-6 w-8 rounded bg-[#f59e0b] text-[#020617] font-bold text-xs">B</span>
                <span className="text-xs">Rating ≥ 2200 (desde 120 pts)</span>
              </div>
              <div className="rounded border border-[#d8552b] p-2 flex items-center gap-3 bg-[#d8552b]/10">
                <span className="inline-flex items-center justify-center h-6 w-8 rounded bg-[#d8552b] text-white font-bold text-xs">A</span>
                <span className="text-xs">Rating ≥ 4000 (desde 300 pts)</span>
              </div>
            </div>
            <p>
              Un aumento en el rendimiento (mejores resultados y menos sanciones) permitirá a los pilotos subir de
              licencia, mientras que una acumulación de malas actuaciones o penalizaciones puede mantenerlos en licencias
              más bajas a lo largo de la temporada.
            </p>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 11: Discord y WhatsApp obligatorios</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Se utilizarán para:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Reuniones de pilotos.</li>
              <li>Publicación de reglamentos.</li>
              <li>Publicación de sanciones.</li>
              <li>Envío de skins.</li>
              <li>Comunicación con dirección de carrera.</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 12: Fechas del campeonato</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              La fecha de comienzo del campeonato se define una vez alcanzados los 20 pilotos inscriptos.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>1. Zárate 1 (Pretemporada, carga de skins).</li>
              <li>2. Baradero (Pretemporada, carga de skins).</li>
              <li>3. Buenos Aires 2 invertido.</li>
              <li>4. Ciudad Evita (Especial – 40 vueltas) (nuevo).</li>
              <li>5. Zárate 4.</li>
              <li>6. Buenos Aires 1.</li>
              <li>7. Mar del Plata (Especial – 40 vueltas) (nuevo).</li>
              <li>8. Zárate 9 (Especial – 40 vueltas).</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 13: Bugs, errores técnicos y resultados</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              13.1. La liga no se responsabiliza por bugs, errores o fallas técnicas ajenas a la organización,
              incluyendo pero no limitándose a:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Circuitos.</li>
              <li>Plataforma Assetto Corsa.</li>
              <li>Servidor.</li>
              <li>App ZN Flags (Banderas).</li>
              <li>Conexión de los pilotos.</li>
            </ul>
            <p>
              13.2. En caso de que cualquier bug o error técnico durante una sesión oficial (clasificación o carrera)
              pueda perjudicar parcial o totalmente a uno o más pilotos, no se aceptarán reclamos, denuncias ni
              apelaciones por dicho motivo.
            </p>
            <p>
              13.3. Los resultados oficiales de cada fecha serán los que figuren al finalizar la sesión en el servidor,
              sin excepción, independientemente de incidentes técnicos, bugs o fallas externas.
            </p>
            <p>
              13.4. La organización solo podrá intervenir o modificar resultados en casos de fuerza mayor extrema que
              afecten de manera general a la mayoría del parque, quedando dicha decisión exclusivamente a criterio del
              comisariado.
            </p>
          </div>
        </Card>

        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-[#d8552b]" />
            <h2 className="text-lg font-semibold">Artículo 14: Sistema de banderas (App ZN Flags)</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              El sistema oficial de señales en pista se gestiona mediante la App ZN Flags (Banderas). Cada bandera indica
              una condición específica que los pilotos deben respetar de forma inmediata.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/VERDE.png"
                    alt="Bandera verde"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Bandera verde</p>
                  <p className="text-xs">Pista libre. Se reanuda el ritmo normal de carrera.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/AMARILLA.png"
                    alt="Bandera amarilla"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Bandera amarilla</p>
                  <p className="text-xs">
                    Peligro en el sector. Reducir la velocidad, no adelantar y extremar la precaución.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/SC.png"
                    alt="Bandera Safety Car"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Safety Car</p>
                  <p className="text-xs">
                    Presencia de Safety Car. Mantener ritmo controlado, sin adelantamientos, respetando las órdenes de
                    carrera.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/SLOW.png"
                    alt="Bandera Slow"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Slow</p>
                  <p className="text-xs">
                    Zona de velocidad reducida. Respetar el delta marcado por la app y evitar maniobras de riesgo.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/ROJA.png"
                    alt="Bandera roja"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Bandera roja</p>
                  <p className="text-xs">
                    Sesión detenida. Reducir la velocidad, no adelantar y regresar a boxes siguiendo las indicaciones.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/SEMROJO.png"
                    alt="Semáforo rojo en boxes"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Semáforo rojo</p>
                  <p className="text-xs">
                    Boxes cerrados o salida no autorizada. Permanecer detenido hasta que la señal cambie a habilitado.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/RELANZA.png"
                    alt="Bandera de relanzamiento"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Relanza</p>
                  <p className="text-xs">
                    Relanzamiento de la carrera. Mantener la fila y la velocidad indicada hasta la zona habilitada para
                    volver a acelerar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded">
                  <Image
                    src="/assets/FIN.png"
                    alt="Bandera de fin de carrera"
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Fin de carrera</p>
                  <p className="text-xs">
                    Final de la sesión. Completar la vuelta con seguridad y regresar a boxes sin maniobras innecesarias.
                  </p>
                </div>
              </div>
            </div>
            <p>
              Ignorar las indicaciones de la App ZN Flags puede derivar en sanciones deportivas, recargos de tiempo o
              exclusiones de acuerdo al criterio del comisariado.
            </p>
          </div>
        </Card>
      </div>


      <div className="rounded-lg border p-3 md:p-4 text-xs md:text-sm text-muted-foreground space-y-1.5">
        <p>
          Este reglamento resume de forma estructurada el texto oficial provisto por la organización para la temporada
          3 de la Liga ZN SimRacing 2026.
        </p>
        <p>
          Ante cualquier duda o actualización, la referencia prioritaria será la comunicación oficial en los canales de
          la liga (Discord, WhatsApp y ficha del campeonato en{" "}
          <Link href="/championship" className="underline">
            esta página
          </Link>
          ).
        </p>
      </div>
    </div>
  );
}

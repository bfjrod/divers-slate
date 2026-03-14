'use client'

type Point = { t: number; d: number; tmp?: number }

interface Props {
  data: Point[]
  maxDepthFt?: number | null
}

const W = 800
const H = 200
const PAD = { top: 12, right: 16, bottom: 32, left: 44 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top - PAD.bottom

export default function DiveProfile({ data, maxDepthFt }: Props) {
  if (!data || data.length < 2) return null

  const maxT = data[data.length - 1].t
  const maxD = Math.max(maxDepthFt ?? 0, ...data.map((p) => p.d))
  const hasTmp = data.some((p) => p.tmp !== undefined)

  // Scale helpers
  const sx = (t: number) => PAD.left + (t / maxT) * CHART_W
  const sy = (d: number) => PAD.top + (d / maxD) * CHART_H

  // Depth path
  const depthPoints = data.map((p) => `${sx(p.t)},${sy(p.d)}`).join(' ')
  const areaPath =
    `M${sx(0)},${sy(0)} ` +
    data.map((p) => `L${sx(p.t)},${sy(p.d)}`).join(' ') +
    ` L${sx(maxT)},${sy(0)} Z`

  // Temp path (normalised to chart height, separate axis)
  let tmpPath = ''
  if (hasTmp) {
    const tmpPoints = data.filter((p) => p.tmp !== undefined)
    const minTmp = Math.min(...tmpPoints.map((p) => p.tmp!))
    const maxTmp = Math.max(...tmpPoints.map((p) => p.tmp!))
    const range = maxTmp - minTmp || 1
    const syt = (tmp: number) => PAD.top + CHART_H - ((tmp - minTmp) / range) * CHART_H * 0.6
    tmpPath = tmpPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.t)},${syt(p.tmp!)}`).join(' ')
  }

  // Depth axis labels — pick 4 nice round intervals
  const depthStep = Math.ceil(maxD / 4 / 10) * 10 || 10
  const depthTicks = Array.from({ length: Math.floor(maxD / depthStep) + 1 }, (_, i) => i * depthStep)

  // Time axis labels — every minute, up to 8 labels
  const totalMins = Math.ceil(maxT / 60)
  const minStep = Math.ceil(totalMins / 8)
  const timeTicks = Array.from({ length: Math.floor(totalMins / minStep) + 1 }, (_, i) => i * minStep)

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Depth profile</p>
      <div className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50 p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 180 }}
          aria-label="Dive depth profile chart"
        >
          {/* Subtle depth grid lines */}
          {depthTicks.slice(1).map((d) => (
            <line
              key={d}
              x1={PAD.left}
              y1={sy(d)}
              x2={PAD.left + CHART_W}
              y2={sy(d)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}

          {/* Depth area fill */}
          <defs>
            <linearGradient id="depthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#depthGrad)" />

          {/* Depth line */}
          <polyline
            points={depthPoints}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Temperature overlay */}
          {hasTmp && tmpPath && (
            <path
              d={tmpPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeDasharray="4 3"
              opacity={0.7}
            />
          )}

          {/* Depth axis labels */}
          {depthTicks.map((d) => (
            <text
              key={d}
              x={PAD.left - 6}
              y={sy(d) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#9ca3af"
            >
              {d}ft
            </text>
          ))}

          {/* Time axis labels */}
          {timeTicks.map((min) => (
            <text
              key={min}
              x={sx(min * 60)}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#9ca3af"
            >
              {min}m
            </text>
          ))}

          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CHART_H} stroke="#e5e7eb" strokeWidth={1} />
          <line x1={PAD.left} y1={PAD.top + CHART_H} x2={PAD.left + CHART_W} y2={PAD.top + CHART_H} stroke="#e5e7eb" strokeWidth={1} />
        </svg>

        {hasTmp && (
          <div className="flex items-center gap-4 px-2 pb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-sky-400 rounded" />
              <span className="text-xs text-gray-400">Depth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-amber-400 rounded" style={{ borderTop: '1.5px dashed #f59e0b', background: 'none' }} />
              <span className="text-xs text-gray-400">Temp</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

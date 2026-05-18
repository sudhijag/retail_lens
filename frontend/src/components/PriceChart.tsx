'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { PLATFORMS } from '../lib/data'

interface Props {
  data: Record<string, string | number>[]
  yourPrice: number
  highlightPromo?: boolean
}

const fmt = (v: number) => `$${v.toFixed(2)}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1714', border: 'none', borderRadius: 8,
      padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    }}>
      <div style={{ color: '#b5a892', marginBottom: 6, fontSize: 10 }}>{label}</div>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} style={{ color: entry.color, marginBottom: 2 }}>
          {entry.name}: ${(entry.value as number).toFixed(2)}
        </div>
      ))}
    </div>
  )
}

export default function PriceChart({ data, yourPrice }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0d9cf" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: '#b5a892' }}
          axisLine={false} tickLine={false}
          interval={4}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: '#b5a892' }}
          axisLine={false} tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={yourPrice}
          stroke="#c8410a"
          strokeDasharray="5 3"
          strokeWidth={1.5}
          label={{
            value: `Your $${yourPrice}`,
            position: 'right',
            fill: '#c8410a',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
          }}
        />
        {PLATFORMS.map(p => (
          <Line
            key={p.id}
            type="monotone"
            dataKey={p.id}
            name={p.name}
            stroke={p.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
        <Legend
          wrapperStyle={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            paddingTop: 8,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

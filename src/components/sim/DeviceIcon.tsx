import type { NodeKind } from '../../sim/types'

interface Props {
  kind: NodeKind
  color: string
  size?: number
}

/** Minimal, consistent line-art glyphs for each device kind (no emoji). */
export default function DeviceIcon({ kind, color, size = 30 }: Props) {
  const s = { width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'pc':
      return (<svg viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></svg>)
    case 'laptop':
      return (<svg viewBox="0 0 24 24" {...s}><rect x="4" y="5" width="16" height="10" rx="1.5" /><path d="M2 19h20l-1.5-3H3.5L2 19Z" /></svg>)
    case 'iot':
      return (<svg viewBox="0 0 24 24" {...s}><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 7V4M15 7V4M9 20v-3M15 20v-3M7 9H4M7 15H4M20 9h-3M20 15h-3" /></svg>)
    case 'server':
      return (<svg viewBox="0 0 24 24" {...s}><rect x="4" y="3" width="16" height="7" rx="1" /><rect x="4" y="14" width="16" height="7" rx="1" /><path d="M7 6.5h.01M7 17.5h.01" /></svg>)
    case 'database':
      return (<svg viewBox="0 0 24 24" {...s}><ellipse cx="12" cy="5" rx="7" ry="2.6" /><path d="M5 5v14c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5" /><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" /></svg>)
    case 'mail':
      return (<svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>)
    case 'dns':
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>)
    case 'switch':
      return (<svg viewBox="0 0 24 24" {...s}><rect x="2" y="8" width="20" height="8" rx="1.5" /><path d="m6 8 2-3M18 8l-2-3M10 8l2-3M14 16l2 3M6 16l2 3M10 16l2 3" /></svg>)
    case 'router':
      return (<svg viewBox="0 0 24 24" {...s}><rect x="2" y="12" width="20" height="7" rx="1.5" /><path d="M6 12V8M18 12V8M12 12V6M6 8h12" /><path d="M4 8.5l2-2.5M20 8.5l-2-2.5" /></svg>)
    case 'cloud':
      return (<svg viewBox="0 0 24 24" {...s}><path d="M7 18h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 6 9.5 3.5 3.5 0 0 0 7 18Z" /></svg>)
    case 'website':
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 9h18M3 15h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" /></svg>)
    case 'attacker':
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 3a6 6 0 0 0-6 6v3l-1.5 2.5h15L18 12V9a6 6 0 0 0-6-6Z" /><circle cx="9.5" cy="10" r="1.2" fill={color} stroke="none" /><circle cx="14.5" cy="10" r="1.2" fill={color} stroke="none" /><path d="M8 17v2M12 17v3M16 17v2" /></svg>)
    default:
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="8" /></svg>)
  }
}

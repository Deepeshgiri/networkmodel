export type NodeKind =
  | 'pc' | 'laptop' | 'iot' | 'server' | 'database' | 'mail' | 'dns'
  | 'switch' | 'router' | 'cloud' | 'website'

export type Zone = 'lan' | 'dmz' | 'edge' | 'internet'

export interface NetNode {
  id: string
  kind: NodeKind
  label: string
  role: string
  ip: string
  mac: string
  zone: Zone
  x: number
  y: number
  layer: number // highest OSI layer the device operates at
  explain: string
}

export interface NetLink {
  a: string
  b: string
  medium: 'ethernet' | 'fiber' | 'wan' | 'wifi'
}

export type Proto = 'ARP' | 'ICMP' | 'TCP' | 'UDP' | 'DNS' | 'TLS' | 'HTTP' | 'HTTPS' | 'SMTP' | 'SMB' | 'MQTT'

export type PacketStatus = 'flying' | 'delivered' | 'dropped'

export interface Packet {
  id: number
  proto: Proto
  label: string
  src: string
  dst: string
  path: string[]
  hop: number
  progress: number
  hopTime: number
  srcPort: number
  dstPort: number
  flags?: string
  payload: string
  summary: string
  encrypted: boolean
  ttl: number
  status: PacketStatus
  fade: number
  dropReason?: string
  scenario?: boolean
  onArrive?: (p: Packet) => void
}

export interface NodeState {
  busy: number // recent packets handled, decays over time (for glow)
  load: number // 0-1 server utilisation
}

export type LogLevel = 'info' | 'success' | 'warn'

export interface LogEntry {
  id: number
  t: number
  level: LogLevel
  source: string
  msg: string
}

export interface Metrics {
  sent: number
  delivered: number
  dropped: number
}

export interface HistoryPoint {
  t: number
  delivered: number
  inFlight: number
}

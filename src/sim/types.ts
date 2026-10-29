export type NodeKind =
  | 'pc' | 'laptop' | 'iot' | 'server' | 'database' | 'mail' | 'dns'
  | 'switch' | 'router' | 'cloud' | 'website' | 'attacker'

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

export type DefenseId = 'firewall' | 'ids' | 'ratelimit' | 'dai' | 'dnssec' | 'segmentation'

export interface Threat {
  id: string
  name: string
  /** Defenses that drop the packet when it reaches a node that has them (and they are enabled). */
  blockedBy: DefenseId[]
  /** Defenses that raise an alert without stopping it. */
  detectedBy?: DefenseId[]
  /** Per-defense probability of a block (defaults to 1); used for flood rate-limiting. */
  blockChance?: Partial<Record<DefenseId, number>>
}

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
  malicious: boolean
  threat?: Threat
  ttl: number
  status: PacketStatus
  fade: number
  dropReason?: string
  dropAt?: string
  detected?: boolean
  scenario?: boolean
}

/** A snapshot of a frame as it appeared at one node — the per-node capture buffer ("tap"). */
export interface Capture {
  key: number
  packetId: number
  t: number
  proto: Proto
  src: string
  dst: string
  srcPort: number
  dstPort: number
  flags?: string
  payload: string
  summary: string
  encrypted: boolean
  malicious: boolean
  ttlAt: number
  prevHop: string
  nextHop: string
  atNode: string
  hopIndex: number
  hopCount: number
  dropped?: boolean
}

/** Everything the inspector needs to render a layered header view, from a live packet or a capture. */
export interface Frame {
  proto: Proto
  src: string
  dst: string
  srcPort: number
  dstPort: number
  flags?: string
  ttl: number
  payload: string
  summary: string
  encrypted: boolean
  malicious: boolean
  linkFrom: string // L2 source (this hop)
  linkTo: string   // L2 destination (this hop)
  atNode: string
  hopIndex: number
  hopCount: number
  status: PacketStatus
  dropReason?: string
}

export type NodeStatus = 'ok' | 'warning' | 'compromised' | 'down'

export interface NodeState {
  busy: number // recent packets handled, decays over time (for glow)
  load: number // 0-1 server utilisation
  status: NodeStatus
  alerts: number
}

export type LogLevel = 'info' | 'success' | 'warn' | 'alert' | 'block' | 'breach'

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
  blocked: number
  alerts: number
  breaches: number
}

export interface HistoryPoint {
  t: number
  delivered: number
  inFlight: number
}

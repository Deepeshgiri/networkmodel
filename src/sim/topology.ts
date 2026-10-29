import type { NetLink, NetNode, Zone } from './types'

export const VIEW_W = 1400
export const VIEW_H = 820

export const ZONES: { id: Zone; label: string; sub: string; x: number; y: number; w: number; h: number; color: string }[] = [
  { id: 'lan', label: 'HOME / OFFICE LAN', sub: '10.0.1.0/24 · private addresses', x: 24, y: 150, w: 440, h: 640, color: '#38bdf8' },
  { id: 'dmz', label: 'SERVER NETWORK', sub: '172.16.0.0/24 · company servers', x: 500, y: 24, w: 470, h: 330, color: '#a78bfa' },
  { id: 'edge', label: 'GATEWAY', sub: 'LAN ↔ internet', x: 500, y: 390, w: 470, h: 160, color: '#f472b6' },
  { id: 'internet', label: 'INTERNET', sub: 'public addresses', x: 1000, y: 24, w: 376, h: 766, color: '#f97316' },
]

export const NODES: NetNode[] = [
  { id: 'alice', kind: 'pc', label: 'Alice PC', role: 'Workstation', ip: '10.0.1.10', mac: 'a4:c3:f0:10:00:0a', zone: 'lan', x: 110, y: 250, layer: 7,
    explain: 'An end-user computer. Apps build data at Layer 7, and the OS network stack wraps it layer by layer down to bits on the wire.' },
  { id: 'bob', kind: 'laptop', label: 'Bob Laptop', role: 'Workstation (Wi-Fi)', ip: '10.0.1.11', mac: 'a4:c3:f0:10:00:0b', zone: 'lan', x: 110, y: 430, layer: 7,
    explain: 'A laptop on Wi-Fi. Its frames travel as radio (802.11) to an access point, then continue as Ethernet frames.' },
  { id: 'iot', kind: 'iot', label: 'Smart Sensor', role: 'IoT device', ip: '10.0.1.40', mac: 'b8:27:eb:40:00:40', zone: 'lan', x: 110, y: 610, layer: 7,
    explain: 'A small device that sends short telemetry messages (MQTT over TCP) to a server at regular intervals.' },
  { id: 'files', kind: 'server', label: 'File Server', role: 'SMB file share', ip: '10.0.1.20', mac: 'a4:c3:f0:10:00:14', zone: 'lan', x: 300, y: 700, layer: 7,
    explain: 'Shares files over SMB (TCP 445). LAN-to-LAN traffic stays inside the switch and never reaches the router.' },
  { id: 'sw', kind: 'switch', label: 'Core Switch', role: 'Layer-2 switch', ip: '—', mac: '00:1b:54:00:00:01', zone: 'lan', x: 300, y: 430, layer: 2,
    explain: 'Forwards Ethernet frames by MAC address using its MAC (CAM) table. It reads Layer-2 headers only and ignores IP addresses.' },
  { id: 'gw', kind: 'router', label: 'Gateway Router', role: 'Default gateway + NAT', ip: '10.0.1.1', mac: '00:1b:54:00:00:fe', zone: 'edge', x: 600, y: 470, layer: 3,
    explain: 'The LAN default gateway. Any packet for an address outside 10.0.1.0/24 is sent here. It routes by IP and translates private addresses to a public one (NAT).' },
  { id: 'edge', kind: 'router', label: 'ISP Router', role: 'ISP uplink · BGP', ip: '203.0.113.1', mac: '00:1b:54:00:01:01', zone: 'edge', x: 860, y: 470, layer: 3,
    explain: 'Connects the network to the ISP. Each router hop decrements the TTL and rewrites the Layer-2 MAC addresses, while the IP addresses stay the same.' },
  { id: 'srvsw', kind: 'switch', label: 'Server Switch', role: 'Layer-2 switch', ip: '—', mac: '00:1b:54:00:02:01', zone: 'dmz', x: 600, y: 250, layer: 2,
    explain: 'Connects the company servers to the gateway router.' },
  { id: 'web', kind: 'server', label: 'Web Server', role: 'HTTPS · nginx', ip: '172.16.0.10', mac: '00:1b:54:00:02:0a', zone: 'dmz', x: 760, y: 120, layer: 7,
    explain: 'Serves the company website over HTTPS (TCP 443). It talks to the database to build pages.' },
  { id: 'db', kind: 'database', label: 'Database', role: 'PostgreSQL', ip: '172.16.0.20', mac: '00:1b:54:00:02:14', zone: 'dmz', x: 900, y: 120, layer: 7,
    explain: 'Stores application data. Only the web server talks to it, on TCP 5432.' },
  { id: 'mail', kind: 'mail', label: 'Mail Server', role: 'SMTP · IMAP', ip: '172.16.0.25', mac: '00:1b:54:00:02:19', zone: 'dmz', x: 760, y: 290, layer: 7,
    explain: 'Sends and receives email using SMTP (TCP 25/587). Other mail servers find it through DNS MX records.' },
  { id: 'dns', kind: 'dns', label: 'DNS Resolver', role: 'Recursive resolver', ip: '172.16.0.53', mac: '00:1b:54:00:02:35', zone: 'dmz', x: 900, y: 290, layer: 7,
    explain: 'Turns names like example.com into IP addresses. It asks root, TLD and authoritative servers on behalf of clients and caches the answers.' },
  { id: 'net', kind: 'cloud', label: 'Internet Backbone', role: 'Tier-1 transit', ip: '—', mac: '—', zone: 'internet', x: 1100, y: 470, layer: 3,
    explain: 'Many routers in many autonomous systems, glued together by BGP. A packet typically crosses 10–20 router hops here.' },
  { id: 'site', kind: 'website', label: 'example.com', role: 'Remote web server (CDN)', ip: '93.184.215.14', mac: '—', zone: 'internet', x: 1280, y: 300, layer: 7,
    explain: 'A public website served from a CDN edge node close to the user.' },
  { id: 'pubdns', kind: 'dns', label: 'Root / TLD DNS', role: 'Authoritative DNS', ip: '198.41.0.4', mac: '—', zone: 'internet', x: 1280, y: 140, layer: 7,
    explain: 'The DNS hierarchy: root servers point to .com TLD servers, which point to the domain authoritative server that holds the actual record.' },
  { id: 'cloudapi', kind: 'server', label: 'Cloud API', role: 'IoT telemetry endpoint', ip: '52.20.10.5', mac: '—', zone: 'internet', x: 1280, y: 640, layer: 7,
    explain: 'A cloud service that receives sensor telemetry over MQTT/TLS.' },
]

export const LINKS: NetLink[] = [
  { a: 'alice', b: 'sw', medium: 'ethernet' },
  { a: 'bob', b: 'sw', medium: 'wifi' },
  { a: 'iot', b: 'sw', medium: 'wifi' },
  { a: 'files', b: 'sw', medium: 'ethernet' },
  { a: 'sw', b: 'gw', medium: 'ethernet' },
  { a: 'gw', b: 'srvsw', medium: 'ethernet' },
  { a: 'srvsw', b: 'web', medium: 'ethernet' },
  { a: 'srvsw', b: 'mail', medium: 'ethernet' },
  { a: 'srvsw', b: 'dns', medium: 'ethernet' },
  { a: 'web', b: 'db', medium: 'ethernet' },
  { a: 'gw', b: 'edge', medium: 'fiber' },
  { a: 'edge', b: 'net', medium: 'wan' },
  { a: 'net', b: 'site', medium: 'wan' },
  { a: 'net', b: 'pubdns', medium: 'wan' },
  { a: 'net', b: 'cloudapi', medium: 'wan' },
]

export const NODE_BY_ID: Record<string, NetNode> = Object.fromEntries(NODES.map(n => [n.id, n]))

const ADJ: Record<string, string[]> = {}
for (const l of LINKS) {
  ;(ADJ[l.a] ??= []).push(l.b)
  ;(ADJ[l.b] ??= []).push(l.a)
}

/** Shortest path between two nodes (BFS over links). */
export function route(src: string, dst: string): string[] {
  if (src === dst) return [src]
  const prev: Record<string, string | null> = { [src]: null }
  const queue = [src]
  while (queue.length) {
    const cur = queue.shift()!
    for (const next of ADJ[cur] ?? []) {
      if (next in prev) continue
      prev[next] = cur
      if (next === dst) {
        const path = [dst]
        let p = prev[dst]
        while (p) { path.unshift(p); p = prev[p] }
        return path
      }
      queue.push(next)
    }
  }
  return [src]
}

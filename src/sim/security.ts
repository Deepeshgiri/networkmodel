import type { DefenseId, Proto, Threat } from './types'

export interface Defense {
  id: DefenseId
  name: string
  short: string
  host: string // node id where this control lives
  color: string
  desc: string
}

export const DEFENSES: Defense[] = [
  { id: 'dai', name: 'Dynamic ARP Inspection', short: 'DAI', host: 'sw', color: '#eab308',
    desc: 'The switch checks ARP replies against a trusted IP↔MAC table and drops forged ones — stopping ARP spoofing / MITM.' },
  { id: 'segmentation', name: 'Network Segmentation', short: 'VLAN', host: 'sw', color: '#2dd4bf',
    desc: 'VLANs/ACLs stop a compromised host from freely reaching other hosts, blocking lateral movement like ransomware over SMB.' },
  { id: 'firewall', name: 'Stateful Firewall', short: 'FW', host: 'gw', color: '#f472b6',
    desc: 'Only allows inbound traffic that matches an existing outbound connection or an explicit rule — unsolicited scans are dropped.' },
  { id: 'ids', name: 'Intrusion Detection (IDS)', short: 'IDS', host: 'gw', color: '#38bdf8',
    desc: 'Watches traffic for known-bad patterns (port scans, floods, spoofed replies) and raises alerts.' },
  { id: 'ratelimit', name: 'Rate Limiting', short: 'RL', host: 'gw', color: '#a78bfa',
    desc: 'Caps how many new connections per second a source can open, absorbing most of a SYN flood / DDoS.' },
  { id: 'dnssec', name: 'DNSSEC Validation', short: 'DNSSEC', host: 'dns', color: '#22c55e',
    desc: 'The resolver cryptographically verifies DNS answers, so forged (spoofed) records are rejected.' },
]

export const NODE_DEFENSES: Record<string, DefenseId[]> = {
  sw: ['dai', 'segmentation'],
  gw: ['firewall', 'ids', 'ratelimit'],
  dns: ['dnssec'],
}

export const THREATS: Record<string, Threat> = {
  arp_spoof: { id: 'arp_spoof', name: 'ARP spoofing', blockedBy: ['dai'] },
  syn_flood: { id: 'syn_flood', name: 'SYN flood', blockedBy: ['ratelimit'], detectedBy: ['ids'], blockChance: { ratelimit: 0.8 } },
  port_scan: { id: 'port_scan', name: 'Port scan', blockedBy: ['firewall'], detectedBy: ['ids'] },
  dns_spoof: { id: 'dns_spoof', name: 'DNS spoofing', blockedBy: ['dnssec'], detectedBy: ['ids'] },
  ransomware: { id: 'ransomware', name: 'Ransomware spread', blockedBy: ['segmentation'] },
}

export interface AttackDef {
  id: string
  name: string
  icon: string
  severity: 'high' | 'critical'
  layers: number[]
  threatId: keyof typeof THREATS
  story: string
  mitigation: string
  burst: {
    proto: Proto
    src: string
    dst: string
    srcPort: number
    dstPort: number
    flags?: string
    payload: string
    summary: string
    encrypted?: boolean
    count: number
    intervalMs: number
  }
}

export const ATTACKS: AttackDef[] = [
  {
    id: 'arp_spoof', name: 'ARP Spoofing (MITM)', icon: '🎭', severity: 'critical', layers: [2], threatId: 'arp_spoof',
    story: 'A compromised laptop floods the LAN with forged ARP replies claiming “10.0.1.1 (the gateway) is at my MAC”, trying to make Alice send her traffic through it.',
    mitigation: 'Dynamic ARP Inspection on the switch drops ARP replies that don’t match the trusted IP↔MAC bindings.',
    burst: { proto: 'ARP', src: 'bob', dst: 'alice', srcPort: 0, dstPort: 0, flags: 'reply', payload: '10.0.1.1 is at de:ad:be:ef:00:66 (forged)', summary: 'forged ARP reply — gateway impersonation', count: 4, intervalMs: 450 },
  },
  {
    id: 'syn_flood', name: 'SYN Flood (DDoS)', icon: '💥', severity: 'critical', layers: [3, 4], threatId: 'syn_flood',
    story: 'An attacker on the internet sends a storm of TCP SYN packets to the web server and never completes the handshake, trying to exhaust its connection table.',
    mitigation: 'Rate limiting at the gateway drops most of the flood; the IDS raises an alert. SYN cookies on the server help too.',
    burst: { proto: 'TCP', src: 'attacker', dst: 'web', srcPort: 1337, dstPort: 443, flags: 'SYN', payload: 'SYN (no follow-up)', summary: 'half-open connection flood', count: 12, intervalMs: 180 },
  },
  {
    id: 'port_scan', name: 'Port Scan', icon: '🔦', severity: 'high', layers: [3, 4], threatId: 'port_scan',
    story: 'An attacker probes the web server across many ports to find an exposed service to exploit.',
    mitigation: 'The stateful firewall drops unsolicited inbound connections to closed ports; the IDS flags the scan pattern.',
    burst: { proto: 'TCP', src: 'attacker', dst: 'web', srcPort: 1400, dstPort: 22, flags: 'SYN', payload: 'SYN → port 22,23,3389,445…', summary: 'sequential port probe', count: 8, intervalMs: 260 },
  },
  {
    id: 'dns_spoof', name: 'DNS Spoofing', icon: '🪤', severity: 'high', layers: [7], threatId: 'dns_spoof',
    story: 'An attacker tries to inject a forged DNS answer so that a name resolves to their server instead of the real one.',
    mitigation: 'DNSSEC lets the resolver verify answers cryptographically and reject forgeries; the IDS alerts on the anomaly.',
    burst: { proto: 'DNS', src: 'attacker', dst: 'dns', srcPort: 53, dstPort: 53, payload: 'example.com → 6.6.6.6 (forged, unsigned)', summary: 'forged DNS record injection', count: 5, intervalMs: 350 },
  },
  {
    id: 'ransomware', name: 'Ransomware Lateral Move', icon: '🔐', severity: 'critical', layers: [7], threatId: 'ransomware',
    story: 'A compromised laptop tries to reach the file server over SMB to encrypt the shared drive and spread.',
    mitigation: 'Network segmentation (VLAN/ACL) prevents the workstation VLAN from opening SMB to the server, containing the spread.',
    burst: { proto: 'SMB', src: 'bob', dst: 'files', srcPort: 49500, dstPort: 445, flags: 'PSH,ACK', payload: 'encrypt \\\\files\\share\\*', summary: 'SMB write storm — encryption attempt', count: 6, intervalMs: 300 },
  },
]

/** Decide what a defense node does to a malicious packet arriving at it. */
export function evaluateDefense(
  nodeId: string,
  threat: Threat,
  enabled: Set<DefenseId>,
): { action: 'block' | 'detect'; by: DefenseId } | null {
  const caps = NODE_DEFENSES[nodeId]
  if (!caps) return null
  const blockers = threat.blockedBy.filter(d => caps.includes(d) && enabled.has(d))
  for (const d of blockers) {
    const chance = threat.blockChance?.[d] ?? 1
    if (Math.random() < chance) return { action: 'block', by: d }
  }
  const detectors = (threat.detectedBy ?? []).filter(d => caps.includes(d) && enabled.has(d))
  if (detectors.length) return { action: 'detect', by: detectors[0] }
  return null
}

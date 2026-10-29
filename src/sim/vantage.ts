// Attacker "vantage points" — where an attacker sits on the path decides which
// OSI layer they operate at and therefore what they can read vs. what stays secret.

export interface VantagePoint {
  id: string
  name: string
  short: string
  layer: number
  x: number
  y: number
  color: string
  /** Links this attacker is on-path for (node-id pairs, either order). */
  observes: [string, string][]
  /** True only when traffic is decrypted at this point (an endpoint). */
  seesDecrypted: boolean
  technique: string
  access: string[]
  blind: string[]
  stoppedBy: string[]
  summary: string
}

export const VANTAGE_POINTS: VantagePoint[] = [
  {
    id: 'rogue_lan',
    name: 'Rogue device on the LAN',
    short: 'LAN MITM',
    layer: 2,
    x: 205, y: 335,
    color: '#eab308',
    observes: [['alice', 'sw'], ['sw', 'gw']],
    seesDecrypted: false,
    technique: 'ARP spoofing — forging ARP replies so a victim sends its traffic through the attacker first.',
    summary: 'Sits between a host and the gateway and relays (and can alter) its traffic.',
    access: [
      'Every frame to/from the victim on the local segment',
      'All addressing: MACs, IP addresses, ports',
      'Plaintext protocols in full — DNS queries, plain HTTP, SMB file contents',
      'Can modify or inject packets on the fly (active MITM)',
    ],
    blind: [
      'Anything inside TLS — HTTPS bodies, passwords sent over HTTPS',
      'Other hosts’ traffic it is not actively spoofing',
    ],
    stoppedBy: ['Dynamic ARP Inspection (DAI) on the switch', 'TLS / HTTPS keeps the content secret', '802.1X port authentication'],
  },
  {
    id: 'evil_twin',
    name: 'Evil-twin Wi-Fi',
    short: 'Rogue AP',
    layer: 2,
    x: 48, y: 520,
    color: '#f97316',
    observes: [['bob', 'sw'], ['iot', 'sw']],
    seesDecrypted: false,
    technique: 'A rogue access point broadcasting the same SSID so nearby devices auto-connect to it.',
    summary: 'Impersonates the Wi-Fi network; captures the radio traffic of any device that joins.',
    access: [
      'The wireless frames of every device that associates to the fake AP',
      'Same visibility as a LAN sniffer for those clients: metadata + plaintext protocols',
      'Can serve captive-portal / phishing pages to harvest credentials',
    ],
    blind: ['TLS-encrypted content', 'Devices that stay on the real, trusted network'],
    stoppedBy: ['WPA3 / 802.1X enterprise Wi-Fi', 'TLS + HSTS', 'Server/AP certificate validation'],
  },
  {
    id: 'switch_mirror',
    name: 'Compromised switch',
    short: 'Port mirror',
    layer: 2,
    x: 300, y: 352,
    color: '#eab308',
    observes: [['alice', 'sw'], ['bob', 'sw'], ['iot', 'sw'], ['files', 'sw'], ['sw', 'gw']],
    seesDecrypted: false,
    technique: 'Malicious firmware or a SPAN / port-mirror session copying every port’s traffic.',
    summary: 'Sees all LAN traffic at once — not just one host — because everything flows through it.',
    access: [
      'Every frame on the LAN, from every host',
      'Full metadata and all plaintext protocols, company-wide',
      'A quiet tap — no ARP spoofing needed, nothing looks wrong to hosts',
    ],
    blind: ['TLS payloads', 'Traffic in VLANs/segments this switch cannot reach'],
    stoppedBy: ['Network segmentation (limits what one switch can see)', 'TLS everywhere', 'Switch hardening + firmware integrity'],
  },
  {
    id: 'isp_onpath',
    name: 'On-path at the ISP / backbone',
    short: 'On-path',
    layer: 3,
    x: 980, y: 470,
    color: '#38bdf8',
    observes: [['gw', 'edge'], ['edge', 'net'], ['net', 'site'], ['net', 'pubdns'], ['net', 'cloudapi']],
    seesDecrypted: false,
    technique: 'A compromised ISP router, a lawful-intercept tap, or a BGP hijack that puts the attacker on-path.',
    summary: 'Sees who talks to whom across the internet, but not the encrypted contents.',
    access: [
      'Which IP connects to which IP — the map of who you talk to',
      'Ports, packet sizes and timing (traffic analysis)',
      'Plaintext DNS queries and the TLS SNI — i.e. the site names you visit',
      'Can drop, delay or reroute traffic (BGP hijack)',
    ],
    blind: [
      'The TLS-encrypted content of each connection',
      'Your LAN-internal traffic — it never leaves the building',
    ],
    stoppedBy: ['TLS protects the content', 'Encrypted DNS (DoH/DoT) + Encrypted Client Hello (ECH) hide the names', 'A VPN hides both content and metadata past this point'],
  },
  {
    id: 'dns_evil',
    name: 'Malicious DNS resolver',
    short: 'Evil resolver',
    layer: 7,
    x: 962, y: 345,
    color: '#22c55e',
    observes: [['srvsw', 'dns']],
    seesDecrypted: false,
    technique: 'Owning, or poisoning, the resolver that clients trust for name lookups.',
    summary: 'Sees every name you look up, and can lie about the answers.',
    access: [
      'Every domain every client resolves — a complete map of what you access',
      'Can forge answers to send you to attacker-controlled servers, then phish or MITM',
    ],
    blind: ['The content of the HTTPS connections that follow — still TLS-protected'],
    stoppedBy: ['DNSSEC rejects forged records', 'DoH/DoT stops *others* seeing queries (not the resolver itself)', 'Certificate validation + HSTS limit the damage of a forged answer'],
  },
  {
    id: 'server_pwn',
    name: 'Compromised server (endpoint)',
    short: 'Pwned server',
    layer: 7,
    x: 760, y: 58,
    color: '#ff3366',
    observes: [['srvsw', 'web'], ['web', 'db']],
    seesDecrypted: true,
    technique: 'Remote code execution, stolen credentials, or a supply-chain compromise of the server.',
    summary: 'TLS ends here, so the attacker reads and alters everything in plaintext.',
    access: [
      'Everything, decrypted — the actual requests and responses',
      'Cookies, auth tokens, passwords, and the database behind the app',
      'Can alter the responses served to every visitor',
    ],
    blind: ['Other servers it has not also compromised'],
    stoppedBy: ['This is past the network’s reach — only endpoint hardening, patching, least privilege and EDR help', 'True end-to-end encryption where the server never holds plaintext (rare for web apps)'],
  },
]

export const VANTAGE_BY_ID: Record<string, VantagePoint> = Object.fromEntries(VANTAGE_POINTS.map(v => [v.id, v]))

function linkKey(a: string, b: string) { return [a, b].sort().join('~') }

/** Set of observed link keys for a vantage, for quick canvas lookup. */
export function observedLinkKeys(v: VantagePoint): Set<string> {
  return new Set(v.observes.map(([a, b]) => linkKey(a, b)))
}

/** Does this vantage see the link between a and b? */
export function observesLink(v: VantagePoint, a: string, b: string): boolean {
  return observedLinkKeys(v).has(linkKey(a, b))
}

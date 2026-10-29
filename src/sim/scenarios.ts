import type { Proto } from './types'

export interface ScenarioStep {
  title: string
  layer: number
  proto: Proto
  src: string
  dst: string
  srcPort: number
  dstPort: number
  flags?: string
  payload: string
  summary: string
  encrypted?: boolean
  /** Plain-language narration shown while this step plays. */
  narrate: string
}

export interface Scenario {
  id: string
  name: string
  icon: string
  blurb: string
  steps: ScenarioStep[]
}

const EPHEMERAL = 54321

export const SCENARIOS: Scenario[] = [
  {
    id: 'browse',
    name: 'Open a website (HTTPS)',
    icon: '🌐',
    blurb: 'What really happens between typing a URL and seeing the page — name lookup, connection, encryption, then the page itself.',
    steps: [
      {
        title: 'ARP: find the gateway',
        layer: 2, proto: 'ARP', src: 'alice', dst: 'gw', srcPort: 0, dstPort: 0, flags: 'request',
        payload: 'Who has 10.0.1.1?',
        summary: 'Broadcast asking for the router’s MAC address',
        narrate: 'example.com is outside the local network, so Alice must send the packet to the gateway. First she needs the gateway’s MAC address, so her PC broadcasts an ARP request on the LAN.',
      },
      {
        title: 'ARP reply',
        layer: 2, proto: 'ARP', src: 'gw', dst: 'alice', srcPort: 0, dstPort: 0, flags: 'reply',
        payload: '10.0.1.1 is at 00:1b:54:00:00:fe',
        summary: 'Gateway answers with its MAC address',
        narrate: 'The gateway replies with its MAC address. Now Alice can address Ethernet frames to the gateway for anything leaving the LAN.',
      },
      {
        title: 'DNS query',
        layer: 7, proto: 'DNS', src: 'alice', dst: 'dns', srcPort: EPHEMERAL, dstPort: 53,
        payload: 'A? example.com',
        summary: 'Ask the resolver for example.com’s IP address',
        narrate: 'Alice asks the DNS resolver for the IP address of example.com. DNS runs over UDP on port 53 — small, fast, no connection setup.',
      },
      {
        title: 'DNS answer',
        layer: 7, proto: 'DNS', src: 'dns', dst: 'alice', srcPort: 53, dstPort: EPHEMERAL,
        payload: 'example.com → 93.184.215.14',
        summary: 'Resolver returns the address',
        narrate: 'The resolver returns 93.184.215.14. Alice now knows where to send the packets.',
      },
      {
        title: 'TCP SYN',
        layer: 4, proto: 'TCP', src: 'alice', dst: 'site', srcPort: EPHEMERAL, dstPort: 443, flags: 'SYN',
        payload: 'SYN seq=0',
        summary: 'Start the 3-way handshake to port 443',
        narrate: 'To talk to the web server reliably, Alice opens a TCP connection. Step 1 of the 3-way handshake: a SYN to port 443 (HTTPS).',
      },
      {
        title: 'TCP SYN-ACK',
        layer: 4, proto: 'TCP', src: 'site', dst: 'alice', srcPort: 443, dstPort: EPHEMERAL, flags: 'SYN,ACK',
        payload: 'SYN-ACK seq=0 ack=1',
        summary: 'Server agrees and acknowledges',
        narrate: 'The server replies SYN-ACK: it agrees to the connection and acknowledges Alice’s SYN.',
      },
      {
        title: 'TCP ACK',
        layer: 4, proto: 'TCP', src: 'alice', dst: 'site', srcPort: EPHEMERAL, dstPort: 443, flags: 'ACK',
        payload: 'ACK ack=1',
        summary: 'Connection established',
        narrate: 'Alice sends the final ACK. The TCP connection is now established — both sides can send data reliably and in order.',
      },
      {
        title: 'TLS handshake',
        layer: 6, proto: 'TLS', src: 'alice', dst: 'site', srcPort: EPHEMERAL, dstPort: 443, flags: 'ClientHello',
        payload: 'ClientHello + key share',
        summary: 'Agree on keys; verify the server certificate',
        narrate: 'Before sending anything private, both sides run the TLS handshake: they verify the server’s certificate and agree on a shared secret key. From here on the traffic is encrypted.',
        encrypted: true,
      },
      {
        title: 'HTTPS GET',
        layer: 7, proto: 'HTTPS', src: 'alice', dst: 'site', srcPort: EPHEMERAL, dstPort: 443, flags: 'PSH,ACK',
        payload: 'GET / HTTP/2',
        summary: 'Encrypted request for the page',
        narrate: 'Alice sends the HTTP request — GET / — wrapped inside TLS. Anyone sniffing the wire sees only ciphertext, not the URL or cookies.',
        encrypted: true,
      },
      {
        title: 'HTTPS 200 OK',
        layer: 7, proto: 'HTTPS', src: 'site', dst: 'alice', srcPort: 443, dstPort: EPHEMERAL, flags: 'PSH,ACK',
        payload: '200 OK · text/html',
        summary: 'Encrypted page content comes back',
        narrate: 'The server responds with the page, still encrypted. The browser decrypts it, parses the HTML, and renders the page. Done.',
        encrypted: true,
      },
    ],
  },
  {
    id: 'ping',
    name: 'Ping a server (ICMP)',
    icon: '📡',
    blurb: 'The simplest round trip: an ICMP echo request and reply, hop by hop, with the TTL counting down.',
    steps: [
      {
        title: 'Echo request',
        layer: 3, proto: 'ICMP', src: 'alice', dst: 'site', srcPort: 0, dstPort: 0,
        payload: 'Echo request id=1 seq=1',
        summary: 'Ping goes out toward 93.184.215.14',
        narrate: 'ping sends an ICMP echo request. ICMP lives directly at Layer 3 — no ports, no connection. Watch the TTL drop by one at every router hop.',
      },
      {
        title: 'Echo reply',
        layer: 3, proto: 'ICMP', src: 'site', dst: 'alice', srcPort: 0, dstPort: 0,
        payload: 'Echo reply id=1 seq=1',
        summary: 'Server echoes it straight back',
        narrate: 'The server sends an echo reply straight back along the reverse path. The time between request and reply is the round-trip time (RTT) ping reports.',
      },
    ],
  },
  {
    id: 'mail',
    name: 'Send an email (SMTP)',
    icon: '✉️',
    blurb: 'A message leaves the client, is handed to the mail server, which finds the recipient’s server via DNS MX and relays it.',
    steps: [
      {
        title: 'Submit message',
        layer: 7, proto: 'SMTP', src: 'alice', dst: 'mail', srcPort: EPHEMERAL, dstPort: 587, flags: 'PSH,ACK',
        payload: 'MAIL FROM / RCPT TO / DATA',
        summary: 'Client submits the email to its mail server',
        narrate: 'Alice’s mail client submits the message to the company mail server on port 587 (authenticated submission).',
        encrypted: true,
      },
      {
        title: 'MX lookup',
        layer: 7, proto: 'DNS', src: 'mail', dst: 'dns', srcPort: EPHEMERAL, dstPort: 53,
        payload: 'MX? example.com',
        summary: 'Find the recipient domain’s mail server',
        narrate: 'The mail server asks DNS for the MX record of the recipient’s domain — which server accepts mail for example.com.',
      },
      {
        title: 'Relay to remote server',
        layer: 7, proto: 'SMTP', src: 'mail', dst: 'site', srcPort: EPHEMERAL, dstPort: 25,
        payload: 'MAIL FROM / RCPT TO / DATA',
        summary: 'Deliver across the internet on port 25',
        narrate: 'The mail server connects to the recipient’s mail server on port 25 and relays the message. SMTP is store-and-forward: each hop takes responsibility for the next.',
        encrypted: true,
      },
    ],
  },
]

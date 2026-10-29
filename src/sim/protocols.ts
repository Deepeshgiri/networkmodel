import type { Proto } from './types'
import { NODE_BY_ID } from './topology'

export interface HeaderField {
  name: string
  bits: number
  value: string
  description: string
  color: string
}

export const PROTO_COLOR: Record<Proto, string> = {
  ARP: '#ffcc00',
  ICMP: '#94a3b8',
  TCP: '#00ff88',
  UDP: '#5eead4',
  DNS: '#38bdf8',
  TLS: '#ff3366',
  HTTP: '#f97316',
  HTTPS: '#22c55e',
  SMTP: '#a78bfa',
  SMB: '#eab308',
  MQTT: '#2dd4bf',
}

export const PROTO_LAYER: Record<Proto, number> = {
  ARP: 2, ICMP: 3, TCP: 4, UDP: 4, DNS: 7, TLS: 6, HTTP: 7, HTTPS: 7, SMTP: 7, SMB: 7, MQTT: 7,
}

function macOf(id: string) {
  return NODE_BY_ID[id]?.mac ?? 'ff:ff:ff:ff:ff:ff'
}
function ipOf(id: string) {
  return NODE_BY_ID[id]?.ip ?? '0.0.0.0'
}

const C = {
  l2: '#eab308',
  l3: '#38bdf8',
  l4: '#22c55e',
  l6: '#ff3366',
  l7: '#a78bfa',
  meta: '#64748b',
}

/**
 * Build the layered header stack for a packet, from the inside out
 * (application payload first, then transport, network, link).
 * `nextHopId`/`prevHopId` are the physical neighbours on the current link,
 * so the L2 MAC addresses reflect the hop — not the end-to-end endpoints.
 */
export function buildHeaders(opts: {
  proto: Proto
  srcId: string
  dstId: string
  prevHopId: string
  nextHopId: string
  srcPort: number
  dstPort: number
  flags?: string
  ttl: number
  payload: string
  encrypted: boolean
}): { layer: number; title: string; fields: HeaderField[] }[] {
  const { proto, srcId, dstId, prevHopId, nextHopId, srcPort, dstPort, flags, ttl, payload, encrypted } = opts
  const stack: { layer: number; title: string; fields: HeaderField[] }[] = []

  // ---- Application / L7 ----
  if (PROTO_LAYER[proto] === 7) {
    const appFields: HeaderField[] = []
    if (proto === 'DNS') {
      appFields.push(
        { name: 'Txn ID', bits: 16, value: '0x3f21', description: 'Matches a reply to its query', color: C.l7 },
        { name: 'Flags', bits: 16, value: 'QR=0 RD=1', description: 'Query, recursion desired', color: C.l7 },
        { name: 'Question', bits: 160, value: payload, description: 'The name being looked up', color: C.l7 },
      )
    } else if (proto === 'HTTP' || proto === 'HTTPS') {
      appFields.push(
        { name: 'Request line', bits: 120, value: payload, description: 'Method, path and HTTP version', color: C.l7 },
        { name: 'Host', bits: 96, value: NODE_BY_ID[dstId]?.label ?? dstId, description: 'Which site this request is for', color: C.l7 },
        { name: 'Headers', bits: 256, value: 'User-Agent, Accept, Cookie…', description: 'Metadata about the request', color: C.l7 },
      )
    } else if (proto === 'SMTP') {
      appFields.push({ name: 'SMTP cmd', bits: 160, value: payload, description: 'Mail transfer command/data', color: C.l7 })
    } else if (proto === 'SMB') {
      appFields.push({ name: 'SMB2 hdr', bits: 256, value: payload, description: 'File share operation', color: C.l7 })
    } else if (proto === 'MQTT') {
      appFields.push({ name: 'MQTT', bits: 96, value: payload, description: 'Publish/subscribe telemetry message', color: C.l7 })
    }
    stack.push({ layer: 7, title: `${proto} · Application data`, fields: appFields })
  }

  // ---- Presentation / L6 (TLS) ----
  if (encrypted || proto === 'TLS') {
    stack.push({
      layer: 6,
      title: 'TLS 1.3 · Encryption',
      fields: [
        { name: 'Type', bits: 8, value: '0x17', description: 'Application data record', color: C.l6 },
        { name: 'Version', bits: 16, value: '0x0303', description: 'TLS record version', color: C.l6 },
        { name: 'Length', bits: 16, value: '1024', description: 'Encrypted payload length', color: C.l6 },
        { name: 'Ciphertext', bits: 256, value: '🔒 AES-256-GCM', description: 'The application data, encrypted — unreadable in transit', color: C.l6 },
        { name: 'Auth tag', bits: 128, value: '0x9f2a…', description: 'Proves the data was not tampered with', color: C.l6 },
      ],
    })
  }

  // ---- Transport / L4 ----
  if (proto === 'TCP' || proto === 'TLS' || proto === 'HTTP' || proto === 'HTTPS' || proto === 'SMTP' || proto === 'SMB') {
    stack.push({
      layer: 4,
      title: 'TCP · Transport',
      fields: [
        { name: 'Src port', bits: 16, value: String(srcPort), description: 'Sending app port (ephemeral)', color: C.l4 },
        { name: 'Dst port', bits: 16, value: String(dstPort), description: 'Service port on the destination', color: C.l4 },
        { name: 'Seq', bits: 32, value: '0x3f2a1b0c', description: 'Position in the byte stream', color: C.l4 },
        { name: 'Ack', bits: 32, value: '0x00000001', description: 'Next byte the sender expects', color: C.l4 },
        { name: 'Flags', bits: 9, value: flags ?? 'PSH,ACK', description: 'SYN/ACK/FIN control bits', color: '#dc2626' },
        { name: 'Window', bits: 16, value: '64240', description: 'How much more data the receiver can take', color: C.l4 },
      ],
    })
  } else if (proto === 'UDP' || proto === 'DNS' || proto === 'MQTT') {
    stack.push({
      layer: 4,
      title: 'UDP · Transport',
      fields: [
        { name: 'Src port', bits: 16, value: String(srcPort), description: 'Sending app port', color: C.l4 },
        { name: 'Dst port', bits: 16, value: String(dstPort), description: 'Service port (53 = DNS)', color: C.l4 },
        { name: 'Length', bits: 16, value: '64', description: 'UDP header + data length', color: C.l4 },
        { name: 'Checksum', bits: 16, value: '0xb2c4', description: 'Basic error check', color: C.l4 },
      ],
    })
  }

  // ---- Network / L3 ----
  if (proto !== 'ARP') {
    const ipFields: HeaderField[] = [
      { name: 'Version', bits: 4, value: '4', description: 'IPv4', color: C.meta },
      { name: 'TTL', bits: 8, value: String(ttl), description: 'Hop countdown — a router drops the packet at TTL 0', color: '#dc2626' },
      { name: 'Protocol', bits: 8, value: proto === 'ICMP' ? '1 (ICMP)' : (proto === 'UDP' || proto === 'DNS' || proto === 'MQTT') ? '17 (UDP)' : '6 (TCP)', description: 'What is inside the packet', color: C.l3 },
      { name: 'Src IP', bits: 32, value: ipOf(srcId), description: 'Original sender — unchanged end to end', color: C.l3 },
      { name: 'Dst IP', bits: 32, value: ipOf(dstId), description: 'Final destination — unchanged end to end', color: C.l3 },
    ]
    if (proto === 'ICMP') {
      ipFields.push({ name: 'ICMP', bits: 32, value: 'Echo request', description: 'Ping — type 8 echo request', color: C.l3 })
    }
    stack.push({ layer: 3, title: 'IPv4 · Network', fields: ipFields })
  }

  // ---- Link / L2 ----
  if (proto === 'ARP') {
    stack.push({
      layer: 2,
      title: 'ARP · Address resolution',
      fields: [
        { name: 'Op', bits: 16, value: flags === 'reply' ? '2 (reply)' : '1 (request)', description: 'ARP request or reply', color: C.l2 },
        { name: 'Sender MAC', bits: 48, value: macOf(srcId), description: 'Who is answering/asking', color: C.l2 },
        { name: 'Sender IP', bits: 32, value: ipOf(srcId), description: 'Their IP address', color: C.l2 },
        { name: 'Target IP', bits: 32, value: ipOf(dstId), description: 'The IP whose MAC we want', color: C.l2 },
      ],
    })
  } else {
    stack.push({
      layer: 2,
      title: 'Ethernet · Link (this hop only)',
      fields: [
        { name: 'Dst MAC', bits: 48, value: macOf(nextHopId), description: 'Next device on the wire — rewritten at every hop', color: C.l2 },
        { name: 'Src MAC', bits: 48, value: macOf(prevHopId), description: 'The device that put the frame on this wire', color: C.l2 },
        { name: 'EtherType', bits: 16, value: '0x0800', description: 'IPv4 inside', color: C.meta },
        { name: 'FCS', bits: 32, value: '0xa3f2c1d8', description: 'Frame checksum (error detection)', color: '#92400e' },
      ],
    })
  }

  return stack
}

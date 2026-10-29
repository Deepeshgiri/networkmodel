# NetScope — Network & Security Explainer

An interactive, visual model of how a computer network works, built with React + Vite + TypeScript.
It runs a **live packet simulation** and lets you inspect real protocol headers, so the abstract
OSI model becomes something you can watch and click.

## Views

### 🖧 Network Simulation
A realistic topology — home/office LAN, a core switch, gateway + ISP routers, a server network
(web, database, mail, DNS), and the internet. Packets are routed **hop by hop**: the TTL counts
down at each router and the Ethernet MAC addresses are rewritten per hop while the IP addresses
stay fixed end to end.

- **Background traffic** flows continuously (browsing, DNS, IoT telemetry, file access, DB queries).
- **Guided walkthroughs** play a scenario step by step with plain-language narration:
  - *Open a website (HTTPS)* — ARP → DNS → TCP 3-way handshake → TLS → HTTP request/response
  - *Ping a server (ICMP)* — echo request/reply with the TTL counting down
  - *Send an email (SMTP)* — client submission → MX lookup → relay
- **Send one packet** buttons for ad-hoc HTTPS / DNS / ping / SMB flows.
- **Freeze & step** — pause the whole simulation, then step one hop at a time. While frozen you can
  click *any* packet anywhere on the map and inspect it.
- **Packet inspector** — click any packet to see its full layered encapsulation
  (Ethernet → IP → TCP/UDP → TLS → application), each field with a hover explanation, and a
  **hop stepper** to walk it across the network and watch the MAC addresses rewrite and the TTL
  count down. Encrypted packets show ciphertext instead of the payload.
- **Per-node capture tap** — click any device to open its capture buffer (like a mini packet
  sniffer): every frame that passed through it, newest first. Click a captured frame to inspect its
  structure *as it looked at that node* (correct per-hop MACs and TTL).
- **Live metrics** — delivered / blocked / alerts / breaches, a throughput sparkline, and an event log.
- Pan, zoom, speed control.

### 🛡 Security layer (defensive)
A dedicated **Security** tab turns the same topology into an attack/defense sandbox:

- **Attack simulations** (shown defensively, with the real mitigation): ARP spoofing / MITM, SYN
  flood (DDoS), port scan, DNS spoofing, and ransomware lateral movement over SMB. Malicious packets
  are drawn in red and pulse.
- **Defenses live on real nodes**: Dynamic ARP Inspection + segmentation on the switch, stateful
  firewall + IDS + rate limiting on the gateway, DNSSEC on the resolver. When a malicious packet
  reaches a node whose (enabled) control covers that threat, it is **dropped at that node** with a
  reason, an alert is logged, and the node glows.
- **Toggle any defense on/off** — from the Security tab or directly on a device — and re-launch the
  attack to see exactly what the control was buying you. Turn a defense off and watch the attack
  reach its target: the victim node turns amber/red and a *breach* is logged.

### 📚 OSI Model
The seven layers, each expandable with description, protocols and the matching TCP/IP layer, plus a
worked **encapsulation** example following one HTTPS request down the stack.

### 🔩 Inside the Machine
The path from an application through system calls, the kernel TCP/IP stack, the driver/DMA layer and
out to the NIC and the wire — with an animated packet travelling the stack and the DMA receive path.

## Run it

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Project layout

```
src/
  sim/                 simulation core (no React)
    topology.ts        nodes, links, zones, BFS routing
    protocols.ts       per-protocol layered header builder
    scenarios.ts       guided walkthrough definitions
    security.ts        defenses, threats, attack definitions, defense evaluation
    engine.ts          useSimulation hook — packets, captures, drops, metrics, attacks
    types.ts
  components/
    sim/               simulation UI (canvas, inspector, controls, security, activity)
    views/             OSI model + hardware explainers
  data/knowledgeNodes.ts   OSI layer reference content
```

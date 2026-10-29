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
- **Packet inspector** — click any packet in flight to freeze it and see its full layered
  encapsulation (Ethernet → IP → TCP/UDP → TLS → application), each field with a hover explanation.
  Encrypted packets show ciphertext instead of the payload.
- **Live metrics** — sent / delivered / in-flight counters, a throughput sparkline, and an event log.
- Pan, zoom, speed control.

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
    engine.ts          useSimulation hook — spawns/animates packets, logs, metrics
    types.ts
  components/
    sim/               simulation UI (canvas, inspector, controls, activity)
    views/             OSI model + hardware explainers
  data/knowledgeNodes.ts   OSI layer reference content
```

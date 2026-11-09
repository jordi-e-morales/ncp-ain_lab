// ---------------------------------------------------------------------------
// InfiniBand host tools (run on gpu0X). Output derived from SIM.topology + st.sm.
// Covers: ibstat ibv_devinfo ibhosts ibswitches ibnodes iblinkinfo ibnetdiscover
// sminfo smpquery ibping ibtracert ibroute ibdiagnet perfquery saquery ibaddr
// ibportstate ib_write_bw ib_write_lat ib_send_bw ibv_rc_pingpong rdma ibdev2netdev
// mst mlxconfig mlxlink mlxfwreset ofed_info lsmod nvidia-smi systemctl(opensm)
// ---------------------------------------------------------------------------
window.SIM = window.SIM || {};
const IB = SIM.IB = {};
const T = SIM.topology;

IB.smUp = st => st.sm.running;
IB.portState = (st) => IB.smUp(st) ? "Active" : "Initializing";
IB.lidOf = (st, node) => IB.smUp(st) ? T.ibNodes[node].lid : 0;
IB.rateFor = (st, node, port) => {   // bad cable: gpu04 link negotiated down to 100 Gb/s
  if (st.faults.badCable && ((node === "gpu04") || (node === "ibsw-leaf02" && port === 2))) return { rate: 100, lanes: "4X", speed: "25.0 Gbps (EDR)", symbolErr: () => 1800 + st.counters.perfReads * 412 };
  return { rate: 400, lanes: "4X", speed: "100.0 Gbps (NDR)", symbolErr: () => 0 };
};
IB.ndName = (node) => T.ibNodes[node].type === "ca" ? `${node} HCA-1` : `${T.ibNodes[node].model} ${node}`;
IB.lidsFor = (st, node) => { const base = IB.lidOf(st, node); const n = 1 << st.sm.lmc; return Array.from({ length: n }, (_, i) => base + i); };

IB.run = function (st, node, argv, raw) {
  const [cmd, ...a] = argv;
  const H = IB.handlers;
  if (H[cmd]) return H[cmd](st, node, a, raw);
  return null;
};

const noSm = "ibwarn: [21342] mad_rpc: _do_madrpc failed; dport (Lid 0)\n# no response from the Subnet Manager - is opensm running? (ibstat shows SM lid 0)";

IB.handlers = {
  ibstat(st, node, a) {
    const dev = a.includes("-d") ? a[a.indexOf("-d") + 1] : null;
    const me = T.ibNodes[node];
    const rt = IB.rateFor(st, node, 1);
    const ib = [
      "CA 'mlx5_0'",
      "\tCA type: MT4129",
      "\tNumber of ports: 1",
      "\tFirmware version: 28.43.1014",
      "\tHardware version: 0",
      `\tNode GUID: ${me.guid}`,
      `\tSystem image GUID: ${me.guid.replace(/.$/, "0")}`,
      "\tPort 1:",
      `\t\tState: ${IB.portState(st)}`,
      "\t\tPhysical state: LinkUp",
      `\t\tRate: ${rt.rate}`,
      `\t\tBase lid: ${IB.lidOf(st, node)}`,
      `\t\tLMC: ${IB.smUp(st) ? st.sm.lmc : 0}`,
      `\t\tSM lid: ${IB.smUp(st) ? T.ibNodes[st.sm.master].lid : 0}`,
      "\t\tCapability mask: 0xa651e848",
      `\t\tPort GUID: ${me.portguid}`,
      "\t\tLink layer: InfiniBand"
    ];
    const eth = [
      "CA 'mlx5_1'",
      "\tCA type: MT41692",
      "\tNumber of ports: 1",
      "\tFirmware version: 32.43.1014",
      `\tNode GUID: ${me.guid.replace("a1c", "e1c")}`,
      "\tPort 1:",
      "\t\tState: Active",
      "\t\tPhysical state: LinkUp",
      "\t\tRate: 400",
      "\t\tBase lid: 0",
      "\t\tLMC: 0",
      "\t\tSM lid: 0",
      "\t\tCapability mask: 0x00010000",
      `\t\tPort GUID: ${me.portguid.replace("a1c", "e1c")}`,
      "\t\tLink layer: Ethernet"
    ];
    if (dev === "mlx5_0") return ib.join("\n");
    if (dev === "mlx5_1") return eth.join("\n");
    if (dev) return `ibstat: device '${dev}' not found`;
    return ib.join("\n") + "\n" + eth.join("\n");
  },
  ibv_devinfo(st, node, a) {
    const me = T.ibNodes[node];
    const v = a.includes("-v");
    const gid = `fe80:0000:0000:0000:${me.portguid.slice(2).match(/.{4}/g).join(":")}`;
    const lines = [
      "hca_id:\tmlx5_0",
      "\ttransport:\t\t\tInfiniBand (0)",
      "\tfw_ver:\t\t\t\t28.43.1014",
      `\tnode_guid:\t\t\t${me.guid.slice(2).match(/.{4}/g).join(":")}`,
      `\tsys_image_guid:\t\t\t${me.guid.slice(2).replace(/.$/, "0").match(/.{4}/g).join(":")}`,
      "\tvendor_id:\t\t\t0x02c9",
      "\tvendor_part_id:\t\t\t4129",
      "\thw_ver:\t\t\t\t0x0",
      "\tboard_id:\t\t\tMT_0000000838",
      "\tphys_port_cnt:\t\t\t1",
      "\t\tport:\t1",
      `\t\t\tstate:\t\t\t${IB.smUp(st) ? "PORT_ACTIVE (4)" : "PORT_INIT (2)"}`,
      "\t\t\tmax_mtu:\t\t4096 (5)",
      "\t\t\tactive_mtu:\t\t4096 (5)",
      `\t\t\tsm_lid:\t\t\t${IB.smUp(st) ? T.ibNodes[st.sm.master].lid : 0}`,
      `\t\t\tport_lid:\t\t${IB.lidOf(st, node)}`,
      `\t\t\tport_lmc:\t\t0x0${IB.smUp(st) ? st.sm.lmc : 0}`,
      "\t\t\tlink_layer:\t\tInfiniBand"
    ];
    if (v) lines.push(`\t\t\tGID[  0]:\t\t${gid}`);
    lines.push("", "hca_id:\tmlx5_1", "\ttransport:\t\t\tInfiniBand (0)", "\tfw_ver:\t\t\t\t32.43.1014", "\t\tport:\t1", "\t\t\tstate:\t\t\tPORT_ACTIVE (4)", "\t\t\tlink_layer:\t\tEthernet");
    if (v) lines.push(`\t\t\tGID[  0]:\t\tfe80:0000:0000:0000:${me.portguid.replace("a1c", "e1c").slice(2).match(/.{4}/g).join(":")}`, `\t\t\tGID[  1]:\t\t0000:0000:0000:0000:0000:ffff:${T.hosts[node].data.split("/")[0].split(".").map(x => (+x).toString(16).padStart(2, "0")).join("").match(/.{4}/g).join(":")}  (RoCEv2)`);
    return lines.join("\n");
  },
  ibhosts(st) {
    if (!IB.smUp(st)) return noSm;
    return Object.entries(T.ibNodes).filter(([, v]) => v.type === "ca").map(([n, v]) => `Ca\t: ${v.guid} ports 1 "${n} HCA-1"`).join("\n");
  },
  ibswitches(st) {
    if (!IB.smUp(st)) return noSm;
    return Object.entries(T.ibNodes).filter(([, v]) => v.type === "sw").map(([n, v]) => `Switch\t: ${v.guid} ports 65 "${v.model} ${n}" enhanced port 0 lid ${v.lid} lmc 0`).join("\n");
  },
  ibnodes(st) { if (!IB.smUp(st)) return noSm; return IB.handlers.ibhosts(st) + "\n" + IB.handlers.ibswitches(st); },
  iblinkinfo(st) {
    if (!IB.smUp(st)) return noSm;
    const out = [];
    for (const [n, v] of Object.entries(T.ibNodes).filter(([, v]) => v.type === "sw")) {
      out.push(`Switch ${v.guid} ${v.model} ${n}:`);
      const ports = [1, 2, 33];
      ports.forEach(p => {
        const peer = SIM.ibPeer(n, p);
        if (!peer) return;
        const rt = IB.rateFor(st, n, p);
        const pv = T.ibNodes[peer.node];
        const flag = rt.rate !== 400 ? "   # <-- negotiated DOWN (expected NDR 4X 100 Gbps)" : "";
        out.push(`${String(v.lid).padStart(12)}${String(p).padStart(5)}[  ] ==( ${rt.lanes} ${rt.speed} Active/  LinkUp)==>  ${String(pv.lid).padStart(5)}${String(peer.port).padStart(5)}[  ] "${IB.ndName(peer.node)}" ( )${flag}`);
      });
    }
    return out.join("\n");
  },
  ibnetdiscover(st, node, a) {
    if (!IB.smUp(st)) return noSm;
    if (a.includes("-p")) {
      const out = [];
      for (const l of T.ibLinks) { const A = T.ibNodes[l.a[0]], B = T.ibNodes[l.b[0]]; const rt = IB.rateFor(st, l.a[0], l.a[1]); out.push(`SW ${String(A.lid).padStart(4)} ${String(l.a[1]).padStart(3)} ${A.guid} ${rt.lanes} ${rt.speed.split(" ")[0]} - ${B.type.toUpperCase()} ${String(B.lid).padStart(4)} ${String(l.b[1]).padStart(3)} ${B.guid} ( '${IB.ndName(l.a[0])}' - '${IB.ndName(l.b[0])}' )`); }
      return out.join("\n");
    }
    const out = ["#", "# Topology file: generated on " + new Date().toDateString(), "#", "# Initiated from node " + T.ibNodes[node].guid + " port " + T.ibNodes[node].portguid, ""];
    for (const [n, v] of Object.entries(T.ibNodes).filter(([, v]) => v.type === "sw")) {
      out.push(`vendid=0x2c9`, `devid=0xd2f2`, `sysimgguid=${v.guid}`, `switchguid=${v.guid}(${v.guid.slice(2)})`, `Switch\t65 "S-${v.guid.slice(2)}"\t\t# "${v.model} ${n}" enhanced port 0 lid ${v.lid} lmc 0`);
      [1, 2, 33].forEach(p => { const peer = SIM.ibPeer(n, p); if (!peer) return; const pv = T.ibNodes[peer.node]; const rt = IB.rateFor(st, n, p); out.push(`[${p}]\t"${pv.type === "ca" ? "H" : "S"}-${pv.guid.slice(2)}"[${peer.port}](${(pv.portguid || pv.guid).slice(2)}) \t\t# "${IB.ndName(peer.node)}" lid ${pv.lid} ${rt.lanes} ${rt.speed.split(" ")[0] === "100.0" ? "NDR" : "EDR"}`); });
      out.push("");
    }
    for (const [n, v] of Object.entries(T.ibNodes).filter(([, v]) => v.type === "ca")) {
      const link = T.ibLinks.find(l => l.b[0] === n); const sw = T.ibNodes[link.a[0]];
      out.push(`vendid=0x2c9`, `devid=0x1021`, `sysimgguid=${v.guid}`, `caguid=${v.guid}`, `Ca\t1 "H-${v.guid.slice(2)}"\t\t# "${n} HCA-1"`, `[1](${v.portguid.slice(2)}) \t"S-${sw.guid.slice(2)}"[${link.a[1]}]\t\t# lid ${v.lid} lmc ${st.sm.lmc} "${sw.model} ${link.a[0]}" lid ${sw.lid} ${IB.rateFor(st, n, 1).lanes} ${IB.rateFor(st, n, 1).rate === 400 ? "NDR" : "EDR"}`, "");
    }
    return out.join("\n");
  },
  sminfo(st) {
    if (!IB.smUp(st)) return "sminfo: iberror: failed: query\n# No Subnet Manager answered on VL15. Start one: systemctl start opensm (gpu01) or enable the SM on a managed switch / UFM.";
    const m = T.ibNodes[st.sm.master];
    return `sminfo: sm lid ${m.lid} sm guid ${m.portguid}, activity count 184203 priority ${st.sm.priority} state 3 SMINFO_MASTER`;
  },
  smpquery(st, node, a) {
    if (!IB.smUp(st)) return noSm;
    const attr = (a[0] || "").toUpperCase(); const lid = a[1]; const port = a[2] || "1";
    const tgt = SIM.ibByLid(lid);
    if (!tgt) return `smpquery: iberror: failed: can't resolve destination port ${lid}`;
    switch (attr) {
      case "ND": case "NODEDESC": return `Node Description:.................${IB.ndName(tgt.name)}`;
      case "NI": case "NODEINFO": return `# Node info: Lid ${lid}\nBaseVers:........................1\nClassVers:.......................1\nNodeType:........................${tgt.type === "ca" ? "Channel Adapter" : "Switch"}\nNumPorts:........................${tgt.type === "ca" ? 1 : 65}\nSystemGuid:......................${tgt.guid}\nGuid:............................${tgt.guid}\nPortGuid:........................${tgt.portguid || tgt.guid}\nPartCap:.........................128\nDevId:...........................${tgt.type === "ca" ? "0x1021" : "0xd2f2"}\nVendId:..........................0x0002c9`;
      case "PI": case "PORTINFO": { const rt = IB.rateFor(st, tgt.name, +port); return `# Port info: Lid ${lid} port ${port}\nLid:.............................${lid}\nSMLid:...........................${T.ibNodes[st.sm.master].lid}\nLinkWidthActive:.................${rt.lanes}\nLinkSpeedActive:.................${rt.rate === 400 ? "100.0 Gbps (NDR)" : "25.0 Gbps (EDR)"}\nLinkState:.......................Active\nPhysLinkState:...................LinkUp\nLMC:.............................${st.sm.lmc}\nOperVLs:.........................${st.sm.qos ? "VL0-7" : "VL0-7"}\nNeighborMTU:.....................4096\nMtuCap:..........................4096`; }
      case "PKEYS": case "PKEYTABLE": {
        const ks = IB.pkeysFor(st, tgt.name);
        return `# PKey table for Lid ${lid} port ${port}\n` + ks.map((k, i) => `${String(i).padStart(4)}: ${k}`).join("\n");
      }
      case "SL2VL": { const map = st.sm.qos ? (st.sm.sl2vl || "0,1,2,3,4,5,6,7,7,7,7,7,7,7,7,15") : "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15"; return `# SL2VL table: Lid ${lid}\n#                 SL: | 0| 1| 2| 3| 4| 5| 6| 7| 8| 9|10|11|12|13|14|15|\nports: in 0, out 0: |` + map.split(",").map(x => x.padStart(2)).join("|") + "|"; }
      case "VLARB": { const w = st.sm.qos ? (st.sm.vlarb_high || "0:100,1:50,2:20,3:10") : "0:4"; return `# VLArbitration tables: Lid ${lid} port ${port} LowCap 8 HighCap 8\n# Low priority VL Arbitration Table:\nVL    : |0x0 |\nWEIGHT: |0x4 |\n# High priority VL Arbitration Table:\nVL    : |${w.split(",").map(p => "0x" + (+p.split(":")[0]).toString(16).padStart(1, "0") + " ").join("|")}|\nWEIGHT: |${w.split(",").map(p => "0x" + (+p.split(":")[1]).toString(16).padStart(2, "0")).join("|")}|`; }
      default: return "Usage: smpquery <ND|NI|PI|PKeys|SL2VL|VLArb> <lid> [port]";
    }
  },
  saquery(st, node, a) { if (!IB.smUp(st)) return noSm; if (a.includes("-s")) return `sminfo: sm lid ${T.ibNodes[st.sm.master].lid} sm guid ${T.ibNodes[st.sm.master].portguid}, activity count 184203 priority ${st.sm.priority} state 3 SMINFO_MASTER`; return Object.entries(T.ibNodes).map(([n, v]) => `NodeRecord dump:\n\tlid.....................0x${v.lid.toString(16)}\n\tnode_guid...............${v.guid}\n\tNodeDescription.........${IB.ndName(n)}`).join("\n"); },
  ibping(st, node, a) {
    if (a.includes("-S")) return "ibping server started (listening for MADs on mlx5_0 port 1). Ctrl-C to stop.";
    if (!IB.smUp(st)) return noSm;
    let tgt = null;
    if (a.includes("-L")) tgt = SIM.ibByLid(a[a.indexOf("-L") + 1]);
    if (a.includes("-G")) { const g = a[a.indexOf("-G") + 1]; const e = Object.entries(T.ibNodes).find(([, v]) => v.portguid === g || v.guid === g); if (e) tgt = Object.assign({ name: e[0] }, e[1]); }
    if (!tgt) return "Usage: ibping [-S] | ibping -L <lid> | ibping -G <portguid>";
    return [1, 2, 3].map(i => `Pong from ${tgt.name}.(none) (Lid ${tgt.lid}): time ${(0.07 + i * 0.004).toFixed(3)} ms`).join("\n") + `\n\n--- ${tgt.name} (Lid ${tgt.lid}) ibping statistics ---\n3 packets transmitted, 3 received, 0% packet loss, time 3000 ms\nrtt min/avg/max = 0.074/0.078/0.082 ms`;
  },
  ibtracert(st, node, a) {
    if (!IB.smUp(st)) return noSm;
    const s = SIM.ibByLid(a[0]), d = SIM.ibByLid(a[1]);
    if (!s || !d) return "ibtracert: iberror: failed: can't resolve source/destination lid";
    const sLink = T.ibLinks.find(l => l.b[0] === s.name), dLink = T.ibLinks.find(l => l.b[0] === d.name);
    const sw1 = sLink.a[0], sw2 = dLink.a[0];
    const out = [`From ca {${s.guid}} portnum 1 lid ${s.lid}-${s.lid + (1 << st.sm.lmc) - 1} "${s.name} HCA-1"`];
    if (sw1 === sw2) {
      out.push(`[1] -> switch port {${T.ibNodes[sw1].guid}}[${sLink.a[1]}] lid ${T.ibNodes[sw1].lid} "${IB.ndName(sw1)}"`);
      out.push(`[${dLink.a[1]}] -> ca port {${d.portguid}}[1] lid ${d.lid} "${d.name} HCA-1"`);
    } else {
      const up1 = T.ibLinks.find(l => l.a[0] === sw1 && l.b[0] === "ibsw-spine01"), up2 = T.ibLinks.find(l => l.a[0] === sw2 && l.b[0] === "ibsw-spine01");
      out.push(`[1] -> switch port {${T.ibNodes[sw1].guid}}[${sLink.a[1]}] lid ${T.ibNodes[sw1].lid} "${IB.ndName(sw1)}"`);
      out.push(`[${up1.a[1]}] -> switch port {${T.ibNodes["ibsw-spine01"].guid}}[${up1.b[1]}] lid 5 "${IB.ndName("ibsw-spine01")}"`);
      out.push(`[${up2.b[1]}] -> switch port {${T.ibNodes[sw2].guid}}[${up2.a[1]}] lid ${T.ibNodes[sw2].lid} "${IB.ndName(sw2)}"`);
      out.push(`[${dLink.a[1]}] -> ca port {${d.portguid}}[1] lid ${d.lid} "${d.name} HCA-1"`);
    }
    out.push(`To ca {${d.guid}} portnum 1 lid ${d.lid}-${d.lid + (1 << st.sm.lmc) - 1} "${d.name} HCA-1"`);
    return out.join("\n");
  },
  ibroute(st, node, a) {
    if (!IB.smUp(st)) return noSm;
    const sw = SIM.ibByLid(a[0]);
    if (!sw || sw.type !== "sw") return "ibroute: iberror: failed: switch lid required (4, 5 or 6)";
    const out = [`Unicast lids [0x0-0x${(8 + (1 << st.sm.lmc)).toString(16)}] of switch Lid ${sw.lid} guid ${sw.guid} (${IB.ndName(sw.name)}):\n  Lid  Out   Destination\n       Port     Info`];
    for (const [n, v] of Object.entries(T.ibNodes)) {
      for (const lid of IB.lidsFor(st, n)) {
        const port = IB.outPort(sw.name, n);
        out.push(`0x${lid.toString(16).padStart(4, "0")} ${String(port).padStart(3, "0")} : (${v.type === "ca" ? "Channel Adapter" : "Switch"} portguid ${v.portguid || v.guid}: '${IB.ndName(n)}')`);
      }
    }
    out.push(`${out.length - 1} valid lids dumped`);
    return out.join("\n");
  },
  ibdiagnet(st, node, a) {
    if (!IB.smUp(st)) return "-I- Discovering ... 1 nodes (1 Switches & 0 CA-s) discovered.\n-E- Fabric discovery failed: no Subnet Manager detected (SM lid 0). Ports are in INIT state.\n-I- Summary\n    Errors: 1   Warnings: 0\n-E- Check that opensm is running on exactly one node (sminfo / systemctl status opensm).";
    const pm = a.includes("--pm") || a.includes("--pc");
    const bad = st.faults.badCable;
    const out = [
      "Loading IBDIAGNET from: /usr/lib/ibdiagnet1.5.7",
      "-I- Discovering ... 7 nodes (3 Switches & 4 CA-s) discovered.",
      "-I- Links: 6",
      `-I- Master SM: ${IB.ndName(st.sm.master)} lid ${T.ibNodes[st.sm.master].lid} priority ${st.sm.priority}`,
      `-I- Routing engine: ${st.sm.routing_engine}${st.sm.adaptive_routing ? " + adaptive routing" : ""}; LMC ${st.sm.lmc}`,
      "-I- Checking unicast forwarding tables ... no credit loops found",
      `-I- Partitions: ${st.sm.partitions.map(p => p.name + "(" + p.pkey + ")").join(", ")}`
    ];
    if (pm) {
      out.push("-I- Port counters (--pm): reading PortCounters on all 12 ports ...");
      if (bad) out.push("-W- lid=0x0006 port=2 (MQM9700 ibsw-leaf02) : SymbolErrorCounter = " + IB.rateFor(st, "ibsw-leaf02", 2).symbolErr() + " exceeds threshold (link to gpu04 HCA-1, negotiated 4X EDR instead of NDR)");
      else out.push("-I- No port counter errors above threshold.");
      if (a.includes("--pc")) out.push("-I- Counters cleared (--pc).");
    }
    if (a.includes("--sharp")) out.push("-I- SHARP: aggregation manager sharp_am reachable on ufm-server; 2 trees programmed (ibsw-spine01 root)");
    out.push("", "-I- Summary", `    Errors: 0   Warnings: ${bad && pm ? 1 : 0}`, `-I- ${bad && pm ? "1 link with bad signal integrity: see /var/tmp/ibdiagnet2/ibdiagnet2.log and mlxlink -c on both ends" : "Fabric is healthy"}`);
    st.counters.perfReads++;
    return out.join("\n");
  },
  perfquery(st, node, a) {
    if (!IB.smUp(st)) return noSm;
    const reset = a.includes("-R"); const args = a.filter(x => !x.startsWith("-"));
    const lid = args[0] || String(T.ibNodes[node].lid), port = +(args[1] || 1);
    const tgt = SIM.ibByLid(lid); if (!tgt) return "perfquery: iberror: failed: can't resolve lid";
    if (reset) { st.counters.perfBase = st.counters.perfReads; return `# Port counters reset: Lid ${lid} port ${port}`; }
    st.counters.perfReads++;
    const rt = IB.rateFor(st, tgt.name, port);
    const sym = (tgt.name === "ibsw-leaf02" && port === 2) || (tgt.name === "gpu04") ? rt.symbolErr() - (st.counters.perfBase ? 1800 + st.counters.perfBase * 412 : 0) : 0;
    const base = 1200000 + st.counters.perfReads * 85000;
    return [`# Port counters: Lid ${lid} port ${port} (CapMask: 0x5A00)`, `PortSelect:......................${port}`, "CounterSelect:...................0x0000", `SymbolErrorCounter:..............${Math.max(0, sym)}`, "LinkErrorRecoveryCounter:........0", `LinkDownedCounter:...............${sym ? 2 : 0}`, "PortRcvErrors:...................0", "PortRcvRemotePhysicalErrors:.....0", "PortRcvSwitchRelayErrors:........0", "PortXmitDiscards:................0", "PortXmitConstraintErrors:........0", "PortRcvConstraintErrors:.........0", "LocalLinkIntegrityErrors:........0", "ExcessiveBufferOverrunErrors:....0", "VL15Dropped:.....................0", `PortXmitData:....................${base}`, `PortRcvData:.....................${base - 3100}`, `PortXmitPkts:....................${Math.round(base / 1024)}`, `PortRcvPkts:.....................${Math.round(base / 1024) - 3}`, `PortXmitWait:....................${port === 33 ? 48120 + st.counters.perfReads * 1600 : 0}   # time with data but no credits = congestion`].join("\n");
  },
  ibaddr(st, node) {
    const me = T.ibNodes[node]; const lids = IB.lidsFor(st, node);
    return `GID fe80::${me.portguid.slice(2).match(/.{4}/g).map(x => x.replace(/^0+/, "") || "0").join(":")} LID start 0x${lids[0].toString(16)} end 0x${lids[lids.length - 1].toString(16)}`;
  },
  ibportstate(st, node, a) { const tgt = SIM.ibByLid(a[0]); if (!tgt) return "Usage: ibportstate <lid> <port> [query|enable|disable|reset]"; const op = a[2] || "query"; if (op === "query") return `PortInfo:\n# Port info: Lid ${a[0]} port ${a[1]}\nLinkState:.......................Active\nPhysLinkState:...................LinkUp\nLinkWidthActive:.................4X\nLinkSpeedActive:.................${IB.rateFor(st, tgt.name, +a[1]).rate === 400 ? "100.0 Gbps" : "25.0 Gbps"}`; return `ibportstate: port ${a[1]} on lid ${a[0]} -> ${op} (use with care: the SM will re-sweep)`; },
  ibdev2netdev() { return "mlx5_0 port 1 ==> ib0 (Up)\nmlx5_1 port 1 ==> eth1 (Up)"; },
  ib_write_bw(st, node, a) { return IB.perftest(st, node, a, "write_bw"); },
  ib_send_bw(st, node, a) { return IB.perftest(st, node, a, "send_bw"); },
  ib_read_bw(st, node, a) { return IB.perftest(st, node, a, "read_bw"); },
  ib_write_lat(st, node, a) { return IB.perftest(st, node, a, "write_lat"); },
  ib_send_lat(st, node, a) { return IB.perftest(st, node, a, "send_lat"); },
  ibv_rc_pingpong(st, node, a) {
    const srv = !a.some(x => /^\d+\.\d+/.test(x));
    if (srv) return "  local address:  LID 0x0000, QPN 0x0127, PSN 0x5aa3f1, GID fe80::...  (server waiting on port 18515)";
    return "  local address:  LID 0x0000, QPN 0x0128, PSN 0x31b0a2, GID ::ffff:" + T.hosts[node].data.split("/")[0] + "\n  remote address: LID 0x0000, QPN 0x0127, PSN 0x5aa3f1, GID ::ffff:" + a.find(x => /^\d+\.\d+/.test(x)) + "\n8192000 bytes in 0.01 seconds = 6115.23 Mbit/sec\n1000 iters in 0.01 seconds = 10.72 usec/iter";
  },
  rdma(st, node, a) {
    if (a[0] === "link" && (a[1] === "show" || !a[1])) return `link mlx5_0/1 subnet_prefix fe80:0000:0000:0000 lid ${IB.lidOf(st, node)} sm_lid ${IB.smUp(st) ? T.ibNodes[st.sm.master].lid : 0} lmc ${st.sm.lmc} state ${IB.smUp(st) ? "ACTIVE" : "INIT"} physical_state LINK_UP netdev ib0\nlink mlx5_1/1 state ACTIVE physical_state LINK_UP netdev eth1`;
    if (a[0] === "link" && a[1] === "add") return `link ${a[2]} type rxe netdev ${a[5]} added (Soft-RoCE)`;
    if (a[0] === "dev") return "0: mlx5_0: node_type ca fw 28.43.1014 node_guid " + T.ibNodes[node].guid.slice(2).match(/.{4}/g).join(":") + "\n1: mlx5_1: node_type ca fw 32.43.1014";
    return "Usage: rdma link show | rdma dev | rdma link add <name> type rxe netdev <if>";
  },
  ofed_info(st, node, a) { return a.includes("-s") ? "MLNX_OFED_LINUX-24.10-1.1.4.0:" : "MLNX_OFED_LINUX-24.10-1.1.4.0 (OFED-24.10-1.1.4):\n\nInstalled Packages:\n  rdma-core, libibverbs1, infiniband-diags, perftest, mlnx-tools, mft, opensm, ibutils2, ucx, sharp, nccl-rdma-sharp-plugins"; },
  lsmod(st, node, a, raw) { const l = ["Module                  Size  Used by", "mlx5_ib               450560  0", "ib_uverbs             163840  2 mlx5_ib,rdma_ucm", "ib_core               434176  8 rdma_cm,ib_ipoib,iw_cm,ib_umad,rdma_ucm,ib_uverbs,mlx5_ib,ib_cm", "mlx5_core            2064384  1 mlx5_ib", "nvidia_peermem         16384  0", "nvidia              56487936  450 nvidia_uvm,nvidia_peermem,nvidia_modeset"]; return raw.includes("grep") ? l.filter(x => x.includes(raw.split("grep")[1].trim())).join("\n") : l.join("\n"); },
  mst(st, node, a) { if (a[0] === "start") return "Starting MST (Mellanox Software Tools) driver set\nLoading MST PCI module - Success\nCreate devices\n-I- Loading MST PCI configuration module - Success"; return "MST modules:\n------------\n    MST PCI module is not loaded\n    MST PCI configuration module loaded\nMST devices:\n------------\n/dev/mst/mt4129_pciconf0         - PCI configuration cycles access.\n                                   domain:bus:dev.fn=0000:4b:00.0 addr.reg=88 data.reg=92\n                                   Chip revision is: 00\n/dev/mst/mt41692_pciconf0        - PCI configuration cycles access.   # BlueField-3 SuperNIC\n                                   domain:bus:dev.fn=0000:98:00.0"; },
  mlxconfig(st, node, a) {
    const dev = a.includes("-d") ? a[a.indexOf("-d") + 1] : "/dev/mst/mt4129_pciconf0";
    const op = a.find(x => ["q", "query", "s", "set", "r", "reset"].includes(x));
    const bf = dev.includes("41692");
    if (op === "q" || op === "query" || !op) {
      const rows = bf ? [["INTERNAL_CPU_MODEL", st.dpuMode === 1 ? "EMBEDDED_CPU(1)" : "SEPARATED_HOST(0)"], ["INTERNAL_CPU_OFFLOAD_ENGINE", st.dpuMode === 1 ? "ENABLED(0)" : "DISABLED(1)"], ["LINK_TYPE_P1", "ETH(2)"], ["ROCE_CC_PRIO_MASK_P1", "255"], ["CNP_DSCP_P1", "48"], ["SRIOV_EN", "True(1)"], ["NUM_OF_VFS", "16"]] : [["LINK_TYPE_P1", st.linkTypeP1 === 2 ? "ETH(2)" : "IB(1)"], ["SRIOV_EN", "True(1)"], ["NUM_OF_VFS", "8"], ["ATS_ENABLED", "False(0)"], ["ADVANCED_PCI_SETTINGS", "True(1)"]];
      return `\nDevice #1:\n----------\n\nDevice type:    ${bf ? "BlueField3" : "ConnectX7"}\nName:           ${bf ? "900-9D3B6-00CV-AA0" : "MCX75310AAS-NEAT"}\nDescription:    ${bf ? "NVIDIA BlueField-3 B3140H E-series SuperNIC 400GbE" : "NVIDIA ConnectX-7 HHHL adapter card; 400Gb/s NDR IB; single-port OSFP"}\nDevice:         ${dev}\n\nConfigurations:                              Next Boot\n` + rows.map(r => `         ${SIM.pad(r[0], 36)} ${r[1]}`).join("\n");
    }
    if (op === "s" || op === "set") { const kv = a.find(x => x.includes("=")); if (!kv) return "Usage: mlxconfig -d <dev> s PARAM=value"; const [k, v] = kv.split("="); if (k === "INTERNAL_CPU_MODEL") st.dpuMode = +v; if (k === "LINK_TYPE_P1") st.linkTypeP1 = +v; return `\nDevice #1:\n----------\nDevice type:    ${bf ? "BlueField3" : "ConnectX7"}\nDevice:         ${dev}\n\nConfigurations:                              Next Boot       New\n         ${SIM.pad(k, 36)} ${SIM.pad("current", 15)} ${v}\n\n Apply new Configuration? (y/n) [n] : y\nApplying... Done!\n-I- Please reboot machine (or run mlxfwreset) to load new configurations.`; }
    return "Usage: mlxconfig -d <dev> [q|s PARAM=val|r]";
  },
  mlxfwreset(st, node, a) { return `-I- Sending Reset Command To Fw             -Done\n-I- Stopping Driver                         -Done\n-I- Resetting device                        -Done\n-I- Starting Driver                         -Done\n-I- Restarting MST                          -Done\n-I- FW was loaded successfully.${a.includes("41692") ? " INTERNAL_CPU_MODEL now active: " + (st.dpuMode === 1 ? "DPU mode" : "NIC mode") : ""}`; },
  mlxlink(st, node, a) {
    const dev = a.includes("-d") ? a[a.indexOf("-d") + 1] : "/dev/mst/mt4129_pciconf0";
    const bad = st.faults.badCable && node === "gpu04";
    const out = ["", "Operational Info", "----------------", `State                           : ${IB.smUp(st) ? "Active" : "Initialize"}`, "Physical state                  : LinkUp", `Speed                           : ${bad ? "IB-EDR" : "IB-NDR"}`, "Width                           : 4x", `FEC                             : ${bad ? "Standard_RS-FEC - (528,514)" : "Standard_RS-FEC-PLR - (544,514)"}`, "Loopback Mode                   : No Loopback", "Auto Negotiation                : ON", "", "Supported Info", "--------------", "Enabled Link Speed (IB)         : 0x00000040 (NDR)", "", "Troubleshooting Info", "--------------------", `Status Opcode                   : ${bad ? "2" : "0"}`, `Group Opcode                    : ${bad ? "AN failure" : "N/A"}`, `Recommendation                  : ${bad ? "Speed/FEC negotiation issue - check Tx/Rx power both ends; check cable" : "No issue was observed"}`];
    if (a.includes("-m")) out.push("", "Module Info", "-----------", "Identifier                      : OSFP", `Compliance                      : ${bad ? "400G-DR4 (degraded)" : "400G-DR4"}`, "Cable Technology                : 1310nm SMF", "Cable Type                      : Optical Module (separated)", "Vendor Name                     : NVIDIA", "Vendor Part Number              : MMA4Z00-NS400", "Cable Length [m]                : 50", "Temperature [C]                 : 41", "Voltage [mV]                    : 3296", `Rx Power Current [dBm]          : ${bad ? "-9.8,-10.1,-9.9,-14.6   # lane 3 low Rx power" : "-1.2,-1.1,-1.3,-1.2"}`, "Tx Power Current [dBm]          : 1.1,1.0,1.2,1.1");
    if (a.includes("-c")) { const eff = bad ? 16 + st.counters.perfReads * 3 : 0; st.counters.perfReads++; out.push("", "Physical Counters and BER Info", "------------------------------", `Time Since Last Clear [Min]     : ${bad ? "5.2" : "1440.0"}`, `Effective Physical Errors       : ${eff}`, `Effective Physical BER          : ${bad ? "2E-12   # should be ~0 (e.g. 15E-255)" : "15E-255"}`, `Raw Physical Errors Per Lane    : ${bad ? "7991,105663,8812,9900412" : "812,790,803,811"}`, `Raw Physical BER                : ${bad ? "3E-6    # pre-FEC, too high - FEC at its limit" : "3E-9"}`); }
    if (a.includes("-e")) out.push("", "EYE Opening Info", "----------------", `Physical Grade                  : ${bad ? "8512,8601,8498,1203" : "26112,26009,26301,25988"}`, "Height Eye Opening [mV]         : " + (bad ? "121,119,123,14" : "309,311,305,310"));
    if (a.includes("--pc")) { st.counters.perfBase = st.counters.perfReads; return "Clearing Counters... Done"; }
    if (a.includes("--show_fec")) out.push("", "FEC Capability Info", "-------------------", "FEC Capability 400G NDR         : RS-FEC-PLR (default), RS-FEC");
    return out.join("\n");
  },
  "nvidia-smi"(st, node, a) {
    if (a[0] === "topo" && (a[1] === "-m" || a[1] === "--matrix")) {
      return [
        "\tGPU0\tGPU1\tGPU2\tGPU3\tGPU4\tGPU5\tGPU6\tGPU7\tNIC0\tNIC1\tNIC2\tNIC3\tCPU Affinity\tNUMA Affinity",
        "GPU0\t X \tNV18\tNV18\tNV18\tNV18\tNV18\tNV18\tNV18\tPIX\tNODE\tSYS\tSYS\t0-47\t0",
        "GPU1\tNV18\t X \tNV18\tNV18\tNV18\tNV18\tNV18\tNV18\tNODE\tPIX\tSYS\tSYS\t0-47\t0",
        "GPU2\tNV18\tNV18\t X \tNV18\tNV18\tNV18\tNV18\tNV18\tNODE\tNODE\tSYS\tSYS\t0-47\t0",
        "GPU3\tNV18\tNV18\tNV18\t X \tNV18\tNV18\tNV18\tNV18\tPXB\tNODE\tSYS\tSYS\t0-47\t0",
        "GPU4\tNV18\tNV18\tNV18\tNV18\t X \tNV18\tNV18\tNV18\tSYS\tSYS\tPIX\tNODE\t48-95\t1",
        "GPU5\tNV18\tNV18\tNV18\tNV18\tNV18\t X \tNV18\tNV18\tSYS\tSYS\tNODE\tPIX\t48-95\t1",
        "GPU6\tNV18\tNV18\tNV18\tNV18\tNV18\tNV18\t X \tNV18\tSYS\tSYS\tNODE\tNODE\t48-95\t1",
        "GPU7\tNV18\tNV18\tNV18\tNV18\tNV18\tNV18\tNV18\t X \tSYS\tSYS\tPXB\tNODE\t48-95\t1",
        "NIC0\tPIX\tNODE\tNODE\tPXB\tSYS\tSYS\tSYS\tSYS\t X \tNODE\tSYS\tSYS",
        "NIC1\tNODE\tPIX\tNODE\tNODE\tSYS\tSYS\tSYS\tSYS\tNODE\t X \tSYS\tSYS",
        "NIC2\tSYS\tSYS\tSYS\tSYS\tPIX\tNODE\tNODE\tPXB\tSYS\tSYS\t X \tNODE",
        "NIC3\tSYS\tSYS\tSYS\tSYS\tNODE\tPIX\tNODE\tNODE\tSYS\tSYS\tNODE\t X ",
        "",
        "Legend:",
        "  X    = Self",
        "  SYS  = Connection traversing PCIe as well as the SMP interconnect between NUMA nodes (e.g., QPI/UPI)",
        "  NODE = Connection traversing PCIe as well as the interconnect between PCIe Host Bridges within a NUMA node",
        "  PHB  = Connection traversing PCIe as well as a PCIe Host Bridge (typically the CPU)",
        "  PXB  = Connection traversing multiple PCIe bridges (without traversing the PCIe Host Bridge)",
        "  PIX  = Connection traversing at most a single PCIe bridge",
        "  NV#  = Connection traversing a bonded set of # NVLinks",
        "",
        "NIC Legend:",
        "  NIC0: mlx5_0   NIC1: mlx5_1   NIC2: mlx5_2   NIC3: mlx5_3"
      ].join("\n");
    }
    return "+-----------------------------------------------------------------------------------------+\n| NVIDIA-SMI 570.86.15      Driver Version: 570.86.15      CUDA Version: 12.8     |\n|-----------------------------------------+------------------------+----------------------+\n| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |\n|=========================================+========================+======================|\n|   0  NVIDIA H100 80GB HBM3          On  | 00000000:1B:00.0 Off   |                    0 |\n|   1  NVIDIA H100 80GB HBM3          On  | 00000000:43:00.0 Off   |                    0 |\n|  ... (8 GPUs)                                                                           |\n+-----------------------------------------+------------------------+----------------------+";
  },
  systemctl(st, node, a) {
    const [op, svc] = a;
    if (svc === "opensm" || svc === "opensmd") {
      if (node !== "gpu01") return `Failed to ${op} opensm.service: Unit opensm.service not found on ${node}. (The lab SM runs on gpu01.)`;
      if (op === "status") return `● opensm.service - Starts the OpenSM InfiniBand fabric Subnet Manager\n     Loaded: loaded (/lib/systemd/system/opensm.service; enabled)\n     Active: ${st.sm.running ? "active (running)" : "inactive (dead)"} since ${SIM.NVUE.now()}\n   Main PID: 2311 (opensm)\n     Config: /etc/opensm/opensm.conf  routing_engine=${st.sm.routing_engine} lmc=${st.sm.lmc} qos=${st.sm.qos ? "TRUE" : "FALSE"} partitions=${st.sm.partitions.length}`;
      if (op === "start" || op === "restart") { st.sm.running = true; IB.reloadSmConfig(st); return op === "restart" ? "opensm restarted - configuration re-read; fabric re-sweep in progress (LIDs reassigned, LFTs reprogrammed)." : "opensm started - SM elected MASTER (priority " + st.sm.priority + "); sweeping fabric, assigning LIDs."; }
      if (op === "stop") { st.sm.running = false; return "opensm stopped. Ports will fall back to INIT after the SM timeout; no new LIDs will be assigned."; }
    }
    if (svc === "rshim") return `● rshim.service - rshim driver for BlueField SoC\n     Active: ${op === "start" ? "active (running)" : "active (running)"}\n     Devices: /dev/rshim0/{console,boot,misc}  tmfifo_net0`;
    if (svc === "ufm-enterprise") return "● ufm-enterprise.service\n     Active: active (running)  (UFM runs on ufm-server, not here)";
    return `Unknown unit ${svc || ""}. Lab services: opensm (gpu01), rshim`;
  },
  "kill"(st, node, a) { if (a.includes("-HUP")) { IB.reloadSmConfig(st); return "opensm: SIGHUP received - re-reading /etc/opensm/opensm.conf and partitions.conf (no restart, no LID reassignment)"; } return ""; },
  "pgrep"(st, node, a) { return a.includes("opensm") && st.sm.running && node === "gpu01" ? "2311" : ""; },
  ucx_info() { return "# UCT version=1.17.0\n# Transport: rc_mlx5, dc_mlx5, ud_mlx5, cuda_copy, cuda_ipc, gdr_copy"; },
  nccl_tests(st) { return IB.handlers.all_reduce_perf(st); },
  all_reduce_perf(st, node, a) { const ok = IB.smUp(st) && !st.faults.badCable; return `# nThread 1 nGpus 8 minBytes 8 maxBytes 8589934592 step: 2(factor) warmup iters: 5 iters: 20\n#\n#       size         count      type   redop    root     time   algbw   busbw #wrong\n#        (B)    (elements)                               (us)  (GB/s)  (GB/s)\n     8589934592    2147483648     float     sum      -1   ${ok ? "40112" : "131044"}  ${ok ? "214.1" : "65.5"}   ${ok ? "374.7" : "114.7"}      0\n# Avg bus bandwidth    : ${ok ? "374.7" : "114.7"}  ${ok ? "" : "# far below baseline (~375 GB/s) - check fabric (iblinkinfo: one link negotiated down)"}\nNCCL INFO NET/IB : Using [0]mlx5_0:1/IB [1]mlx5_1:1/RoCE ; OOB eth0\nNCCL INFO ${st.sm.adaptive_routing ? "IB adaptive routing enabled" : "Using ring/tree algorithms"}${a.includes("sharp") ? "\nNCCL INFO CollNet (SHARP) enabled: 2 aggregation trees" : ""}`; }
};

IB.perftest = function (st, node, a, kind) {
  const client = a.some(x => /^\d+\.\d+\.\d+\.\d+$/.test(x) || /^gpu0\d$/.test(x));
  const sl = a.includes("-S") ? a[a.indexOf("-S") + 1] : "0";
  const dev = a.includes("-d") ? a[a.indexOf("-d") + 1] : "mlx5_0";
  const roce = dev === "mlx5_1" || a.includes("-x");
  const gbits = a.includes("--report_gbits");
  if (!client) return `\n************************************\n* Waiting for client to connect... *\n************************************\n(${kind} server on ${dev}${a.includes("-p") ? " port " + a[a.indexOf("-p") + 1] : " port 18515"}, SL ${sl})`;
  if (roce && st.faults.roceOff) return header(kind, dev) + (kind.includes("lat") ? "\n 2          1000          6.91          48.02         9.84   # jittery: lossy Ethernet, drops+retransmits" : `\n 65536      5000             ${gbits ? "88.4" : "11.05"}       ${gbits ? "61.2" : "7.65"}             0.1167   # ~60 Gb/s on a 400G link: RoCE without PFC/ECN (nv show qos roce)`);
  if (!IB.smUp(st) && !roce) return `Couldn't open ${dev} port 1: port state is INIT (no Subnet Manager) - ibstat`;
  const degraded = st.faults.badCable && (node === "gpu04" || a.includes("gpu04") || a.includes("192.168.1.4"));
  let bw = degraded ? 92.8 : 390.1; if (st.sm.qos && sl !== "0") bw = Math.round(bw * (sl === "3" ? 0.056 : 0.278) * 10) / 10;
  const lat = degraded ? 2.41 : 1.19;
  if (kind.includes("lat")) return header(kind, dev) + `\n 2          1000          ${(lat - 0.11).toFixed(2)}          ${(lat + 2.2).toFixed(2)}         ${lat.toFixed(2)}         ${lat.toFixed(2)}        0.03   ${(lat + 0.9).toFixed(2)}   ${(lat + 2.1).toFixed(2)}`;
  return header(kind, dev) + `\n 65536      5000             ${gbits ? bw.toFixed(1) : (bw / 8).toFixed(2)}       ${gbits ? (bw - 0.8).toFixed(1) : ((bw - 0.8) / 8).toFixed(2)}             ${(bw / 8 / 65536 * 1e3).toFixed(4)}${degraded ? "   # far below NDR line rate (~390 Gb/s): link negotiated down - iblinkinfo / mlxlink" : ""}`;
  function header(k, d) { return `---------------------------------------------------------------------------------------\n                    RDMA_${k.split("_")[0].toUpperCase()} ${k.includes("lat") ? "Latency" : "BW"} Test\n Dual-port       : OFF\t\tDevice         : ${d}\n Number of qps   : ${a.includes("-q") ? a[a.indexOf("-q") + 1] : 1}\t\tTransport type : IB\n Connection type : RC\t\tUsing SRQ      : OFF\n TX depth        : 128\n Mtu             : 4096[B]\n Link type       : ${roce ? "Ethernet\n GID index       : " + (a.includes("-x") ? a[a.indexOf("-x") + 1] : "3") : "IB"}\n Max inline data : 0[B]\n rdma_cm QPs\t : OFF\n Data ex. method : Ethernet\n Service Level   : ${sl}\n---------------------------------------------------------------------------------------\n${k.includes("lat") ? " #bytes #iterations    t_min[usec]    t_max[usec]  t_typical[usec]    t_avg[usec]    t_stdev[usec]   99% percentile[usec]   99.9% percentile[usec]" : (gbits ? " #bytes     #iterations    BW peak[Gb/sec]    BW average[Gb/sec]   MsgRate[Mpps]" : " #bytes     #iterations    BW peak[MB/sec]    BW average[MB/sec]   MsgRate[Mpps]")}`; }
};

// Output port on switch `sw` toward node `dst` (fat-tree: leaves go up on 33, spine goes down on the leaf's uplink)
IB.outPort = function (sw, dst) {
  if (sw === dst) return 0;
  const direct = T.ibLinks.find(l => (l.a[0] === sw && l.b[0] === dst) || (l.b[0] === sw && l.a[0] === dst));
  if (direct) return direct.a[0] === sw ? direct.a[1] : direct.b[1];
  if (sw === "ibsw-spine01") {
    // dst is a CA under some leaf: find that leaf, then the spine port facing it
    const dl = T.ibLinks.find(l => l.b[0] === dst || l.a[0] === dst);
    const leaf = dl ? (dl.a[0] === dst ? dl.b[0] : dl.a[0]) : null;
    const up = leaf ? T.ibLinks.find(l => l.a[0] === leaf && l.b[0] === "ibsw-spine01") : null;
    return up ? up.b[1] : 0;
  }
  return 33; // leaf: everything not local goes to the spine
};

// PKey table of a node derived from st.sm.partitions
IB.pkeysFor = function (st, node) {
  const me = T.ibNodes[node]; const keys = [];
  for (const p of st.sm.partitions) {
    let mem = p.members.ALL || p.members[me.portguid] || p.members[me.guid] || p.members[(me.portguid || "").toLowerCase()];
    if (!mem) continue;
    const base = parseInt(p.pkey, 16) & 0x7fff;
    keys.push("0x" + (mem === "full" ? (base | 0x8000) : base).toString(16).padStart(4, "0"));
  }
  if (!keys.length) keys.push("0xffff");
  while (keys.length < 4) keys.push("0x0000");
  return keys;
};
// Re-read opensm.conf and partitions.conf from st.files
IB.reloadSmConfig = function (st) {
  const conf = st.files["/etc/opensm/opensm.conf"] || "";
  const get = (k, d) => { const m = conf.match(new RegExp("^\\s*" + k + "\\s+(\\S+)", "m")); return m ? m[1] : d; };
  st.sm.routing_engine = get("routing_engine", "minhop").split(",")[0];
  st.sm.lmc = Math.min(7, +get("lmc", 0) || 0);
  st.sm.adaptive_routing = /TRUE/i.test(get("adaptive_routing_enable", "FALSE"));
  st.sm.qos = /TRUE/i.test(get("qos", "FALSE"));
  st.sm.sl2vl = get("qos_sl2vl", "0,1,2,3,4,5,6,7,7,7,7,7,7,7,7,15");
  st.sm.vlarb_high = get("qos_vlarb_high", "0:100,1:50,2:20,3:10");
  st.sm.priority = +get("sm_priority", 14);
  const parts = []; const text = (st.files["/etc/opensm/partitions.conf"] || "").replace(/#.*$/gm, "");
  const re = /([A-Za-z0-9_]+)\s*=\s*(0x[0-9a-fA-F]+)\s*([^:]*):\s*([^;]*);/g; let m;
  while ((m = re.exec(text))) {
    const members = {};
    m[4].split(",").map(s => s.trim()).filter(Boolean).forEach(s => { const [who, mem] = s.split("=").map(x => x.trim()); members[who === "ALL" ? "ALL" : who.toLowerCase()] = (mem || "full").toLowerCase(); });
    parts.push({ name: m[1], pkey: m[2].toLowerCase(), ipoib: /ipoib/.test(m[3]), members });
  }
  if (parts.length) st.sm.partitions = parts;
};

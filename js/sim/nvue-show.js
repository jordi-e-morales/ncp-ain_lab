// nv show ... renderers. Output mimics Cumulus Linux 5.x NVUE tables.
window.SIM = window.SIM || {};
const P = SIM.pad;

SIM.NVUE.cmdShow = function (st, m, toks) {
  const json = toks.includes("-o") && toks[toks.indexOf("-o") + 1] === "json";
  toks = toks.filter((t, i, a) => t !== "-o" && a[i - 1] !== "-o");
  const path = toks.join(" ");
  const S = SIM.NVUE.show;
  if (path === "" ) return "Usage: nv show <object> ... e.g. nv show interface | system | qos roce | vrf default router bgp neighbor | evpn vni | nve vxlan | bridge domain br_default | system wjh | router adaptive-routing";
  if (path === "system") return S.system(st, m);
  if (path === "system version") return S.version(m);
  if (path === "system hostname") return "              applied\n------------  -------\n[hostname]    " + (SIM.NVUE.val(m.applied, ["system", "hostname"]) || m.name);
  if (path === "system wjh" || path.startsWith("system wjh")) return S.wjh(st, m, toks);
  if (path === "system config") return "applied\n-------\nauto-save  " + (m.autosave ? "enabled" : "disabled") + "\nsaved      " + (m.saved ? "yes" : "no (run nv config save)");
  if (path === "platform") return `              operational\n------------  --------------------------\nmodel         ${SIM.topology.switches[m.name].model}\nasic          Spectrum-4\nport-count    64 x 800G (OSFP)\nserial        MT2345X${m.name.toUpperCase().slice(-2)}001`;
  if (path === "platform inventory" ) return "Item          Model               Serial         State\n------------  ------------------  -------------  -----\nchassis       SN5600              MT2345X00001   ok\npsu1          MTEF-PSF-AC-C       MT2301PSU01    ok\npsu2          MTEF-PSF-AC-C       MT2301PSU02    ok\nfan1-6        MTEF-FANF-A         -              ok";
  if (path === "platform environment") return "Sensor            Value     State\n----------------  --------  -----\nCPU temp          48 C      ok\nASIC temp         61 C      ok\nPSU1              present   ok\nPSU2              present   ok\nFan1..Fan6        9200 rpm  ok";
  if (path === "interface") return S.interfaces(st, m);
  if (/^interface \S+$/.test(path)) return S.interface(st, m, toks[1]);
  if (/^interface \S+ link$/.test(path)) return S.ifaceLink(st, m, toks[1]);
  if (/^interface \S+ ip address$/.test(path)) return SIM.NVUE.ifaceIp(m, toks[1]).map(a => `[address]  ${a}`).join("\n") || "(no IP address)";
  if (path === "qos roce") return S.roce(st, m);
  if (path === "qos") return "Configured QoS features: roce=" + (SIM.NVUE.roceOn(m) ? "on" : "off") + "\nTry: nv show qos roce | nv show interface swp1 qos";
  if (/^interface \S+ qos/.test(path)) return S.ifaceQos(st, m, toks[1]);
  if (path === "vrf default router bgp" || path === "router bgp") return S.bgp(st, m);
  if (path === "vrf default router bgp neighbor" ) return S.bgpNeighbors(st, m);
  if (/^vrf default router bgp neighbor \S+$/.test(path)) return S.bgpNeighbor(st, m, toks[5]);
  if (path === "vrf default router bgp address-family l2vpn-evpn route" || path === "evpn route") return S.evpnRoutes(st, m);
  if (path === "vrf default router rib ipv4 route" || path === "vrf default router rib ipv4") return S.rib(st, m);
  if (/^vrf \S+ evpn$/.test(path)) return S.vrfEvpn(st, m, toks[1]);
  if (/^vrf \S+ router rib ipv4 route$/.test(path)) return S.rib(st, m, toks[1]);
  if (path === "vrf") return Object.keys(SIM.NVUE.get(m.applied, ["vrf"]) || {}).map(v => `${P(v, 10)} table ${v === "default" ? "254" : "auto (1001+)"}`).join("\n");
  if (path === "evpn") return "              operational  applied\n------------  -----------  -------\nenable        " + P(SIM.NVUE.get(m.applied, ["evpn", "state", "enabled"]) ? "on" : "off", 12) + " " + (SIM.NVUE.get(m.applied, ["evpn", "state", "enabled"]) ? "on" : "off");
  if (path === "evpn vni") return S.evpnVni(st, m);
  if (path === "evpn multihoming" || path === "evpn multihoming esi") return S.mh(st, m);
  if (path === "nve vxlan") return S.nve(st, m);
  if (path === "bridge domain br_default" || path === "bridge domain") return S.bridge(st, m);
  if (path === "bridge domain br_default vlan") return S.bridgeVlan(st, m);
  if (path === "router adaptive-routing") return "              operational  applied\n------------  -----------  -------\nenable        " + P(SIM.NVUE.val(m.applied, ["router", "adaptive-routing", "enable"]) || "off", 12) + " " + (SIM.NVUE.val(m.applied, ["router", "adaptive-routing", "enable"]) || "off") + "\nlink-utilization-threshold  70   70";
  if (path === "service lldp" ) return "Interface  Neighbor       Port\n---------  -------------  -----\n" + SIM.NVUE.ifaceList(m).filter(i => SIM.peer(m.name, i)).map(i => { const p = SIM.peer(m.name, i); return `${P(i, 10)} ${P(p.node, 14)} ${p.iface}`; }).join("\n");
  // generic fallback: dump the applied subtree
  const node = SIM.NVUE.get(m.applied, toks);
  if (!node) return `Error: The requested item does not exist: ${path}`;
  const flat = SIM.NVUE.flatten(node);
  if (!flat.length) return `${path}  (set)`;
  return "applied\n-------\n" + flat.join("\n");
};

SIM.NVUE.show = {
  system(st, m) {
    return [
      "              operational          applied",
      "------------  -------------------  --------",
      `hostname      ${P(m.name, 20)} ${m.name}`,
      "build         Cumulus Linux 5.16.1",
      "uptime        3 days, 04:12:55",
      "timezone      Etc/UTC",
      `platform      ${SIM.topology.switches[m.name].model} (Spectrum-4)`
    ].join("\n");
  },
  version(m) { return "              operational\n------------  --------------------\nbuild         Cumulus Linux 5.16.1\nkernel        6.1.0-cl-1-amd64\nnvue          5.16.1-0.1"; },
  interfaces(st, m) {
    const rows = [["Interface", "MTU", "Speed", "State", "Remote Host", "Remote Port", "Type", "Summary"]];
    for (const i of SIM.NVUE.ifaceList(m)) {
      const peer = SIM.peer(m.name, i);
      const ips = SIM.NVUE.ifaceIp(m, i);
      let type = i === "lo" ? "loopback" : i === "eth0" ? "eth" : i.startsWith("vlan") ? "svi" : i.startsWith("bond") ? "bond" : "swp";
      let summ = ips.length ? "IP Address: " + ips.join(", ") : "";
      const acc = SIM.NVUE.val(m.applied, ["interface", i, "bridge", "domain", "br_default", "access"]);
      if (acc) summ = "Access VLAN: " + acc;
      if (i.startsWith("vlan") && SIM.NVUE.get(m.applied, ["interface", i, "ipv4", "vrr", "state", "enabled"])) summ += "  VRR: " + Object.keys(SIM.NVUE.get(m.applied, ["interface", i, "ipv4", "vrr", "address"]) || {})[0];
      const speed = i === "lo" ? "" : i === "eth0" ? "1G" : i.startsWith("vlan") ? "" : (i.startsWith("swp5") ? "800G" : "400G");
      const state = SIM.NVUE.ifaceState(m, i);
      rows.push(["+ " + i, SIM.NVUE.ifaceMtu(m, i), speed, state, peer ? peer.node : (i === "eth0" ? "oob-mgmt-switch" : ""), peer ? peer.iface : (i === "eth0" ? "swp" + (Object.keys(SIM.topology.switches).indexOf(m.name) + 3) : ""), type, summ]);
    }
    return SIM.table(rows);
  },
  interface(st, m, i) {
    if (!SIM.NVUE.ifaceList(m).includes(i)) return `Error: interface ${i} does not exist`;
    const peer = SIM.peer(m.name, i);
    const ips = SIM.NVUE.ifaceIp(m, i);
    const out = [
      "                      operational            applied",
      "--------------------  ---------------------  -----------",
      `type                  ${P(i.startsWith("vlan") ? "svi" : i === "lo" ? "loopback" : "swp", 22)} ${i.startsWith("vlan") ? "svi" : i === "lo" ? "loopback" : "swp"}`,
      `[ip address]          ${P(ips.join(", ") || "-", 22)} ${ips.join(", ") || ""}`,
      "link",
      `  mtu                 ${P(SIM.NVUE.ifaceMtu(m, i), 22)} ${SIM.NVUE.val(m.applied, ["interface", i, "link", "mtu"]) || ""}`,
      `  state               ${P(SIM.NVUE.ifaceState(m, i), 22)} ${SIM.NVUE.val(m.applied, ["interface", i, "link", "state"]) || "up"}`,
      `  speed               ${i.startsWith("swp5") ? "800G" : "400G"}`,
      `  fec                 rs`
    ];
    if (peer) out.push(`  lldp neighbor       ${peer.node} ${peer.iface}`);
    const acc = SIM.NVUE.val(m.applied, ["interface", i, "bridge", "domain", "br_default", "access"]);
    if (acc) out.push("bridge", `  domain br_default`, `    access            ${P(acc, 22)} ${acc}`);
    const vrf = SIM.NVUE.val(m.applied, ["interface", i, "vrf"]);
    if (vrf) out.push(`vrf                   ${P(vrf, 22)} ${vrf}`);
    return out.join("\n");
  },
  ifaceLink(st, m, i) {
    const peer = SIM.peer(m.name, i);
    const mtu = SIM.NVUE.ifaceMtu(m, i);
    let warn = "";
    if (peer && SIM.isSwitch(peer.node)) { const pm = st.switches[peer.node]; const pmtu = SIM.NVUE.ifaceMtu(pm, peer.iface); if (pmtu !== mtu) warn = `\n! MTU mismatch: local ${mtu}, neighbor ${peer.node} ${peer.iface} ${pmtu} (jumbo frames / VXLAN will be dropped)`; }
    return [
      "                   operational  applied",
      "-----------------  -----------  -------",
      `auto-negotiate     on           on`,
      `duplex             full         full`,
      `speed              ${P(i.startsWith("swp5") ? "800G" : "400G", 12)} auto`,
      `fec                rs           auto`,
      `mtu                ${P(mtu, 12)} ${SIM.NVUE.val(m.applied, ["interface", i, "link", "mtu"]) || ""}`,
      `state              ${P(SIM.NVUE.ifaceState(m, i), 12)} ${SIM.NVUE.val(m.applied, ["interface", i, "link", "state"]) || "up"}`,
      `mac-address        44:38:39:22:${(10 + SIM.NVUE.ifaceList(m).indexOf(i)).toString(16).padStart(2, "0")}:${m.name.slice(-2) === "01" ? "01" : "02"}`,
      "stats",
      `  in-pkts          ${(48112000 + i.length * 1337).toLocaleString()}`,
      `  out-pkts         ${(47990120 + i.length * 913).toLocaleString()}`,
      `  in-drops         ${st.faults.mtuMismatch && m.name === "leaf01" && i === "swp51" ? "0" : "0"}`,
      `  out-drops        ${st.faults.mtuMismatch && m.name === "leaf01" && i === "swp51" ? "18,441  (MTU exceeded - see nv show system wjh / netq show wjh-drop)" : "0"}`
    ].join("\n") + warn;
  },
  roce(st, m) {
    const on = SIM.NVUE.roceOn(m);
    const mode = SIM.NVUE.val(m.applied, ["qos", "roce", "mode"]) || "lossless";
    if (!on) return "RoCE is not enabled on this switch.\n  (nv set qos roce enable on  → applies the lossless profile: PFC on priority 3, ECN on TC 3, DSCP 26 trust)";
    return [
      "                    operational  applied",
      "------------------  -----------  -------",
      "enable                           on",
      `mode                ${P(mode, 12)} ${mode}`,
      "cable-length        100          100",
      "congestion-control",
      "  congestion-mode   ECN          ECN",
      "  enabled-tc        0,3          0,3",
      "  max-threshold     1.43 MB      1.43 MB",
      "  min-threshold     146.48 KB    146.48 KB",
      "  probability       100          100",
      "lldp-app-tlv",
      "  priority          3            3",
      "  protocol-id       4791         4791",
      "  selector          UDP          UDP",
      "pfc",
      `  pfc-priority      ${mode === "lossless" ? "3           " : "-           "} ${mode === "lossless" ? "3" : "-"}`,
      `  rx-enabled        ${mode === "lossless" ? "enabled     " : "disabled    "} ${mode === "lossless" ? "enabled" : "disabled"}`,
      `  tx-enabled        ${mode === "lossless" ? "enabled     " : "disabled    "} ${mode === "lossless" ? "enabled" : "disabled"}`,
      "trust",
      "  trust-mode        pcp,dscp     pcp,dscp",
      "",
      "RoCE PCP/DSCP->SP mapping configurations",
      "===========================================",
      "        pcp  dscp                     switch-prio",
      "    --  ---  -----------------------  -----------",
      "    0   0    0,1,2,3,4,5,6,7          0",
      "    1   1    8,9,10,11,12,13,14,15    1",
      "    2   2    16,17,18,19,20,21,22,23  2",
      "    3   3    24,25,26,27,28,29,30,31  3",
      "    4   4    32,33,34,35,36,37,38,39  4",
      "    5   5    40,41,42,43,44,45,46,47  5",
      "    6   6    48,49,50,51,52,53,54,55  6",
      "    7   7    56,57,58,59,60,61,62,63  7",
      "",
      "RoCE SP->TC mapping and ETS configurations",
      "=============================================",
      "        switch-prio  traffic-class  scheduler-weight",
      "    --  -----------  -------------  ----------------",
      "    0   0            0              DWRR-50%",
      "    1   1            0              DWRR-50%",
      "    2   2            0              DWRR-50%",
      `    3   3            3              ${mode === "lossless" ? "DWRR-50%" : "DWRR-50%"}`,
      "    4   4            0              DWRR-50%",
      "    5   5            0              DWRR-50%",
      "    6   6            6              strict-priority   # CNP",
      "    7   7            0              DWRR-50%",
      "",
      "RoCE pool config",
      "===================",
      "        name                   mode     size   switch-priorities  traffic-class",
      "    --  ---------------------  -------  -----  -----------------  -------------",
      "    0   lossy-default-ingress  Dynamic  50.0%  0,1,2,4,5,6,7      -",
      `    1   roce-reserved-ingress  Dynamic  50.0%  3                  -`,
      "    2   lossy-default-egress   Dynamic  50.0%  -                  0,6",
      "    3   roce-reserved-egress   Dynamic  inf    -                  3",
      "",
      "Exception List",
      "=================",
      "    (none)"
    ].join("\n");
  },
  ifaceQos(st, m, i) {
    const on = SIM.NVUE.roceOn(m);
    return [
      `Interface ${i} QoS`,
      "  trust-mode            " + (on ? "pcp,dscp" : "l2 (pcp)"),
      "  pfc                   " + (on ? "priority 3 rx/tx enabled" : "disabled"),
      "  ecn                   " + (on ? "TC 3 min 146.48KB max 1.43MB" : "disabled"),
      "  counters",
      "    pfc-rx-pause        " + (on ? "1,204" : "0"),
      "    pfc-tx-pause        " + (on ? "87" : "0"),
      "    ecn-marked-pkts     " + (on ? "233,901" : "0"),
      "    tx-drops (TC3)      " + (on ? "0" : "4,120   # lossy: RoCE packets dropped under congestion")
    ].join("\n");
  },
  bgp(st, m) {
    const as = SIM.NVUE.val(m.applied, ["vrf", "default", "router", "bgp", "autonomous-system"]);
    const rid = SIM.NVUE.val(m.applied, ["vrf", "default", "router", "bgp", "router-id"]);
    if (!as) return "BGP is not configured in VRF default.";
    const nb = SIM.NVUE.bgpNeighbors(st, m);
    return [
      "                     operational  applied",
      "-------------------  -----------  -------",
      `autonomous-system    ${P(as, 12)} ${as}`,
      `router-id            ${P(rid, 12)} ${rid}`,
      `neighbors            ${nb.length}`,
      `established          ${nb.filter(n => n.state === "Established").length}`,
      "address-family",
      `  ipv4-unicast       ${SIM.NVUE.get(m.applied, ["vrf", "default", "router", "bgp", "address-family", "ipv4-unicast"]) ? "enabled" : "disabled"}`,
      `  l2vpn-evpn         ${SIM.NVUE.get(m.applied, ["vrf", "default", "router", "bgp", "address-family", "l2vpn-evpn", "state", "enabled"]) ? "enabled" : "disabled"}`
    ].join("\n");
  },
  bgpNeighbors(st, m) {
    const nb = SIM.NVUE.bgpNeighbors(st, m);
    if (!nb.length) return "No BGP neighbors configured.";
    const rows = [["Neighbor", "Remote-AS", "State", "Uptime", "PfxRcd", "AFI/SAFI", "Peer"]];
    nb.forEach(n => rows.push([n.ip, n.remoteAs || "-", n.state, n.state === "Established" ? "2d04h11m" : "never", n.state === "Established" ? n.pfxRx : "0", n.state === "Established" ? ("ipv4-unicast" + (n.evpn ? ", l2vpn-evpn" : "")) : "-", n.peer]));
    let out = SIM.table(rows);
    nb.filter(n => n.state !== "Established").forEach(n => out += `\n! ${n.ip}: ${n.reason}`);
    return out;
  },
  bgpNeighbor(st, m, ip) {
    const n = SIM.NVUE.bgpNeighbors(st, m).find(x => x.ip === ip);
    if (!n) return `Error: neighbor ${ip} not configured`;
    return [
      "                     operational            applied",
      "-------------------  ---------------------  -------",
      `remote-as            ${P(n.peerAs || "unknown", 22)} ${n.remoteAs}`,
      `state                ${n.state}`,
      `last-reset-reason    ${n.state === "Established" ? "-" : n.reason}`,
      `peer-hostname        ${n.peer}`,
      "address-family",
      `  ipv4-unicast       ${n.state === "Established" ? "received " + n.pfxRx + " prefixes" : "-"}`,
      `  l2vpn-evpn         ${n.evpn ? "enabled (type-2/3/5 exchanged)" : "disabled"}`
    ].join("\n");
  },
  rib(st, m, vrf) {
    vrf = vrf || "default";
    const rows = [["Route", "Protocol", "Nexthop", "Interface", "Distance/Metric"]];
    if (vrf === "default") {
      SIM.NVUE.ifaceList(m).forEach(i => SIM.NVUE.ifaceIp(m, i).forEach(a => rows.push([SIM.network(a), "connected", "directly connected", i, "0/0"])));
      SIM.NVUE.bgpNeighbors(st, m).filter(n => n.state === "Established").forEach(n => {
        const pm = st.switches[n.peer];
        SIM.NVUE.ifaceList(pm).forEach(i => SIM.NVUE.ifaceIp(pm, i).forEach(a => { const net = SIM.network(a); if (!rows.some(r => r[0] === net)) rows.push([net, "bgp", n.ip, SIM.NVUE.mySwitchForIp(st, n.ip) ? Object.keys(SIM.NVUE.get(m.applied, ["interface"])).find(x => SIM.NVUE.ifaceIp(m, x).some(c => SIM.sameNet(c, n.ip))) || "?" : "?", "20/0"]); }));
      });
    } else {
      SIM.NVUE.ifaceList(m).filter(i => SIM.NVUE.val(m.applied, ["interface", i, "vrf"]) === vrf).forEach(i => SIM.NVUE.ifaceIp(m, i).forEach(a => rows.push([SIM.network(a), "connected", "directly connected", i, "0/0"])));
      const l3 = SIM.NVUE.val(m.applied, ["vrf", vrf, "evpn", "vni"]);
      if (l3) rows.push(["(type-5 routes)", "bgp-evpn", "remote VTEPs via L3VNI " + l3, "vxlan", "20/0"]);
    }
    return SIM.table(rows);
  },
  vrfEvpn(st, m, vrf) {
    const vni = SIM.NVUE.val(m.applied, ["vrf", vrf, "evpn", "vni"]);
    if (!vni) return `VRF ${vrf}: no L3VNI configured (nv set vrf ${vrf} evpn vni <id>)`;
    const others = Object.entries(st.switches).filter(([n]) => n !== m.name).map(([n, pm]) => [n, SIM.NVUE.val(pm.applied, ["vrf", vrf, "evpn", "vni"])]).filter(x => x[1]);
    let warn = others.filter(o => o[1] !== vni).map(o => `\n! ${o[0]} maps VRF ${vrf} to L3VNI ${o[1]} - symmetric routing requires the SAME L3VNI on every leaf`).join("");
    return [
      "          operational  applied",
      "--------  -----------  -------",
      `vni       ${P(vni, 12)} ${vni}`,
      `vlan      ${P("auto (4001+)", 12)}`,
      `rmac      44:38:39:22:01:${m.name.slice(-2)}`,
      `type      L3 (symmetric IRB)`
    ].join("\n") + warn;
  },
  evpnVni(st, m) {
    const list = SIM.NVUE.vnis(st, m);
    if (!list.length) return "No VNIs configured.";
    const rows = [["VNI", "Type", "VLAN", "VRF", "In-Kernel", "Remote VTEPs"]];
    list.forEach(v => rows.push([v.vni, v.type, v.vlan, v.vrf, "yes", SIM.NVUE.remoteVteps(st, m, v).join(", ") || "-"]));
    return SIM.table(rows);
  },
  evpnRoutes(st, m) {
    const nb = SIM.NVUE.bgpNeighbors(st, m).filter(n => n.state === "Established" && n.evpn);
    if (!nb.length) return "No EVPN routes: no established neighbor with l2vpn-evpn activated.";
    const out = ["BGP table version is 48, local router ID is " + SIM.NVUE.val(m.applied, ["vrf", "default", "router", "bgp", "router-id"]), "EVPN type-2 prefix: [2]:[EthTag]:[MAClen]:[MAC]:[IPlen]:[IP]", "EVPN type-3 prefix: [3]:[EthTag]:[IPlen]:[OrigIP]", "EVPN type-5 prefix: [5]:[EthTag]:[IPlen]:[IP]", ""];
    for (const v of SIM.NVUE.vnis(st, m)) {
      const vteps = SIM.NVUE.remoteVteps(st, m, v);
      vteps.forEach(vt => {
        if (v.type === "L2") { out.push(`Route Distinguisher: ${vt}:2`, ` *> [3]:[0]:[32]:[${vt}]   RT:${65100}:${v.vni}  ET:8`, ` *> [2]:[0]:[48]:[52:54:00:ab:cd:${vt.slice(-1)}2]:[32]:[192.168.1.${vt.slice(-1)}]  VNI ${v.vni}`); }
        else out.push(`Route Distinguisher: ${vt}:3`, ` *> [5]:[0]:[24]:[192.168.1.0]   RT:65100:${v.vni}  Rmac:44:38:39:22:01:0${vt.slice(-1)}  L3VNI ${v.vni}`);
      });
    }
    out.push("", "Displayed " + (out.length - 5) + " prefixes");
    return out.join("\n");
  },
  nve(st, m) {
    const on = SIM.NVUE.get(m.applied, ["nve", "vxlan", "state", "enabled"]);
    const src = SIM.NVUE.val(m.applied, ["nve", "vxlan", "source", "address"]);
    const vtepList = new Set(); SIM.NVUE.vnis(st, m).forEach(v => SIM.NVUE.remoteVteps(st, m, v).forEach(x => vtepList.add(x)));
    return [
      "                  operational  applied",
      "----------------  -----------  -------",
      `enable            ${P(on ? "on" : "off", 12)} ${on ? "on" : "off"}`,
      `source address    ${P(src || "-", 12)} ${src || ""}`,
      "udp-port          4789         4789",
      "mtu               9216         9216",
      `remote vteps      ${[...vtepList].join(", ") || "-"}`,
      "arp-nd-suppress   on           on"
    ].join("\n");
  },
  bridge(st, m) {
    const ifs = SIM.NVUE.ifaceList(m).filter(i => SIM.NVUE.get(m.applied, ["interface", i, "bridge", "domain", "br_default"]));
    const vlans = Object.keys(SIM.NVUE.get(m.applied, ["bridge", "domain", "br_default", "vlan"]) || {});
    return [
      "                operational                applied",
      "--------------  -------------------------  --------",
      `type            vlan-aware                 vlan-aware`,
      `untagged        1                          1`,
      `vlan            ${P(vlans.join(",") || "-", 26)} ${vlans.join(",")}`,
      `[interface]     ${P(ifs.join(",") || "-", 26)} ${ifs.join(",")}`,
      `mac-address     44:38:39:22:00:${m.name.slice(-2)}`,
      `stp             off`
    ].join("\n");
  },
  bridgeVlan(st, m) {
    const vl = SIM.NVUE.get(m.applied, ["bridge", "domain", "br_default", "vlan"]) || {};
    const rows = [["VLAN", "VNI", "Ports"]];
    Object.keys(vl).forEach(v => rows.push([v, SIM.NVUE.val(m.applied, ["bridge", "domain", "br_default", "vlan", v, "vni"]) || "-", SIM.NVUE.ifaceList(m).filter(i => SIM.NVUE.val(m.applied, ["interface", i, "bridge", "domain", "br_default", "access"]) === v).join(",")]));
    return SIM.table(rows);
  },
  mh(st, m) {
    const on = SIM.NVUE.get(m.applied, ["evpn", "multihoming", "enable", "on"]);
    if (!on) return "EVPN multihoming is not enabled (nv set evpn multihoming enable on).";
    const bonds = SIM.NVUE.ifaceList(m).filter(i => i.startsWith("bond"));
    const rows = [["ESI", "Interface", "DF-pref", "DF", "Remote VTEPs"]];
    bonds.forEach(b => { const mac = SIM.NVUE.val(m.applied, ["interface", b, "evpn", "multihoming", "segment", "mac-address"]) || "00:00:00:00:00:00"; const id = SIM.NVUE.val(m.applied, ["interface", b, "evpn", "multihoming", "segment", "local-id"]) || "0"; rows.push([`03:${mac.toLowerCase()}:${(+id).toString(16).padStart(6, "0").match(/../g).join(":")}`, b, SIM.NVUE.val(m.applied, ["interface", b, "evpn", "multihoming", "segment", "df-preference"]) || "32767", "yes", "-"]); });
    return SIM.table(rows);
  },
  wjh(st, m, toks) {
    if (toks.length > 2 && toks[2] === "channel") {
      const ch = SIM.NVUE.get(m.applied, ["system", "wjh", "channel"]) || {};
      const rows = [["Channel", "Trigger", "Type"]];
      Object.keys(ch).forEach(c => Object.keys(ch[c].trigger || {}).forEach(t => rows.push([c, t, "aggregate"])));
      if (rows.length === 1) return "No WJH channels configured (nv set system wjh channel forwarding trigger l2|l3|tunnel ...).";
      return SIM.table(rows);
    }
    const drops = SIM.wjhEvents(st).filter(e => e.switch === m.name);
    const head = [
      "              operational  applied",
      "------------  -----------  -------",
      "enable        on           on",
      "channel",
      "  forwarding  l2,l3,tunnel",
      "  layer-1     l1",
      "  acl         acl",
      "  buffer      buffer",
      "",
      "Recent drops (what-just-happened, last 1h):"
    ];
    if (!drops.length) head.push("  (none)");
    drops.forEach(e => head.push(`  ${e.ts}  ${P(e.type, 9)} ${P(e.port, 6)} ${P(e.reason, 48)} ${e.flow}`));
    return head.join("\n");
  }
};

// Shared helpers ----------------------------------------------------------------
SIM.table = function (rows) {
  const w = rows[0].map((_, c) => Math.max(...rows.map(r => String(r[c] ?? "").length)));
  const line = (r) => r.map((v, c) => P(v ?? "", w[c])).join("  ").trimEnd();
  return [line(rows[0]), w.map(x => "-".repeat(x)).join("  "), ...rows.slice(1).map(line)].join("\n");
};
SIM.network = function (cidr) {
  const [ip, len] = cidr.split("/"); const n = +len;
  const parts = ip.split(".").map(Number);
  let v = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0;
  v = (v & mask) >>> 0;
  return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join(".") + "/" + n;
};
SIM.sameNet = function (cidr, ip) { return SIM.network(cidr) === SIM.network(ip + "/" + cidr.split("/")[1]); };
SIM.wjhEvents = function (st) {
  const ev = [];
  const t = (m) => new Date(Date.now() - m * 60000).toTimeString().slice(0, 8);
  if (st.faults.mtuMismatch) ev.push({ switch: "leaf01", ts: t(3), type: "L3", port: "swp51", reason: "Packet size is larger than MTU (1500) - encapsulated VXLAN frame", flow: "192.168.1.1 -> 192.168.1.2 UDP 4791 (RoCEv2 in VXLAN)", severity: "Error", count: 18441 });
  if (!SIM.NVUE.roceOn(st.switches.leaf01)) ev.push({ switch: "leaf01", ts: t(1), type: "Buffer", port: "swp1", reason: "Tail drop - egress queue TC0 exceeded (lossy, no PFC/ECN)", flow: "192.168.1.3 -> 192.168.1.1 UDP 4791 (RoCEv2)", severity: "Warning", count: 4120 });
  if (st.faults.bgpAsn) ev.push({ switch: "leaf02", ts: t(5), type: "L3", port: "swp1", reason: "Router: destination unreachable - no route (blackhole)", flow: "192.168.1.2 -> 10.10.10.1 ICMP", severity: "Error", count: 302 });
  if (st.faults.aclDrop) ev.push({ switch: "leaf01", ts: t(2), type: "ACL", port: "swp2", reason: "Ingress ACL deny - rule 'block-mgmt' (ipv4 acl TENANT-IN seq 30)", flow: "192.168.1.3 -> 192.168.200.5 TCP 443", severity: "Warning", count: 77 });
  return ev;
};

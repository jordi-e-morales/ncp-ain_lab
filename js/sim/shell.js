// ---------------------------------------------------------------------------
// Shell dispatcher: prompt, ssh between nodes, Linux basics (cat/grep/echo/sed/ls)
// and routing to the NVUE, InfiniBand and operations modules.
// ---------------------------------------------------------------------------
window.SIM = window.SIM || {};

SIM.createSession = function (opts) {
  const st = SIM.newState(opts);
  for (const n of Object.keys(SIM.topology.switches)) st.switches[n] = SIM.NVUE.create(n);
  SIM.NVUE.injectFaults(st);
  if (st.faults.aclDrop) { /* flag only; rendered by wjhEvents */ }
  return st;
};

SIM.prompt = function (st) {
  const n = st.node;
  if (SIM.isSwitch(n)) return `cumulus@${n}:mgmt:~$ `;
  if (n === "oob-mgmt-server") return `ubuntu@oob-mgmt-server:~$ `;
  if (n === "ufm-server") return `root@ufm-server:~# `;
  return `ubuntu@${n}:~$ `;
};

SIM.exec = function (st, line) {
  line = line.trim();
  if (!line) return "";
  st.history.push(line); st.cmdLog.push({ node: st.node, cmd: line });
  // pipes: only "| grep X" and "| head -N" are honoured
  let grep = null, head = null;
  const pipes = line.split("|").map(s => s.trim());
  let main = pipes[0];
  pipes.slice(1).forEach(p => { const g = p.match(/^grep\s+(-\w+\s+)*['"]?(.+?)['"]?$/); if (g) grep = { re: new RegExp(g[2].replace(/^-E\s+/, ""), "i"), v: /\s-v\s/.test(" " + p + " ") }; const h = p.match(/^head\s+(?:-n\s*)?-?(\d+)/); if (h) head = +h[1]; if (p.startsWith("tee")) { const f = p.split(/\s+/).pop(); SIM.writeFile(st, f, SIM.evalEcho(main), p.includes("-a")); return; } });
  if (pipes.length > 1 && pipes[1].startsWith("sudo tee") || pipes.some(p => p.startsWith("sudo tee") || p.startsWith("tee"))) { const p = pipes.find(x => /tee/.test(x)); const f = p.split(/\s+/).pop(); SIM.writeFile(st, f, SIM.evalEcho(main), p.includes("-a")); return SIM.evalEcho(main); }
  let out = SIM.runOne(st, main, line);
  if (out == null) out = `${main.split(/\s+/)[0]}: command not found. Type 'help' for the commands available on ${st.node}.`;
  if (grep) out = out.split("\n").filter(l => grep.v ? !grep.re.test(l) : grep.re.test(l)).join("\n");
  if (head) out = out.split("\n").slice(0, head).join("\n");
  return out;
};

SIM.evalEcho = function (cmd) { const m = cmd.match(/^echo\s+(.*)$/); if (!m) return ""; return m[1].replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"); };
SIM.resolvePath = function (st, f) {
  if (f.startsWith("/")) return f;
  const home = SIM.isSwitch(st.node) ? "/home/cumulus/" : st.node === "oob-mgmt-server" ? "/home/ubuntu/" : "/home/ubuntu/";
  if (f.startsWith("~/")) f = f.slice(2);
  // convenience: files under ansible/ and k8s/ resolve from the oob home
  return home + f;
};
SIM.writeFile = function (st, f, content, append) { const p = SIM.resolvePath(st, f); st.files[p] = append && st.files[p] != null ? st.files[p].replace(/\n?$/, "\n") + content : content; };

SIM.runOne = function (st, cmd, raw) {
  let argv = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  argv = argv.map(a => a.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
  if (argv[0] === "sudo") argv.shift();
  if (argv[0] === "watch") { argv = argv.filter(x => !/^-n$|^\d+$/.test(x)).slice(1); }
  const c = argv[0]; const a = argv.slice(1); const node = st.node;

  // --- universal ---------------------------------------------------------------
  if (c === "help" || c === "?") return SIM.help(st);
  if (c === "clear") return "\u0000CLEAR";
  if (c === "hostname") return node;
  if (c === "whoami") return SIM.isSwitch(node) ? "cumulus" : "ubuntu";
  if (c === "exit" || c === "logout") { if (node !== "oob-mgmt-server") { st.node = "oob-mgmt-server"; return "Connection closed. Back on oob-mgmt-server."; } return "Already on oob-mgmt-server (the lab jump host)."; }
  if (c === "ssh") { let tgt = (a.find(x => !x.startsWith("-")) || "").replace(/^\w+@/, ""); const byIp = Object.entries(Object.assign({}, SIM.topology.hosts, SIM.topology.switches)).find(([, v]) => v.mgmt === tgt); if (byIp) tgt = byIp[0]; if (!SIM.topology.hosts[tgt] && !SIM.topology.switches[tgt]) return `ssh: Could not resolve hostname ${tgt || "?"}: nodes are ${Object.keys(SIM.topology.switches).concat(Object.keys(SIM.topology.hosts)).join(", ")}`; st.node = tgt; return SIM.banner(st, tgt); }
  if (c === "cat") { const f = a.find(x => !x.startsWith("-")); if (!f) return "cat: missing file"; const p = SIM.resolvePath(st, f); if (st.files[p] == null) return `cat: ${f}: No such file or directory`; return st.files[p]; }
  if (c === "ls") { const dir = a.find(x => !x.startsWith("-")); const base = dir ? SIM.resolvePath(st, dir).replace(/\/?$/, "/") : (SIM.isSwitch(node) ? "/home/cumulus/" : "/home/ubuntu/"); const items = new Set(); Object.keys(st.files).forEach(f => { if (f.startsWith(base)) items.add(f.slice(base.length).split("/")[0]); }); if (!items.size) return ""; return [...items].sort().join("  "); }
  if (c === "echo") { const redir = raw.match(/>>?\s*(\S+)$/); if (redir) { SIM.writeFile(st, redir[1], SIM.evalEcho(cmd.replace(/>>?\s*\S+$/, "").trim()), raw.includes(">>")); return ""; } return SIM.evalEcho(cmd); }
  if (c === "grep") { const flags = a.filter(x => x.startsWith("-")); const rest = a.filter(x => !x.startsWith("-")); const pat = rest[0], f = rest[1]; if (!f) return "grep: usage: grep [-E] <pattern> <file>"; const p = SIM.resolvePath(st, f); if (st.files[p] == null) return `grep: ${f}: No such file or directory`; return st.files[p].split("\n").filter(l => new RegExp(pat, flags.includes("-i") ? "i" : "").test(l)).join("\n"); }
  if (c === "sed") { const m = raw.match(/sed\s+(-i\s+)?['"]s([\/|#])(.*?)\2(.*?)\2(g?)['"]\s+(\S+)/); if (!m) return "sed: supported form: sed -i 's/old/new/' <file>"; const p = SIM.resolvePath(st, m[6]); if (st.files[p] == null) return `sed: can't read ${m[6]}: No such file or directory`; const re = new RegExp(m[3], m[5] ? "gm" : "m"); const res = st.files[p].replace(re, m[4]); if (m[1]) { st.files[p] = res; return ""; } return res; }
  if (c === "vi" || c === "vim" || c === "nano") return `${c}: interactive editors are not simulated. Edit files with:\n  sed -i 's/routing_engine minhop/routing_engine ftree/' /etc/opensm/opensm.conf\n  echo 'AI_Partition=0x1234, ipoib : 0xb83fd20300a1c002=full, 0xb83fd20300a1c012=limited;' | sudo tee -a /etc/opensm/partitions.conf\nthen: cat <file> to verify.`;
  if (c === "ping") { const t = a.find(x => /^\d+\.\d+/.test(x) || /^(gpu|leaf|spine|oob)/.test(x)); const ok = SIM.pingOk(st, node, t); return ok ? `PING ${t}: 56 data bytes\n64 bytes from ${t}: icmp_seq=1 ttl=64 time=0.112 ms\n64 bytes from ${t}: icmp_seq=2 ttl=64 time=0.098 ms\n64 bytes from ${t}: icmp_seq=3 ttl=64 time=0.101 ms\n--- ${t} ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss` : `PING ${t}: 56 data bytes\n--- ${t} ping statistics ---\n3 packets transmitted, 0 received, 100% packet loss`; }
  if (c === "ip") return SIM.ipCmd(st, node, a);
  if (c === "lspci") return raw.includes("grep") ? "4b:00.0 Infiniband controller: Mellanox Technologies MT2910 Family [ConnectX-7]\n98:00.0 Ethernet controller: Mellanox Technologies MT43244 BlueField-3 integrated ConnectX-7 network controller" : "1b:00.0 3D controller: NVIDIA Corporation GH100 [H100 SXM5 80GB]\n4b:00.0 Infiniband controller: Mellanox Technologies MT2910 Family [ConnectX-7]\n98:00.0 Ethernet controller: Mellanox Technologies MT43244 BlueField-3 integrated ConnectX-7 network controller";
  if (c === "uname") return "Linux " + node + " 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux";
  if (c === "date") return new Date().toString();
  if (c === "history") return st.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n");
  if (c === "topology" || c === "lab") return SIM.topoText(st);

  // --- Cumulus switches ----------------------------------------------------------
  if (SIM.isSwitch(node)) {
    const m = st.switches[node];
    if (c === "nv") return SIM.NVUE.run(st, m, a);
    if (c === "net") return "NCLU ('net' commands) was removed in Cumulus Linux 5.x. Use NVUE: nv set ... / nv config apply / nv show ...";
    if (c === "cl-resource-query") return SIM.OPS.clResourceQuery(st, m);
    if (c === "bridge") { if (a[0] === "vlan") return "port              vlan-id\nswp1              10 PVID Egress Untagged\nswp2              10 PVID Egress Untagged\nvxlan48           10\n                  4001" ; if (a[0] === "fdb") return "52:54:00:ab:cd:12 dev swp1 vlan 10 master br_default\n52:54:00:ab:cd:32 dev swp2 vlan 10 master br_default\n52:54:00:ab:cd:22 dev vxlan48 vlan 10 master br_default extern_learn\n52:54:00:ab:cd:22 dev vxlan48 dst 10.10.10.2 self extern_learn"; return "Usage: bridge vlan show | bridge fdb show"; }
    if (c === "vtysh") return "Hello, this is FRRouting (version 10.1).\n(use: nv show vrf default router bgp neighbor  -- NVUE wraps FRR)";
    if (c === "systemctl") return a[1] === "what-just-happened" ? "● what-just-happened.service - WJH on-box drop analysis\n     Active: active (running)" : a[1] === "netq-agent" ? "● netq-agent.service\n     Active: active (running) - streaming to oob-mgmt-server:31980" : `● ${a[1]}.service  Active: active (running)`;
    if (c === "ztp") return a.includes("-s") ? "ZTP INFO:\nState           disabled\nVersion         1.0\nResult          success\nDate            Mon Nov  3 10:02:11 2026\nMethod          DHCP (option 239)\nURL             http://192.168.200.1/ztp/cumulus-ztp.sh" : a.includes("-e") ? "ZTP enabled - will run on next boot (removes the ZTP-done marker)" : "Usage: ztp -s (status) | ztp -e (enable) | ztp -d (disable)";
    if (c === "what-just-happened" || c === "wjh") return SIM.NVUE.show.wjh(st, m, ["system", "wjh"]);
    if (c === "mlxlink" || c === "mst" || c === "mlxconfig") return SIM.IB.run(st, node, argv, raw);
    if (c === "ethtool") return `Settings for ${a[0] || "swp1"}:\n\tSpeed: ${(a[0] || "swp1").startsWith("swp5") ? "800000Mb/s" : "400000Mb/s"}\n\tDuplex: Full\n\tLink detected: yes\n\tFEC: RS`;
    if (c === "decode-syseeprom") return `Product Name       ${SIM.topology.switches[node].model}\nSerial Number      MT2345X${node.slice(-2)}001\nBase MAC Address   44:38:39:22:00:${node.slice(-2)}\nManufacturer       NVIDIA\nPlatform Name      x86_64-nvidia_sn5600-r0`;
    return null;
  }
  // --- oob-mgmt-server ----------------------------------------------------------
  if (node === "oob-mgmt-server") {
    if (c === "netq") return SIM.OPS.netq(st, a);
    if (c === "kubectl" || c === "k") return SIM.OPS.kubectl(st, a);
    if (c === "helm") return SIM.OPS.helm(st, a);
    if (c.startsWith("ansible")) return SIM.OPS.ansible(st, c, a);
    if (c === "cd") return "";
    return null;
  }
  if (node === "ufm-server") {
    if (c === "ufm_enterprise_sanity.sh" || c === "ufm-sanity") return "UFM Enterprise sanity: SM=MASTER  telemetry=running  disk=/opt 41% used  HA=active/standby (ufm-server-2 via OOB link 10.9.9.2)";
    if (c === "sharp_am" || (c === "systemctl" && a[1] === "sharp_am")) return "● sharp_am.service - SHARP Aggregation Manager\n     Active: active (running)\n     Trees: 2 (root ibsw-spine01)  jobs: 1";
    if (c === "systemctl") return `● ${a[1]}.service  Active: active (running)`;
    if (c === "df") return "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda2       440G  180G  238G  43% /\n/dev/sdb1       1.8T  1.7T   12G  99% /opt/ufm   # <-- telemetry history disk nearly full";
    if (c === "docker") return "CONTAINER ID   IMAGE                                 STATUS       NAMES\n3f1a9c0d2e4b   mellanox/ufm-enterprise:6.21.0        Up 3 days    ufm\n9b2c7e1f0a3d   mellanox/ufm-telemetry:1.18.0         Up 3 days    ufm-telemetry";
    if (c === "sminfo" || c === "ibdiagnet" || c === "ibhosts" || c === "ibswitches" || c === "ibnodes" || c === "iblinkinfo") return SIM.IB.run(st, "gpu01", argv, raw);
    return null;
  }
  // --- GPU hosts -----------------------------------------------------------------
  if (SIM.isGpuHost(node)) {
    const r = SIM.IB.run(st, node, argv, raw);
    if (r != null) return r;
    if (c === "cd") return "";
    if (c === "minicom") return a.includes("rshim") ? "Welcome to minicom 2.8\nOPTIONS: I18n\nPort /dev/rshim0/console\n\nUbuntu 22.04 LTS bf3-dpu ttyAMA0\nbf3-dpu login: ubuntu\nPassword: (default ubuntu/ubuntu - you will be forced to change it)\nubuntu@bf3-dpu:~$ ip link show  →  lo, oob_net0, tmfifo_net0, p0, p1, pf0hpf, pf1hpf\n(type 'exit' to leave the DPU console)" : "minicom: usage: minicom -D /dev/rshim0/console";
    if (c === "dpkg") return raw.includes("doca") ? "ii  doca-all        2.9.0-0.3.1   amd64  DOCA SDK meta package\nii  doca-networking 2.9.0-0.3.1   amd64\nii  doca-ofed       2.9.0-0.3.1   amd64\nii  mft             4.30.0-139    amd64  Mellanox Firmware Tools" : "ii  rdma-core  50.0  amd64\nii  perftest   24.10 amd64\nii  infiniband-diags 50.0 amd64";
    if (c === "apt" || c === "apt-get") return `Reading package lists... Done\n${a.slice(1).join(" ")} is already the newest version.`;
    if (c === "modprobe") return "";
    if (c === "free") return "               total        used        free      shared  buff/cache   available\nMem:           2.0Ti       340Gi       1.5Ti        12Gi       180Gi       1.6Ti";
    if (c === "numactl") return "available: 2 nodes (0-1)\nnode 0 cpus: 0-47\nnode 0 size: 1031796 MB\nnode 1 cpus: 48-95\nnode 1 size: 1031796 MB\nnode distances:\nnode   0   1\n  0:  10  21\n  1:  21  10";
    if (c === "show_gids") return "DEV\tPORT\tINDEX\tGID\t\t\t\t\tIPv4\t\tVER\tDEV\nmlx5_1\t1\t0\tfe80:0000:0000:0000:b83f:d2ff:fee1:c002\t\t\tv1\teth1\nmlx5_1\t1\t1\tfe80:0000:0000:0000:b83f:d2ff:fee1:c002\t\t\tv2\teth1\nmlx5_1\t1\t2\t0000:0000:0000:0000:0000:ffff:c0a8:0101\t192.168.1.1\tv1\teth1\nmlx5_1\t1\t3\t0000:0000:0000:0000:0000:ffff:c0a8:0101\t192.168.1.1\tv2\teth1   # <-- RoCEv2 GID index 3";
    if (c === "cma_roce_mode") return "RoCE v2";
    return null;
  }
  return null;
};

SIM.pingOk = function (st, node, t) {
  if (!t) return false;
  if (/^192\.168\.200\./.test(t) || /^(oob|leaf|spine|ufm)/.test(t)) return true;         // OOB network always works
  if (/^192\.168\.1\./.test(t) || /^gpu0\d$/.test(t)) {                                   // overlay: needs working EVPN between leaves
    const src = SIM.topology.hosts[node]?.rail || "leaf01";
    const dstHost = /^gpu/.test(t) ? t : Object.entries(SIM.topology.hosts).find(([, v]) => v.data && v.data.startsWith(t + "/"))?.[0];
    const dst = dstHost ? SIM.topology.hosts[dstHost].rail : "leaf02";
    if (src === dst) return true;
    const v = SIM.NVUE.vnis(st, st.switches[src]).find(x => x.vni === "10010");
    return !!v && SIM.NVUE.remoteVteps(st, st.switches[src], v).length > 0 && !st.faults.mtuMismatch;
  }
  return false;
};

SIM.ipCmd = function (st, node, a) {
  const h = SIM.topology.hosts[node];
  if (a[0] === "addr" || a[0] === "a") return `1: lo: <LOOPBACK,UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet ${h.mgmt}/24 brd 192.168.200.255 scope global eth0${h.data ? `\n3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9000\n    inet ${h.data} brd 192.168.1.255 scope global eth1\n4: ib0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 2044\n    inet 10.100.0.${h.mgmt.split(".")[3]}/24 scope global ib0` : ""}`;
  if (a[0] === "link") { if (a[1] === "set") return ""; return `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 link/ether 52:54:00:00:${h.mgmt.split(".")[3].padStart(2, "0")}:01${h.data ? `\n3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9000 link/ether 52:54:00:ab:cd:${h.mgmt.split(".")[3]}2\n4: ib0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 2044 link/infiniband 00:00:10:49:fe:80:...` : ""}`; }
  if (a[0] === "route" || a[0] === "r") return `default via 192.168.200.1 dev eth0${h.data ? `\n192.168.1.0/24 dev eth1 proto kernel scope link src ${h.data.split("/")[0]}` : ""}\n192.168.200.0/24 dev eth0 proto kernel scope link src ${h.mgmt}`;
  return "Usage: ip addr | ip link [set eth1 up] | ip route";
};

SIM.banner = function (st, n) {
  if (SIM.isSwitch(n)) return `Welcome to NVIDIA Cumulus (R) Linux (R) 5.16.1\n${n} (${SIM.topology.switches[n].model}, Spectrum-4). Try: nv show interface | nv show qos roce | nv config diff`;
  if (n === "oob-mgmt-server") return "oob-mgmt-server: NetQ CLI, kubectl, helm, ansible live here. Try: netq check bgp | kubectl get nicclusterpolicy | ls ansible";
  if (n === "ufm-server") return "ufm-server: UFM Enterprise 6.21 (SM + telemetry + sharp_am). Try: df -h | docker ps | sminfo";
  return `${n}: DGX H100 (8x H100, ConnectX-7 mlx5_0 InfiniBand, BlueField-3 mlx5_1 RoCE). Try: ibstat | ibhosts | nvidia-smi topo -m${n === "gpu01" ? " | systemctl status opensm" : ""}`;
};

SIM.help = function (st) {
  const n = st.node;
  const common = "General: ssh <node> | exit | cat <file> | grep | sed -i | echo >> | ls | ping | ip addr | topology | clear | help";
  if (SIM.isSwitch(n)) return common + "\nNVUE:    nv set|unset <path> | nv config diff|apply [rev]|save|history|show [-o yaml]|patch <file>|replace <file>|detach\n         nv show interface [swpX [link|qos]] | system [version|wjh] | platform | qos roce | vrf default router bgp [neighbor [ip]] | vrf <vrf> evpn | evpn vni | nve vxlan | bridge domain br_default [vlan] | router adaptive-routing | vrf default router rib ipv4 route\nLinux:   cl-resource-query | bridge vlan show | bridge fdb show | ethtool swp1 | ztp -s | mst status | mlxlink | decode-syseeprom";
  if (n === "oob-mgmt-server") return common + "\nNetQ:    netq show agents|version|events|wjh-drop|bgp|evpn|interfaces [congestion]|roce-counters|validation ; netq check bgp|evpn|mtu|interfaces|roce  [around 14:00 | between now and 1h]\nK8s:     kubectl get pods -n nvidia-network-operator | get nicclusterpolicy [-o yaml] | describe node gpu01 | get net-attach-def | apply -f k8s/rdma-pod.yaml | describe pod rdma-test | logs <pod> ; helm list -A\nAnsible: ls ansible | cat ansible/inventory.ini | cat ansible/group_vars/leaf.yml | ansible-playbook -i ansible/inventory.ini ansible/roce.yml [--limit leaf01] [--check] | ansible-galaxy collection install nvidia.nvue | ansible-inventory --graph";
  if (n === "ufm-server") return common + "\nUFM:     df -h | docker ps | systemctl status ufm-enterprise | systemctl status sharp_am | sminfo | ibdiagnet | iblinkinfo";
  return common + "\nIB:      ibstat [-d mlx5_0] | ibv_devinfo [-v] | ibhosts | ibswitches | ibnodes | iblinkinfo | ibnetdiscover [-p] | sminfo | smpquery ND|NI|PI|PKeys|SL2VL|VLArb <lid> [port] | saquery -s | ibping -S | -L <lid> | -G <guid> | ibtracert <src> <dst> | ibroute <swlid> | ibdiagnet [--pc --pm] [--sharp] | perfquery [-R] <lid> <port> | ibaddr | ibportstate <lid> <port> query | rdma link show | ibdev2netdev\nPerf:    ib_write_bw [-d dev] [-S sl] [-p port] [--report_gbits] [-x gid] [server] | ib_write_lat | ib_send_bw | ibv_rc_pingpong -d mlx5_1 -g 3 [server] | all_reduce_perf\nHW:      mst start|status | mlxconfig -d /dev/mst/<dev> q | s PARAM=val | mlxfwreset -d <dev> reset | mlxlink -d <dev> [-m] [-c] [-e] [--pc] | nvidia-smi topo -m | lspci | lsmod | ofed_info -s | show_gids | numactl -H\nSM:      systemctl status|start|stop|restart opensm (gpu01) | kill -HUP $(pgrep opensm) | cat /etc/opensm/opensm.conf | cat /etc/opensm/partitions.conf | cat /etc/opensm/qos-policy.conf";
};

SIM.topoText = function (st) {
  return [
    "LAB TOPOLOGY (all nodes reachable with: ssh <name>)",
    "",
    "  Ethernet / Spectrum-X (Cumulus Linux 5.16, SN5600, eBGP + EVPN-VXLAN, RoCE)",
    "      spine01 (AS65100, lo 10.10.10.101)     spine02 (AS65100, lo 10.10.10.102)",
    "        swp1 10.0.1.0 ─ swp51 leaf01           swp1 10.0.2.0 ─ swp52 leaf01",
    "        swp2 10.0.1.2 ─ swp51 leaf02           swp2 10.0.2.2 ─ swp52 leaf02",
    "      leaf01 (AS65101, VTEP 10.10.10.1)  swp1─gpu01 eth1   swp2─gpu03 eth1   VLAN10/VNI10010, VRF RED L3VNI 4001",
    "      leaf02 (AS65102, VTEP 10.10.10.2)  swp1─gpu02 eth1   swp2─gpu04 eth1   anycast GW 192.168.1.254",
    "",
    "  InfiniBand (NDR, Quantum-2 QM9700; opensm MASTER on gpu01)",
    "      ibsw-spine01 LID 5",
    "        p1 ─ p33 ibsw-leaf01 LID 4 : p1─gpu01 (LID 1)  p2─gpu03 (LID 7)",
    "        p2 ─ p33 ibsw-leaf02 LID 6 : p1─gpu02 (LID 3)  p2─gpu04 (LID 8)",
    "",
    "  Management: oob-mgmt-server 192.168.200.1 (NetQ, kubectl, ansible) · ufm-server 192.168.200.5 · switches .21/.22/.31/.32 · gpu0X .11-.14",
    "",
    `  Active faults: ${Object.entries(st.faults).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`
  ].join("\n");
};

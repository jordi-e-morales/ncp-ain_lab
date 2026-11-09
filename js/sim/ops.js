// ---------------------------------------------------------------------------
// Operations tooling that lives on oob-mgmt-server (NetQ CLI, kubectl, helm,
// ansible) plus Cumulus Linux native commands (cl-resource-query, bridge, ip).
// ---------------------------------------------------------------------------
window.SIM = window.SIM || {};
const OPS = SIM.OPS = {};
const P2 = SIM.pad;

OPS.netq = function (st, a) {
  const sub = a[0], obj = a[1];
  const timeFilter = a.includes("between") || a.includes("around") ? ` (time filter: ${a.slice(a.indexOf(a.includes("between") ? "between" : "around")).join(" ")})` : "";
  if (sub === "show" && obj === "version") return "NetQ CLI version 4.13.0  NetQ Agent 4.13.0  Cumulus Linux 5.16.1";
  if (sub === "show" && obj === "agents") {
    const rows = [["Matching agents records:", "", "", "", ""], ["Hostname", "Status", "NTP Sync", "Version", "Last Changed"]];
    const rows2 = [["Hostname", "Status", "NTP Sync", "Version", "Last Changed"]];
    [...Object.keys(SIM.topology.switches), "gpu01", "gpu02", "gpu03", "gpu04", "oob-mgmt-server"].forEach(h => rows2.push([h, h === "gpu02" && st.faults.nicDriverNotReady ? "Rotten" : "Fresh", "yes", "4.13.0", "Sat Nov  8 13:02:11 2026"]));
    return SIM.table(rows2);
  }
  if (sub === "check" && obj === "bgp") {
    const all = []; let fail = 0;
    for (const [n, m] of Object.entries(st.switches)) for (const nb of SIM.NVUE.bgpNeighbors(st, m)) { all.push([n, nb.ip, nb.peer, nb.remoteAs, nb.state]); if (nb.state !== "Established") fail++; }
    let out = `bgp check result summary:\n\nTotal nodes         : 4\nChecked nodes       : 4\nFailed nodes        : ${new Set(all.filter(r => r[4] !== "Established").map(r => r[0])).size}\nRotten nodes        : 0\nWarning nodes       : 0\n\nAdditional summary:\nTotal Sessions      : ${all.length}\nFailed Sessions     : ${fail}\n\nSession Establishment Test   : ${fail ? "failed" : "passed"}\nAddress Families Test        : passed\nRouter ID Test               : passed\n`;
    if (fail) { out += "\nSession Establishment Test details:\nHostname  Peer Name  Peer Hostname  Reason\n--------  ---------  -------------  ------------------------------\n"; all.filter(r => r[4] !== "Established").forEach(r => out += `${P2(r[0], 9)} ${P2(r[1], 10)} ${P2(r[2], 14)} BGP session with peer ${r[1]} (AS ${r[3]}) is ${r[4]}\n`); }
    return out + timeFilter;
  }
  if (sub === "check" && obj === "evpn") {
    const leaves = ["leaf01", "leaf02"];
    const l3 = leaves.map(l => SIM.NVUE.val(st.switches[l].applied, ["vrf", "RED", "evpn", "vni"]));
    const l3ok = l3[0] === l3[1];
    const vniOk = leaves.every(l => SIM.NVUE.vnis(st, st.switches[l]).some(v => v.vni === "10010" && SIM.NVUE.remoteVteps(st, st.switches[l], v).length));
    const fails = (l3ok ? 0 : 1) + (vniOk ? 0 : 1);
    let out = `evpn check result summary:\n\nTotal nodes         : 2\nChecked nodes       : 2\nFailed nodes        : ${fails ? 1 : 0}\n\nAdditional summary:\nFailed BGP Sessions : ${Object.values(st.switches).reduce((c, m) => c + SIM.NVUE.bgpNeighbors(st, m).filter(n => n.state !== "Established").length, 0)}\nTotal VNIs          : ${new Set(leaves.flatMap(l => SIM.NVUE.vnis(st, st.switches[l]).map(v => v.vni))).size}\n\nBGP Check Test               : ${Object.values(st.switches).some(m => SIM.NVUE.bgpNeighbors(st, m).some(n => n.state !== "Established")) ? "failed" : "passed"}\nVNI Consistency Test         : ${vniOk ? "passed" : "failed"}\nL3 VNI Consistency Test      : ${l3ok ? "passed" : "failed"}\nVLAN Consistency Test        : passed\nVRF Consistency Test         : passed\n`;
    if (!l3ok) out += `\nL3 VNI Consistency Test details:\nHostname  VRF  L3 VNI  Reason\n--------  ---  ------  --------------------------------------------\nleaf01    RED  ${l3[0]}    VRF RED L3VNI differs across VTEPs (leaf02 uses ${l3[1]})\n`;
    if (!vniOk) out += `\nVNI Consistency Test details:\nHostname  VNI    Reason\n--------  -----  ------------------------------------------\nleaf01    10010  No remote VTEP learned (EVPN session / nve vxlan state)\n`;
    return out + timeFilter;
  }
  if (sub === "check" && obj === "mtu") {
    const issues = [];
    for (const l of SIM.topology.ethLinks) { const [an, ai] = l.a, [bn, bi] = l.b; if (!SIM.isSwitch(an) || !SIM.isSwitch(bn)) continue; const ma = SIM.NVUE.ifaceMtu(st.switches[an], ai), mb = SIM.NVUE.ifaceMtu(st.switches[bn], bi); if (ma !== mb) issues.push([an, ai, ma, bn, bi, mb]); }
    let out = `mtu check result summary:\n\nTotal nodes         : 4\nChecked nodes       : 4\nFailed nodes        : ${issues.length ? 1 : 0}\n\nLink MTU Consistency Test    : ${issues.length ? "failed" : "passed"}\nVLAN interface Test          : passed\nBridge interface Test        : passed\n`;
    if (issues.length) { out += "\nLink MTU Consistency Test details:\nHostname  Interface  MTU   Peer Hostname  Peer Interface  Peer MTU\n--------  ---------  ----  -------------  --------------  --------\n"; issues.forEach(i => out += `${P2(i[0], 9)} ${P2(i[1], 10)} ${P2(i[2], 5)} ${P2(i[3], 14)} ${P2(i[4], 15)} ${i[5]}\n`); }
    return out + timeFilter;
  }
  if (sub === "check" && obj === "interfaces") return "interfaces check result summary:\n\nTotal nodes         : 4\nChecked nodes       : 4\nFailed nodes        : 0\n\nAdmin State Test             : passed\nOper State Test              : passed\nSpeed Test                   : passed\nAutoneg Test                 : passed";
  if (sub === "check" && obj === "roce") { const off = ["leaf01", "leaf02"].filter(l => !SIM.NVUE.roceOn(st.switches[l])); return `roce check result summary:\n\nTotal nodes         : 2\nChecked nodes       : 2\nFailed nodes        : ${off.length}\n\nRoCE mode Test               : ${off.length ? "failed" : "passed"}\nRoCE PFC/ECN Test            : ${off.length ? "failed" : "passed"}\nRoCE Trust Test              : ${off.length ? "failed" : "passed"}\n` + (off.length ? "\nRoCE mode Test details:\nHostname  Reason\n--------  ------------------------------\n" + off.map(l => `${P2(l, 9)} RoCE is not enabled (nv set qos roce enable on)`).join("\n") : ""); }
  if (sub === "check") return "Usage: netq check [bgp|evpn|mtu|interfaces|roce] [around <time>] [between <t1> and <t2>]";
  if (sub === "show" && obj === "events") {
    const ev = SIM.wjhEvents(st).map(e => [e.ts, e.switch, e.severity, "wjh", `${e.type} drop on ${e.port}: ${e.reason} (${e.count} pkts)`]);
    for (const [n, m] of Object.entries(st.switches)) SIM.NVUE.bgpNeighbors(st, m).filter(x => x.state !== "Established").forEach(x => ev.push([new Date(Date.now() - 300000).toTimeString().slice(0, 8), n, "Error", "bgp", `BGP session with peer ${x.ip} ${x.state}: ${x.reason}`]));
    if (st.faults.nicDriverNotReady) ev.push([new Date(Date.now() - 600000).toTimeString().slice(0, 8), "gpu02", "Warning", "agent", "NetQ agent Rotten - host RDMA driver pod restarting (mofed-ubuntu CrashLoopBackOff)"]);
    if (!ev.length) return "No matching event records found" + timeFilter;
    return SIM.table([["Time", "Hostname", "Severity", "Type", "Message"], ...ev]) + timeFilter;
  }
  if (sub === "show" && obj === "wjh-drop") {
    const ev = SIM.wjhEvents(st);
    if (!ev.length) return "No matching wjh records found" + timeFilter;
    if (a[2] === "l1") return "No matching wjh L1 records found";
    return SIM.table([["Hostname", "Ingress Port", "Reason", "Severity", "Agg Count", "Src Ip", "Dst Ip", "Proto/Port", "First Timestamp"], ...ev.map(e => [e.switch, e.port, e.reason, e.severity, String(e.count), e.flow.split(" -> ")[0], e.flow.split(" -> ")[1].split(" ")[0], e.flow.split(" ").slice(2).join(" "), e.ts])]) + timeFilter;
  }
  if (sub === "show" && obj === "bgp") { const rows = [["Hostname", "Neighbor", "VRF", "ASN", "Peer ASN", "PfxRcvd", "State"]]; for (const [n, m] of Object.entries(st.switches)) for (const nb of SIM.NVUE.bgpNeighbors(st, m)) rows.push([n, nb.ip, "default", SIM.NVUE.val(m.applied, ["vrf", "default", "router", "bgp", "autonomous-system"]), nb.remoteAs, nb.state === "Established" ? nb.pfxRx : "-", nb.state]); return SIM.table(rows) + timeFilter; }
  if (sub === "show" && obj === "evpn") { const rows = [["Hostname", "VNI", "VTEP IP", "Type", "In Kernel", "Remote VTEPs"]]; ["leaf01", "leaf02"].forEach(l => SIM.NVUE.vnis(st, st.switches[l]).forEach(v => rows.push([l, v.vni, SIM.NVUE.val(st.switches[l].applied, ["nve", "vxlan", "source", "address"]) || "-", v.type, "yes", SIM.NVUE.remoteVteps(st, st.switches[l], v).join(",") || "-"]))); return SIM.table(rows) + timeFilter; }
  if (sub === "show" && obj === "interfaces" && a.includes("congestion")) return "Hostname  Interface  TC  Queue Occupancy (p99)  ECN Marked  PFC Rx  Microbursts(>80% q)\n--------  ---------  --  ---------------------  ----------  ------  -------------------\n" + (SIM.NVUE.roceOn(st.switches.leaf01) ? "leaf01    swp51      3   1.21 MB                233,901     1,204   14 (avg util only 31%)\nleaf02    swp51      3   0.98 MB                201,114     987     9" : "leaf01    swp51      0   4.10 MB (tail drops)   0           0       41 (lossy: no ECN/PFC)\nleaf02    swp51      0   3.87 MB (tail drops)   0           0       37") + timeFilter;
  if (sub === "show" && obj === "interfaces") return "Hostname  Interface  Type  State  Speed  MTU   Peer\n--------  ---------  ----  -----  -----  ----  ---------------\n" + Object.entries(st.switches).flatMap(([n, m]) => SIM.NVUE.ifaceList(m).filter(i => i.startsWith("swp")).map(i => { const p = SIM.peer(n, i); return `${P2(n, 9)} ${P2(i, 10)} swp   up     ${P2(i.startsWith("swp5") ? "800G" : "400G", 6)} ${P2(SIM.NVUE.ifaceMtu(m, i), 5)} ${p ? p.node + ":" + p.iface : "-"}`; })).join("\n") + timeFilter;
  if (sub === "show" && obj === "roce-counters") return "Hostname  Interface  PFC Rx Pause  PFC Tx Pause  ECN Marked  RoCE Drops\n--------  ---------  ------------  ------------  ----------  ----------\n" + ["leaf01", "leaf02"].map(l => `${P2(l, 9)} swp1       ${SIM.NVUE.roceOn(st.switches[l]) ? "1,204         87            233,901     0" : "0             0             0           4,120  (lossy)"}`).join("\n");
  if (sub === "show" && obj === "inventory") return "Hostname         OS             Platform   ASIC        Agent\n---------------  -------------  ---------  ----------  -----\n" + Object.keys(st.switches).map(n => `${P2(n, 16)} CL 5.16.1      SN5600     Spectrum-4  4.13.0`).join("\n") + "\ngpu01..gpu04     Ubuntu 24.04   DGX H100   -           4.13.0";
  if (sub === "show" && obj === "validation") return "Validation  Last Run        Result\n----------  --------------  --------------------------------\nbgp         now             " + (Object.values(st.switches).some(m => SIM.NVUE.bgpNeighbors(st, m).some(n => n.state !== "Established")) ? "failed" : "passed") + "\nevpn        now             " + (st.faults.l3vniMismatch ? "failed (L3 VNI consistency)" : "passed") + "\nmtu         now             " + (st.faults.mtuMismatch ? "failed" : "passed");
  return "Usage: netq [show agents|version|events|wjh-drop|bgp|evpn|interfaces [congestion]|roce-counters|inventory|validation] | netq check [bgp|evpn|mtu|interfaces|roce]  [around 14:00 | between now and 1h]";
};

OPS.kubectl = function (st, a) {
  const ns = a.includes("-n") ? a[a.indexOf("-n") + 1] : (a.includes("--namespace") ? a[a.indexOf("--namespace") + 1] : "default");
  const [verb, kind, name] = a.filter(x => !x.startsWith("-") && x !== ns);
  const notReady = st.faults.nicDriverNotReady;
  if (verb === "get" && (kind === "pods" || kind === "pod" || kind === "po")) {
    if (ns === "nvidia-network-operator" || a.includes("-A")) {
      const rows = [["NAME", "READY", "STATUS", "RESTARTS", "AGE"],
        ["network-operator-7d9c5c6b8f-k2x9p", "1/1", "Running", "0", "3d"],
        ["mofed-ubuntu24.04-ds-gpu01-7hq2m", "1/1", "Running", "0", "3d"],
        ["mofed-ubuntu24.04-ds-gpu02-p9z1c", notReady ? "0/1" : "1/1", notReady ? "CrashLoopBackOff" : "Running", notReady ? "14" : "0", "3d"],
        ["rdma-shared-dp-ds-5xk2w", "1/1", "Running", "0", "3d"],
        ["rdma-shared-dp-ds-8jq7n", notReady ? "0/1" : "1/1", notReady ? "Init:0/1" : "Running", "0", "3d"],
        ["kube-multus-ds-amd64-bb6zq", "1/1", "Running", "0", "3d"],
        ["kube-multus-ds-amd64-wl3fk", "1/1", "Running", "0", "3d"],
        ["whereabouts-tplln", "1/1", "Running", "0", "3d"],
        ["whereabouts-x8p6c", "1/1", "Running", "0", "3d"],
        ["nv-ipam-controller-6f7bd6b7c9-q9t4r", "1/1", "Running", "0", "3d"]];
      return SIM.table(rows);
    }
    return SIM.table([["NAME", "READY", "STATUS", "RESTARTS", "AGE"], ["rdma-test", "1/1", "Running", "0", "2m"], ["nccl-test-launcher-0", "1/1", "Running", "0", "1h"]]);
  }
  if (verb === "get" && /^nicclusterpolic/.test(kind || "")) {
    const yaml = a.includes("-o") && a[a.indexOf("-o") + 1] === "yaml";
    if (yaml) return `apiVersion: mellanox.com/v1alpha1\nkind: NicClusterPolicy\nmetadata:\n  name: nic-cluster-policy\nspec:\n  ofedDriver:\n    image: doca-driver\n    repository: nvcr.io/nvidia/mellanox\n    version: 25.04-0.6.1.0-2\n  rdmaSharedDevicePlugin:\n    image: k8s-rdma-shared-dev-plugin\n    repository: ghcr.io/mellanox\n    version: v1.5.2\n    config: |\n      {\n        "configList": [{\n          "resourceName": "rdma_shared_device_a",\n          "rdmaHcaMax": 63,\n          "selectors": { "ifNames": ["ib0", "eth1"] }\n        }]\n      }\n  secondaryNetwork:\n    cniPlugins: {}\n    multus: {}\n    ipamPlugin: {}\n  nvIpam: {}\nstatus:\n  state: ${notReady ? "notReady" : "ready"}\n  appliedStates:\n  - name: state-OFED\n    state: ${notReady ? "notReady" : "ready"}${notReady ? "\n    message: DaemonSet mofed-ubuntu24.04-ds not ready on node gpu02 (CrashLoopBackOff) - check kubectl logs / kernel-driver compatibility" : ""}\n  - name: state-RDMA-device-plugin\n    state: ${notReady ? "notReady" : "ready"}\n  - name: state-Multus\n    state: ready\n  - name: state-whereabouts\n    state: ready\n  - name: state-NV-IPAM\n    state: ready`;
    return `NAME                 STATUS      AGE\nnic-cluster-policy   ${notReady ? "notReady" : "ready"}       3d`;
  }
  if (verb === "get" && /^(network-attachment-definitions?|net-attach-def|nad)$/.test(kind || "")) return "NAME       AGE\nroce-net   3d\nib-net     3d";
  if (verb === "get" && /^(macvlannetwork|ipoibnetwork|hostdevicenetwork)s?$/.test(kind || "")) return `NAME       STATUS   AGE\n${kind.startsWith("ipoib") ? "ib-net" : "roce-net"}   ready    3d`;
  if (verb === "get" && kind === "nodes") return "NAME     STATUS   ROLES           AGE   VERSION\ngpu01    Ready    worker          30d   v1.31.2\ngpu02    Ready    worker          30d   v1.31.2\ngpu03    Ready    worker          30d   v1.31.2\ngpu04    Ready    worker          30d   v1.31.2\nk8s-cp   Ready    control-plane   30d   v1.31.2";
  if (verb === "describe" && (kind === "node" || kind === "nodes")) {
    const n = name || "gpu01";
    const rdma = notReady && n === "gpu02" ? "0" : "63";
    return `Name:               ${n}\nRoles:              worker\nLabels:             feature.node.kubernetes.io/pci-15b3.present=true\n                    network.nvidia.com/operator.mofed.wait=false\nCapacity:\n  cpu:                           96\n  memory:                        2063592Ki\n  nvidia.com/gpu:                8\n  rdma/rdma_shared_device_a:     ${rdma}\nAllocatable:\n  cpu:                           95\n  nvidia.com/gpu:                8\n  rdma/rdma_shared_device_a:     ${rdma}\nAllocated resources:\n  Resource                   Requests  Limits\n  nvidia.com/gpu             1         1\n  rdma/rdma_shared_device_a  1         1`;
  }
  if (verb === "describe" && kind === "pod") return `Name:         ${name || "rdma-test"}\nNamespace:    default\nNode:         gpu01\nAnnotations:  k8s.v1.cni.cncf.io/networks: roce-net\n              k8s.v1.cni.cncf.io/network-status: [{"name":"default/roce-net","interface":"net1","ips":["192.168.1.101"]}]\nContainers:\n  rdma:\n    Limits:\n      nvidia.com/gpu:             1\n      rdma/rdma_shared_device_a:  1\n    Requests:\n      nvidia.com/gpu:             1\n      rdma/rdma_shared_device_a:  1\nEvents:\n  Normal  Scheduled  Successfully assigned default/rdma-test to gpu01\n  Normal  AddedInterface  Add net1 [192.168.1.101/24] from default/roce-net`;
  if (verb === "logs") return notReady && ((name || "") + (kind || "")).includes("gpu02") ? "+ Installing DOCA/OFED driver for kernel 6.8.0-45-generic\nERROR: kernel module mlx5_core failed to load: version mismatch (driver built for 6.8.0-41-generic)\nFailed to start driver container - retrying" : "Driver container ready: mlx5_core 25.04-0.6.1.0 loaded\nRDMA device plugin registered resource rdma/rdma_shared_device_a (63 units)";
  if (verb === "apply" || verb === "create") { const f = a[a.indexOf("-f") + 1]; if (f && f.includes("rdma-pod")) return "pod/rdma-test created"; return `${f || "resource"} applied`; }
  if (verb === "exec") return "$ ibv_devinfo (inside pod)\nhca_id: mlx5_0\n        link_layer: InfiniBand\n        state: PORT_ACTIVE (4)\n(pod sees the RDMA device via rdma/rdma_shared_device_a)";
  return "Usage: kubectl get pods -n nvidia-network-operator | get nicclusterpolicy [-o yaml] | describe node gpu01 | get network-attachment-definitions | apply -f k8s/rdma-pod.yaml | describe pod rdma-test | logs <pod> -n nvidia-network-operator";
};

OPS.helm = function (st, a) {
  if (a[0] === "list" || a[0] === "ls") return "NAME              NAMESPACE                 REVISION  STATUS    CHART                     APP VERSION\nnetwork-operator  nvidia-network-operator   1         deployed  network-operator-25.4.0   v25.4.0\ngpu-operator      gpu-operator              1         deployed  gpu-operator-v25.3.0      v25.3.0";
  if (a[0] === "repo") return "\"nvidia\" has been added to your repositories\nUpdate Complete. ⎈Happy Helming!⎈";
  if (a[0] === "install" || a[0] === "upgrade") return `Release "network-operator" ${a[0] === "install" ? "has been installed" : "has been upgraded"}. Happy Helming!\nNAMESPACE: nvidia-network-operator\nNOTES: Get the status with: kubectl -n nvidia-network-operator get pods ; kubectl get nicclusterpolicy`;
  return "Usage: helm repo add nvidia https://helm.ngc.nvidia.com/nvidia | helm install network-operator nvidia/network-operator -n nvidia-network-operator --create-namespace | helm list -A";
};

OPS.ansible = function (st, cmd, a) {
  if (cmd === "ansible-galaxy") return a.includes("nvidia.nvue") ? "Starting galaxy collection install process\nInstalling 'nvidia.nvue:1.0.4' to '/home/ubuntu/.ansible/collections/ansible_collections/nvidia/nvue'\nnvidia.nvue:1.0.4 was installed successfully" : "Usage: ansible-galaxy collection install nvidia.nvue";
  if (cmd === "ansible-inventory") return "@all:\n  |--@cumulus:\n  |  |--@leaf:\n  |  |  |--leaf01\n  |  |  |--leaf02\n  |  |--@spine:\n  |  |  |--spine01\n  |  |  |--spine02\n  |--@ungrouped:";
  if (cmd === "ansible-playbook") {
    const pb = a.find(x => x.endsWith(".yml") || x.endsWith(".yaml"));
    if (!pb) return "Usage: ansible-playbook -i inventory.ini <playbook.yml> [--limit <group|host>] [--check] [--diff]";
    const path = "/home/ubuntu/ansible/" + pb.replace(/^.*\//, "");
    const text = st.files[path]; if (!text) return `ERROR! the playbook: ${pb} could not be found`;
    const hostsLine = (text.match(/hosts:\s*(\S+)/) || [])[1] || "all";
    const groups = { all: ["spine01", "spine02", "leaf01", "leaf02"], cumulus: ["spine01", "spine02", "leaf01", "leaf02"], leaf: ["leaf01", "leaf02"], spine: ["spine01", "spine02"] };
    let targets = groups[hostsLine] || (groups.all.includes(hostsLine) ? [hostsLine] : []);
    if (a.includes("--limit") || a.includes("-l")) { const lim = a[a.indexOf(a.includes("--limit") ? "--limit" : "-l") + 1]; const l = groups[lim] || [lim]; targets = targets.filter(t => l.includes(t)); }
    const check = a.includes("--check");
    const vars = {}; const gv = st.files["/home/ubuntu/ansible/group_vars/leaf.yml"] || ""; gv.split("\n").forEach(l => { const m = l.match(/^(\w+):\s*(\S+)/); if (m) vars[m[1]] = m[2]; });
    const out = [`\nPLAY [${(text.match(/- name:\s*(.*)/) || [])[1] || pb}] ${"*".repeat(50)}`];
    const tasks = [...text.matchAll(/^\s+- name:\s*(.*)$/gm)].map(m => m[1].replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] || `{{ ${k} }}`));
    tasks.forEach(t => { out.push(`\nTASK [${t}] ${"*".repeat(50)}`); targets.forEach(h => { const isLeaf = h.startsWith("leaf"); const missing = /tenant_vlan|roce_mode/.test(text) && !isLeaf; out.push(missing ? `fatal: [${h}]: FAILED! => {"msg": "The task includes an option with an undefined variable. The error was: 'tenant_vlan' is undefined (defined only in group_vars/leaf.yml)"}` : `${check ? "changed (check mode)" : "changed"}: [${h}]`); }); });
    if (!check) targets.forEach(h => { const m = st.switches[h]; if (!m) return; if (pb.includes("roce") && h.startsWith("leaf")) { SIM.NVUE.setPath(m.applied, ["qos", "roce", "enable", "on"]); SIM.NVUE.setPath(m.applied, ["qos", "roce", "mode", vars.roce_mode || "lossless"]); } if (pb.includes("vlan") && h.startsWith("leaf")) { SIM.NVUE.setPath(m.applied, ["bridge", "domain", "br_default", "vlan", vars.tenant_vlan || "30", "vni", vars.tenant_vni || "10030"]); } m.pending = SIM.NVUE.clone(m.applied); m.revisions.push({ id: m.nextRev++, ts: SIM.NVUE.now(), user: "ansible", note: `playbook ${pb}`, config: SIM.NVUE.clone(m.applied) }); m.saved = false; });
    out.push(`\nPLAY RECAP ${"*".repeat(60)}`);
    targets.forEach(h => { const failed = /tenant_vlan|roce_mode/.test(text) && !h.startsWith("leaf"); out.push(`${P2(h, 10)}: ok=${failed ? 0 : tasks.length}  changed=${failed ? 0 : tasks.length}  unreachable=0  failed=${failed ? 1 : 0}  skipped=0`); });
    if (!targets.length) out.push("[WARNING]: Could not match supplied host pattern - no hosts matched");
    return out.join("\n");
  }
  return "";
};

// Cumulus native Linux commands on switches --------------------------------------
OPS.clResourceQuery = function (st, m) {
  const vnis = SIM.NVUE.vnis(st, m).length;
  const routes = 12 + Object.values(st.switches).length * 3;
  return [
    `Host entries:                      14,    0% of maximum value    65536`,
    `IPv4 neighbors:                    14`,
    `IPv6 neighbors:                     0`,
    `Total Routes:                      ${routes},    0% of maximum value    98304`,
    `IPv4 Routes:                       ${routes}`,
    `IPv6 Routes:                        0`,
    `Total Mcast Routes:                 0,    0% of maximum value     8192`,
    `ECMP nexthops:                      6,    0% of maximum value     4096`,
    `MAC entries:                     ${m.name.startsWith("leaf") ? "38912" : "   24"},   ${m.name.startsWith("leaf") ? "95" : " 0"}% of maximum value    40960${m.name.startsWith("leaf") ? "   # <-- near exhaustion: new FDB entries fail" : ""}`,
    `Ingress ACL entries:              312,    6% of maximum value     5120`,
    `Egress ACL entries:                 0,    0% of maximum value      512`,
    `L2 VXLAN tunnels (VNIs):            ${vnis},    0% of maximum value     2048`,
    `Layer 3 VNIs:                       ${SIM.NVUE.vnis(st, m).filter(v => v.type === "L3").length}`,
    `Forwarding table profile:        default  (alternatives: l2-heavy, l3-heavy, ipmc-heavy, rash-v4-max, rash-v6-max, lpm-balanced)`,
    `  # nv set system forwarding profile l2-heavy  -> more MAC capacity, fewer routes (check route usage first)`
  ].join("\n");
};

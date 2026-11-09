// ---------------------------------------------------------------------------
// Virtual lab: topology, per-node state and fault injection.
// Everything the CLI simulator shows is derived from this state, so a change
// (nv config apply, systemctl restart opensm, ...) is visible in later shows.
// ---------------------------------------------------------------------------
window.SIM = window.SIM || {};

SIM.topology = {
  // Ethernet (Spectrum-X) side ------------------------------------------------
  // spine01/spine02 = SN5600 (AS 65100). leaf01 (AS 65101), leaf02 (AS 65102).
  // leaf swp1 -> gpu0X eth1 (RoCE data). swp51 -> spine01, swp52 -> spine02.
  ethLinks: [
    { a: ["spine01", "swp1"], b: ["leaf01", "swp51"] },
    { a: ["spine01", "swp2"], b: ["leaf02", "swp51"] },
    { a: ["spine02", "swp1"], b: ["leaf01", "swp52"] },
    { a: ["spine02", "swp2"], b: ["leaf02", "swp52"] },
    { a: ["leaf01", "swp1"], b: ["gpu01", "eth1"] },
    { a: ["leaf01", "swp2"], b: ["gpu03", "eth1"] },
    { a: ["leaf02", "swp1"], b: ["gpu02", "eth1"] },
    { a: ["leaf02", "swp2"], b: ["gpu04", "eth1"] }
  ],
  // InfiniBand side (NDR 400G, Quantum-2 QM9700) --------------------------------
  // LIDs are assigned by the SM (gpu01 runs opensm). Switch LIDs 4,5,6.
  ibNodes: {
    gpu01: { type: "ca", lid: 1, guid: "0xb83fd20300a1c001", portguid: "0xb83fd20300a1c002", dev: "mlx5_0" },
    gpu02: { type: "ca", lid: 3, guid: "0xb83fd20300a1c011", portguid: "0xb83fd20300a1c012", dev: "mlx5_0" },
    gpu03: { type: "ca", lid: 7, guid: "0xb83fd20300a1c021", portguid: "0xb83fd20300a1c022", dev: "mlx5_0" },
    gpu04: { type: "ca", lid: 8, guid: "0xb83fd20300a1c031", portguid: "0xb83fd20300a1c032", dev: "mlx5_0" },
    "ibsw-leaf01": { type: "sw", lid: 4, guid: "0x900a84030071a001", model: "MQM9700" },
    "ibsw-leaf02": { type: "sw", lid: 6, guid: "0x900a84030071a002", model: "MQM9700" },
    "ibsw-spine01": { type: "sw", lid: 5, guid: "0x900a84030071a003", model: "MQM9700" }
  },
  ibLinks: [
    { a: ["ibsw-leaf01", 1], b: ["gpu01", 1] },
    { a: ["ibsw-leaf01", 2], b: ["gpu03", 1] },
    { a: ["ibsw-leaf02", 1], b: ["gpu02", 1] },
    { a: ["ibsw-leaf02", 2], b: ["gpu04", 1] },
    { a: ["ibsw-leaf01", 33], b: ["ibsw-spine01", 1] },
    { a: ["ibsw-leaf02", 33], b: ["ibsw-spine01", 2] }
  ],
  hosts: {
    gpu01: { mgmt: "192.168.200.11", data: "192.168.1.1/24", gw: "192.168.1.254", gpus: 8, rail: "leaf01" },
    gpu02: { mgmt: "192.168.200.12", data: "192.168.1.2/24", gw: "192.168.1.254", gpus: 8, rail: "leaf02" },
    gpu03: { mgmt: "192.168.200.13", data: "192.168.1.3/24", gw: "192.168.1.254", gpus: 8, rail: "leaf01" },
    gpu04: { mgmt: "192.168.200.14", data: "192.168.1.4/24", gw: "192.168.1.254", gpus: 8, rail: "leaf02" },
    "oob-mgmt-server": { mgmt: "192.168.200.1" },
    "ufm-server": { mgmt: "192.168.200.5" }
  },
  switches: {
    spine01: { model: "SN5600", mgmt: "192.168.200.21", asn: 65100, lo: "10.10.10.101" },
    spine02: { model: "SN5600", mgmt: "192.168.200.22", asn: 65100, lo: "10.10.10.102" },
    leaf01: { model: "SN5600", mgmt: "192.168.200.31", asn: 65101, lo: "10.10.10.1" },
    leaf02: { model: "SN5600", mgmt: "192.168.200.32", asn: 65102, lo: "10.10.10.2" }
  }
};

// Baseline (golden) NVUE configuration per switch, written as `nv set` lines.
// The lab loads these into the APPLIED tree so the fabric starts "working".
SIM.baseline = {
  spine01: [
    "system hostname spine01",
    "interface lo ip address 10.10.10.101/32",
    "interface swp1,swp2 link mtu 9216",
    "interface swp1 ip address 10.0.1.0/31",
    "interface swp2 ip address 10.0.1.2/31",
    "vrf default router bgp autonomous-system 65100",
    "vrf default router bgp router-id 10.10.10.101",
    "vrf default router bgp neighbor 10.0.1.1 remote-as 65101",
    "vrf default router bgp neighbor 10.0.1.3 remote-as 65102",
    "vrf default router bgp address-family ipv4-unicast redistribute connected",
    "vrf default router bgp address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.1.1 address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.1.3 address-family l2vpn-evpn state enabled",
    "router adaptive-routing enable on"
  ],
  spine02: [
    "system hostname spine02",
    "interface lo ip address 10.10.10.102/32",
    "interface swp1,swp2 link mtu 9216",
    "interface swp1 ip address 10.0.2.0/31",
    "interface swp2 ip address 10.0.2.2/31",
    "vrf default router bgp autonomous-system 65100",
    "vrf default router bgp router-id 10.10.10.102",
    "vrf default router bgp neighbor 10.0.2.1 remote-as 65101",
    "vrf default router bgp neighbor 10.0.2.3 remote-as 65102",
    "vrf default router bgp address-family ipv4-unicast redistribute connected",
    "vrf default router bgp address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.2.1 address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.2.3 address-family l2vpn-evpn state enabled",
    "router adaptive-routing enable on"
  ],
  leaf01: [
    "system hostname leaf01",
    "interface lo ip address 10.10.10.1/32",
    "interface swp1,swp2,swp51,swp52 link mtu 9216",
    "interface swp51 ip address 10.0.1.1/31",
    "interface swp52 ip address 10.0.2.1/31",
    "interface swp1,swp2 bridge domain br_default access 10",
    "bridge domain br_default vlan 10 vni 10010",
    "nve vxlan state enabled",
    "nve vxlan source address 10.10.10.1",
    "interface vlan10 ip address 192.168.1.252/24",
    "interface vlan10 ipv4 vrr address 192.168.1.254/24",
    "interface vlan10 ipv4 vrr state enabled",
    "interface vlan10 vrf RED",
    "vrf RED table auto",
    "vrf RED evpn vni 4001",
    "evpn state enabled",
    "evpn vni 10010 route-advertise svi-ip enabled",
    "vrf default router bgp autonomous-system 65101",
    "vrf default router bgp router-id 10.10.10.1",
    "vrf default router bgp neighbor 10.0.1.0 remote-as 65100",
    "vrf default router bgp neighbor 10.0.2.0 remote-as 65100",
    "vrf default router bgp address-family ipv4-unicast redistribute connected",
    "vrf default router bgp address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.1.0 address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.2.0 address-family l2vpn-evpn state enabled",
    "router adaptive-routing enable on"
  ],
  leaf02: [
    "system hostname leaf02",
    "interface lo ip address 10.10.10.2/32",
    "interface swp1,swp2,swp51,swp52 link mtu 9216",
    "interface swp51 ip address 10.0.1.3/31",
    "interface swp52 ip address 10.0.2.3/31",
    "interface swp1,swp2 bridge domain br_default access 10",
    "bridge domain br_default vlan 10 vni 10010",
    "nve vxlan state enabled",
    "nve vxlan source address 10.10.10.2",
    "interface vlan10 ip address 192.168.1.253/24",
    "interface vlan10 ipv4 vrr address 192.168.1.254/24",
    "interface vlan10 ipv4 vrr state enabled",
    "interface vlan10 vrf RED",
    "vrf RED table auto",
    "vrf RED evpn vni 4001",
    "evpn state enabled",
    "evpn vni 10010 route-advertise svi-ip enabled",
    "vrf default router bgp autonomous-system 65102",
    "vrf default router bgp router-id 10.10.10.2",
    "vrf default router bgp neighbor 10.0.1.2 remote-as 65100",
    "vrf default router bgp neighbor 10.0.2.2 remote-as 65100",
    "vrf default router bgp address-family ipv4-unicast redistribute connected",
    "vrf default router bgp address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.1.2 address-family l2vpn-evpn state enabled",
    "vrf default router bgp neighbor 10.0.2.2 address-family l2vpn-evpn state enabled",
    "router adaptive-routing enable on"
  ]
};

// Files visible with cat/grep on the Linux hosts.
SIM.files = {
  "/etc/opensm/opensm.conf": [
    "# OpenSM configuration (gpu01 runs the master SM for the lab fabric)",
    "guid 0x0000000000000000",
    "sm_priority 14",
    "lmc 0",
    "routing_engine minhop",
    "root_guid_file /etc/opensm/root_guid.conf",
    "adaptive_routing_enable FALSE",
    "partition_config_file /etc/opensm/partitions.conf",
    "qos FALSE",
    "qos_max_vls 8",
    "qos_sl2vl 0,1,2,3,4,5,6,7,7,7,7,7,7,7,7,15",
    "qos_vlarb_high 0:100,1:50,2:20,3:10",
    "qos_policy_file /etc/opensm/qos-policy.conf"
  ].join("\n"),
  "/etc/opensm/partitions.conf": [
    "# PKey  : members (port GUIDs)   full | limited",
    "Default=0x7fff, ipoib : ALL=full;"
  ].join("\n"),
  "/etc/opensm/root_guid.conf": "0x900a84030071a003   # ibsw-spine01\n",
  "/etc/opensm/qos-policy.conf": [
    "port-groups",
    "    port-group",
    "        name: GPU-Tenant",
    "        port-guid: 0xb83fd20300a1c002",
    "        port-guid: 0xb83fd20300a1c012",
    "    end-port-group",
    "end-port-groups",
    "qos-levels",
    "    qos-level",
    "        name: GPU-Level",
    "        sl: 1",
    "    end-qos-level",
    "end-qos-levels",
    "qos-match-rules",
    "    qos-match-rule",
    "        source: GPU-Tenant",
    "        destination: GPU-Tenant",
    "        qos-level-name: GPU-Level",
    "    end-qos-match-rule",
    "end-qos-match-rules"
  ].join("\n"),
  "/etc/nccl.conf": "NCCL_IB_HCA=mlx5_0\nNCCL_SOCKET_IFNAME=eth0\n",
  "/home/cumulus/vlan20.yaml": [
    "- set:",
    "    bridge:",
    "      domain:",
    "        br_default:",
    "          vlan:",
    "            '20':",
    "              vni:",
    "                '10020': {}",
    "    interface:",
    "      swp2:",
    "        bridge:",
    "          domain:",
    "            br_default:",
    "              access: 20"
  ].join("\n"),
  "/home/ubuntu/ansible/inventory.ini": [
    "[spine]",
    "spine01 ansible_host=192.168.200.21",
    "spine02 ansible_host=192.168.200.22",
    "",
    "[leaf]",
    "leaf01 ansible_host=192.168.200.31",
    "leaf02 ansible_host=192.168.200.32",
    "",
    "[cumulus:children]",
    "spine",
    "leaf",
    "",
    "[cumulus:vars]",
    "ansible_user=cumulus",
    "ansible_connection=httpapi",
    "ansible_network_os=nvidia.nvue.httpapi"
  ].join("\n"),
  "/home/ubuntu/ansible/group_vars/leaf.yml": [
    "# Shared by every switch in the [leaf] group",
    "tenant_vlan: 30",
    "tenant_vni: 10030",
    "roce_mode: lossless"
  ].join("\n"),
  "/home/ubuntu/ansible/host_vars/leaf01.yml": "loopback: 10.10.10.1/32\n",
  "/home/ubuntu/ansible/host_vars/leaf02.yml": "loopback: 10.10.10.2/32\n",
  "/home/ubuntu/ansible/roce.yml": [
    "---",
    "- name: Enable lossless RoCE on the leaf switches",
    "  hosts: leaf",
    "  gather_facts: false",
    "  tasks:",
    "    - name: Set RoCE profile",
    "      nvidia.nvue.config:",
    "        state: merged",
    "        data:",
    "          - set:",
    "              qos:",
    "                roce:",
    "                  enable: on",
    "                  mode: \"{{ roce_mode }}\"",
    "    - name: Apply the pending revision",
    "      nvidia.nvue.config:",
    "        state: apply"
  ].join("\n"),
  "/home/ubuntu/ansible/vlan.yml": [
    "---",
    "- name: Create the tenant VLAN on all switches",
    "  hosts: all",
    "  gather_facts: false",
    "  tasks:",
    "    - name: Add VLAN {{ tenant_vlan }} to br_default",
    "      nvidia.nvue.config:",
    "        state: merged",
    "        data:",
    "          - set:",
    "              bridge:",
    "                domain:",
    "                  br_default:",
    "                    vlan:",
    "                      \"{{ tenant_vlan }}\":",
    "                        vni:",
    "                          \"{{ tenant_vni }}\": {}"
  ].join("\n"),
  "/home/ubuntu/k8s/rdma-pod.yaml": [
    "apiVersion: v1",
    "kind: Pod",
    "metadata:",
    "  name: rdma-test",
    "  annotations:",
    "    k8s.v1.cni.cncf.io/networks: roce-net",
    "spec:",
    "  containers:",
    "  - name: rdma",
    "    image: nvcr.io/nvidia/doca/doca:2.9.0-base-rt-host",
    "    command: [\"sleep\", \"infinity\"]",
    "    securityContext:",
    "      capabilities:",
    "        add: [\"IPC_LOCK\"]",
    "    resources:",
    "      limits:",
    "        rdma/rdma_shared_device_a: 1",
    "        nvidia.com/gpu: 1"
  ].join("\n")
};

// ----------------------------------------------------------------------------
// State factory. Faults are flags consumed by the command renderers.
// ----------------------------------------------------------------------------
SIM.newState = function (opts) {
  opts = opts || {};
  const st = {
    node: opts.startNode || "oob-mgmt-server",
    history: [],              // every command typed (for lab checkers)
    cmdLog: [],               // {node, cmd}
    switches: {},             // name -> NVUE model (filled by nvue.js)
    files: JSON.parse(JSON.stringify(SIM.files)),
    sm: {
      running: true, master: "gpu01", priority: 14, lmc: 0,
      routing_engine: "minhop", adaptive_routing: false, qos: false,
      partitions: [{ name: "Default", pkey: "0x7fff", ipoib: true, members: { ALL: "full" } }]
    },
    faults: Object.assign({
      smDown: false,          // opensm stopped on gpu01 -> ports INIT, SM lid 0
      badCable: false,        // ibsw-leaf02 port 2 <-> gpu04: symbol errors, negotiated down
      bgpAsn: false,          // leaf02 neighbor 10.0.1.2 remote-as wrong -> Idle
      mtuMismatch: false,     // leaf01 swp51 mtu 1500 -> WJH MTU drops
      l3vniMismatch: false,   // leaf02 vrf RED evpn vni 4002
      roceOff: true,          // RoCE disabled on the leaves (default lab state)
      dpuNicMode: false,      // gpu01 BlueField in NIC mode
      nicDriverNotReady: false// Network Operator OFED driver pod CrashLoop on gpu02
    }, opts.faults || {}),
    counters: { perfReads: 0, symbolErrors: 0 },
    k8s: { nicPolicyReady: true },
    dpuMode: 1
  };
  if (st.faults.smDown) st.sm.running = false;
  if (st.faults.nicDriverNotReady) st.k8s.nicPolicyReady = false;
  if (st.faults.dpuNicMode) st.dpuMode = 0;
  return st;
};

// Helpers used by several modules -------------------------------------------
SIM.peer = function (node, iface) {
  for (const l of SIM.topology.ethLinks) {
    if (l.a[0] === node && l.a[1] === iface) return { node: l.b[0], iface: l.b[1] };
    if (l.b[0] === node && l.b[1] === iface) return { node: l.a[0], iface: l.a[1] };
  }
  return null;
};
SIM.ibPeer = function (node, port) {
  for (const l of SIM.topology.ibLinks) {
    if (l.a[0] === node && l.a[1] === port) return { node: l.b[0], port: l.b[1] };
    if (l.b[0] === node && l.b[1] === port) return { node: l.a[0], port: l.a[1] };
  }
  return null;
};
SIM.ibByLid = function (lid) {
  for (const [n, v] of Object.entries(SIM.topology.ibNodes)) if (v.lid === Number(lid)) return Object.assign({ name: n }, v);
  return null;
};
SIM.isSwitch = n => !!SIM.topology.switches[n];
SIM.isGpuHost = n => /^gpu0\d$/.test(n);
SIM.expandRange = function (tok) {
  // swp1-4,swp51 -> [swp1,swp2,swp3,swp4,swp51]
  const out = [];
  tok.split(",").forEach(part => {
    const m = part.match(/^([a-z]+)(\d+)-(\d+)$/);
    if (m) { for (let i = +m[2]; i <= +m[3]; i++) out.push(m[1] + i); }
    else out.push(part);
  });
  return out;
};
SIM.pad = (s, n) => (s + "").padEnd(n);

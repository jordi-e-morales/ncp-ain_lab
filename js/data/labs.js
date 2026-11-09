// Guided labs. Each lab builds a fresh session (with faults), lists tasks and
// verifies them against the live state or against the command log.
//   check(st) -> true when done.   `ran(st, regex)` = a command matching regex was typed.
window.NCP_LABS = [];
const ran = (st, re, node) => st.cmdLog.some(c => re.test(c.cmd) && (!node || c.node === node));
const applied = (st, sw, toks) => !!SIM.NVUE.get(st.switches[sw].applied, toks);
const val = (st, sw, toks) => SIM.NVUE.val(st.switches[sw].applied, toks);

NCP_LABS.push(
  // ------------------------------------------------------------------ InfiniBand
  {
    id: "ib-linkup", domain: "ib", title: "Prove the link is up and find the master SM", minutes: 8,
    brief: "You just cabled gpu01. Prove layer 1 and the control plane are healthy before anyone blames the fabric.",
    start: "gpu01",
    tasks: [
      { text: "Read State, Physical state, Rate and SM lid of mlx5_0 with ibstat", check: st => ran(st, /^ibstat/, "gpu01") },
      { text: "Find the LID of the master Subnet Manager (sminfo)", check: st => ran(st, /^sminfo/) },
      { text: "Resolve that LID to a node name (smpquery ND <lid>)", check: st => ran(st, /^smpquery\s+ND\s+1\b/i) },
      { text: "List every HCA and every switch (ibhosts, ibswitches or ibnodes)", check: st => ran(st, /^(ibhosts|ibnodes)/) && ran(st, /^(ibswitches|ibnodes)/) }
    ],
    question: { text: "Which node runs the master SM and what is its priority?", answer: /gpu01.*14|14.*gpu01/i, hint: "sminfo prints 'priority N'; smpquery ND turns the SM LID into a name." },
    teach: "Four fields of ibstat answer most L1 tickets: State (Active), Physical state (LinkUp), Rate (400 = NDR) and SM lid (0 = nobody is managing the fabric). sminfo → smpquery ND is the exam's two-step for 'who is the master SM'."
  },
  {
    id: "ib-nosm", domain: "ib", title: "Ports stuck in INIT: no Subnet Manager", minutes: 8,
    brief: "Users report the InfiniBand fabric is dead on every node at once. Physical links are up. Find the cause and fix it.",
    start: "gpu01", faults: { smDown: true },
    tasks: [
      { text: "Confirm the symptom: ibstat shows State Initializing and SM lid 0", check: st => ran(st, /^ibstat/) },
      { text: "Prove no SM answers (sminfo fails)", check: st => ran(st, /^sminfo/) },
      { text: "Check the service on the SM host (systemctl status opensm)", check: st => ran(st, /systemctl\s+status\s+opensm/) },
      { text: "Start the SM and re-verify (ports go Active, LIDs assigned)", check: st => st.sm.running && ran(st, /systemctl\s+(start|restart)\s+opensm/) && st.cmdLog.filter(c => /^ibstat/.test(c.cmd)).length >= 2 }
    ],
    teach: "INIT (Initializing) means the physical link trained but no SM has configured the port: no LID, no LFT entries. A fabric-wide INIT is always the SM, never the cables. The SM speaks MADs on VL15, so it must sit inside the fabric (host with HCA, managed switch or UFM)."
  },
  {
    id: "ib-inventory", domain: "ib", title: "Fabric inventory and path tracing", minutes: 10,
    brief: "Two new servers were racked. Map the fabric, check every link negotiated at NDR and trace a cross-leaf path.",
    start: "gpu01",
    tasks: [
      { text: "Full topology scan (ibnetdiscover)", check: st => ran(st, /^ibnetdiscover/) },
      { text: "Link-by-link rate check for the whole subnet (iblinkinfo)", check: st => ran(st, /^iblinkinfo/) },
      { text: "Trace the path from gpu01 (LID 1) to gpu02 (LID 3): ibtracert 1 3", check: st => ran(st, /^ibtracert\s+1\s+3/) },
      { text: "Dump the forwarding table of the spine (ibroute 5)", check: st => ran(st, /^ibroute\s+5/) },
      { text: "Run the one-shot health report with counters (ibdiagnet --pc --pm)", check: st => ran(st, /^ibdiagnet.*--pm/) }
    ],
    question: { text: "How many switch hops does traffic from LID 1 to LID 3 cross?", answer: /^\s*(3|three)\s*$/i, hint: "leaf01 → spine01 → leaf02: the two hosts sit under different leaves." },
    teach: "iblinkinfo is the node-by-node link report for the whole subnet (width, speed, state per port). ibtracert follows the LFTs hop by hop; ibroute shows the table a single switch uses. ibdiagnet --pc --pm clears and then reads port counters so the report shows fresh errors, not lifetime totals."
  },
  {
    id: "ib-pkey", domain: "ib", title: "Create a tenant partition (PKey) with full and limited members", minutes: 12,
    brief: "Tenant AI needs partition 0x1234: gpu01 (storage role) full member, gpu02 limited. Prove the PKey tables were pushed.",
    start: "gpu01",
    tasks: [
      { text: "Collect the Port GUIDs (ibstat / ibhosts)", check: st => ran(st, /^(ibstat|ibhosts|ibnodes)/) },
      { text: "Append the partition to /etc/opensm/partitions.conf (echo ... | sudo tee -a, or echo >>)", check: st => /0x1234/i.test(st.files["/etc/opensm/partitions.conf"]) && /0xb83fd20300a1c002\s*=\s*full/i.test(st.files["/etc/opensm/partitions.conf"]) && /0xb83fd20300a1c012\s*=\s*limited/i.test(st.files["/etc/opensm/partitions.conf"]) },
      { text: "Make the SM re-read it (systemctl restart opensm or kill -HUP)", check: st => st.sm.partitions.some(p => p.pkey === "0x1234") },
      { text: "Read the PKey table back on gpu02 (smpquery PKeys 3 1)", check: st => ran(st, /^smpquery\s+PKeys\s+3/i) }
    ],
    question: { text: "What PKey value does gpu02 see for this partition (hex, 4 digits)?", answer: /0x1234|^1234$/i, hint: "Limited members see bit 15 clear: 0x1234. Full members see 0x9234 (0x1234 | 0x8000)." },
    teach: "Membership is per PORT GUID, not node name or LID. Full members talk to everyone in the partition; limited members only talk to full members (limited↔limited is dropped by the HCA). If a server moves to its second port, the partition must list the new port's GUID. The SM distributes tables; the HCA enforces them in hardware."
  },
  {
    id: "ib-routing", domain: "ib", title: "Switch to fat-tree routing with LMC 1 (path diversity)", minutes: 10,
    brief: "The fabric uses MINHOP. Move to ftree, give every port two LIDs (LMC 1) and prove it.",
    start: "gpu01",
    tasks: [
      { text: "Inspect the current engine (grep routing_engine /etc/opensm/opensm.conf)", check: st => ran(st, /routing_engine/) },
      { text: "Set routing_engine ftree (sed -i 's/routing_engine minhop/routing_engine ftree/' /etc/opensm/opensm.conf)", check: st => /routing_engine\s+ftree/.test(st.files["/etc/opensm/opensm.conf"]) },
      { text: "Set lmc 1", check: st => /^\s*lmc\s+1/m.test(st.files["/etc/opensm/opensm.conf"]) },
      { text: "Restart opensm so the new engine runs", check: st => st.sm.routing_engine === "ftree" && st.sm.lmc === 1 },
      { text: "Confirm two LIDs per port (ibaddr) and the engine in ibdiagnet", check: st => ran(st, /^ibaddr/) && st.sm.lmc === 1 }
    ],
    teach: "ftree needs the roots declared in root_guid_file. LMC n gives each port 2^n LIDs and each LID can map to a different path in the LFTs, which is how you get path diversity without adaptive routing. A routing_engine change needs a restart; QoS/partition changes only need kill -HUP."
  },
  {
    id: "ib-degraded", domain: "tshoot", title: "A training job is slow: find the degraded link", minutes: 12,
    brief: "all_reduce busbw dropped to a third overnight. Every port is ACTIVE. Work it from the fabric down to the physical layer.",
    start: "gpu04", faults: { badCable: true },
    tasks: [
      { text: "Blast radius: ibdiagnet --pc --pm and read the summary", check: st => ran(st, /^ibdiagnet/) },
      { text: "Find the link that negotiated down (iblinkinfo)", check: st => ran(st, /^iblinkinfo/) },
      { text: "Read the suspect port counters twice (perfquery 6 2) to measure a rate", check: st => st.cmdLog.filter(c => /^perfquery\s+6\s+2/.test(c.cmd)).length >= 2 },
      { text: "Drop to the physical layer on gpu04: mlxlink -d /dev/mst/mt4129_pciconf0 -m and -c", check: st => ran(st, /^mlxlink.*-m/, "gpu04") && ran(st, /^mlxlink.*-c/, "gpu04") }
    ],
    question: { text: "Which switch port is the bad end of the link (format: <switch> port <n>)?", answer: /leaf02\s*(port)?\s*2\b/i, hint: "iblinkinfo marks the link that is 4X EDR instead of NDR; perfquery shows SymbolErrorCounter climbing on that port." },
    teach: "ACTIVE only means the link trained. A link that came up at a lower speed, symbol errors that grow between two perfquery reads, and an effective BER that is not ~0 all point to the cable/optic. Raw BER (pre-FEC) is allowed to be ~1e-9; effective BER (post-FEC) must be effectively zero. Replace, clear counters (--pc / perfquery -R), re-read."
  },
  {
    id: "ib-qos", domain: "ib", title: "Enable QoS: SL→VL mapping and VL arbitration", minutes: 10,
    brief: "Two tenants share links. Give SL0 weight 100 and SL3 weight 10, push the tables without restarting the SM and read them back.",
    start: "gpu01",
    tasks: [
      { text: "Turn QoS on in opensm.conf (sed -i 's/^qos FALSE/qos TRUE/' ...)", check: st => /^qos\s+TRUE/m.test(st.files["/etc/opensm/opensm.conf"]) },
      { text: "Apply without a restart: kill -HUP $(pgrep opensm)", check: st => st.sm.qos && ran(st, /kill\s+-HUP/) },
      { text: "Read the SL2VL table of a switch (smpquery SL2VL 4)", check: st => ran(st, /^smpquery\s+SL2VL/i) },
      { text: "Read the arbitration weights (smpquery VLArb 4 1)", check: st => ran(st, /^smpquery\s+VLArb/i) },
      { text: "Generate traffic on SL3: ib_write_bw -S 3 ... (any perftest with -S 3)", check: st => ran(st, /ib_\w+_bw.*-S\s*3/) }
    ],
    question: { text: "With qos_vlarb_high 0:100,1:50,2:20,3:10, what share of the link does VL0 get under full contention (percent, integer)?", answer: /^\s*5[56]\s*%?\s*$/, hint: "100 / (100+50+20+10) = 100/180." },
    teach: "QoS = policy (SM). SL = 4-bit label the application sets (ib_write_bw -S). VL = the lane with its own buffers/credits; the SM programs SL→VL into every switch. VL15 is management and bypasses the arbiter. Weights only matter when VLs compete."
  },
  // ------------------------------------------------------------------ Spectrum-X
  {
    id: "spx-roce", domain: "spx", title: "Enable lossless RoCE on both leaves", minutes: 8,
    brief: "GPU hosts show RoCE at 60 Gb/s with retransmits. The leaves still run a lossy profile. Fix both leaves and verify.",
    start: "leaf01", faults: { roceOff: true },
    tasks: [
      { text: "Confirm RoCE is off (nv show qos roce)", check: st => ran(st, /^nv show qos roce/) },
      { text: "Stage the lossless profile on leaf01 (nv set qos roce enable on) and review nv config diff", check: st => ran(st, /^nv set qos roce enable on/, "leaf01") && ran(st, /^nv config diff/, "leaf01") },
      { text: "Apply on leaf01 (nv config apply)", check: st => SIM.NVUE.roceOn(st.switches.leaf01) },
      { text: "Repeat on leaf02 (ssh leaf02 → set → apply)", check: st => SIM.NVUE.roceOn(st.switches.leaf02) },
      { text: "Make it persistent on both (nv config save)", check: st => st.switches.leaf01.saved && st.switches.leaf02.saved && SIM.NVUE.roceOn(st.switches.leaf01) }
    ],
    question: { text: "Which switch priority does the default RoCE lossless profile make lossless (PFC) and which DSCP range maps to it?", answer: /3.*(24|26)|(24|26).*3/, hint: "PFC priority 3; DSCP 24-31 (RoCE uses 26) → switch priority 3; CNP on priority 6." },
    teach: "One command applies the whole profile: PFC on priority 3, ECN on TC 3 (min/max thresholds), DSCP/PCP trust, CNP in a strict queue. Lossless mode = PFC+ECN; lossy mode = ECN only. Without it RoCE drops under congestion and go-back-N retransmits kill throughput."
  },
  {
    id: "spx-bgp", domain: "spx", title: "BGP session down: wrong remote-as", minutes: 8,
    brief: "netq check bgp fails for leaf02 toward spine01. Find the mismatch and fix it with NVUE.",
    start: "oob-mgmt-server", faults: { bgpAsn: true },
    tasks: [
      { text: "Run the fabric-wide validation (netq check bgp)", check: st => ran(st, /^netq check bgp/) },
      { text: "On leaf02 inspect the neighbor (nv show vrf default router bgp neighbor)", check: st => ran(st, /^nv show vrf default router bgp/, "leaf02") },
      { text: "Correct the remote-as to the spine's AS 65100 and apply", check: st => val(st, "leaf02", ["vrf", "default", "router", "bgp", "neighbor", "10.0.1.2", "remote-as"]) === "65100" && SIM.NVUE.bgpNeighbors(st, st.switches.leaf02).every(n => n.state === "Established") },
      { text: "Re-run netq check bgp and see it pass", check: st => st.cmdLog.filter(c => /^netq check bgp/.test(c.cmd)).length >= 2 && SIM.NVUE.bgpNeighbors(st, st.switches.leaf02).every(n => n.state === "Established") }
    ],
    teach: "eBGP fabrics use one AS per leaf and a shared AS on the spines; a remote-as that does not match the peer's local AS keeps the session in Idle/Active. NetQ validates all sessions at once; NVUE fixes the one that is wrong; the nv show neighbor output tells you why (last-reset-reason)."
  },
  {
    id: "spx-evpn", domain: "spx", title: "EVPN symmetric routing: fix the L3VNI mismatch", minutes: 10,
    brief: "Tenant RED hosts on leaf01 cannot route to RED hosts on leaf02. L2 in VLAN 10 works. netq check evpn fails the L3 VNI consistency test.",
    start: "oob-mgmt-server", faults: { l3vniMismatch: true },
    tasks: [
      { text: "Validate the overlay (netq check evpn)", check: st => ran(st, /^netq check evpn/) },
      { text: "Compare VRF RED on both leaves (nv show vrf RED evpn)", check: st => ran(st, /^nv show vrf RED evpn/, "leaf01") || ran(st, /^nv show vrf RED evpn/, "leaf02") },
      { text: "Make the L3VNI identical (4001) on leaf02 and apply", check: st => val(st, "leaf02", ["vrf", "RED", "evpn", "vni"]) === "4001" && val(st, "leaf01", ["vrf", "RED", "evpn", "vni"]) === "4001" },
      { text: "Confirm both VTEPs see each other for VNI 4001 (nv show evpn vni)", check: st => ran(st, /^nv show evpn vni/) && val(st, "leaf02", ["vrf", "RED", "evpn", "vni"]) === "4001" }
    ],
    teach: "Symmetric IRB routes inter-subnet tenant traffic through one L3VNI per VRF. Every leaf that hosts the VRF must map it to the SAME L3VNI (and the same route targets), otherwise type-5 routes are imported into the wrong (or no) VRF. L2VNIs identify a VLAN; the L3VNI identifies the tenant."
  },
  {
    id: "spx-mtu", domain: "spx", title: "WJH shows MTU drops on an uplink", minutes: 8,
    brief: "VXLAN traffic between racks fails for large RoCE messages. WJH is dropping frames. Find why and fix it.",
    start: "oob-mgmt-server", faults: { mtuMismatch: true },
    tasks: [
      { text: "Look at the drop reason (netq show wjh-drop)", check: st => ran(st, /^netq show wjh-drop/) },
      { text: "Validate MTU fabric-wide (netq check mtu)", check: st => ran(st, /^netq check mtu/) },
      { text: "On leaf01 check swp51 (nv show interface swp51 link)", check: st => ran(st, /^nv show interface swp51/, "leaf01") },
      { text: "Set link mtu 9216 on swp51 and apply", check: st => SIM.NVUE.ifaceMtu(st.switches.leaf01, "swp51") === "9216" }
    ],
    question: { text: "How many bytes does VXLAN add to a frame (outer Ethernet+IP+UDP+VXLAN)?", answer: /^\s*50\s*$/, hint: "14 + 20 + 8 + 8 = 50 bytes; that is why the underlay runs jumbo (9216)." },
    teach: "WJH tells you WHY the ASIC dropped: here 'packet larger than MTU' on an encapsulated flow. The fix is on the underlay: raise the MTU on every fabric link so the inner 9000-byte frames plus 50 bytes of VXLAN fit. netq check mtu catches peer mismatches before users do."
  },
  {
    id: "spx-vlan-evpn", domain: "spx", title: "Stretch a new VLAN 20 across both leaves (L2VNI 10020)", minutes: 12,
    brief: "Build a second tenant segment end to end: VLAN 20 ↔ VNI 10020 on both leaves, gpu03 and gpu04 in VLAN 20.",
    start: "leaf01",
    tasks: [
      { text: "leaf01: map VLAN 20 to VNI 10020 (nv set bridge domain br_default vlan 20 vni 10020)", check: st => val(st, "leaf01", ["bridge", "domain", "br_default", "vlan", "20", "vni"]) === "10020" },
      { text: "leaf01: put swp2 (gpu03) in access VLAN 20 and apply", check: st => val(st, "leaf01", ["interface", "swp2", "bridge", "domain", "br_default", "access"]) === "20" },
      { text: "leaf02: same mapping and swp2 (gpu04) access 20, apply", check: st => val(st, "leaf02", ["bridge", "domain", "br_default", "vlan", "20", "vni"]) === "10020" && val(st, "leaf02", ["interface", "swp2", "bridge", "domain", "br_default", "access"]) === "20" },
      { text: "Verify both leaves list each other as remote VTEP for 10020 (nv show evpn vni)", check: st => ran(st, /^nv show evpn vni/) && val(st, "leaf02", ["bridge", "domain", "br_default", "vlan", "20", "vni"]) === "10020" }
    ],
    teach: "Same VLAN→VNI mapping on every VTEP, VXLAN enabled with the loopback as source, EVPN activated per BGP neighbor: that is the whole recipe. Type-3 routes announce the VTEP for the VNI; type-2 routes carry the MAC/IP of the hosts."
  },
  // ------------------------------------------------------------------ Automation
  {
    id: "auto-nvue", domain: "auto", title: "NVUE revisions: diff, apply, save and roll back", minutes: 10,
    brief: "Practise the change workflow the exam loves: stage, diff, apply, save, then roll back to a previous revision.",
    start: "leaf01",
    tasks: [
      { text: "Stage a hostname change (nv set system hostname leaf01-lab) and view nv config diff", check: st => ran(st, /^nv set system hostname/, "leaf01") && ran(st, /^nv config diff/, "leaf01") },
      { text: "Apply it (nv config apply)", check: st => st.switches.leaf01.revisions.length >= 2 },
      { text: "Check the revision list (nv config history)", check: st => ran(st, /^nv config history/, "leaf01") },
      { text: "Roll back to revision 1 (nv config apply 1)", check: st => ran(st, /^nv config apply\s+1\b/, "leaf01") && !SIM.NVUE.get(st.switches.leaf01.applied, ["system", "hostname", "leaf01-lab"]) },
      { text: "Persist the running configuration (nv config save)", check: st => st.switches.leaf01.saved && ran(st, /^nv config save/, "leaf01") }
    ],
    teach: "Every apply creates a numbered revision; nv config apply <rev> re-applies that snapshot (atomic rollback). nv config diff with no arguments compares pending with applied; with two revision ids it compares history. Applied ≠ saved: without nv config save (or auto-save) a reboot returns to startup."
  },
  {
    id: "auto-patch", domain: "auto", title: "Apply a YAML template incrementally (nv config patch)", minutes: 8,
    brief: "A reviewed YAML fragment adds VLAN 20 on swp2. Merge it without touching the rest of the config.",
    start: "leaf02",
    tasks: [
      { text: "Read the fragment (cat vlan20.yaml)", check: st => ran(st, /^cat\s+(\/home\/cumulus\/)?vlan20\.yaml/, "leaf02") },
      { text: "Merge it into pending (nv config patch vlan20.yaml)", check: st => ran(st, /^nv config patch\s+(\/home\/cumulus\/)?vlan20\.yaml/, "leaf02") },
      { text: "Review the delta (nv config diff) — only VLAN 20 lines should appear", check: st => ran(st, /^nv config diff/, "leaf02") && ran(st, /^nv config patch/, "leaf02") },
      { text: "Apply and save", check: st => val(st, "leaf02", ["bridge", "domain", "br_default", "vlan", "20", "vni"]) === "10020" && st.switches.leaf02.saved }
    ],
    question: { text: "Which nv config operation would REPLACE the whole configuration with the file instead of merging?", answer: /replace/i, hint: "patch = incremental merge; replace = full replacement; both stage, apply commits." },
    teach: "Templates are YAML in the NVUE object model. patch merges (incremental change), replace swaps the full config. Either way nothing is live until nv config apply, so diff first."
  },
  {
    id: "auto-ansible", domain: "auto", title: "Ansible with nvidia.nvue: groups, group_vars and --limit", minutes: 10,
    brief: "Roll RoCE to the leaf group only, with shared variables in group_vars, and understand why the VLAN playbook fails on spines.",
    start: "oob-mgmt-server",
    tasks: [
      { text: "Inspect the inventory groups (cat ansible/inventory.ini)", check: st => ran(st, /^cat\s+(~\/)?ansible\/inventory\.ini/) },
      { text: "See the shared leaf variables (cat ansible/group_vars/leaf.yml)", check: st => ran(st, /group_vars\/leaf\.yml/) },
      { text: "Dry-run the RoCE playbook (ansible-playbook -i ansible/inventory.ini ansible/roce.yml --check)", check: st => ran(st, /ansible-playbook.*roce\.yml.*--check/) },
      { text: "Run it for real, limited to leaf01 only (--limit leaf01)", check: st => ran(st, /ansible-playbook.*roce\.yml(?!.*--check).*--limit\s+leaf01/) && SIM.NVUE.roceOn(st.switches.leaf01) },
      { text: "Run vlan.yml (hosts: all) and observe the spines fail on the undefined variable", check: st => ran(st, /ansible-playbook.*vlan\.yml/) }
    ],
    question: { text: "What single change to vlan.yml restricts the rollout to the leaf switches without --limit?", answer: /hosts:\s*leaf|hosts.*leaf/i, hint: "The play's hosts: line targets an inventory group." },
    teach: "Inventory groups ([leaf], [spine]) decide scope; hosts: in the play or --limit on the CLI narrow it. Variables shared by a group live in group_vars/<group>.yml; per-device values live in host_vars/<host>.yml. The nvidia.nvue collection talks to the NVUE REST API, so each run is an atomic revision."
  },
  // ------------------------------------------------------------------ Kubernetes
  {
    id: "k8s-netop", domain: "k8s", title: "Verify the Network Operator and give a pod RDMA", minutes: 10,
    brief: "A pod needs RDMA. Check the operator, the NicClusterPolicy, the node resource and the pod spec.",
    start: "oob-mgmt-server",
    tasks: [
      { text: "List operator pods (kubectl get pods -n nvidia-network-operator)", check: st => ran(st, /kubectl get pods? -n nvidia-network-operator|kubectl -n nvidia-network-operator get pods?/) },
      { text: "Check the policy state (kubectl get nicclusterpolicy -o yaml)", check: st => ran(st, /kubectl get nicclusterpolic(y|ies).*-o yaml/) },
      { text: "Find the RDMA extended resource on a node (kubectl describe node gpu01 | grep rdma)", check: st => ran(st, /kubectl describe node/) },
      { text: "Read the pod manifest (cat k8s/rdma-pod.yaml) and apply it", check: st => ran(st, /cat\s+(~\/)?k8s\/rdma-pod\.yaml/) && ran(st, /kubectl apply -f .*rdma-pod\.yaml/) },
      { text: "Confirm the secondary interface (kubectl describe pod rdma-test)", check: st => ran(st, /kubectl describe pod rdma-test/) }
    ],
    question: { text: "Name the extended resource the pod requests to get an RDMA device.", answer: /rdma\/rdma_shared_device_a/i, hint: "It appears under Allocatable on the node and under resources.limits in the pod." },
    teach: "Network Operator = NicClusterPolicy CR that deploys the DOCA/OFED driver container, the RDMA shared (or SR-IOV) device plugin, Multus and IPAM. The pod gets the device by requesting the extended resource (rdma/rdma_shared_device_a: 1) and the network by the k8s.v1.cni.cncf.io/networks annotation pointing at a NetworkAttachmentDefinition."
  },
  {
    id: "k8s-driver", domain: "k8s", title: "NicClusterPolicy notReady: a driver pod is crash-looping", minutes: 8,
    brief: "The operator runs but the policy reports a component not ready. Find which node and why.",
    start: "oob-mgmt-server", faults: { nicDriverNotReady: true },
    tasks: [
      { text: "Read the policy status (kubectl get nicclusterpolicy -o yaml)", check: st => ran(st, /kubectl get nicclusterpolic(y|ies).*-o yaml/) },
      { text: "Find the failing pod (kubectl get pods -n nvidia-network-operator)", check: st => ran(st, /kubectl.*get pods?.*nvidia-network-operator|kubectl -n nvidia-network-operator get pods?/) },
      { text: "Read its logs (kubectl logs mofed-ubuntu24.04-ds-gpu02-p9z1c -n nvidia-network-operator)", check: st => ran(st, /kubectl logs .*gpu02/) }
    ],
    question: { text: "Which node has the failing driver container and what is the root cause (one word)?", answer: /gpu02.*(kernel|version|mismatch)|(kernel|version|mismatch).*gpu02/i, hint: "The OFED/DOCA driver image must match the node's kernel." },
    teach: "state-OFED notReady means the driver DaemonSet is not healthy on some node. The next verification is always the pod on that node: kubectl get pods shows CrashLoopBackOff, kubectl logs shows the kernel/driver mismatch. Until the driver is ready the RDMA device plugin cannot advertise resources (rdma/... = 0)."
  },
  // ------------------------------------------------------------------ Troubleshooting
  {
    id: "tshoot-asic", domain: "tshoot", title: "ASIC tables: cl-resource-query and forwarding profiles", minutes: 6,
    brief: "A leaf has free RAM but new MAC entries fail to install. Check the ASIC, not the CPU.",
    start: "leaf01",
    tasks: [
      { text: "Check ASIC resource allocation (cl-resource-query)", check: st => ran(st, /^cl-resource-query/, "leaf01") },
      { text: "Compare with the spine (ssh spine01, cl-resource-query)", check: st => ran(st, /^cl-resource-query/, "spine01") }
    ],
    question: { text: "What percentage of the MAC table is used on leaf01?", answer: /95/, hint: "Read the 'MAC entries' line." },
    teach: "System RAM is irrelevant to forwarding capacity; the ASIC tables (MAC, host, LPM routes, ECMP, ACL) have fixed sizes. cl-resource-query shows usage vs maximum. Forwarding table profiles trade one table for another (l2-heavy gains MACs, loses routes), so check current route usage before switching."
  },
  {
    id: "tshoot-topo", domain: "tshoot", title: "GPU-to-NIC locality with nvidia-smi topo -m", minutes: 6,
    brief: "GPU transfers are slow although the RDMA link rate is correct. Inspect PCIe/NUMA locality before touching the fabric.",
    start: "gpu01",
    tasks: [
      { text: "Print the topology matrix (nvidia-smi topo -m)", check: st => ran(st, /nvidia-smi topo (-m|--matrix)/) },
      { text: "Check NUMA layout (numactl -H)", check: st => ran(st, /^numactl/) }
    ],
    question: { text: "Which NIC should GPU0 use for GPUDirect RDMA (closest, PIX)?", answer: /NIC0|mlx5_0/i, hint: "PIX = one PCIe bridge away; SYS = across sockets (worst)." },
    teach: "Preference order: NV# (NVLink) > PIX > PXB > PHB > NODE > SYS. A NIC reached through the inter-socket link (SYS) halves GPUDirect throughput. NCCL picks the closest NIC automatically; NCCL_IB_HCA lets you pin it."
  },
  {
    id: "tshoot-dpu", domain: "spx", title: "Put a BlueField-3 into DPU mode", minutes: 6,
    brief: "The SuperNIC on gpu01 is in NIC mode, so its Arm cores are bypassed and DOCA services cannot run. Switch it.",
    start: "gpu01", faults: { dpuNicMode: true },
    tasks: [
      { text: "Start MST and list devices (mst start; mst status)", check: st => ran(st, /^mst (start|status)/) },
      { text: "Query the mode (mlxconfig -d /dev/mst/mt41692_pciconf0 q)", check: st => ran(st, /mlxconfig.*41692.*\bq\b/) },
      { text: "Set INTERNAL_CPU_MODEL=1 (mlxconfig -d /dev/mst/mt41692_pciconf0 s INTERNAL_CPU_MODEL=1)", check: st => st.dpuMode === 1 && ran(st, /INTERNAL_CPU_MODEL=1/) },
      { text: "Activate with a firmware reset (mlxfwreset -d /dev/mst/mt41692_pciconf0 reset)", check: st => ran(st, /^mlxfwreset/) }
    ],
    teach: "INTERNAL_CPU_MODEL 1 = EMBEDDED_CPU (DPU mode: Arm owns the datapath, DPU OS reachable through rshim), 0 = SEPARATED_HOST (NIC mode). The change is 'Next Boot' until mlxfwreset or a power cycle."
  }
);

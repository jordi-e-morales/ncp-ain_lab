// NCP-AIN question bank — domains: spx (Spectrum Networking), k8s (Kubernetes Integration), auto (Automation and Configuration)
// Schema: see SCHEMA.md. Loaded via <script>, appends to window.NCP_QUESTIONS.
window.NCP_QUESTIONS = window.NCP_QUESTIONS || [];
window.NCP_QUESTIONS.push(

// ───────────────────────────── spx — NVUE workflow ─────────────────────────────
{
  id: "spx-001", domain: "spx", topic: "NVUE workflow", difficulty: 1,
  q: "A Cumulus Linux switch has a new RoCE setting in its NVUE pending configuration, but the running state remains unchanged. Which action activates the staged change?",
  options: ["Run nv config apply", "Run nv config save", "Run nv show qos roce", "Reboot the switch so the pending revision loads"],
  answer: 0, multi: false,
  explanation: "NVUE is transactional: nv set only stages a change into a pending revision. nv config apply commits the pending revision to the running system atomically. nv config save only writes the applied configuration to /etc/nvue.d/startup.yaml for persistence, and nv show reads state without changing it.",
  distractors: "nv config save persists what is already applied; it never activates a pending change.",
  ref: "Module 11 · NVUE command structure and workflow",
  tags: ["nvue", "apply", "pending"]
},
{
  id: "spx-002", domain: "spx", topic: "NVUE workflow", difficulty: 2,
  q: "Before committing a staged NVUE change, an operator wants to see exactly what will differ between the pending and the currently applied configuration. Which command provides this?",
  options: ["nv config diff", "nv config history", "nv show system", "nv config show -o yaml"],
  answer: 0, multi: false,
  explanation: "nv config diff compares the pending revision against the applied configuration and prints the additions and removals. nv config history lists past revisions, nv config show dumps the whole applied config, and nv show system reports operational system state.",
  ref: "Module 11 · NVUE show commands",
  tags: ["nvue", "diff"]
},
{
  id: "spx-003", domain: "spx", topic: "NVUE workflow", difficulty: 2,
  q: "A BGP change applied with NVUE ten minutes ago broke peering. The operator wants to return the switch to the configuration that was running before that change. Which approach uses NVUE's built-in revision control?",
  options: ["Run nv config history to find the earlier revision and apply it with nv config apply <rev_id>", "Edit /etc/network/interfaces by hand and run ifreload -a", "Run nv config save to restore the startup configuration", "Power-cycle the switch to discard the last revision"],
  answer: 0, multi: false,
  explanation: "Every nv config apply creates a numbered revision. nv config history lists them and nv config apply <rev_id> re-applies any earlier revision, which is NVUE's rollback mechanism. nv config save writes the running config to startup, which would persist the broken state rather than undo it.",
  ref: "Module 11 · NVUE atomic commits, revision control, rollback",
  tags: ["nvue", "rollback", "history"]
},
{
  id: "spx-004", domain: "spx", topic: "NVUE workflow", difficulty: 2,
  q: "An automation script needs machine-readable output from a Cumulus switch's interface status. Which NVUE option should be appended to the show command?",
  options: ["-o json", "--xml", "--raw", "-v"],
  answer: 0, multi: false,
  explanation: "Any NVUE show command accepts -o json (or -o yaml) to emit structured output suitable for scripts and Ansible. There is no --xml or --raw option in NVUE, and -v is not an NVUE output selector.",
  ref: "Module 11 · NVUE show commands (-o json)",
  tags: ["nvue", "json", "automation"]
},
{
  id: "spx-005", domain: "spx", topic: "NVUE workflow", difficulty: 2,
  q: "A switch has automatic configuration saving disabled. An operator applies a VLAN change with nv config apply and then reboots for maintenance; the VLAN is gone afterwards. What should have been run before the reboot?",
  options: ["nv config save", "nv config apply again", "nv config diff", "nv set system config auto-save disabled"],
  answer: 0, multi: false,
  explanation: "When auto-save is off, nv config apply changes the running configuration but does not write it to the startup file /etc/nvue.d/startup.yaml. nv config save persists the applied configuration so it survives a reboot. Alternatively, enable auto-save with nv set system config auto-save enabled.",
  ref: "Module 11 · NVUE workflow (apply vs save)",
  tags: ["nvue", "save", "persistence"]
},
{
  id: "spx-006", domain: "spx", topic: "NVUE workflow", difficulty: 2,
  q: "An operator staged an incorrect IP address with nv set interface swp1 ip address 10.0.0.9/30 but has not applied it yet. Which command removes just that staged setting?",
  options: ["nv unset interface swp1 ip address 10.0.0.9/30", "nv config apply", "nv config detach", "nv delete interface swp1"],
  answer: 0, multi: false,
  explanation: "nv unset removes a configuration element from the pending revision; it mirrors the nv set syntax. nv config detach discards the whole pending revision, which is heavier than needed, and NVUE has no nv delete verb.",
  ref: "Module 11 · NVUE command structure",
  tags: ["nvue", "unset"]
},

// ───────────────────────────── spx — RoCE / QoS ─────────────────────────────
{
  id: "spx-007", domain: "spx", topic: "RoCE on Cumulus", difficulty: 1,
  q: "A team must enable lossless RoCE on a Spectrum switch running Cumulus Linux with the fewest commands, letting the switch apply PFC, ECN and the DSCP-to-priority mappings automatically. Which configuration achieves this?",
  options: ["nv set qos roce enable on, then nv config apply", "nv set qos pfc default-global port-buffer 1500 and nv config apply", "nv set interface swp1-32 link mtu 9216 and nv config apply", "nv set router adaptive-routing enable on and nv config apply"],
  answer: 0, multi: false,
  explanation: "The single command nv set qos roce enable on applies Cumulus Linux's RoCE profile: PFC on the RoCE priority, ECN marking thresholds, the DSCP trust mode and the DSCP-to-switch-priority mapping (DSCP 26 to priority 3 by default, CNP DSCP 48 to priority 6). Verify with nv show qos roce. Adaptive routing and MTU are separate settings.",
  ref: "Module 11 · Configuring RoCE",
  tags: ["roce", "qos", "lossless"]
},
{
  id: "spx-008", domain: "spx", topic: "RoCE on Cumulus", difficulty: 2,
  q: "A RoCE design maps application packets to switch priority 3. Captured packets instead enter a lossy queue because their DSCP values map elsewhere. Which configuration should be corrected first?",
  options: ["The DSCP-to-switch-priority mapping (or the DSCP the hosts mark), so RoCE traffic lands on priority 3", "The egress scheduler weights for traffic class 3", "The PFC pause-time value on the uplinks", "The ECN maximum threshold on the lossless queue"],
  answer: 0, multi: false,
  explanation: "Classification happens first: with trust mode DSCP the switch looks up the packet's DSCP in the DSCP-to-switch-priority map to pick the queue. If the hosts mark a DSCP that maps to a lossy priority, no amount of PFC or ECN tuning on priority 3 helps. Fix the mapping (nv set qos mapping ... dscp 26 switch-priority 3) or the host DSCP marking so the packets enter the lossless queue.",
  ref: "Module 11 · RoCE: PFC, ECN, DSCP",
  tags: ["roce", "dscp", "classification"]
},
{
  id: "spx-009", domain: "spx", topic: "RoCE congestion control", difficulty: 2,
  q: "A congested RoCE path needs feedback that causes the transmitting endpoint to reduce its sending rate. Which mechanism provides the relevant congestion signal?",
  options: ["ECN marking by the switch, which triggers Congestion Notification Packets (CNPs) from the receiver back to the sender", "PFC pause frames sent hop-by-hop to the upstream port", "LLDP TLVs advertising queue depth to the neighbour", "BGP route dampening on the congested prefix"],
  answer: 0, multi: false,
  explanation: "End-to-end rate control in RoCEv2 (DCQCN or DOCA PCC on the SuperNIC) relies on Explicit Congestion Notification: when a queue crosses the ECN threshold the switch sets the CE bits instead of dropping, the receiving NIC answers with a CNP, and the sending NIC lowers its injection rate. PFC is a different, hop-by-hop mechanism: it pauses the upstream link for one priority to prevent drops, but it does not tell the original sender to slow down and, used alone, can spread congestion (head-of-line blocking, pause storms). The exam distinguishes PFC = losslessness safety net, ECN/CNP = the congestion signal that reduces the sending rate.",
  distractors: "PFC pauses the adjacent link; it is not a rate-reduction signal to the transmitting endpoint.",
  ref: "Module 11 · RoCE: PFC, ECN, DSCP · Module 12 · Congestion control in Spectrum-X",
  tags: ["roce", "ecn", "cnp", "pfc", "missed-before"]
},
{
  id: "spx-010", domain: "spx", topic: "RoCE congestion control", difficulty: 2,
  q: "A switch receives a PFC pause for the priority assigned to RoCE traffic. Other priorities have available buffers. What forwarding behavior reflects priority-based flow control?",
  options: ["Only the paused priority stops transmitting on that link; the other priorities continue to forward", "All traffic on the link stops until the pause timer expires", "The switch drops the paused priority's packets and keeps forwarding the rest", "The switch reroutes the paused priority to another uplink via adaptive routing"],
  answer: 0, multi: false,
  explanation: "IEEE 802.1Qbb PFC extends classic Ethernet PAUSE with a per-priority bitmap, so a pause frame halts only the named priority (here the RoCE lossless queue) while the remaining seven priorities keep flowing. This is what makes a converged fabric possible: storage/RoCE is lossless while best-effort traffic is unaffected. Dropping would defeat the purpose of PFC, and PFC does not itself trigger rerouting.",
  ref: "Module 11 · RoCE: PFC",
  tags: ["roce", "pfc"]
},
{
  id: "spx-011", domain: "spx", topic: "RoCE on Cumulus", difficulty: 2,
  q: "After enabling RoCE, an engineer runs nv show qos roce and sees mode lossy. The design requires PFC on the RoCE queue. Which statement is correct?",
  options: ["Lossy mode relies on ECN only; set nv set qos roce mode lossless to also enable PFC on the RoCE priority", "Lossy mode already enables PFC; only ECN is missing", "Mode is informational and cannot be changed", "Lossy mode is required when hosts use DCQCN"],
  answer: 0, multi: false,
  explanation: "Cumulus Linux supports two RoCE profiles: lossless (default) enables PFC on the RoCE switch priority plus ECN, while lossy enables ECN marking without PFC and relies entirely on end-to-end congestion control. If the design mandates a lossless queue, set the mode to lossless and apply.",
  ref: "Module 11 · Configuring RoCE",
  tags: ["roce", "lossless", "lossy"]
},
{
  id: "spx-012", domain: "spx", topic: "QoS trust and mapping", difficulty: 2,
  q: "RoCE hosts mark packets with DSCP 26, but the switch classifies on the 802.1p PCP bits and places the traffic in the default queue. Which QoS setting must change?",
  options: ["The QoS trust mode on the ingress ports from l2 (PCP) to dscp (or both)", "The egress traffic-class scheduler from DWRR to strict", "The PFC pause threshold", "The VLAN ID of the RoCE segment"],
  answer: 0, multi: false,
  explanation: "The trust mode decides which header field the switch reads to derive the switch priority. With trust l2 only the PCP bits in the 802.1Q tag are used; untagged or differently tagged RoCE traffic falls to the default priority. Setting trust mode to dscp (nv set qos mapping ... trust dscp, done automatically by the RoCE profile) lets the DSCP 26 mapping to priority 3 take effect.",
  ref: "Module 11 · RoCE: DSCP classification",
  tags: ["qos", "trust", "dscp", "pcp"]
},
{
  id: "spx-013", domain: "spx", topic: "RoCE congestion control", difficulty: 3,
  q: "Telemetry shows ECN-marked packets arriving at receivers, yet senders do not slow down and buffer drops continue. Which host-side condition most directly explains this?",
  options: ["The receiving NICs are not generating CNPs, or the sender's congestion-control (DCQCN / DOCA PCC) is disabled, so the ECN signal is never acted upon", "The switch PFC watchdog is disabled", "The hosts use jumbo MTU while the switch uses 1500", "LLDP is not enabled on the host-facing ports"],
  answer: 0, multi: false,
  explanation: "ECN marking is only half of the loop. The receiver's NIC must translate CE-marked packets into CNPs (mapped to a dedicated priority, DSCP 48 by default) and the sender's NIC must run a reaction algorithm that reduces rate on CNP arrival. If either side has congestion control disabled or the CNP priority is not forwarded, marking has no effect and the queue keeps overflowing.",
  ref: "Module 11 · RoCE: ECN/CNP · Module 12 · SuperNIC congestion control",
  tags: ["roce", "ecn", "cnp", "dcqcn"]
},
{
  id: "spx-014", domain: "spx", topic: "SuperNIC congestion control", difficulty: 2,
  q: "A SuperNIC congestion-control algorithm receives notification that the fabric is congested. Which endpoint action addresses the offered load at its source?",
  options: ["Reduce the injection (transmit) rate of the affected flows at the sending NIC", "Send PFC pause frames toward the switch", "Increase the receive buffer size on the destination NIC", "Switch the flow to a different switch priority"],
  answer: 0, multi: false,
  explanation: "Congestion control on the BlueField-3 SuperNIC (DOCA Programmable Congestion Control) executes in hardware and reacts to CNP/ECN or RTT signals by throttling the sender's rate in microseconds. Slowing the source is the only action that removes load from the fabric; pausing or buffering just moves the queue elsewhere.",
  ref: "Module 12 · Congestion control in Spectrum-X",
  tags: ["supernic", "pcc", "congestion-control"]
},

// ───────────────────────────── spx — Adaptive routing / platform ─────────────────────────────
{
  id: "spx-015", domain: "spx", topic: "Adaptive routing", difficulty: 2,
  q: "A training job's elephant flows all hash onto the same spine uplink while parallel uplinks sit idle. Which Spectrum-X capability specifically spreads this load based on real-time egress queue occupancy?",
  options: ["Per-packet adaptive routing on the Spectrum switch", "Static ECMP with a larger hash seed", "PFC on the congested uplink", "VRR anycast gateway"],
  answer: 0, multi: false,
  explanation: "Spectrum switches evaluate the egress queue depth of the ECMP candidate ports and send each packet over the least-loaded one, so a single large flow is spread across all uplinks. Static ECMP pins the whole flow to one path for its lifetime, which is exactly what fails with low-entropy AI traffic. Enable it with nv set router adaptive-routing enable on and per interface.",
  ref: "Module 12 · What makes Spectrum-X unique",
  tags: ["adaptive-routing", "ecmp", "elephant-flows"]
},
{
  id: "spx-016", domain: "spx", topic: "Adaptive routing", difficulty: 3,
  q: "Per-packet adaptive routing is enabled on the switches, but applications report RDMA errors due to out-of-order delivery. Which component is responsible for restoring order in the Spectrum-X design?",
  options: ["The BlueField-3 SuperNIC, which reorders packets before delivering data to the GPU or application", "The spine switch, which buffers and resequences packets per flow", "The NetQ agent on the host", "The Cumulus Linux kernel on the leaf"],
  answer: 0, multi: false,
  explanation: "Spectrum-X is a coupled platform: the Spectrum-4 switch chooses paths per packet (which can reorder), and the BlueField-3 SuperNIC handles out-of-order reassembly at the RoCE transport layer so the application sees in-order data. Adaptive routing with plain ConnectX NICs that lack this capability is why older SN4700 designs cannot run the full coordinated mode.",
  ref: "Module 12 · Switch and SuperNIC together",
  tags: ["adaptive-routing", "supernic", "reordering"]
},
{
  id: "spx-017", domain: "spx", topic: "Spectrum-X platform", difficulty: 1,
  q: "Which combination correctly describes the Spectrum-X platform rather than a standalone Spectrum switch deployment?",
  options: ["Spectrum-4 (SN5000 series) switches paired with BlueField-3 SuperNICs and the validated software stack (Cumulus/SONiC, DOCA, NetQ)", "Any Spectrum switch with RoCE enabled", "Quantum-2 switches with ConnectX-7 adapters", "SN2700 switches with Onyx and UFM"],
  answer: 0, multi: false,
  explanation: "'Spectrum' is the switch ASIC family; 'Spectrum-X' is the end-to-end AI Ethernet platform combining Spectrum-4 switches with BlueField-3 SuperNICs and software, where the switch does adaptive routing and the SuperNIC does congestion control and reordering. Quantum and UFM belong to InfiniBand.",
  ref: "Module 12 · Spectrum-X switches",
  tags: ["spectrum-x", "platform"]
},
{
  id: "spx-018", domain: "spx", topic: "Spectrum-X platform", difficulty: 1,
  q: "An architect needs the total switching capacity of an SN5600 to size a spine tier. Which figure is correct?",
  options: ["64 ports of 800GbE for 51.2 Tb/s", "32 ports of 400GbE for 12.8 Tb/s", "128 ports of 100GbE for 12.8 Tb/s", "64 ports of 400GbE for 25.6 Tb/s"],
  answer: 0, multi: false,
  explanation: "The SN5600 is the Spectrum-4 flagship: 64 × 800GbE OSFP ports in 2U, 64 × 800 Gb/s = 51,200 Gb/s = 51.2 Tb/s. The 12.8 Tb/s figures belong to the SN3000/SN4000 generation.",
  ref: "Module 12 · SN5600 the flagship",
  tags: ["sn5600", "spectrum-4"]
},
{
  id: "spx-019", domain: "spx", topic: "Spectrum-X deployment", difficulty: 2,
  q: "A Spectrum-X switch has its approved fabric configuration, but server adapters retain a generic profile. The deployment requires the reference architecture's endpoint tuning. What completes the end-to-end setup?",
  options: ["Apply the Spectrum-X host/SuperNIC configuration from the reference architecture (DOCA-Host, PCC, RoCE/QoS settings) to the adapters", "Enable adaptive routing on the switch again", "Increase the switch MTU to 9216", "Add more spine uplinks"],
  answer: 0, multi: false,
  explanation: "Spectrum-X performance depends on both halves being tuned: the switch side (RoCE, AR, buffers) and the endpoint side (BlueField-3 SuperNIC firmware/driver, DOCA PCC congestion control, DSCP marking, RoCE QoS). The reference architecture specifies the host profile; leaving adapters at a generic profile means the fabric cannot deliver the validated behaviour.",
  ref: "Module 11 · Configuring RoCE (hosts) · Module 12 · Spectrum-X platform",
  tags: ["spectrum-x", "endpoint-tuning", "doca"]
},

// ───────────────────────────── spx — BGP underlay ─────────────────────────────
{
  id: "spx-020", domain: "spx", topic: "BGP underlay", difficulty: 2,
  q: "In a Layer 3 leaf-spine design with eBGP, which addressing/AS plan is conventional for Cumulus Linux fabrics?",
  options: ["A unique AS number per switch (or per leaf with a shared spine AS), point-to-point /30 or unnumbered links, and a unique router-id from the loopback", "The same AS on every switch with full-mesh iBGP", "OSPF between leaves and BGP only on spines", "A single /24 shared by all spine-leaf links"],
  answer: 0, multi: false,
  explanation: "The course's Method 2 gives each switch its own AS (65000 spine, 65001/65002 leaves), /30 point-to-point uplinks and a loopback-derived router-id, so eBGP loop prevention via AS-path works and ECMP spreads traffic across spines. BGP unnumbered (IPv6 link-local peering) is the production shortcut on Cumulus.",
  ref: "Module 11 · Method 2 Layer 3 with BGP",
  tags: ["bgp", "underlay", "ebgp"]
},
{
  id: "spx-021", domain: "spx", topic: "BGP underlay", difficulty: 2,
  q: "A leaf's BGP session to the spine is established, but the leaf's host subnet never appears on the spine. Which NVUE statement on the leaf most likely is missing?",
  options: ["nv set vrf default router bgp address-family ipv4-unicast network 172.16.1.0/24 (or redistribute connected)", "nv set vrf default router bgp router-id 22.2.2.2", "nv set interface swp1 link mtu 9216", "nv set evpn state enabled"],
  answer: 0, multi: false,
  explanation: "An established session only means the peers can talk; prefixes are advertised only if they are injected into BGP, either explicitly with the network statement or with redistribute connected under address-family ipv4-unicast. Router-id is needed for the session itself, and EVPN is irrelevant to IPv4 unicast reachability.",
  ref: "Module 11 · Method 2 configuration",
  tags: ["bgp", "advertise", "network"]
},
{
  id: "spx-022", domain: "spx", topic: "BGP underlay", difficulty: 1,
  q: "Which NVUE command shows whether BGP neighbours in the default VRF are Established and how many prefixes were received?",
  options: ["nv show vrf default router bgp neighbor", "nv show interface", "nv show system version", "nv config diff"],
  answer: 0, multi: false,
  explanation: "nv show vrf default router bgp neighbor summarises every peer with state, uptime and prefix counts; nv show vrf default router rib ipv4 route shows the resulting routes. The other commands do not report routing-protocol state.",
  ref: "Module 11 · Method 2 verify",
  tags: ["bgp", "show"]
},
{
  id: "spx-023", domain: "spx", topic: "BGP underlay", difficulty: 2,
  q: "Two leaves in an EVPN fabric cannot form VXLAN tunnels although both have VTEP loopbacks configured. On the spine, nv show vrf default router rib ipv4 route lists only the /30 links. Which underlay fix is needed on the leaves?",
  options: ["Advertise the loopbacks into BGP with address-family ipv4-unicast redistribute connected (or a network statement)", "Enable the l2vpn-evpn address family on the spine", "Change the VNI from 10010 to 10", "Enable VRR on the SVI"],
  answer: 0, multi: false,
  explanation: "VXLAN tunnels are built between VTEP loopback addresses, so the underlay must carry those /32 routes. If the leaves do not redistribute their loopbacks, remote VTEPs are unreachable and EVPN type-3 routes point to next-hops with no path. This is an underlay problem, independent of EVPN and VNI settings.",
  ref: "Module 11 · Method 3 configuration (spine): redistribute connected for VTEP reachability",
  tags: ["bgp", "underlay", "vtep", "loopback"]
},

// ───────────────────────────── spx — EVPN-VXLAN ─────────────────────────────
{
  id: "spx-024", domain: "spx", topic: "EVPN-VXLAN", difficulty: 1,
  q: "Which statements about VXLAN encapsulation are correct? (Choose two.)",
  options: ["It uses UDP destination port 4789", "The VNI is a 24-bit identifier (about 16 million segments)", "The VNI is a 12-bit identifier like a VLAN", "It uses TCP port 4789 for reliability", "Encapsulation adds about 5 bytes of overhead"],
  answer: [0, 1], multi: true,
  explanation: "VXLAN wraps the original Layer 2 frame in outer Ethernet/IP/UDP (destination port 4789) plus an 8-byte VXLAN header carrying a 24-bit VNI, roughly 50 bytes of overhead, which is why underlay MTU is raised to 9216. The 12-bit space is the VLAN limitation VXLAN exists to overcome.",
  ref: "Module 11 · VXLAN, VNI, VTEP, EVPN",
  tags: ["vxlan", "vni", "udp-4789"]
},
{
  id: "spx-025", domain: "spx", topic: "EVPN-VXLAN", difficulty: 2,
  q: "A leaf must map VLAN 10 to VNI 10010 and source its VXLAN tunnels from loopback 10.10.10.1. Which NVUE command pair is correct?",
  options: ["nv set bridge domain br_default vlan 10 vni 10010 and nv set nve vxlan source address 10.10.10.1", "nv set interface vlan10 vni 10010 and nv set interface lo vxlan on", "nv set evpn vni 10010 vlan 10 and nv set router bgp vtep 10.10.10.1", "nv set nve vxlan vlan 10 and nv set bridge domain br_default source 10.10.10.1"],
  answer: 0, multi: false,
  explanation: "In NVUE the VLAN-to-VNI binding lives under the bridge domain (nv set bridge domain br_default vlan 10 vni 10010) and the VTEP source address under the NVE object (nv set nve vxlan source address <loopback>), together with nv set nve vxlan state enabled. The other syntaxes do not exist.",
  ref: "Module 11 · Method 3 configuration (LEAF-1)",
  tags: ["vxlan", "nvue", "vni", "vtep"]
},
{
  id: "spx-026", domain: "spx", topic: "EVPN-VXLAN", difficulty: 2,
  q: "A spine in an EVPN fabric should reflect MAC/IP routes between leaves but never terminate VXLAN. Which configuration belongs on the spine?",
  options: ["Enable the l2vpn-evpn address family globally and on each neighbour; no VNI, NVE or SVI configuration", "Map every tenant VLAN to its VNI so the spine can decapsulate", "Configure VRR on each tenant SVI", "Set nv set nve vxlan source address to the spine loopback"],
  answer: 0, multi: false,
  explanation: "The spine participates only in the underlay and the EVPN control plane: nv set vrf default router bgp address-family l2vpn-evpn state enabled plus the same per neighbour. It needs no VTEP, VNI or gateway because tunnels run leaf-to-leaf over the routed underlay.",
  ref: "Module 11 · Method 3 configuration (SPINE-1)",
  tags: ["evpn", "spine", "l2vpn-evpn"]
},
{
  id: "spx-027", domain: "spx", topic: "EVPN-VXLAN", difficulty: 2,
  q: "After building an EVPN-VXLAN fabric, nv show vrf default router bgp address-family l2vpn-evpn route shows type-3 routes from each VTEP but no type-2 routes, and hosts cannot ping. What do the missing route types indicate?",
  options: ["No host MAC/IP has been learned and advertised yet; check that the access ports are in the right VLAN/bridge domain and that hosts have sent traffic", "The VXLAN UDP port is blocked", "The spine is missing the ipv4-unicast address family", "The VNI is outside the 24-bit range"],
  answer: 0, multi: false,
  explanation: "Type-3 (Inclusive Multicast Ethernet Tag) routes announce VTEP membership in a VNI and are generated as soon as the VNI is up. Type-2 routes carry learned host MAC and MAC/IP bindings; they appear only after a host's frame is learned on an access port in that VLAN. Their absence points to the access-side configuration (port not in VLAN 10 access, host interface down) rather than the overlay control plane.",
  ref: "Module 11 · Method 3 verification",
  tags: ["evpn", "type-2", "type-3"]
},
{
  id: "spx-028", domain: "spx", topic: "EVPN-VXLAN", difficulty: 2,
  q: "Two EVPN leaf switches host the same tenant VRF but use different Layer 3 VNIs for it. The design uses symmetric routing. Which mapping should be made consistent?",
  options: ["The VRF-to-L3VNI mapping (nv set vrf RED evpn vni <same value>) so the tenant VRF uses the identical L3VNI on every leaf", "The VLAN-to-L2VNI mapping of the host VLAN", "The router-id of each leaf", "The BGP AS number of each leaf"],
  answer: 0, multi: false,
  explanation: "Symmetric EVPN routing forwards inter-subnet tenant traffic over a dedicated Layer 3 VNI attached to the tenant VRF: the ingress leaf routes into the VRF, encapsulates with the L3VNI, and the egress leaf uses that L3VNI to pick the right VRF and route to the destination. If leaf-1 uses L3VNI 4001 and leaf-2 uses 4002 for VRF RED, the egress leaf receives a VNI it does not associate with RED and drops or misroutes the traffic. The rule is one VRF = one L3VNI, identical fabric-wide (the Spectrum-X multi-tenancy standard), configured with nv set vrf RED evpn vni 4001 on every leaf. L2VNIs for a given VLAN also must match, but that is the bridging path; router-ids and AS numbers are deliberately unique per device.",
  distractors: "Router-id and AS must be unique, not consistent; the L2VNI matters for bridging, not for the symmetric routed path.",
  ref: "Module 11 · L3VNI per VRF (symmetric routing)",
  tags: ["evpn", "l3vni", "symmetric-routing", "vrf", "missed-before"]
},
{
  id: "spx-029", domain: "spx", topic: "EVPN-VXLAN", difficulty: 2,
  q: "Tenant RED unexpectedly learns tenant BLUE prefixes. RED's EVPN import policy includes BLUE's export route target. Which change directly restores the intended route isolation?",
  options: ["Remove BLUE's route target from RED's import list so RED imports only its own RT", "Change BLUE's L3VNI", "Disable the l2vpn-evpn address family on the spine", "Assign RED and BLUE different router-ids"],
  answer: 0, multi: false,
  explanation: "EVPN uses route targets to decide which routes a VRF imports. Importing BLUE's export RT into RED is exactly a route-leaking configuration; removing it restores isolation without touching the data plane. Changing VNIs or router-ids does not alter RT-based import.",
  ref: "Module 11 · Multi-tenancy with VRF/EVPN",
  tags: ["evpn", "route-target", "isolation"]
},
{
  id: "spx-030", domain: "spx", topic: "EVPN-VXLAN", difficulty: 2,
  q: "Hosts in VLAN 10 sit behind different leaves and must keep the same default gateway when migrated between racks. Which Cumulus feature provides this?",
  options: ["VRR (Virtual Router Redundancy) anycast gateway on the vlan10 SVI with the same address on every leaf", "HSRP on the spine", "A static route on each host pointing at its local leaf", "EVPN multihoming on the host bond"],
  answer: 0, multi: false,
  explanation: "nv set interface vlan10 ipv4 vrr address 192.168.1.254/24 on every leaf creates a distributed anycast gateway with a shared virtual MAC, so a host keeps 192.168.1.254 as its gateway regardless of which leaf it lands on. Multihoming is about a server dual-attached to two leaves, not gateway mobility.",
  ref: "Module 11 · Method 3 gateway (VRR)",
  tags: ["evpn", "vrr", "anycast-gateway"]
},
{
  id: "spx-031", domain: "spx", topic: "EVPN multihoming", difficulty: 2,
  q: "A GPU server is dual-attached with an LACP bond to two leaves that run EVPN. Which design avoids a mandatory inter-switch peer link and scales beyond two ToRs?",
  options: ["EVPN multihoming with the same Ethernet Segment Identifier (ESI) configured on the bond at each leaf", "MLAG with a peer-link and backup IP", "Spanning tree with one blocked uplink", "Two independent bridges without a bond"],
  answer: 0, multi: false,
  explanation: "EVPN-MH replaces MLAG in Clos fabrics: both leaves advertise the server's segment with a shared ESI (segment MAC + local-id) via EVPN type-1/2/4 routes, so no proprietary peer link is needed and more than two ToRs can share a segment on Spectrum-2 and later. Verify with nv show evpn multihoming esi.",
  ref: "Module 11 · EVPN multihoming vs MLAG",
  tags: ["evpn-mh", "esi", "mlag"]
},
{
  id: "spx-032", domain: "spx", topic: "EVPN-VXLAN", difficulty: 3,
  q: "After enabling VXLAN, hosts can ping with small packets but large RDMA transfers fail on an overlay path. WJH reports MTU-related drops on the spine-facing ports. What is the most likely cause?",
  options: ["The underlay MTU does not account for the ~50-byte VXLAN overhead; raise the fabric MTU (e.g. 9216) above the host MTU", "The VNI exceeds 16 million", "ECN is marking too aggressively", "VRR is misconfigured on the SVI"],
  answer: 0, multi: false,
  explanation: "VXLAN adds outer Ethernet (14) + IP (20) + UDP (8) + VXLAN (8) = 50 bytes. If hosts send 9000-byte frames and the underlay links are also 9000, the encapsulated 9050-byte packet exceeds the link MTU and is dropped, which WJH classifies as a Layer 3 MTU drop. Set the switch and uplink MTU higher than the host MTU.",
  ref: "Module 11 · VXLAN overhead · Module 12 · WJH categories",
  tags: ["vxlan", "mtu", "wjh"]
},

// ───────────────────────────── spx — NVIDIA Air / DSX Air ─────────────────────────────
{
  id: "spx-033", domain: "spx", topic: "NVIDIA Air", difficulty: 2,
  q: "An NVIDIA Air simulation contains the expected leaf and spine nodes, but one planned uplink is absent from the topology file. Which change makes the simulation represent that connection?",
  options: ["Add a link entry pairing the two node interfaces (e.g. spine-1:swp12 -- leaf-2:swp12) in the topology's links section and re-import", "Add a BGP neighbour statement on both switches", "Add a new node for the missing cable", "Enable the Services option to expose the port"],
  answer: 0, multi: false,
  explanation: "In Air the physical cabling is defined by the topology file: JSON has a links array of interface pairs, DOT uses \"spine-1\":\"swp12\" -- \"leaf-2\":\"swp12\". Configuration inside the NOS cannot create a cable; the link must exist in the topology. Services only publish ports (like SSH) to the outside.",
  ref: "Module 11 · Importing custom topologies (JSON / DOT)",
  tags: ["air", "topology", "links"]
},
{
  id: "spx-034", domain: "spx", topic: "NVIDIA Air", difficulty: 1,
  q: "A team wants to compare a BGP policy change against its current working NVIDIA Air simulation and then return to the baseline. What should be captured before editing?",
  options: ["A snapshot of the simulation", "A screenshot of the topology canvas", "The output of nv show interface on one leaf", "An export of the DOT file only"],
  answer: 0, multi: false,
  explanation: "Air's Snapshot feature saves the full simulation state (all node configs and disks) and can be restored, which is the supported way to A/B a change and roll back. Exporting the topology file captures only cabling, not device configuration.",
  ref: "Module 11 · DSX Air platform capabilities (Snapshot)",
  tags: ["air", "snapshot"]
},
{
  id: "spx-035", domain: "spx", topic: "NVIDIA Air", difficulty: 2,
  q: "A DOT topology import into NVIDIA Air fails. The file contains the line \"leaf-1\":\"eth1\" to \"server-1\":\"eth1\". Which two corrections are needed? (Choose two.)",
  options: ["Replace the keyword to with the link operator --", "Switch ports on Cumulus nodes must be named swpX, not ethX", "Node names must be unquoted", "Links must use a single dash -", "The server interface must be renamed swp1"],
  answer: [0, 1], multi: true,
  explanation: "Graphviz DOT links use the -- operator; 'to' and a single '-' are the classic mistakes. Cumulus Linux switch ports are swp1, swp2, ..., while servers keep ethX. Names and ports should stay quoted.",
  ref: "Module 11 · DOT example and common mistakes",
  tags: ["air", "dot", "swp"]
},
{
  id: "spx-036", domain: "spx", topic: "NVIDIA Air", difficulty: 2,
  q: "An engineer wants to reach the simulated switches from a laptop terminal rather than the browser console. Which Air feature and node are involved?",
  options: ["Enable an SSH Service on the oob-mgmt-server and jump from there over the OOB network", "Enable the Snapshot feature on spine-1", "Export the topology as JSON", "Assign a public IP to each switch's swp1"],
  answer: 0, multi: false,
  explanation: "Every Air simulation includes an automatic out-of-band network and an oob-mgmt-server; the Services menu exposes a port (typically SSH on the oob-mgmt-server) to the internet so you can SSH in and hop to any node over its eth0 management interface.",
  ref: "Module 11 · DSX Air platform capabilities (Services, OOB network)",
  tags: ["air", "services", "oob"]
},
{
  id: "spx-037", domain: "spx", topic: "NVIDIA Air", difficulty: 2,
  q: "Which phase of the network lifecycle is best supported by using NVIDIA Air to validate golden configurations and Ansible playbooks before the first physical rollout?",
  options: ["Day 1 (build/deploy)", "Day 2 (operate)", "Day 0 (design) only", "None; Air is for Day 2 troubleshooting only"],
  answer: 0, multi: false,
  explanation: "Air spans all phases, but validating golden configs and automation ahead of deployment is the Day 1 role; Day 0 is topology/protocol design validation and Day 2 is reproducing issues and testing fixes/upgrades with NetQ integration.",
  ref: "Module 11 · Role of NVIDIA Air across the lifecycle",
  tags: ["air", "day0-day1-day2"]
},

// ───────────────────────────── spx — WJH ─────────────────────────────
{
  id: "spx-038", domain: "spx", topic: "WJH", difficulty: 2,
  q: "WJH reports that packets to a destination are dropped because no route exists. The relevant links remain up. Which investigation most directly addresses the reported reason?",
  options: ["Check the routing table and BGP advertisements for the destination prefix (nv show vrf default router rib ipv4 route, nv show vrf default router bgp neighbor)", "Check the cable and transceiver with mlxlink", "Increase the lossless buffer for priority 3", "Check the VLAN membership of the access port"],
  answer: 0, multi: false,
  explanation: "WJH gives the exact drop reason from the ASIC. 'No route' is a Layer 3 (routing) category event, so the fix is on the control plane: is the prefix in the RIB/FIB, is BGP advertising it, is there a blackhole? Physical and buffer checks do not match the stated reason.",
  ref: "Module 12 · WJH event categories",
  tags: ["wjh", "routing", "drop-reason"]
},
{
  id: "spx-039", domain: "spx", topic: "WJH", difficulty: 2,
  q: "During a training burst, telemetry shows rising queue occupancy and buffer drops on an uplink, while physical error counters remain stable. Which condition is best supported by this evidence?",
  options: ["Congestion (oversubscription of the uplink), not a physical-layer fault", "A failing transceiver", "An MTU mismatch", "A routing loop"],
  answer: 0, multi: false,
  explanation: "Buffer tail drops with clean physical counters are the signature of congestion: more traffic arrives than the egress can drain. WJH classifies these as Buffer & Congestion events. A bad optic would show symbol/CRC errors; MTU and loops produce their own L3 reasons (MTU exceeded, TTL expired).",
  ref: "Module 12 · WJH categories (buffer & congestion)",
  tags: ["wjh", "congestion", "buffer"]
},
{
  id: "spx-040", domain: "spx", topic: "WJH", difficulty: 1,
  q: "Which commands show WJH status on a Cumulus switch and the aggregated drop history on the NetQ server, respectively?",
  options: ["nv show system wjh on the switch; netq show wjh-drop on NetQ", "nv show qos roce on the switch; netq check wjh on NetQ", "nv show interface on the switch; netq show events on NetQ", "cl-resource-query on the switch; netq show agents on NetQ"],
  answer: 0, multi: false,
  explanation: "WJH runs on the switch (what-just-happened service, enabled by default) and is inspected with nv show system wjh; triggers are set per channel (nv set system wjh channel forwarding trigger l3). The WJH agent streams events to NetQ where netq show wjh-drop (optionally between now and 1h) lists drops with reasons.",
  ref: "Module 12 · WJH useful commands",
  tags: ["wjh", "netq", "commands"]
},
{
  id: "spx-041", domain: "spx", topic: "WJH", difficulty: 2,
  q: "A server team claims their frames are correctly tagged, but WJH shows Layer 2 drops with reason 'VLAN mismatch' on leaf01 swp5. What is the most direct conclusion?",
  options: ["The ingress port's VLAN configuration does not include the tag the host is sending; compare nv show interface swp5 bridge domain with the host VLAN", "The spine has no route to the server", "The transceiver is failing", "The ECN threshold is too low"],
  answer: 0, multi: false,
  explanation: "WJH's Layer 2 category reports VLAN tag mismatches between the frame and the port's allowed/untagged VLAN set. The ASIC-level reason removes the guesswork: fix the bridge-domain membership on swp5 or the host tagging.",
  ref: "Module 12 · WJH event categories (Layer 2)",
  tags: ["wjh", "vlan", "l2"]
},

// ───────────────────────────── spx — NetQ ─────────────────────────────
{
  id: "spx-042", domain: "spx", topic: "NetQ", difficulty: 2,
  q: "NetQ shows moderate average utilization on a port, but users report short latency spikes. Which additional view best tests whether brief queue buildups are being hidden by the average?",
  options: ["High-frequency ASIC telemetry such as queue-length histograms / buffer occupancy over time for that port", "The port's LLDP neighbour table", "The 24-hour average utilisation graph", "The switch inventory card"],
  answer: 0, multi: false,
  explanation: "Microbursts last microseconds to milliseconds and vanish in minute-level averages. NetQ's Spectrum ASIC telemetry (queue histograms, latency and buffer occupancy sampled at high frequency) reveals the short buildups that cause tail latency. A longer average only hides them more.",
  ref: "Module 12 · What makes NetQ unique (millisecond ASIC visibility)",
  tags: ["netq", "microburst", "histogram"]
},
{
  id: "spx-043", domain: "spx", topic: "NetQ", difficulty: 2,
  q: "An application slows at 14:00, but the fabric is healthy when examined at 14:30. Which NetQ investigation is most useful for identifying a transient network cause?",
  options: ["Use NetQ's time-travel queries (e.g. netq show events around 14:00 or netq show wjh-drop between <t1> and <t2>) to inspect state and drops at the time of the incident", "Run netq check bgp now", "Reboot the NetQ agents to refresh data", "Read nv show interface on the leaf now"],
  answer: 0, multi: false,
  explanation: "NetQ stores historical telemetry, so you can query what the fabric looked like at the moment of the problem instead of the current healthy state. Events, WJH drops, BGP/EVPN validations and interface counters all accept time ranges (around, between ... and ...). Point-in-time checks after recovery miss transient causes.",
  ref: "Module 12 · NetQ core commands / use cases",
  tags: ["netq", "time-travel", "events"]
},
{
  id: "spx-044", domain: "spx", topic: "NetQ", difficulty: 1,
  q: "Which NetQ command validates the health of the EVPN/VXLAN overlay across the fabric (VNIs, remote VTEPs, EVPN sessions)?",
  options: ["netq check evpn", "netq show agents", "netq check bgp", "netq show version"],
  answer: 0, multi: false,
  explanation: "netq check <protocol> runs a fabric-wide validation; netq check evpn verifies VNI consistency, VTEP reachability and EVPN session state, while netq check bgp covers the underlay sessions and netq check mtu finds mismatches. netq show agents only reports agent connectivity.",
  ref: "Module 12 · Using NetQ core commands",
  tags: ["netq", "check", "evpn"]
},
{
  id: "spx-045", domain: "spx", topic: "NetQ", difficulty: 2,
  q: "A team wants NetQ Flow Analysis to trace a RoCE flow across the fabric, but the option is unavailable. Which requirements must be met? (Choose two.)",
  options: ["Switches with Spectrum-2 or later ASICs running Cumulus Linux 5.x", "NetQ Lifecycle Management (LCM) enabled for the switches", "UFM installed on the NetQ server", "Switches running MLNX-OS", "The RoCE profile set to lossy"],
  answer: [0, 1], multi: true,
  explanation: "Flow Analysis uses ASIC telemetry that exists on Spectrum-2+ with Cumulus 5.x, and NetQ requires those switches to be managed through LCM. UFM and MLNX-OS belong to the InfiniBand side.",
  ref: "Module 12 · NetQ minimum requirements",
  tags: ["netq", "flow-analysis", "lcm"]
},
{
  id: "spx-046", domain: "spx", topic: "NetQ", difficulty: 2,
  q: "After a NetQ upgrade, several switches disappear from the validation results. Which command first confirms whether telemetry is still arriving from those devices?",
  options: ["netq show agents", "netq check bgp", "netq show wjh-drop", "nv show system wjh"],
  answer: 0, multi: false,
  explanation: "netq show agents lists every NetQ agent with connectivity and status (Fresh/Rotten). A device missing from validations with a rotten or absent agent indicates a collection problem, not a fabric problem; fix the agent before trusting any check output.",
  ref: "Module 12 · Using NetQ core commands",
  tags: ["netq", "agents"]
},

// ───────────────────────────── spx — DOCA / SuperNIC / DPU ─────────────────────────────
{
  id: "spx-047", domain: "spx", topic: "DOCA", difficulty: 1,
  q: "An administrator prepares DOCA-Host installation for an x86 server. A downloaded package targets a different processor architecture and operating-system release. What should be done before installation?",
  options: ["Obtain the DOCA-Host package that matches the host's CPU architecture (x86_64) and exact OS distribution/version", "Install it anyway with --force", "Convert the package with alien", "Install it on the BlueField Arm cores instead"],
  answer: 0, multi: false,
  explanation: "DOCA-Host packages (doca-all, doca-networking, doca-ofed profiles) are built per architecture (x86_64 vs aarch64) and per OS release (e.g. Ubuntu 22.04 vs 24.04, RHEL 9.x) because they contain kernel modules. A mismatched package will fail or load incompatible drivers; always download the matching repository/package from the DOCA downloads page.",
  ref: "Module 5 · MLNX_OFED vs DOCA_OFED · Module 12 · DOCA",
  tags: ["doca", "install"]
},
{
  id: "spx-048", domain: "spx", topic: "SuperNIC vs DPU", difficulty: 2,
  q: "A BlueField-3 card must act as a transparent high-speed NIC with no Arm-side services, and another identical card must run OVS and a firewall on its Arm cores. Which mlxconfig settings apply, and how is the change activated?",
  options: ["INTERNAL_CPU_MODEL=0 for NIC mode and INTERNAL_CPU_MODEL=1 for DPU mode, activated with mlxfwreset (or a power cycle)", "LINK_TYPE_P1=1 for NIC mode and LINK_TYPE_P1=2 for DPU mode, activated with nv config apply", "SRIOV_EN=0 for NIC mode and SRIOV_EN=1 for DPU mode, activated immediately", "NUM_OF_VFS=0 and NUM_OF_VFS=8, activated with ibdiagnet"],
  answer: 0, multi: false,
  explanation: "mlxconfig -d /dev/mst/<dev> s INTERNAL_CPU_MODEL=1 selects DPU (embedded CPU) mode where the Arm cores own the datapath and DOCA services run; 0 selects NIC mode where the host owns the NIC and the Arm side is bypassed. The setting takes effect only after a firmware reset (mlxfwreset -d <dev> reset) or power cycle. LINK_TYPE selects InfiniBand vs Ethernet, unrelated to mode.",
  ref: "Module 12 · Verifying and changing DPU mode",
  tags: ["bluefield", "mlxconfig", "dpu-mode", "nic-mode"]
},
{
  id: "spx-049", domain: "spx", topic: "SuperNIC vs DPU", difficulty: 2,
  q: "Which BlueField personality is the right fit for east-west GPU-to-GPU traffic in a Spectrum-X cluster, and which for north-south infrastructure offload with zero-trust security?",
  options: ["SuperNIC for east-west AI traffic; BlueField DPU for north-south infrastructure offload", "DPU for east-west; SuperNIC for north-south", "Both roles always require the DPU variant", "ConnectX-7 for east-west; SuperNIC for north-south"],
  answer: 0, multi: false,
  explanation: "The SuperNIC is optimised for the AI fabric: hardware congestion control (PCC), adaptive-routing support and packet reordering in a small form factor. The DPU runs infrastructure services (OVS, firewall, NVMe-oF, encryption) on its Arm cores and sits on the north-south/cloud boundary. Same silicon family, different provisioning.",
  ref: "Module 12 · SuperNIC vs BlueField DPU",
  tags: ["supernic", "dpu", "east-west"]
},
{
  id: "spx-050", domain: "spx", topic: "Troubleshooting on Spectrum", difficulty: 2,
  q: "A Spectrum switch has free system RAM, but new forwarding entries fail to install and WJH is quiet. Which command directly checks ASIC forwarding-table resource usage on Cumulus Linux?",
  options: ["cl-resource-query", "free -h", "nv show system memory", "netq show agents"],
  answer: 0, multi: false,
  explanation: "cl-resource-query reports the Spectrum ASIC hardware tables (routes, host entries, MAC entries, ACLs, ECMP groups) with current usage against the limits set by the active forwarding profile. System RAM is unrelated to ASIC TCAM/table exhaustion. If a table is full, change the forwarding table profile (nv set system forwarding profile ...) with care because profiles trade MAC capacity against route capacity.",
  ref: "Module 12 · Troubleshooting tools on Spectrum",
  tags: ["cl-resource-query", "asic", "tables"]
},

// ───────────────────────────── k8s — Network Operator ─────────────────────────────
{
  id: "k8s-001", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "A worker node advertises an RDMA extended resource after Network Operator deployment. A pod needs access to that resource. Which workload configuration connects the pod to the device-plugin allocation?",
  options: ["Request the extended resource in the pod spec under resources.limits (e.g. rdma/rdma_shared_device_a: 1) and attach the RDMA network with the k8s.v1.cni.cncf.io/networks annotation", "Set hostNetwork: true so the pod sees all host devices", "Mount /dev/infiniband as a hostPath volume", "Add a nodeSelector for the node that has the NIC"],
  answer: 0, multi: false,
  explanation: "The RDMA shared device plugin (or SR-IOV device plugin) exposes the NIC as a Kubernetes extended resource such as rdma/rdma_shared_device_a; the scheduler and kubelet hand a device to a container only when the pod requests it under resources.limits (requests must equal limits for extended resources). The device plugin then injects the /dev/infiniband character devices. For the actual data-plane interface the pod also needs the secondary network: the k8s.v1.cni.cncf.io/networks annotation referencing the NetworkAttachmentDefinition created by a MacvlanNetwork/HostDeviceNetwork/IPoIBNetwork CR via Multus. hostNetwork or hostPath bypass the device plugin and are not the supported pattern; a nodeSelector only places the pod.",
  distractors: "hostNetwork gives host interfaces but does not interact with the device plugin's allocation and defeats isolation.",
  ref: "Module 12 · Network Operator (RDMA for pods)",
  tags: ["network-operator", "device-plugin", "extended-resource", "multus", "missed-before"]
},
{
  id: "k8s-002", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "The Network Operator controller is running, but NicClusterPolicy reports that a managed driver component is not ready. Which verification should come next?",
  options: ["Inspect the component pods in the operator namespace (kubectl get pods -n nvidia-network-operator) and their logs/events for the driver container", "Reinstall Kubernetes on the worker", "Delete the NicClusterPolicy and recreate it", "Check nv show system wjh on the leaf switch"],
  answer: 0, multi: false,
  explanation: "NicClusterPolicy status aggregates the state of each managed component (OFED/DOCA driver DaemonSet, RDMA shared device plugin, SR-IOV plugin, Multus, IPAM). When one is notReady, kubectl get nicclusterpolicy -o yaml names it; the next step is kubectl get pods -n nvidia-network-operator and kubectl logs/describe on that pod to find the failure (image pull, kernel mismatch, node not matching the selector).",
  ref: "Module 12 · NVIDIA Network Operator",
  tags: ["network-operator", "nicclusterpolicy", "troubleshooting"]
},
{
  id: "k8s-003", domain: "k8s", topic: "Network Operator", difficulty: 1,
  q: "Which Kubernetes custom resource is the primary object an administrator edits to tell the NVIDIA Network Operator which components (OFED driver, RDMA device plugin, SR-IOV plugin, secondary network CNIs) to deploy?",
  options: ["NicClusterPolicy", "ClusterPolicy (GPU Operator)", "NetworkAttachmentDefinition", "SriovNetworkNodePolicy"],
  answer: 0, multi: false,
  explanation: "NicClusterPolicy is the Network Operator's cluster-wide CR: its spec lists ofedDriver, rdmaSharedDevicePlugin, sriovDevicePlugin, secondaryNetwork (Multus, CNI plugins, IPAM) and so on. ClusterPolicy belongs to the GPU Operator; NetworkAttachmentDefinition is what Multus consumes and is generated from the operator's network CRs.",
  ref: "Module 12 · NVIDIA Kubernetes Operators",
  tags: ["network-operator", "nicclusterpolicy"]
},
{
  id: "k8s-004", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "How does an administrator confirm that a worker node is advertising RDMA devices to the scheduler after the device plugin starts?",
  options: ["kubectl describe node <node> and look for rdma/... entries under Capacity and Allocatable", "kubectl get nodes -o wide", "ibstat on the control-plane node", "kubectl get svc -A"],
  answer: 0, multi: false,
  explanation: "Device plugins register extended resources with the kubelet, which publishes them in the node object. kubectl describe node shows e.g. rdma/rdma_shared_device_a: 63 under Allocatable (shared plugin) or nvidia.com/sriov_rdma: 8 (SR-IOV). Without these entries pods requesting the resource stay Pending.",
  ref: "Module 12 · Network Operator (RDMA for pods)",
  tags: ["device-plugin", "allocatable", "kubectl"]
},
{
  id: "k8s-005", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "A training cluster needs many pods per node to share one ConnectX adapter for RDMA, without hardware virtual functions. Which Network Operator component provides this?",
  options: ["The RDMA shared device plugin (rdmaSharedDevicePlugin) with a HostDevice or MacVLAN secondary network", "The SR-IOV network operator with one VF per pod", "The IPoIB CNI only", "The GPU Operator's device plugin"],
  answer: 0, multi: false,
  explanation: "The RDMA shared device plugin exposes a configurable number of allocations of the same RDMA device so multiple pods share it (shared mode). SR-IOV instead carves the NIC into VFs and gives each pod its own VF with stronger isolation and native performance; the exam contrasts shared = many pods one NIC, SR-IOV = VF per pod.",
  ref: "Module 12 · Checkpoint Q6 shared RDMA plugin vs SR-IOV",
  tags: ["rdma-shared-device-plugin", "sriov"]
},
{
  id: "k8s-006", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "Pods must receive IP addresses on a secondary RDMA network defined by a MacvlanNetwork CR. Which component is responsible for IP assignment?",
  options: ["An IPAM plugin deployed by the operator (e.g. whereabouts or nv-ipam) referenced in the network CR's ipam section", "The Kubernetes Service controller", "DHCP on the leaf switch", "kube-proxy"],
  answer: 0, multi: false,
  explanation: "Multus attaches the secondary interface, but addressing comes from an IPAM CNI; the Network Operator can deploy whereabouts or NVIDIA IPAM (nv-ipam) and the MacvlanNetwork/HostDeviceNetwork/IPoIBNetwork CR carries the ipam JSON (range, exclusions). Services and kube-proxy only cover the primary cluster network.",
  ref: "Module 12 · Network Operator components (Multus, IPAM)",
  tags: ["ipam", "whereabouts", "nv-ipam", "multus"]
},
{
  id: "k8s-007", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "GPUs and RDMA NICs are both present, but NCCL inside the pods falls back to a host-memory copy instead of GPUDirect RDMA. Which Network Operator-managed component is most likely missing?",
  options: ["The NVIDIA peer memory (nvidia-peermem / nv_peer_mem) driver that lets the RDMA NIC read GPU memory directly", "The Multus CNI", "The IPoIB CNI", "The whereabouts IPAM"],
  answer: 0, multi: false,
  explanation: "GPUDirect RDMA requires the peer-memory kernel module so the HCA can DMA to and from GPU BAR memory. The Network Operator (with the GPU Operator providing the GPU driver) can deploy it as part of the OFED/DOCA driver container. Networking CNIs give connectivity but not the zero-copy GPU path.",
  ref: "Module 3 · GPUDirect RDMA · Module 12 · Two operators together",
  tags: ["gpudirect", "peermem", "nccl"]
},
{
  id: "k8s-008", domain: "k8s", topic: "Network Operator", difficulty: 1,
  q: "Which statement correctly splits responsibilities between the NVIDIA GPU Operator and the NVIDIA Network Operator?",
  options: ["GPU Operator installs GPU drivers, container toolkit and DCGM; Network Operator installs OFED/DOCA drivers, RDMA/SR-IOV device plugins and secondary-network CNIs", "GPU Operator handles RDMA device plugins; Network Operator handles CUDA", "Both install the same components for redundancy", "Network Operator installs the GPU driver when GPUs are present"],
  answer: 0, multi: false,
  explanation: "The GPU Operator automates the GPU software stack (driver, container toolkit, device plugin, DCGM monitoring). The Network Operator automates networking (DOCA-OFED driver container, RDMA shared / SR-IOV device plugins, Multus, IPAM, IPoIB/macvlan/host-device CNIs). Together they give a pod a GPU and an RDMA path, enabling GPUDirect RDMA end to end.",
  ref: "Module 12 · Two important operators",
  tags: ["gpu-operator", "network-operator"]
},
{
  id: "k8s-009", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "Which Helm-based sequence installs the Network Operator in its own namespace?",
  options: ["helm repo add nvidia https://helm.ngc.nvidia.com/nvidia; helm repo update; helm install network-operator nvidia/network-operator -n nvidia-network-operator --create-namespace", "kubectl apply -f nicclusterpolicy.yaml with no operator installed", "apt install nvidia-network-operator on each worker", "ansible-galaxy collection install nvidia.nvue"],
  answer: 0, multi: false,
  explanation: "The operator ships as a Helm chart in the NVIDIA NGC Helm repository; installing it creates the controller deployment and CRDs. Only afterwards does applying a NicClusterPolicy make sense. The NVUE collection is for switches, and the operator is not a per-node package.",
  ref: "Module 12 · NVIDIA Network Operator",
  tags: ["helm", "install"]
},
{
  id: "k8s-010", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "A pod requesting rdma/rdma_shared_device_a: 1 stays Pending with the scheduler message 'Insufficient rdma/rdma_shared_device_a'. The NIC is present on the node. What is the most likely cause?",
  options: ["The RDMA shared device plugin is not running on that node or its selector does not match the adapter, so the node advertises 0 of the resource", "The pod lacks a nodeSelector", "The switch port is down", "The pod's image is too large"],
  answer: 0, multi: false,
  explanation: "'Insufficient <extended resource>' means no node offers enough allocatable units. Check kubectl describe node for the rdma/ entry and the device plugin pod on that node (kubectl get pods -n nvidia-network-operator -o wide); a wrong vendor/device selector in the NicClusterPolicy rdmaSharedDevicePlugin config leaves the count at zero.",
  ref: "Module 12 · Network Operator troubleshooting",
  tags: ["device-plugin", "pending", "scheduling"]
},
{
  id: "k8s-011", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "On a worker node, an engineer must confirm which RDMA device (mlx5_x) maps to which Linux netdev before writing a HostDeviceNetwork CR. Which utility provides this mapping?",
  options: ["ibdev2netdev", "ibstat", "kubectl get nodes", "nv show interface"],
  answer: 0, multi: false,
  explanation: "ibdev2netdev (from OFED/DOCA) prints lines like mlx5_0 port 1 ==> ens1f0 (Up), tying the RDMA device to its network interface and link state. ibstat shows port state and LIDs but not the netdev name; the other commands are not host tools.",
  ref: "Module 12 · Network Operator (RDMA for pods)",
  tags: ["ibdev2netdev", "host-tools"]
},
{
  id: "k8s-012", domain: "k8s", topic: "Network Operator", difficulty: 2,
  q: "A cluster runs on an InfiniBand fabric. Pods need an IP interface on a partition (PKey) over the IB HCA. Which Network Operator CR and CNI are appropriate?",
  options: ["IPoIBNetwork CR using the IPoIB CNI (with the PKey defined on the Subnet Manager/UFM)", "MacvlanNetwork CR over an Ethernet NIC", "A plain hostNetwork pod", "A Kubernetes LoadBalancer Service"],
  answer: 0, multi: false,
  explanation: "For InfiniBand the operator's IPoIBNetwork CR generates a NetworkAttachmentDefinition using the IPoIB CNI, creating child IPoIB interfaces inside pods; partition membership is still controlled by the SM (OpenSM/UFM partitions). Macvlan applies to Ethernet NICs and Services do not create pod interfaces.",
  ref: "Module 12 · Network Operator components (IPoIB CNI) · Module 6 · PKeys",
  tags: ["ipoib", "pkey", "network-operator"]
},

// ───────────────────────────── auto — NVUE templates / API / Ansible / ZTP ─────────────────────────────
{
  id: "auto-001", domain: "auto", topic: "NVUE templates", difficulty: 2,
  q: "A reviewed NVUE YAML fragment adds a VLAN while the switch already has unrelated interface settings that should remain. Which operation stages the fragment as an incremental change?",
  options: ["nv config patch <file.yaml>", "nv config replace <file.yaml>", "nv config save", "nv config apply <file.yaml>"],
  answer: 0, multi: false,
  explanation: "nv config patch merges the YAML fragment into the pending revision, leaving everything not mentioned untouched; you then review with nv config diff and commit with nv config apply. nv config replace treats the file as the complete desired configuration and removes anything absent from it, which would wipe the unrelated interface settings.",
  ref: "Module 11 · NVUE workflow / templates",
  tags: ["nvue", "patch", "replace", "yaml"]
},
{
  id: "auto-002", domain: "auto", topic: "NVUE templates", difficulty: 2,
  q: "A switch's reviewed NVUE configuration is applied successfully, and automatic saving is disabled. Which action preserves the applied configuration across a reboot?",
  options: ["nv config save", "nv config apply", "nv config diff", "nv config history"],
  answer: 0, multi: false,
  explanation: "With auto-save disabled, the applied revision lives only in the running system. nv config save writes it to /etc/nvue.d/startup.yaml, which NVUE loads at boot. Enabling nv set system config auto-save enabled makes every apply persist automatically.",
  ref: "Module 11 · NVUE workflow",
  tags: ["nvue", "save", "startup"]
},
{
  id: "auto-003", domain: "auto", topic: "NVUE templates", difficulty: 1,
  q: "Before activating an NVUE template change, a reviewer wants to see the differences between the pending and applied configurations. Which command serves that purpose?",
  options: ["nv config diff", "nv config show", "nv show system", "nv config history"],
  answer: 0, multi: false,
  explanation: "nv config diff prints the delta between the pending revision and the applied configuration; with two revision IDs (nv config diff <rev1> <rev2>) it compares any two points in history. nv config show dumps a full configuration, not a delta.",
  ref: "Module 11 · NVUE show commands",
  tags: ["nvue", "diff", "review"]
},
{
  id: "auto-004", domain: "auto", topic: "NVUE templates", difficulty: 2,
  q: "A CI pipeline must push a complete golden configuration to a switch and guarantee that no stale settings survive. Which NVUE operation and follow-up are correct?",
  options: ["nv config replace golden.yaml, then nv config apply -y", "nv config patch golden.yaml, then nv config save", "nv config diff golden.yaml, then nv config history", "nv set system config golden.yaml"],
  answer: 0, multi: false,
  explanation: "replace loads the file as the entire desired state so anything not in golden.yaml is removed from the pending revision; apply with -y (--assume-yes) commits non-interactively, which is what pipelines need. patch would keep stale settings.",
  ref: "Module 11 · NVUE templates (patch vs replace)",
  tags: ["nvue", "replace", "ci", "assume-yes"]
},
{
  id: "auto-005", domain: "auto", topic: "NVUE templates", difficulty: 2,
  q: "Which command exports a switch's complete applied NVUE configuration in a format that can be stored in Git and later re-imported on another switch?",
  options: ["nv config show -o yaml > leaf01.yaml", "nv show interface -o json > leaf01.json", "cat /etc/network/interfaces > leaf01.txt", "nv config history > leaf01.yaml"],
  answer: 0, multi: false,
  explanation: "nv config show prints the applied configuration as NVUE YAML (the same format startup.yaml uses), which is exactly what nv config patch/replace consume. Interface show output is operational state, and /etc/network/interfaces is a Linux flat file that NVUE may ignore.",
  ref: "Module 11 · NVUE workflow",
  tags: ["nvue", "yaml", "export", "git"]
},
{
  id: "auto-006", domain: "auto", topic: "NVUE REST API", difficulty: 3,
  q: "An automation tool uses the NVUE REST API to configure a switch. Which sequence correctly changes configuration through the API?",
  options: ["POST /nvue_v1/revision to create a revision, PATCH the configuration paths with ?rev=<id>, then PATCH /nvue_v1/revision/<id> with {\"state\":\"apply\"}", "GET /nvue_v1/interface, then POST the changed JSON back to the same URL", "PUT /nvue_v1/apply with the full YAML", "Send nv set commands over SSH inside the HTTP body"],
  answer: 0, multi: false,
  explanation: "The NVUE API (default https://<switch>:8765/nvue_v1) mirrors the CLI model: configuration changes are staged against a revision (created with POST /nvue_v1/revision), objects are modified with PATCH using the rev query parameter, and the revision is applied (and optionally auto-saved) by PATCHing its state to apply. The Ansible nvidia.nvue collection wraps exactly this flow.",
  ref: "Module 11 · NVUE REST API parity",
  tags: ["nvue-api", "rest", "revision"]
},
{
  id: "auto-007", domain: "auto", topic: "NVUE REST API", difficulty: 2,
  q: "Which port and base path does an automation client use by default to reach the NVUE REST API on Cumulus Linux?",
  options: ["TCP 8765, https://<switch>:8765/nvue_v1", "TCP 443, https://<switch>/api/v1", "TCP 22, ssh://<switch>/nvue", "TCP 830, NETCONF over SSH"],
  answer: 0, multi: false,
  explanation: "The nvued REST service listens on HTTPS port 8765 and exposes the nvue_v1 API tree, which maps one-to-one to nv show/set paths. The nvidia.nvue Ansible modules talk to this endpoint.",
  ref: "Module 11 · NVUE REST API",
  tags: ["nvue-api", "port-8765"]
},
{
  id: "auto-008", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 2,
  q: "An Ansible playbook creates the same tenant VLAN on a defined group of leaf switches. Where should a shared VLAN identifier be stored to avoid repeating it in every host file?",
  options: ["In group_vars/leaf.yml (variables for the leaf inventory group)", "In host_vars/<each-leaf>.yml, copied to every leaf file", "Hard-coded inside each task", "In the ansible.cfg file"],
  answer: 0, multi: false,
  explanation: "Ansible variable precedence is built around scope: host_vars/<hostname>.yml holds values unique to one device (loopback IP, AS number, router-id), while group_vars/<groupname>.yml holds values shared by every member of an inventory group, such as a tenant VLAN ID, the RoCE profile or NTP servers. Putting the VLAN in group_vars/leaf.yml defines it once, keeps playbooks DRY, and changing the VLAN later is a one-line edit. Duplicating it in host_vars invites drift, hard-coding in tasks defeats reuse, and ansible.cfg is for Ansible's own settings, not network data. The NVUE collection roles rely on precisely this split: roles carry the pattern, group_vars/host_vars carry the differences.",
  distractors: "host_vars is correct for per-device values; a VLAN shared by the whole leaf group is a group variable.",
  ref: "Module 11 · What is an Ansible role (host_vars / group_vars)",
  tags: ["ansible", "group_vars", "host_vars", "missed-before"]
},
{
  id: "auto-009", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 2,
  q: "An NVUE Ansible playbook targets every switch in its inventory, but a VLAN rollout is intended for a leaf subgroup. What should the author change to restrict the rollout scope?",
  options: ["Set the play's hosts: to the leaf group (e.g. hosts: leaf), or run with --limit leaf", "Add become: true to the play", "Change the connection plugin to local", "Move the VLAN variable into host_vars"],
  answer: 0, multi: false,
  explanation: "The hosts: keyword of a play selects which inventory hosts or groups the tasks run against; hosts: all hits every device, hosts: leaf (a group defined as [leaf] in inventory.ini) restricts the play to leaves, and patterns like leaf:!leaf03 or --limit leaf01,leaf02 narrow it further at run time without editing the play. become controls privilege escalation, connection controls how Ansible talks to the device, and host_vars changes where a value is defined, none of which change the target scope. On Spectrum-X fabrics this matters because the same playbook that is harmless on leaves could, for example, add a VLAN/VNI to spines that should carry only the underlay.",
  distractors: "become and connection do not affect which hosts a play touches.",
  ref: "Module 11 · NVUE Collection for Ansible",
  tags: ["ansible", "hosts", "limit", "inventory", "missed-before"]
},
{
  id: "auto-010", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 1,
  q: "Which command installs the NVIDIA collection that provides Ansible modules for Cumulus Linux switches via the NVUE API?",
  options: ["ansible-galaxy collection install nvidia.nvue", "pip install nvidia-nvue", "apt install ansible-nvue", "helm install nvidia/nvue"],
  answer: 0, multi: false,
  explanation: "The nvidia.nvue collection on Ansible Galaxy contains modules (nvidia.nvue.config, interface, bridge, vlan, router, api ...) and roles that talk to the NVUE REST API, so each play becomes an atomic NVUE revision. The other commands are not how Ansible collections are distributed.",
  ref: "Module 11 · NVUE Collection for Ansible (install)",
  tags: ["ansible", "galaxy", "nvidia.nvue"]
},
{
  id: "auto-011", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 2,
  q: "Before applying a RoCE playbook to 40 production leaves, the operator wants to see what would change without modifying any switch. Which invocation is appropriate?",
  options: ["ansible-playbook -i inventory.ini roce.yml --check --diff", "ansible-playbook -i inventory.ini roce.yml --force", "ansible-playbook roce.yml --limit all", "ansible-playbook roce.yml -e apply=true"],
  answer: 0, multi: false,
  explanation: "--check runs the play in dry-run mode and --diff shows the before/after of idempotent modules, letting the operator review the planned NVUE changes safely. --limit all does not reduce scope and --force is not an ansible-playbook option.",
  ref: "Module 11 · Ansible automation with NVUE",
  tags: ["ansible", "check-mode", "diff"]
},
{
  id: "auto-012", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 2,
  q: "Each leaf needs its own loopback address, BGP AS and router-id, while the spine-facing interfaces are configured identically. Which Ansible structure keeps the playbook generic?",
  options: ["A reusable role whose tasks read per-device values from host_vars and shared values from group_vars (optionally rendering NVUE YAML with Jinja2 templates)", "One separate playbook per switch", "A single play with 40 hard-coded tasks", "Running nv set commands manually after the play"],
  answer: 0, multi: false,
  explanation: "Roles encapsulate the pattern (configure loopback, interfaces, BGP) once; variables supply the differences: host_vars/leaf01.yml carries loopback/AS/router-id, group_vars/leaf.yml carries the common uplink and QoS settings. Jinja2 templates can render a per-device NVUE YAML that is then pushed with nvidia.nvue.config or nv config patch.",
  ref: "Module 11 · What is an Ansible role",
  tags: ["ansible", "roles", "jinja2"]
},
{
  id: "auto-013", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 2,
  q: "An inventory file contains groups [spine] and [leaf]. A play with hosts: leaf runs an NVUE task twice and the second run reports changed: 0. What does this demonstrate?",
  options: ["Idempotency: the module compared desired and current state and made no change the second time", "A failure to connect on the second run", "That the switches rejected duplicate VLANs", "That the inventory lost the leaf group"],
  answer: 0, multi: false,
  explanation: "Well-written automation is idempotent: running it repeatedly converges to the same state and reports no changes when nothing needs to change. The nvidia.nvue modules and NVUE's declarative model make this natural; changed: 0 on a repeat run is the expected, healthy result.",
  ref: "Module 11 · Ansible automation with NVUE",
  tags: ["ansible", "idempotency"]
},
{
  id: "auto-014", domain: "auto", topic: "ZTP", difficulty: 2,
  q: "New Cumulus Linux leaves must configure themselves on first boot from a central script without an engineer typing commands. Which mechanism is designed for this, and how does the switch find the script?",
  options: ["Zero Touch Provisioning (ZTP): the switch requests DHCP on the management port and fetches the script URL from DHCP option 239 (or runs it from a local USB drive)", "NVUE auto-save: the switch downloads startup.yaml via nv config save", "Ansible pull from the switch's crontab", "LLDP: the spine pushes the configuration to the leaf"],
  answer: 0, multi: false,
  explanation: "Cumulus Linux boots into ZTP when no configuration exists: it obtains an address via DHCP on eth0 and uses the cumulus-provision-url (DHCP option 239) to download and execute a ZTP script (which can install licenses, apply nv config patch files, or kick off Ansible). A USB drive with a ztp script is the offline alternative. Check status with ztp -s and re-enable with ztp -e.",
  ref: "Module 11 · Cumulus Linux automation (ZTP)",
  tags: ["ztp", "dhcp-239", "day1"]
},
{
  id: "auto-015", domain: "auto", topic: "ZTP", difficulty: 2,
  q: "After an engineer logged into a brand-new switch to look around, ZTP no longer runs on later boots even though the DHCP server offers the provisioning URL. Which command reverts the switch so ZTP will run again?",
  options: ["ztp -e (re-enable ZTP) then reboot, or ztp -R to reset", "nv config apply", "nv config save", "ztp -s"],
  answer: 0, multi: false,
  explanation: "An interactive login or a manual configuration change disables ZTP to avoid overwriting work. ztp -s only shows the current ZTP state; ztp -e re-enables it (and ztp -R resets the switch to run ZTP on the next boot). NVUE apply/save do not affect ZTP.",
  ref: "Module 11 · Cumulus Linux automation (ZTP)",
  tags: ["ztp", "ztp-e", "ztp-s"]
},
{
  id: "auto-016", domain: "auto", topic: "NVUE templates", difficulty: 2,
  q: "An external tool writes /etc/network/interfaces directly, and NVUE keeps overwriting it on every apply. Which NVUE setting stops the conflict so each tool owns its own files?",
  options: ["nv set system config ignore-linux-files /etc/network/interfaces", "nv set system config auto-save disabled", "nv config detach", "chmod 444 /etc/network/interfaces"],
  answer: 0, multi: false,
  explanation: "By default NVUE renders its configuration into Linux flat files such as /etc/network/interfaces and /etc/frr/frr.conf. nv set system config ignore-linux-files <path> tells NVUE not to manage that file, so a legacy tool or script can own it while NVUE manages everything else. The other options do not change file ownership boundaries.",
  ref: "Module 11 · NVUE ignore-linux-files",
  tags: ["nvue", "ignore-linux-files"]
},
{
  id: "auto-017", domain: "auto", topic: "NVUE templates", difficulty: 2,
  q: "A change applied by a pipeline at 02:00 must be audited later: who applied it and what the configuration looked like at that revision. Which NVUE facilities provide this?",
  options: ["nv config history to list revisions (with timestamps and user) and nv config diff <rev1> <rev2> or nv config show --rev <id> to see content", "nv show system version", "/var/log/syslog only", "nv config save followed by nv config apply"],
  answer: 0, multi: false,
  explanation: "Every apply creates a numbered, timestamped revision attributed to the user or API client. nv config history enumerates them and diff/show against a revision ID reconstructs exactly what changed, which also enables rollback with nv config apply <rev_id>.",
  ref: "Module 11 · NVUE revision control",
  tags: ["nvue", "history", "audit"]
},
{
  id: "auto-018", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 2,
  q: "A play uses the nvidia.nvue.config module to push a rendered YAML and needs the change committed and persisted in one run. Which module parameters accomplish that?",
  options: ["Set the module to apply the revision (e.g. state: applied) and enable save/auto-save so the applied revision is written to startup", "Set gather_facts: false", "Use delegate_to: localhost", "Add ignore_errors: yes"],
  answer: 0, multi: false,
  explanation: "The nvidia.nvue modules stage changes against an NVUE revision; a parameter controls whether the revision is applied (committed) and whether it is saved to startup. Fact gathering, delegation and error handling do not commit or persist anything.",
  ref: "Module 11 · NVUE Collection for Ansible",
  tags: ["ansible", "nvidia.nvue.config", "apply", "save"]
},
{
  id: "auto-019", domain: "auto", topic: "NVUE templates", difficulty: 2,
  q: "A YAML template for RoCE contains the fragment below. What will it do when applied with nv config patch and nv config apply?\n\n- set:\n    qos:\n      roce:\n        enable: on\n        mode: lossless",
  options: ["Enable the RoCE lossless profile (PFC + ECN + DSCP mapping) while keeping all other existing settings", "Replace the entire switch configuration with only RoCE settings", "Disable RoCE because mode is specified", "Fail, because RoCE can only be configured from the CLI"],
  answer: 0, multi: false,
  explanation: "NVUE YAML is the declarative form of the CLI: this fragment equals nv set qos roce enable on and nv set qos roce mode lossless. Applied through patch it merges into the pending revision without touching unrelated configuration; the same YAML could be delivered by Ansible or the REST API.",
  ref: "Module 11 · Configuring RoCE · NVUE templates",
  tags: ["nvue", "yaml", "roce"]
},
{
  id: "auto-020", domain: "auto", topic: "Ansible (nvidia.nvue)", difficulty: 2,
  q: "An inventory.ini defines leaf01 and leaf02 under [leaf] and spine01 under [spine]. Which play header configures only the leaves while also allowing an ad-hoc single-switch test later?",
  options: ["hosts: leaf in the play, and ansible-playbook ... --limit leaf01 for the test", "hosts: all in the play, and a when: inventory_hostname == 'leaf01' on each task", "hosts: spine in the play, overridden by host_vars", "hosts: localhost with delegate_to on every task"],
  answer: 0, multi: false,
  explanation: "Scoping belongs in hosts: (group name leaf) and run-time narrowing in --limit; sprinkling when: conditions over every task is fragile and still evaluates the play on every host. host_vars cannot change targeting.",
  ref: "Module 11 · NVUE Collection for Ansible (inventory groups)",
  tags: ["ansible", "inventory", "limit", "hosts"]
}

);

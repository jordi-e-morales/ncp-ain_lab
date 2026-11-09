// NCP-AIN question bank — domains: dc (AI Data Center Design), ib (InfiniBand), tshoot (Troubleshooting Tools)
// Schema: see SCHEMA.md. Loaded via <script>, appends to window.NCP_QUESTIONS.
window.NCP_QUESTIONS = window.NCP_QUESTIONS || [];
window.NCP_QUESTIONS.push(
/* ===================== DC — AI Data Center Design and Optimization (12) ===================== */
{
  id: "dc-001", domain: "dc", topic: "Fabric roles in an AI data center", difficulty: 1,
  q: "An AI cluster needs administrators to reach server BMCs while the workload (compute) network is unavailable. Which fabric should provide this access?",
  options: [
    "The out-of-band (OOB) management network connected to the BMC ports",
    "The InfiniBand compute fabric using IPoIB",
    "The in-band management network shared with the storage fabric",
    "The NVLink domain through the NVSwitch management controller"
  ],
  answer: 0, multi: false,
  explanation: "A DGX SuperPOD / AI factory has four networks: compute (IB or Spectrum-X), storage, in-band management and out-of-band management. The OOB network is a separate, low-speed Ethernet that reaches BMCs, switch mgmt ports and PDUs so you can power-cycle and console into hardware even when the compute fabric or host OS is down. Anything that rides the compute fabric (IPoIB) or the host OS (in-band) disappears exactly when you need the BMC most.",
  ref: "Module 12 · OOB mgmt / DGX SuperPOD RA networks", tags: ["oob", "bmc", "four-networks"]
},
{
  id: "dc-002", domain: "dc", topic: "Rail-optimized topology", difficulty: 2,
  q: "Two otherwise identical GPU servers have their corresponding GPU-associated adapters cabled to different leaf switches (rails). The design specifies a rail-optimized compute fabric. Which correction restores the intended alignment?",
  options: [
    "Re-cable so that the adapter with the same index (NIC-1, NIC-2, ...) on every server lands on the same leaf switch",
    "Move both servers to the same leaf switch so all of their adapters share one rail",
    "Enable adaptive routing on the spines so cross-rail traffic is balanced automatically",
    "Change the routing engine to UPDN so the Subnet Manager tolerates the mismatch"
  ],
  answer: 0, multi: false,
  explanation: "In a rail-optimized design every NIC-1 goes to leaf L1, every NIC-2 to leaf L2, and so on. Same HCA index → same leaf. This keeps GPU-k to GPU-k traffic (the dominant NCCL pattern) one hop away on a single leaf and is also required for SHARP streaming-aggregation trees. Routing changes do not fix a cabling error; the physical rail assignment must match the reference architecture.",
  ref: "Module 12 · Rail-Optimised Design", tags: ["rail", "topology", "cabling"]
},
{
  id: "dc-003", domain: "dc", topic: "GPU data paths", difficulty: 1,
  q: "A distributed training application transfers data between a network adapter and GPU memory. The team wants to remove the intermediate host-memory copy. Which data path addresses that goal?",
  options: [
    "GPUDirect RDMA, so the NIC reads and writes GPU memory directly over PCIe",
    "GPUDirect Storage, so the NIC writes into NVMe and the GPU reads from there",
    "IPoIB with jumbo frames to reduce the number of copies per message",
    "NVLink between the GPU and the CPU to speed up the staging copy"
  ],
  answer: 0, multi: false,
  explanation: "GPUDirect RDMA lets an RDMA-capable NIC (ConnectX / BlueField) DMA directly into and out of GPU memory, bypassing the CPU and the system-memory bounce buffer. GPUDirect Storage is the equivalent for storage → GPU inside a host, not for the network path. IPoIB still traverses the kernel TCP/IP stack and host memory.",
  ref: "Module 3 · GPUDirect RDMA vs GPUDirect Storage", tags: ["gpudirect", "rdma"]
},
{
  id: "dc-004", domain: "dc", topic: "Scalable units", difficulty: 2,
  q: "An architect describes a DGX SuperPOD as being built from repeatable blocks, each containing a fixed number of DGX systems and their leaf switches, added as demand grows. What is this block called?",
  options: ["A scalable unit (SU)", "A rail group", "A super-spine pod", "An NVLink domain"],
  answer: 0, multi: false,
  explanation: "The scalable unit (SU) is the repeatable building block of the SuperPOD reference architecture: a set of DGX nodes plus the leaf switches that serve them, cabled identically every time. Capacity grows by adding SUs under the spine layer, which keeps cabling, addressing and automation predictable. An NVLink domain is the GPU scale-up domain inside a node or rack, not the fabric growth unit.",
  ref: "DGX SuperPOD Reference Architecture", tags: ["superpod", "scalable-unit"]
},
{
  id: "dc-005", domain: "dc", topic: "Fat-tree design", difficulty: 2,
  q: "A leaf switch has 32 ports connected to GPU servers. The design must be non-blocking (1:1). How many ports should connect upward to the spine layer at the same speed?",
  options: [
    "32 — uplink capacity must equal downlink capacity",
    "16 — a 2:1 oversubscription is the fat-tree standard",
    "8 — one uplink per spine is sufficient with adaptive routing",
    "64 — uplinks must be double the downlinks to absorb bursts"
  ],
  answer: 0, multi: false,
  explanation: "A fat-tree (Clos) is non-blocking when the aggregate uplink bandwidth of each leaf equals the aggregate downlink bandwidth: 32 host ports need 32 spine-facing ports at the same speed. Any ratio above 1:1 is oversubscription, which AI training fabrics avoid because collective operations saturate every link simultaneously.",
  ref: "Module 7 · Fat-Tree (CLOS)", tags: ["fat-tree", "oversubscription"]
},
{
  id: "dc-006", domain: "dc", topic: "Scale-up vs scale-out", difficulty: 1,
  q: "A proposal claims that NVLink can replace the InfiniBand fabric for a 512-GPU training cluster spread across 64 servers. Which statement correctly describes the roles?",
  options: [
    "NVLink/NVSwitch is the scale-up interconnect inside a node or rack; InfiniBand or Spectrum-X is the scale-out fabric between nodes",
    "NVLink is the scale-out fabric and InfiniBand only carries storage traffic",
    "Both are interchangeable because NCCL abstracts the transport",
    "NVLink replaces InfiniBand once GPUDirect RDMA is enabled"
  ],
  answer: 0, multi: false,
  explanation: "NVLink and NVSwitch connect GPUs inside a server or an NVL72 rack at TB/s scale (scale-up). Communication between servers requires a network fabric — InfiniBand or Spectrum-X Ethernet (scale-out). NCCL uses both: NVLink intra-node and RDMA inter-node, but it cannot make NVLink span racks.",
  ref: "Module 13 · NVLink exam hook", tags: ["nvlink", "scale-out"]
},
{
  id: "dc-007", domain: "dc", topic: "PXN", difficulty: 3,
  q: "In a rail-optimized fabric, GPU0 on server A must send to GPU3 on server B. Without optimization the traffic leaves on rail 0, crosses a spine and descends on rail 3. Which NCCL feature keeps this transfer on a single rail?",
  options: [
    "PXN (PCI × NVLink): the data moves over NVLink to the local GPU whose NIC is on rail 3, then exits on that NIC",
    "SHARP: the spine reduces the message so it does not need to cross rails",
    "Adaptive routing: the switch re-hashes the flow onto rail 3",
    "IB router support: the SM assigns an alias GID on rail 3"
  ],
  answer: 0, multi: false,
  explanation: "PXN (NCCL 2.12+) first moves the data intra-node over NVLink to the GPU attached to the NIC that sits on the destination rail, then sends it over the fabric. The network sees a one-hop, same-rail transfer and NCCL can aggregate messages. SHARP reduces collectives in switches, and adaptive routing balances paths; neither changes which rail a packet enters on.",
  ref: "Module 13 · PXN", tags: ["pxn", "nccl", "rail"]
},
{
  id: "dc-008", domain: "dc", topic: "Storage fabric", difficulty: 2,
  q: "A design reviewer asks why the reference architecture places storage on a fabric separate from the GPU compute fabric. Which benefit is the primary justification?",
  options: [
    "Storage traffic is isolated from collective-communication traffic, so dataset reads and checkpoints cannot congest the compute links",
    "Storage arrays only support Ethernet, so a second fabric is mandatory",
    "A separate fabric halves the number of optics required",
    "The Subnet Manager cannot address more than one storage node per subnet"
  ],
  answer: 0, multi: false,
  explanation: "A dedicated storage fabric gives predictable high-bandwidth data delivery and isolates storage I/O from compute (collective) traffic and management traffic. The trade-off is cost: switches, optics, NICs and operations are duplicated. Storage arrays can run on InfiniBand or Ethernet, and the SM has no such addressing limit.",
  ref: "Module 13 · Dedicated Storage Fabric", tags: ["storage", "isolation"]
},
{
  id: "dc-009", domain: "dc", topic: "SuperNIC vs DPU placement", difficulty: 2,
  q: "An AI factory design must choose adapters for two roles: GPU-to-GPU traffic inside the training cluster, and traffic between the cluster and users, storage and the internet. Which placement matches NVIDIA's guidance?",
  options: [
    "BlueField-3 SuperNICs for east-west GPU traffic; BlueField-3 DPUs for north-south infrastructure traffic",
    "BlueField-3 DPUs for east-west; ConnectX-6 for north-south",
    "SuperNICs for both roles because they have lower power draw",
    "DPUs for both roles because they run their own OS"
  ],
  answer: 0, multi: false,
  explanation: "The SuperNIC is tuned for east-west AI traffic: RoCE, programmable congestion control (DOCA PCC), adaptive-routing support and packet reordering. The DPU targets north-south infrastructure: OVS, firewall, encryption, NVMe-oF and zero-trust services running on its Arm cores. Both are BlueField silicon provisioned for different jobs.",
  ref: "Module 12 · East-West vs North-South", tags: ["supernic", "dpu", "east-west"]
},
{
  id: "dc-010", domain: "dc", topic: "DGX portfolio", difficulty: 1,
  q: "A research group needs a validated AI infrastructure that scales from a few to a few dozen DGX systems, with a reference network design but without the scale of thousands of GPUs. Which NVIDIA offering fits?",
  options: ["DGX BasePOD", "DGX SuperPOD", "DGX Station", "DGX Cloud"],
  answer: 0, multi: false,
  explanation: "DGX BasePOD is the validated small-to-medium cluster design (a few to dozens of DGX systems). SuperPOD is the large-scale platform built from scalable units up to thousands of GPUs; DGX Station is a single desk-side system; DGX Cloud is the managed, pay-as-you-go service.",
  ref: "Module 13 · DGX Portfolio", tags: ["dgx", "basepod", "superpod"]
},
{
  id: "dc-011", domain: "dc", topic: "AI factory components", difficulty: 2,
  q: "Which component of an AI factory network executes the congestion-control algorithm and reorders out-of-order packets so that per-packet adaptive routing can be used on Ethernet?",
  options: ["The BlueField-3 SuperNIC at the endpoint", "The Spectrum-4 switch ASIC", "The NetQ telemetry server", "The NVIDIA Network Operator"],
  answer: 0, multi: false,
  explanation: "Spectrum-X splits the job: the Spectrum-4 switch evaluates egress queue depth and sprays packets of a flow across the least-loaded paths; the BlueField-3 SuperNIC runs DOCA Programmable Congestion Control, rate-limits the sender and reassembles out-of-order packets before the GPU sees them. NetQ observes; the Network Operator deploys drivers in Kubernetes.",
  ref: "Module 12 · Congestion Control in Spectrum-X", tags: ["supernic", "adaptive-routing", "spectrum-x"]
},
{
  id: "dc-012", domain: "dc", topic: "GPU-to-GPU communication", difficulty: 2,
  q: "An 8-GPU server shows that GPU pairs communicate at full NVLink bandwidth regardless of which two GPUs are selected. Which component provides this all-to-all, non-blocking behavior inside the node?",
  options: ["NVSwitch", "A PCIe switch", "The Quantum-2 leaf switch", "The host CPU's UPI links"],
  answer: 0, multi: false,
  explanation: "NVSwitch is a crossbar for NVLink: every GPU in the node reaches every other GPU at full NVLink bandwidth, removing the topology limits of direct GPU-pair NVLink wiring. PCIe and UPI paths are far slower and involve the host; the Quantum-2 switch is the inter-node fabric.",
  ref: "Module 13 · NVSwitch", tags: ["nvswitch", "nvlink"]
},
/* ===================== IB — NVIDIA InfiniBand Networking (50) ===================== */
{
  id: "ib-001", domain: "ib", topic: "Port states and the SM", difficulty: 1,
  q: "A newly connected InfiniBand port has a physical link (LinkUp) but its logical state remains INIT rather than ACTIVE. Several new ports show the same condition. Which control-plane check is most appropriate first?",
  options: [
    "Verify that a master Subnet Manager is running and reachable (sminfo / ibstat SM lid)",
    "Replace the cables, because INIT indicates a signal-integrity failure",
    "Reset the HCA firmware with mlxfwreset on every affected host",
    "Increase the LMC value so the ports receive more LIDs"
  ],
  answer: 0, multi: false,
  explanation: "INIT means the physical link is up but the Subnet Manager has not yet configured the port (no LID assigned, not moved to ARMED/ACTIVE). Many ports stuck in INIT at once points to the control plane — no master SM, or the SM cannot reach them — not to individual cables. Check sminfo for a SMINFO_MASTER and ibstat for 'SM lid: 0'.",
  ref: "Module 1 · Two-Node Bring-Up / Module 10", tags: ["port-state", "init", "sm"]
},
{
  id: "ib-002", domain: "ib", topic: "UFM high availability", difficulty: 2,
  q: "A UFM HA pair is planned for a multi-tier InfiniBand fabric. Both UFM servers' InfiniBand management adapters currently connect to the same edge switch. Which placement reduces their common switch dependency?",
  options: [
    "Connect each UFM server's HCA to a different leaf/edge switch",
    "Connect both HCAs to a spine switch instead of a leaf",
    "Bond both HCAs of each server to the same switch for extra bandwidth",
    "Move the standby UFM server to the out-of-band Ethernet only"
  ],
  answer: 0, multi: false,
  explanation: "If both UFM nodes hang off one edge switch, that switch is a single point of failure for the whole SM/UFM function. Spreading the active and standby servers across different switches keeps one of them in the fabric when a switch fails. The standby must stay in-band (it needs an HCA in the fabric to take over as SM); the OOB Ethernet alone cannot manage the fabric.",
  ref: "UFM Enterprise UM · HA deployment", tags: ["ufm", "ha", "placement"]
},
{
  id: "ib-003", domain: "ib", topic: "UFM high availability", difficulty: 2,
  q: "Two UFM HA servers have InfiniBand access, but their dedicated out-of-band IP connection between the two servers is unavailable. Which required function is directly affected by this missing path?",
  options: [
    "Heartbeat and data replication (DRBD) between the active and standby UFM nodes",
    "Subnet Manager MAD traffic to the switches",
    "Telemetry collection from the HCAs' performance counters",
    "LID assignment to newly discovered ports"
  ],
  answer: 0, multi: false,
  explanation: "UFM HA uses a dedicated IP link between the two servers for the cluster heartbeat and for DRBD replication of the UFM database/files so that the standby can take over with current state. SM MADs, LID assignment and telemetry all travel in-band over the InfiniBand fabric and are not affected by the inter-server IP link.",
  ref: "UFM Enterprise UM · HA requirements", tags: ["ufm", "ha", "drbd", "heartbeat"]
},
{
  id: "ib-004", domain: "ib", topic: "VPI adapters and mlxconfig", difficulty: 2,
  q: "A VPI adapter is intended for an InfiniBand port. Its firmware query (mlxconfig -d <dev> q) shows LINK_TYPE_P1 = ETH(2). Which finding should the administrator record?",
  options: [
    "Port 1 is currently configured as Ethernet and must be set to IB(1) with mlxconfig, followed by a firmware reset or reboot",
    "The adapter is InfiniBand-only and the setting is informational",
    "The firmware is corrupt and must be re-flashed before the port can be used",
    "The Subnet Manager will auto-negotiate the port to InfiniBand once connected"
  ],
  answer: 0, multi: false,
  explanation: "On Virtual Protocol Interconnect adapters each port's personality is a firmware parameter: LINK_TYPE_Px = 1 (IB) or 2 (ETH). ETH(2) means the port speaks Ethernet/RoCE today. Fix with 'mlxconfig -d /dev/mst/<dev> s LINK_TYPE_P1=1' and then 'mlxfwreset ... reset' or a reboot. The SM cannot change a port's link type.",
  ref: "MFT · mlxconfig LINK_TYPE", tags: ["mlxconfig", "vpi", "link-type"]
},
{
  id: "ib-005", domain: "ib", topic: "Partitions (PKeys)", difficulty: 2,
  q: "A tenant's server is moved to its second InfiniBand adapter port. The tenant partition in partitions.conf still lists the first port's GUID. The new port is ACTIVE but tenant communication fails. Which update addresses the membership mismatch?",
  options: [
    "Add the new port's Port GUID to the tenant partition definition (and remove the old one), then re-read the SM configuration",
    "Change the partition's PKey value so the SM re-evaluates all members",
    "Set the partition to 'ALL=full' so any port can join",
    "Restart the HCA driver so the new port inherits the old port's PKey table"
  ],
  answer: 0, multi: false,
  explanation: "Partition membership in partitions.conf is defined per PORT GUID, not per host or Node GUID. Each physical port has its own Port GUID, so moving the cable to port 2 means a different GUID that is simply not a member — the SM programs that port's PKey table with only the default partition, and the HCA drops tenant traffic in hardware. The fix is to update the membership list with the new Port GUID (ibstat shows 'Port GUID') and apply with 'kill -HUP $(pgrep opensm)' or a service restart. Changing the PKey value does not add a member; 'ALL=full' would destroy the tenant isolation; the HCA cannot copy PKeys between ports because the SM, not the host, pushes the table.",
  distractors: "ALL=full technically restores connectivity but violates the design intent — the exam asks for the targeted fix.",
  ref: "Module 6 · partitions.conf", tags: ["pkey", "membership", "guid", "missed-before"]
},
{
  id: "ib-006", domain: "ib", topic: "Partitions (PKeys)", difficulty: 2,
  q: "Two departments receive separate InfiniBand partitions, but their HCA ports retain full membership in a common default partition. What should be reviewed before declaring inter-department isolation complete?",
  options: [
    "The default partition's membership type — full members of the default partition can still communicate with each other",
    "The LMC value, because extra LIDs bypass partition checks",
    "The routing engine, because MINHOP ignores PKeys",
    "The VL arbitration table, because VL0 is shared by all tenants"
  ],
  answer: 0, multi: false,
  explanation: "Isolation only holds if there is no shared partition in which both departments are full members. Every port joins the default partition (0x7fff/0xffff); if it is defined as 'ALL=full', all ports can still talk via the default PKey regardless of their tenant partitions. Define it as 'Default=0x7fff : ALL=limited;' (limited cannot talk to limited) or exclude the ports. Routing, LMC and VL arbitration do not enforce membership.",
  ref: "Module 6 · Full vs Limited Membership", tags: ["pkey", "default-partition", "isolation"]
},
{
  id: "ib-007", domain: "ib", topic: "Partitions (PKeys)", difficulty: 3,
  q: "An administrator defines two named InfiniBand partitions in partitions.conf using the same explicit PKey value but different port lists. Which outcome follows the documented partition-file behavior?",
  options: [
    "The PKey identifies the partition; the second definition is merged into the existing partition, so both port lists become members of one partition",
    "OpenSM rejects the whole file and falls back to the default partition only",
    "The second partition silently replaces the first, removing the first list's membership",
    "OpenSM creates two independent partitions because the names differ"
  ],
  answer: 0, multi: false,
  explanation: "In OpenSM a partition is keyed by its PKey value; the name is informational. When a definition reuses an existing PKey, OpenSM logs that the partition already exists and adds the new members to it — effectively merging the port lists. Two tenants given the same PKey are therefore NOT isolated from each other. Use distinct PKeys per tenant.",
  ref: "OpenSM partition-config / Module 6", tags: ["pkey", "partitions.conf", "merge"]
},
{
  id: "ib-008", domain: "ib", topic: "UFM partitions", difficulty: 2,
  q: "A manually edited UFM-generated partitions.conf loses its changes after a UFM logical-model update. Which documented method preserves approved custom partition additions?",
  options: [
    "Place the custom definitions in UFM's user-extension partitions file (partitions.conf.user_ext), which UFM appends to the generated file",
    "Make partitions.conf read-only so UFM cannot regenerate it",
    "Define the partitions in opensm.conf instead of partitions.conf",
    "Disable the UFM Subnet Manager and run a standalone opensm"
  ],
  answer: 0, multi: false,
  explanation: "UFM owns and regenerates partitions.conf from its logical model (environments/PKeys configured in the GUI/REST). Custom entries belong in the user-extension file (partitions.conf.user_ext under the UFM conf directory), which UFM merges into the generated configuration on every update. Locking the file or running a separate SM breaks UFM's management; opensm.conf does not hold partition membership.",
  ref: "UFM Enterprise UM · Partitioning", tags: ["ufm", "pkey", "user_ext"]
},
{
  id: "ib-009", domain: "ib", topic: "QoS: SL to VL", difficulty: 2,
  q: "Two InfiniBand application classes use different Service Levels but still enter the same Virtual Lane. The design requires separate VL handling. Which configuration should be reviewed?",
  options: [
    "The SL-to-VL mapping table (qos_sl2vl in opensm.conf) pushed by the SM",
    "The VL arbitration weights (qos_vlarb_high)",
    "The partition membership of the two application classes",
    "The LMC value of the HCA ports"
  ],
  answer: 0, multi: false,
  explanation: "The application sets the SL (0-15); the SM maps each SL to a VL with the 16-entry qos_sl2vl list (SL0..SL15 in order) and programs the SL2VL table into every switch and HCA port. If SL1 and SL2 both map to VL1 they share buffers and credits. Arbitration weights only matter once traffic is already in distinct VLs; PKeys and LMC are unrelated to lanes.",
  ref: "Module 8 · opensm.conf qos_sl2vl", tags: ["qos", "sl2vl", "vl"]
},
{
  id: "ib-010", domain: "ib", topic: "QoS: VL arbitration", difficulty: 2,
  q: "Two busy InfiniBand Virtual Lanes need different relative service allocations. Both already have valid SL mappings. Which setting governs how their traffic receives transmission opportunities?",
  options: [
    "The VL arbitration table weights (qos_vlarb_high / qos_vlarb_low)",
    "The SL2VL mapping table",
    "The PKey membership type (full vs limited)",
    "The routing engine selected in opensm.conf"
  ],
  answer: 0, multi: false,
  explanation: "VL arbitration decides how the link scheduler shares transmit opportunities among VLs. Entries like 'qos_vlarb_high 0:100,1:50' give VL0 twice the weight of VL1 under contention (weights are relative; one unit is a 64-byte credit block). SL2VL only sorts packets into lanes; it does not allocate bandwidth.",
  ref: "Module 8 · VL Arbitration Weights", tags: ["qos", "vlarb", "weights"]
},
{
  id: "ib-011", domain: "ib", topic: "Adaptive routing", difficulty: 3,
  q: "An InfiniBand fabric uses an adaptive-routing-capable routing engine. Its adaptive-routing Service Level mask excludes the SL used by a training job. What should be checked to enable AR for that job's traffic class?",
  options: [
    "The AR SL mask in the SM configuration (ar_sl_mask) must include the job's SL bit",
    "The job's PKey must be set to full membership",
    "The VL arbitration weight for that SL must be increased",
    "The job must switch from RC to UD transport"
  ],
  answer: 0, multi: false,
  explanation: "Adaptive routing is applied per Service Level: the SM's AR SL mask (16 bits, one per SL, e.g. ar_sl_mask 0xFFFF) selects which SLs are eligible for adaptive forwarding. Traffic on an excluded SL is forwarded statically even though AR is enabled globally. Fix the mask (or move the job to an AR-enabled SL) and reload the SM.",
  ref: "OpenSM AR configuration / Module 7", tags: ["adaptive-routing", "sl-mask"]
},
{
  id: "ib-012", domain: "ib", topic: "Adaptive routing", difficulty: 3,
  q: "An InfiniBand Subnet Manager leaves static forwarding in place for an endpoint that lacks packet-reordering support, while compatible endpoints use adaptive routing. Which explanation matches this behavior?",
  options: [
    "AR can deliver packets of a flow out of order; the SM only enables adaptive forwarding toward endpoints that advertise out-of-order (reordering) support and keeps others static",
    "The endpoint's LMC is zero, so it cannot receive multiple paths",
    "The endpoint is a limited member of its partition, which disables AR",
    "AR requires HDR or faster links and the endpoint negotiated EDR"
  ],
  answer: 0, multi: false,
  explanation: "Per-packet adaptive routing spreads one flow over several paths, so packets may arrive out of order. HCAs that support out-of-order delivery (e.g. ConnectX-7 with AR/OOO enabled) reassemble; older or unconfigured endpoints would see errors. The SM therefore applies AR selectively based on endpoint capability. LMC, membership and link speed are not the gating factors.",
  ref: "Module 7/9 · Adaptive Routing", tags: ["adaptive-routing", "out-of-order"]
},
{
  id: "ib-013", domain: "ib", topic: "UFM monitoring", difficulty: 2,
  q: "A training team reports degraded InfiniBand performance although every relevant port in UFM shows ACTIVE. Which additional evidence is needed before accepting fabric performance as healthy?",
  options: [
    "Negotiated link speed/width and error/congestion counters for the ports (a link that came up at a lower rate or with symbol errors is still ACTIVE)",
    "The UFM license expiration date",
    "The number of partitions defined in the fabric",
    "The hostname-to-LID mapping of the compute nodes"
  ],
  answer: 0, multi: false,
  explanation: "ACTIVE is a logical state only. A port can be ACTIVE at a degraded rate (e.g. EDR instead of NDR, or 2x instead of 4x width) or while accumulating symbol errors and XmitWait. UFM's port telemetry (speed, width, error counters, congestion) or iblinkinfo/perfquery on the CLI supply the missing evidence.",
  ref: "Module 10 · Worked Fault", tags: ["ufm", "link-speed", "counters"]
},
{
  id: "ib-014", domain: "ib", topic: "UFM telemetry", difficulty: 2,
  q: "UFM telemetry shows increasing XmitWait on several ports during an AI job, while physical error counters remain stable. Which investigation is most directly supported?",
  options: [
    "Congestion: the ports have data to send but no credits, so examine traffic distribution, hot links and routing/AR rather than cabling",
    "Cable degradation: XmitWait indicates forward-error-correction activity",
    "Subnet Manager failover: XmitWait counts SM election events",
    "Partition misconfiguration: packets are being dropped by PKey checks"
  ],
  answer: 0, multi: false,
  explanation: "PortXmitWait counts the ticks a port had packets queued but no credits from its neighbor — the InfiniBand congestion counter UFM uses for its congestion views. Rising XmitWait with flat symbol/FEC errors is a congestion signature, not a physical one. Look at which paths are saturated (top-N congested ports, traffic map) and at routing or adaptive routing.",
  ref: "Module 9 · UFM Telemetry", tags: ["ufm", "xmitwait", "congestion"]
},
{
  id: "ib-015", domain: "ib", topic: "UFM monitoring", difficulty: 2,
  q: "UFM reports low average fabric utilization, but one job remains slow. A few paths could still be saturated. Which view best tests that possibility?",
  options: [
    "Per-port Top-N (top ports by bandwidth and by congestion) or the per-tier traffic map, which exposes individual hot links hidden by the average",
    "The fabric inventory view listing switch and cable counts",
    "The events log filtered for SM election messages",
    "The RBAC user list to see who is logged in"
  ],
  answer: 0, multi: false,
  explanation: "A fabric-wide average dilutes a handful of saturated links. UFM's dashboard Top-N panels (top ports by bandwidth / congestion) and the color-coded per-tier traffic map show individual links that are red while the rest are green, which is exactly how a single hot spot slows one job.",
  ref: "Module 9 · UFM Traffic Map / Top-N", tags: ["ufm", "top-n", "traffic-map"]
},
{
  id: "ib-016", domain: "ib", topic: "SM election", difficulty: 2,
  q: "Three OpenSM instances start in one subnet. Instance A has priority 10, instance B priority 14, and instance C priority 14 with a lower Port GUID than B. Which instance becomes master?",
  options: [
    "Instance C — highest priority wins, and among equal priorities the lower GUID wins",
    "Instance B — highest priority wins, and among equal priorities the higher GUID wins",
    "Instance A — the lowest priority value is preferred, like a Linux nice value",
    "The instance that started first always remains master"
  ],
  answer: 0, multi: false,
  explanation: "SM election uses the SMInfo priority field (0-15): the highest priority becomes master; ties are broken by the lowest Port GUID. Set the priority with 'sm_priority' in opensm.conf or 'opensm -p 14'. Start order does not matter — a higher-priority SM that joins later takes over (unless master handover protection is configured).",
  ref: "Module 2 · Subnet Manager", tags: ["sm", "election", "priority"]
},
{
  id: "ib-017", domain: "ib", topic: "SM high availability", difficulty: 1,
  q: "A lab runs a single OpenSM on one host. The administrator wants a standby SM that takes over if that host fails, without creating two masters. Which approach is correct?",
  options: [
    "Start OpenSM on a second host; the SM protocol elects one master and the other stays in STANDBY, ready to take over",
    "Run both as master by giving them the same priority",
    "Run the second OpenSM with a different subnet prefix so it manages the same ports independently",
    "Disable the SM on the switches and run opensm in a container on every compute node"
  ],
  answer: 0, multi: false,
  explanation: "InfiniBand allows several SMs in a subnet but only one master; the others sit in standby and poll the master. If the master disappears, the highest-priority standby takes over. A different subnet prefix would split the fabric logically, and running an SM on every node creates needless elections and risk.",
  ref: "Module 2 · Where Can the SM Run", tags: ["sm", "standby", "ha"]
},
{
  id: "ib-018", domain: "ib", topic: "Routing engines", difficulty: 2,
  q: "A two-tier fat-tree is configured with 'routing_engine ftree' but OpenSM logs that it falls back to MINHOP. What is the most likely missing configuration?",
  options: [
    "The root switches are not declared (root_guid_file pointing to a file listing the spine GUIDs)",
    "qos must be set to TRUE for ftree to work",
    "LMC must be greater than zero",
    "The partitions.conf file is missing"
  ],
  answer: 0, multi: false,
  explanation: "The fat-tree engine must know which switches are the roots of the tree. If it cannot auto-detect a valid fat-tree (common with incomplete or asymmetric cabling) and no root_guid_file is provided, OpenSM falls back to the next engine in the list, ultimately MINHOP. Declare the spines' Node GUIDs in /etc/opensm/root_guid.conf and set root_guid_file in opensm.conf.",
  ref: "Module 7 · Configuring Adaptive Routing", tags: ["ftree", "root_guid", "routing"]
},
{
  id: "ib-019", domain: "ib", topic: "Routing engines", difficulty: 2,
  q: "A fabric experiences intermittent credit-loop deadlocks after an administrator set the routing engine to MINHOP on an irregular topology. Which routing engine property explains the exposure, and which engine removes it?",
  options: [
    "MINHOP is not guaranteed deadlock-free; UPDN enforces up-then-down paths that cannot form cyclic credit dependencies",
    "MINHOP uses too many VLs; DOR reduces them",
    "MINHOP hashes flows; adaptive routing removes hashing",
    "MINHOP is deadlock-free; the deadlock must come from PFC misconfiguration"
  ],
  answer: 0, multi: false,
  explanation: "MINHOP simply takes the fewest hops with no structural loop avoidance, so on topologies with cycles it can create circular buffer dependencies (credit loops). UPDN (and ftree on fat-trees) impose an up/down ordering that makes cyclic dependencies impossible by construction. PFC is an Ethernet mechanism and does not exist in InfiniBand.",
  ref: "Module 7/8 · Credit loops", tags: ["minhop", "updn", "credit-loop"]
},
{
  id: "ib-020", domain: "ib", topic: "LMC", difficulty: 2,
  q: "After setting 'lmc 1' in opensm.conf and restarting OpenSM, what should the administrator expect on each HCA port?",
  options: [
    "Two LIDs per port (base LID and base LID + 1), each of which can be routed over a different path",
    "Two Port GUIDs per port for redundancy",
    "The port joins two partitions automatically",
    "The port negotiates to twice the link width"
  ],
  answer: 0, multi: false,
  explanation: "LID Mask Control gives a port 2^LMC consecutive LIDs. With LMC=1 each port owns two LIDs; the SM can program different output ports for each LID in the switches' Linear Forwarding Tables, so the host gains path diversity. Verify with 'ibaddr' (LID start/end) or ibstat's LMC field.",
  ref: "Module 7 · LMC and path diversity", tags: ["lmc", "lid", "multipath"]
},
{
  id: "ib-021", domain: "ib", topic: "Addressing", difficulty: 1,
  q: "Which statement about InfiniBand addresses is correct?",
  options: [
    "The GUID is a 64-bit burned-in identifier, the LID is a 16-bit address assigned by the SM for intra-subnet routing, and the GID is 128 bits (subnet prefix + GUID) for inter-subnet routing",
    "The LID is burned in by the manufacturer and the GUID is assigned by the SM",
    "The GID is 64 bits and is used by switches for forwarding inside the subnet",
    "The GUID changes every time the SM re-sweeps the fabric"
  ],
  answer: 0, multi: false,
  explanation: "GUID (64-bit, permanent, per node and per port), LID (16-bit, SM-assigned, what switches look up in the LFT) and GID (128-bit, IPv6-style: 64-bit subnet prefix + 64-bit interface ID derived from the Port GUID; needed only when a router or RoCE is involved). View with ibstat (LID), ibv_devinfo -v (GUID/GID) and ibaddr.",
  ref: "Module 2 · GUID vs LID vs GID", tags: ["guid", "lid", "gid"]
},
{
  id: "ib-022", domain: "ib", topic: "Inter-subnet routing", difficulty: 2,
  q: "Traffic between two GPU nodes stays inside one InfiniBand subnet. Which header is NOT present on those packets, and when does it appear?",
  options: [
    "The Global Routing Header (GRH); it is added only when a packet must cross an InfiniBand router to another subnet",
    "The Local Routing Header (LRH); it is added only for multicast",
    "The Base Transport Header (BTH); it is added only for RDMA writes",
    "The Invariant CRC; it is added only on links with FEC"
  ],
  answer: 0, multi: false,
  explanation: "Within a subnet switches forward on the LRH's destination LID, so no GRH is needed. The GRH (source/destination GID) is inserted when the packet is destined to another subnet via an IB router — which is why GIDs exist. LRH, BTH and ICRC/VCRC are present on every packet.",
  ref: "Module 4 · Packet anatomy", tags: ["grh", "gid", "router"]
},
{
  id: "ib-023", domain: "ib", topic: "Partitions (PKeys)", difficulty: 1,
  q: "In a shared-storage partition the storage node is a FULL member and all compute nodes are LIMITED members. What communication does this allow?",
  options: [
    "Each compute node can talk to the storage node, but compute nodes cannot talk to each other",
    "All members can talk to each other",
    "Only the storage node can initiate connections",
    "Compute nodes can talk to each other but not to storage"
  ],
  answer: 0, multi: false,
  explanation: "Full members communicate with every member; limited members may only communicate with full members, never with another limited member. This is the classic hub-and-spoke isolation for shared storage or a license server inside a multi-tenant fabric.",
  ref: "Module 6 · Full vs Limited Membership", tags: ["pkey", "full", "limited"]
},
{
  id: "ib-024", domain: "ib", topic: "Partitions (PKeys)", difficulty: 2,
  q: "A PKey table entry reads 0x8010 on one port and 0x0010 on another port, both for the same partition. What does the difference in the most significant bit indicate?",
  options: [
    "0x8010 is full membership and 0x0010 is limited membership of partition 0x0010",
    "0x8010 belongs to a different partition than 0x0010",
    "0x8010 is an IPoIB-enabled partition and 0x0010 is not",
    "The port with 0x8010 is the Subnet Manager"
  ],
  answer: 0, multi: false,
  explanation: "A PKey is 16 bits: the low 15 bits identify the partition, and the MSB is the membership bit (1 = full, 0 = limited). That is why the default partition appears as 0xffff (full) or 0x7fff (limited). Read tables with 'smpquery PKeys <lid> <port>'.",
  ref: "Module 6 · The Power of the P_Key", tags: ["pkey", "membership-bit"]
},
{
  id: "ib-025", domain: "ib", topic: "Partitions (PKeys)", difficulty: 2,
  q: "Which partitions.conf line defines a partition 0x1234 whose members get an IPoIB interface, with host GUID 0x0002c90300f97611 as a full member and all other ports as limited members?",
  options: [
    "AI_Partition=0x1234, ipoib : 0x0002c90300f97611=full, ALL=limited;",
    "AI_Partition=0x1234 ipoib full=0x0002c90300f97611 limited=ALL",
    "partition 0x1234 { ipoib; member 0x0002c90300f97611 full; member any limited; }",
    "pkey 0x1234 ipoib 0x0002c90300f97611:full ALL:limited"
  ],
  answer: 0, multi: false,
  explanation: "OpenSM syntax is 'Name=PKey[, flags] : member=type, member=type;' where flags include ipoib (create the matching IPoIB child interface), rate, mtu, sl and indx0. Members are Port GUIDs or the keywords ALL, ALL_CAS, ALL_SWITCHES, ALL_ROUTERS, with =full or =limited (default limited). The other options are invented syntaxes.",
  ref: "Module 6 · Configuring Partitions", tags: ["pkey", "partitions.conf", "ipoib"]
},
{
  id: "ib-026", domain: "ib", topic: "Verifying partitions", difficulty: 2,
  q: "After editing partitions.conf and reloading OpenSM, how can the administrator confirm from any host that a given port (LID 5, port 1) actually received the new PKey table?",
  options: ["smpquery PKeys 5 1", "ibping -L 5", "ibtracert 1 5", "perfquery 5 1"],
  answer: 0, multi: false,
  explanation: "smpquery sends Subnet Management Packets to read a port's attributes; 'smpquery PKeys <lid> <port>' dumps the PKey table the SM programmed. ibping tests reachability, ibtracert shows the path and perfquery reads performance counters — none shows partition membership.",
  ref: "Module 6 · Lab 6.1", tags: ["smpquery", "pkey", "verify"]
},
{
  id: "ib-027", domain: "ib", topic: "Virtual Lanes", difficulty: 1,
  q: "Why can Subnet Management traffic never be starved by a congested data VL on an InfiniBand link?",
  options: [
    "Management datagrams use VL15, a dedicated lane with its own buffers that bypasses the VL arbiter",
    "The SM sends MADs over IPoIB with the highest DSCP",
    "Switches drop data packets whenever a MAD is queued",
    "MADs are sent only when all data VLs are idle"
  ],
  answer: 0, multi: false,
  explanation: "VL0-VL14 carry data; VL15 is reserved for Subnet Management Packets, has separate buffers and is not subject to VL arbitration or PKey checks. That is why you cannot lock yourself out of fabric management with a QoS or partition mistake. InfiniBand has no DSCP, and nothing is dropped for congestion.",
  ref: "Module 8 · QoS → SL → VL", tags: ["vl15", "mad", "qos"]
},
{
  id: "ib-028", domain: "ib", topic: "Applying SM changes", difficulty: 1,
  q: "An administrator changed qos_vlarb_high in opensm.conf and wants OpenSM to apply it without interrupting the fabric with a full restart. Which command is appropriate?",
  options: ["kill -HUP $(pgrep opensm)", "systemctl stop opensm && systemctl start opensm", "ibdiagnet --reload", "opensm --reassign-lids"],
  answer: 0, multi: false,
  explanation: "Sending SIGHUP makes OpenSM re-read its configuration files (opensm.conf, partitions.conf, qos-policy.conf) and perform a heavy sweep that re-programs tables. A stop/start briefly leaves the fabric without a master SM and may trigger an election; ibdiagnet is a diagnostic tool; --reassign-lids is not a reload mechanism.",
  ref: "Module 8 · Configuring QoS", tags: ["opensm", "sighup", "reload"]
},
{
  id: "ib-029", domain: "ib", topic: "QoS policy file", difficulty: 2,
  q: "In qos-policy.conf, which construct binds a source port-group and a destination port-group to a specific Service Level?",
  options: [
    "A qos-match-rule that references source, destination and a qos-level-name whose qos-level defines the sl",
    "A port-group with an sl attribute",
    "A qos_sl2vl entry in opensm.conf",
    "A partition flag 'sl=' in partitions.conf"
  ],
  answer: 0, multi: false,
  explanation: "qos-policy.conf has three sections: port-groups (who — lists of Port GUIDs), qos-levels (which SL, optional MTU/rate limits) and qos-match-rules (the engine that maps source/destination groups, and optionally PKey or service-id, to a qos-level). qos_sl2vl maps SLs to VLs afterwards; the partition 'sl=' flag is a coarser per-partition default.",
  ref: "Module 8 · qos-policy.conf", tags: ["qos", "qos-policy", "match-rule"]
},
{
  id: "ib-030", domain: "ib", topic: "QoS configuration", difficulty: 2,
  q: "opensm.conf contains 'qos TRUE', 'qos_max_vls 4' and 'qos_sl2vl 0,1,2,3,3,3,3,3,3,3,3,3,3,3,3,15'. Which statement describes the resulting behavior?",
  options: [
    "SL0-SL3 map to VL0-VL3 respectively, SL4-SL14 share VL3, and SL15 maps to the management VL15",
    "Only four Service Levels exist; packets with SL4 or higher are dropped",
    "Each SL gets its own VL because 16 entries are listed",
    "VL3 is reserved for management and VL15 carries bulk data"
  ],
  answer: 0, multi: false,
  explanation: "The qos_sl2vl list has 16 positions, one per SL in order. Here SL0→VL0, SL1→VL1, SL2→VL2, SL3..SL14→VL3 (the spare lane) and SL15→VL15. qos_max_vls 4 limits the data VLs the SM will use to VL0-VL3. InfiniBand never drops for an SL value; it maps it.",
  ref: "Module 8 · opensm.conf", tags: ["qos", "sl2vl", "max_vls"]
},
{
  id: "ib-031", domain: "ib", topic: "QoS: VL arbitration", difficulty: 2,
  q: "qos_vlarb_high is set to '0:100,3:10'. Two ib_write_bw streams run on SL0 and SL3 over the same 40 Gb/s link. What result confirms the configuration is effective?",
  options: [
    "Under contention SL0 gets about 100/110 of the link (~36 Gb/s) and SL3 about 10/110 (~3.6 Gb/s); when SL0 stops, SL3 expands to the full link",
    "SL0 always gets exactly 100 Gb/s and SL3 exactly 10 Gb/s",
    "SL3 traffic is dropped until SL0 finishes",
    "Both streams get 20 Gb/s because arbitration is round-robin"
  ],
  answer: 0, multi: false,
  explanation: "VL arbitration weights are relative shares that apply only while VLs compete for the link. 100:10 yields roughly a 10:1 split under contention; when the heavy stream stops, the lower-weight VL uses the whole link. Nothing is dropped — InfiniBand is lossless; low-weight traffic just waits.",
  ref: "Module 8 · Lab 8.1", tags: ["qos", "vlarb", "contention"]
},
{
  id: "ib-032", domain: "ib", topic: "Adaptive routing", difficulty: 2,
  q: "An administrator enables 'adaptive_routing_enable TRUE' in opensm.conf on a host using the distribution's opensm package, but AR never activates. What is the most likely cause?",
  options: [
    "Adaptive routing requires the OpenSM build shipped with MLNX_OFED (and AR-capable switches); the upstream distro package lacks AR support",
    "AR requires LMC to be 0",
    "AR only works with the MINHOP engine",
    "AR must be enabled per port with ibportstate"
  ],
  answer: 0, multi: false,
  explanation: "AR support in OpenSM is part of the NVIDIA/Mellanox OFED build, not the upstream opensm package most distributions ship. You also need AR-capable switches (Quantum / Switch-IB 2 and newer) and a compatible engine (e.g. ftree with AR, or the AR-specific engines). ibportstate changes port state/speed, not AR.",
  ref: "Module 7 · Configuring Adaptive Routing", tags: ["adaptive-routing", "mlnx_ofed", "opensm"]
},
{
  id: "ib-033", domain: "ib", topic: "Adaptive routing", difficulty: 2,
  q: "Why does static ECMP-style hashing underperform adaptive routing for AI training traffic?",
  options: [
    "AI traffic has few, long-lived elephant flows with low entropy, so hashing can pin several elephants to one link; AR re-balances per packet using real-time congestion",
    "AI traffic is mostly small UDP packets that cannot be hashed",
    "Hashing requires PFC, which InfiniBand lacks",
    "AR uses shorter paths than hashing"
  ],
  answer: 0, multi: false,
  explanation: "Collective operations produce a small number of very large, repetitive flows between the same GPU pairs. A static hash has little entropy to work with and may place multiple elephants on the same link while others idle. Adaptive routing watches egress queue load and moves packets to the least-congested path dynamically.",
  ref: "Module 7 · Why Adaptive Routing Suits AI", tags: ["adaptive-routing", "entropy", "elephant-flows"]
},
{
  id: "ib-034", domain: "ib", topic: "UFM telemetry", difficulty: 2,
  q: "By default, how often does UFM Enterprise collect its primary telemetry counters (bandwidth, congestion, errors), and what is the secondary (extended) interval?",
  options: ["Primary every 30 seconds; secondary every 300 seconds", "Primary every 1 second; secondary every 60 seconds", "Primary every 5 minutes; secondary daily", "Both every 10 seconds"],
  answer: 0, multi: false,
  explanation: "UFM samples ~30 key counters every 30 s (primary telemetry, drives dashboards and threshold events) and ~120 extended counters every 300 s (secondary telemetry, used for deep diagnostics and history). Very large fabrics can use clustered telemetry to spread collection across HCAs.",
  ref: "Module 9 · UFM Telemetry", tags: ["ufm", "telemetry", "intervals"]
},
{
  id: "ib-035", domain: "ib", topic: "UFM telemetry", difficulty: 1,
  q: "Which InfiniBand counter does UFM use as its primary indicator of congestion on a port?",
  options: ["PortXmitWait", "SymbolErrorCounter", "LinkDownedCounter", "PortRcvRemotePhysicalErrors"],
  answer: 0, multi: false,
  explanation: "PortXmitWait accumulates the time a port had data to transmit but no flow-control credits from the far end — direct evidence of back-pressure/congestion. Symbol errors, link-downed and remote physical errors are physical-layer health counters.",
  ref: "Module 9 · UFM Telemetry", tags: ["ufm", "xmitwait"]
},
{
  id: "ib-036", domain: "ib", topic: "UFM alerts", difficulty: 1,
  q: "UFM raises a 'Wrong Neighbour' alert on a leaf port after a maintenance window. What should the administrator compare the live connection against?",
  options: ["The fabric topology file that defines the expected cabling (source of truth, ideally kept in Git)", "The partitions.conf file", "The VL arbitration table", "The UFM license file"],
  answer: 0, multi: false,
  explanation: "UFM and the Cable Validation Tool compare discovered neighbors (by GUID/LLDP) with the topology file (lines like 'P2 -4x-50G-> HCA_mlx5_3 host mlx5_0/P1'). A mismatch means a cable was moved to the wrong port or device. Fix the cabling or update the file if the change was intentional.",
  ref: "Module 9 · UFM Topology File", tags: ["ufm", "wrong-neighbour", "topology-file"]
},
{
  id: "ib-037", domain: "ib", topic: "UFM Cyber-AI", difficulty: 2,
  q: "Which capability distinguishes UFM Cyber-AI from UFM Enterprise?",
  options: [
    "Machine-learning analytics that baseline the fabric and predict link failures 1-24 hours ahead, plus anomaly and threat detection",
    "The ability to run the Subnet Manager",
    "Automated switch discovery and provisioning",
    "A REST API for scheduler integration"
  ],
  answer: 0, multi: false,
  explanation: "UFM tiers stack: Telemetry (monitoring) → Enterprise (adds discovery, provisioning, PKey/QoS management, REST API, Slurm/OpenStack integration) → Cyber-AI (adds behavioral baselining, link-failure prediction, tenant congestion alerts and security anomaly detection). The SM, provisioning and API already exist in Enterprise.",
  ref: "Module 9 · UFM Platform Tiers / Cyber-AI", tags: ["ufm", "cyber-ai", "tiers"]
},
{
  id: "ib-038", domain: "ib", topic: "UFM tiers", difficulty: 1,
  q: "A site needs centralized PKey and QoS management, automated discovery and provisioning, and integration with Slurm, but does not need predictive analytics. Which UFM tier is the minimum fit?",
  options: ["UFM Enterprise", "UFM Telemetry", "UFM Cyber-AI", "MLNX-OS web UI"],
  answer: 0, multi: false,
  explanation: "UFM Telemetry only monitors. UFM Enterprise adds fabric management: discovery/provisioning, segmentation (PKeys), QoS, routing optimization, REST API and scheduler integration. Cyber-AI is the analytics layer above that. MLNX-OS manages a single switch, not the fabric.",
  ref: "Module 9 · UFM Platform Capabilities", tags: ["ufm", "enterprise", "tiers"]
},
{
  id: "ib-039", domain: "ib", topic: "UFM high availability", difficulty: 2,
  q: "Which set of connections does a UFM Enterprise HA deployment require for each of the two servers?",
  options: [
    "An InfiniBand HCA port in the managed fabric, a management Ethernet interface, and a dedicated back-to-back (or private) IP link between the two servers for heartbeat and DRBD replication",
    "Only an InfiniBand HCA port; HA messages travel over VL15",
    "Only a management Ethernet interface; UFM manages the fabric out of band",
    "Two InfiniBand ports per server bonded together"
  ],
  answer: 0, multi: false,
  explanation: "UFM must be in-band (HCA in the fabric) to run the SM and collect telemetry via MADs. HA additionally needs IP connectivity between the pair — a dedicated link is recommended — for the cluster heartbeat and DRBD block replication of UFM data, plus the usual management interface for the GUI/REST and a virtual IP.",
  ref: "UFM Enterprise UM · HA", tags: ["ufm", "ha", "requirements"]
},
{
  id: "ib-040", domain: "ib", topic: "MLNX-OS basics", difficulty: 1,
  q: "After connecting to a new MLNX-OS switch via the serial console, which sequence gives the switch a static management address and makes the change survive a reload?",
  options: [
    "enable → configure terminal → interface mgmt0 → ip address 10.10.0.20 /24 → exit → ip default-gateway 10.10.0.1 → configuration write",
    "nv set interface eth0 ip address 10.10.0.20/24 → nv config apply → nv config save",
    "ifconfig mgmt0 10.10.0.20 netmask 255.255.255.0 → route add default gw 10.10.0.1",
    "set mgmt0 address 10.10.0.20/24 commit"
  ],
  answer: 0, multi: false,
  explanation: "MLNX-OS (Quantum/Onyx and legacy SwitchX) uses a Cisco-like hierarchy: user > enable (#) > configure terminal (config). mgmt0 is the management port; 'configuration write' saves the running config. The 'nv' syntax belongs to Cumulus Linux/NVUE on Spectrum Ethernet switches, not MLNX-OS.",
  ref: "Module 9 · MLNX-OS Initial Configuration", tags: ["mlnx-os", "mgmt0", "configuration-write"]
},
{
  id: "ib-041", domain: "ib", topic: "MLNX-OS upgrade", difficulty: 2,
  q: "During an MLNX-OS upgrade the administrator ran 'image fetch', 'image install <name>' and 'image boot next'. What must be verified BEFORE issuing 'reload'?",
  options: [
    "'show images' confirms the next boot partition points at the new image (and 'configuration write' has saved the config)",
    "'show version' already reports the new version",
    "'show inventory' lists the new image serial",
    "The SM has been disabled on the switch"
  ],
  answer: 0, multi: false,
  explanation: "The upgrade workflow is: show version → image fetch → image install → image boot next → show images (verify 'next boot' = new image) → configuration write → reload. 'show version' only changes after the reload. Reloading without checking 'show images' risks booting the old image or an incomplete install.",
  ref: "Module 9 · MLNX-OS Upgrade Procedure", tags: ["mlnx-os", "upgrade", "show-images"]
},
{
  id: "ib-042", domain: "ib", topic: "MLNX-OS accounts", difficulty: 1,
  q: "A monitoring integration needs read-only access to an MLNX-OS switch through its XML/JSON API, with no ability to change configuration. Which built-in account role fits?",
  options: ["xmluser", "xmladmin", "admin", "monitor"],
  answer: 0, multi: false,
  explanation: "MLNX-OS has four built-in roles: admin (full CLI/web access), monitor (read-only CLI/web), xmladmin (full access through the API, used by UFM and automation) and xmluser (read-only API access). 'monitor' is read-only but for interactive use, not the API.",
  ref: "Module 9 · MLNX-OS Users and Roles", tags: ["mlnx-os", "rbac", "xmluser"]
},
{
  id: "ib-043", domain: "ib", topic: "mlxconfig", difficulty: 2,
  q: "Which command sequence switches port 1 of a VPI ConnectX adapter from Ethernet to InfiniBand and activates the change without a full host reboot?",
  options: [
    "mst start; mlxconfig -d /dev/mst/mt4123_pciconf0 s LINK_TYPE_P1=1; mlxfwreset -d /dev/mst/mt4123_pciconf0 reset",
    "ibportstate 1 1 enable; ibportstate 1 1 speed 4",
    "nv set interface swp1 link type infiniband; nv config apply",
    "echo ib > /sys/class/net/eth0/link_type"
  ],
  answer: 0, multi: false,
  explanation: "MST must be started so /dev/mst devices exist; mlxconfig 's' sets the firmware parameter (1 = IB, 2 = ETH); mlxfwreset performs a firmware reset so the new personality takes effect (a reboot also works). ibportstate manages port state/speed on the fabric side; nv is Cumulus; the sysfs path does not exist.",
  ref: "MFT · mlxconfig / mlxfwreset", tags: ["mlxconfig", "mlxfwreset", "link-type"]
},
{
  id: "ib-044", domain: "ib", topic: "Port states and the SM", difficulty: 1,
  q: "ibstat on a host shows 'State: Initializing', 'Physical state: LinkUp', 'Base lid: 0', 'SM lid: 0'. What is the diagnosis?",
  options: [
    "The link is physically fine but no Subnet Manager is running in the fabric, so no LID was assigned",
    "The cable is faulty because the physical state is LinkUp",
    "The HCA firmware is incompatible with the driver",
    "The port is a limited member of the default partition"
  ],
  answer: 0, multi: false,
  explanation: "LinkUp proves layer 1. Initializing with SM lid 0 and Base lid 0 means the port is waiting for an SM that has not shown up. Start opensm on a host or enable the SM on a managed switch, then ibstat should show Active with a non-zero LID and SM lid.",
  ref: "Module 1 · Lab 1.1", tags: ["ibstat", "initializing", "sm-lid"]
},
{
  id: "ib-045", domain: "ib", topic: "SHARP", difficulty: 2,
  q: "A SuperPOD team wants AllReduce operations to be executed inside the InfiniBand switches. Which component programs the aggregation trees into the Quantum switches, and where does it usually run?",
  options: [
    "sharp_am (the SHARP Aggregation Manager), typically on the UFM host alongside the SM",
    "The NCCL library on each GPU node",
    "The MLNX-OS CLI on each switch",
    "The Network Operator in Kubernetes"
  ],
  answer: 0, multi: false,
  explanation: "SHARP (Scalable Hierarchical Aggregation and Reduction Protocol) offloads reductions into Quantum switches. sharp_am programs the aggregation trees (usually from the UFM server); GPU nodes use NCCL with the NCCL-SHARP plugin (CollNet) to use them. Requirements include ConnectX-6/Quantum HDR or newer, GPUDirect RDMA and the plugin; rail-aligned leaves are needed for streaming aggregation.",
  ref: "Module 13 · Enabling SHARP", tags: ["sharp", "sharp_am", "ufm"]
},
{
  id: "ib-046", domain: "ib", topic: "Inter-subnet routing", difficulty: 2,
  q: "Which statement correctly describes an InfiniBand router between two subnets?",
  options: [
    "Each subnet keeps its own Subnet Manager and LID space; the router forwards traffic between them based on GIDs",
    "The router merges both subnets under one Subnet Manager and renumbers all LIDs",
    "The router forwards on LIDs and requires both subnets to use the same LID ranges",
    "The router replaces the Subnet Manager in both subnets"
  ],
  answer: 0, multi: false,
  explanation: "A subnet is one SM domain with LID-based routing (16-bit LIDs limit it to ~48K usable endpoints). An IB router connects subnets while keeping them independent — separate SMs, separate LID spaces, isolation — and routes cross-subnet packets on their GIDs (GRH present). NCCL 2.22.3+ can use router alias GIDs.",
  ref: "Module 4 · InfiniBand Router", tags: ["router", "gid", "subnet"]
},
{
  id: "ib-047", domain: "ib", topic: "Subnet scale", difficulty: 2,
  q: "A design calls for a single flat InfiniBand subnet of 80,000 endpoints. Why is this not possible, and what is the remedy?",
  options: [
    "LIDs are 16-bit, so one subnet is limited to roughly 48K-64K usable endpoints; split into multiple subnets joined by InfiniBand routers",
    "The SM can only track 4,096 ports; add more SMs in the same subnet",
    "Cables longer than 100 m are not supported; use DAC",
    "PKeys are limited to 80 partitions; reduce tenants"
  ],
  answer: 0, multi: false,
  explanation: "The LID is a 16-bit field (0x0001-0xBFFF unicast), so a single subnet cannot address 80K endpoints — and well before that the SM becomes a bottleneck and the fault domain grows. Multi-subnet designs with Quantum routers (GID-based forwarding) extend scale while isolating tenants.",
  ref: "Module 4 · Is One Subnet Sufficient", tags: ["lid", "scale", "router"]
},
{
  id: "ib-048", domain: "ib", topic: "SM deployment", difficulty: 1,
  q: "Why must the Subnet Manager (or UFM) have an HCA connected to the InfiniBand fabric it manages, rather than managing it over the Ethernet management network?",
  options: [
    "The SM speaks Management Datagrams (MADs) in-band over VL15; it cannot discover or program the fabric over IP",
    "Ethernet management ports on switches are read-only",
    "IPoIB is required for the SM to reach switches",
    "UFM licensing is tied to the HCA GUID"
  ],
  answer: 0, multi: false,
  explanation: "Discovery, LID assignment, LFT programming and PKey/SL2VL table pushes are all done with SMP/GMP MADs sent through the fabric on VL15 (directed-route and LID-routed). An SM can run on a managed switch, on any host with an HCA, or on a dedicated UFM node — but always in-band.",
  ref: "Module 2 · Where Can the SM Run", tags: ["sm", "mad", "in-band"]
},
{
  id: "ib-049", domain: "ib", topic: "Routing engines", difficulty: 2,
  q: "After changing 'routing_engine' from minhop to ftree in opensm.conf, which steps verify that the new routing is in effect on the fabric?",
  options: [
    "Restart or SIGHUP OpenSM, confirm in the OpenSM log that ftree succeeded, then inspect paths with ibtracert and switch tables with ibroute",
    "Run 'nv config apply' and check 'nv show router'",
    "Reboot every switch so the LFTs are rebuilt",
    "Run ibping; a successful pong proves ftree is active"
  ],
  answer: 0, multi: false,
  explanation: "Routing is computed by the SM, so reloading OpenSM is what triggers a recalculation and LFT re-programming. The log shows whether the engine succeeded or fell back; ibtracert <src> <dst> shows the chosen hops and ibroute <switch_lid> dumps the LFT. Switches never need a reboot for routing changes, and ibping only proves reachability.",
  ref: "Module 7 · Lab 7.1", tags: ["routing", "ibtracert", "ibroute"]
},
{
  id: "ib-050", domain: "ib", topic: "HCA offload", difficulty: 1,
  q: "What does an InfiniBand HCA do that distinguishes it from a conventional Ethernet NIC with a kernel TCP/IP stack?",
  options: [
    "It implements the full transport (queue pairs, segmentation, reliability, memory protection with lkey/rkey) in hardware, enabling kernel-bypass RDMA",
    "It runs the Subnet Manager in firmware",
    "It performs IP routing between subnets",
    "It stores the Linear Forwarding Table for the attached switch"
  ],
  answer: 0, multi: false,
  explanation: "The HCA terminates the InfiniBand transport in silicon: RC/UC/UD queue pairs, packetization and reassembly, ACK/retransmission and lkey/rkey validation. Applications post work requests directly to hardware queues (verbs), bypassing the kernel. The SM is software elsewhere; LFTs live in switch ASICs.",
  ref: "Module 1 · HCA & ConnectX", tags: ["hca", "offload", "rdma"]
},
/* ===================== TSHOOT — Troubleshooting Tools (36) ===================== */
{
  id: "tshoot-001", domain: "tshoot", topic: "Cumulus resource usage", difficulty: 2,
  q: "A Spectrum switch has free system RAM, but new forwarding entries fail to install. The administrator suspects ASIC table exhaustion. Which command directly checks the relevant resource allocation?",
  options: [
    "cl-resource-query",
    "free -m",
    "nv show interface counters",
    "netq show agents"
  ],
  answer: 0, multi: false,
  explanation: "Forwarding entries (MAC addresses, host/neighbor entries, IPv4/IPv6 routes, ACL rules, multicast, VXLAN tunnels) live in the Spectrum ASIC's hardware tables, which are sized by the active forwarding-table profile and have nothing to do with system RAM. cl-resource-query prints, per table, the entries in use versus the maximum for the active profile — e.g. 'IPv4 host entries: 1023, 10% of maximum value 10240' or 'Total Routes: 3190, 97% of maximum 32768'. If a table is at or near 100 %, new entries cannot be programmed even though the CPU and memory are idle. 'free -m' shows Linux memory, interface counters show traffic, and 'netq show agents' lists telemetry agents; none of them reports ASIC table occupancy. When a table is exhausted, consider a different forwarding table profile (nv set system forwarding profile …) that trades capacity between MAC, host and route tables.",
  distractors: "Many candidates reach for memory tools because 'resource' sounds like RAM; on Cumulus 'resource' means ASIC tables.",
  ref: "Cumulus Linux · Forwarding Table Size and Profiles", tags: ["cl-resource-query", "asic", "tables", "missed-before"]
},
{
  id: "tshoot-002", domain: "tshoot", topic: "Cumulus forwarding profiles", difficulty: 2,
  q: "A proposed switch forwarding-table profile increases MAC capacity while reducing route capacity. Current route use is already close to the proposed route limit. What should be assessed before adopting the profile?",
  options: [
    "Current and projected route/host entry counts (cl-resource-query) against the new profile's route maximum, so routes are not pushed past the table limit",
    "Whether the switch has enough free RAM to hold the extra MAC entries",
    "Whether NetQ supports the new profile name",
    "Whether the spine switches use the same hostname prefix"
  ],
  answer: 0, multi: false,
  explanation: "Forwarding-table profiles (default, l2-heavy, l3-heavy, rag-l2/l3 …) re-partition the fixed ASIC memory between MAC, neighbor and route tables. Adopting an L2-heavy profile when routes are already near the smaller limit would cause route installation failures. Measure usage first with cl-resource-query and leave headroom for growth. Profile changes require a switchd restart, which is disruptive, so plan it.",
  ref: "Cumulus Linux · Forwarding Table Profiles", tags: ["forwarding-profile", "cl-resource-query"]
},
{
  id: "tshoot-003", domain: "tshoot", topic: "WJH drop analysis", difficulty: 2,
  q: "WJH records an ACL-related drop for a training flow. Which evidence best identifies the policy causing the failure?",
  options: [
    "The ACL rule (and its table/priority) that WJH names as matching the dropped packet's 5-tuple, cross-checked against the configured ACL policy",
    "The interface's PFC pause counters",
    "The BGP neighbor state on the ingress leaf",
    "The switch's free system memory"
  ],
  answer: 0, multi: false,
  explanation: "WJH reports drops with the reason category and the matching rule for ACL drops ('ACL drop: Ingress router ACL' with the rule hit), plus the packet headers. Correlating that with the configured ACL (nv show acl / the matching rule in /etc/cumulus/acl/policy.d) pinpoints which policy line blocks the flow. PFC, BGP and memory are unrelated to a rule-based deny.",
  ref: "Module 12 · WJH Event Categories", tags: ["wjh", "acl", "drop-reason"]
},
{
  id: "tshoot-004", domain: "tshoot", topic: "WJH drop analysis", difficulty: 2,
  q: "WJH reports MTU-related drops on a path carrying VXLAN-encapsulated traffic. Which comparison should the administrator make first?",
  options: [
    "The underlay interface MTU versus the overlay (host) frame size plus the ~50-byte VXLAN encapsulation overhead",
    "The VNI number on each leaf versus the VLAN ID",
    "The BGP router-ID versus the loopback address",
    "The number of ECMP paths versus the number of spines"
  ],
  answer: 0, multi: false,
  explanation: "VXLAN adds outer Ethernet (14) + IP (20) + UDP (8) + VXLAN (8) ≈ 50 bytes. If hosts send 9000-byte frames and the fabric uplinks are at 9000 (or 1500) bytes, the encapsulated packet exceeds the underlay MTU and the ASIC drops it — WJH classifies this under Layer 3 / router MTU. Fix by raising the underlay MTU (e.g. 9216) on all fabric-facing interfaces.",
  ref: "Module 11 · VXLAN encapsulation overhead", tags: ["wjh", "mtu", "vxlan"]
},
{
  id: "tshoot-005", domain: "tshoot", topic: "GPU/NIC topology", difficulty: 1,
  q: "A server's RDMA link rate is correct, but GPU transfers are slow. The team wants to inspect the GPU-to-NIC PCIe and NUMA relationship before changing fabric settings. Which command provides this topology view?",
  options: ["nvidia-smi topo -m", "ibstat", "lspci -vv | grep Mellanox", "nv show interface"],
  answer: 0, multi: false,
  explanation: "nvidia-smi topo -m (or --matrix) prints a matrix of GPU↔GPU and GPU↔NIC connection types (NV#, PIX, PXB, PHB, NODE, SYS) plus CPU/NUMA affinity. It shows whether a NIC and GPU share a PCIe switch (good for GPUDirect RDMA) or sit on different CPU sockets (bad). ibstat is link state only; lspci shows devices but not the relationship matrix.",
  ref: "Module 13 · nvidia-smi topo --matrix", tags: ["nvidia-smi", "topo", "pcie", "numa"]
},
{
  id: "tshoot-006", domain: "tshoot", topic: "GPU/NIC topology", difficulty: 2,
  q: "Two supported GPU-to-NIC paths are available: one crosses a single PCIe switch (PIX), while the other traverses an inter-socket CPU connection (SYS). Which path should be evaluated first for efficient GPUDirect RDMA transfers?",
  options: [
    "The PIX path, because it stays within one PCIe switch and avoids the host bridge and the inter-socket link",
    "The SYS path, because the CPU interconnect has more bandwidth than PCIe",
    "Either, because NCCL automatically equalizes them",
    "Neither; GPUDirect RDMA requires NVLink between GPU and NIC"
  ],
  answer: 0, multi: false,
  explanation: "nvidia-smi topo ranks locality: NV# (NVLink) > PIX (same PCIe switch) > PXB (multiple PCIe switches, no host bridge) > PHB (through the host bridge) > NODE (same NUMA node) > SYS (across sockets via UPI/QPI). GPUDirect RDMA works best when GPU and NIC share a PCIe switch; crossing sockets adds latency and can halve bandwidth. NCCL prefers local NICs but cannot fix bad placement.",
  ref: "Module 13 · nvidia-smi topo --matrix", tags: ["nvidia-smi", "pix", "sys", "gpudirect"]
},
{
  id: "tshoot-007", domain: "tshoot", topic: "UFM system health", difficulty: 2,
  q: "UFM reports a critical local disk-space condition and its services stop recording telemetry. Fabric ports remain active. Which first investigation addresses the stated management-system problem?",
  options: [
    "Check the UFM server's filesystem usage (logs, telemetry database, backups) in the UFM System Health view or with df on the server, and free or expand space",
    "Run ibdiagnet to look for fabric errors",
    "Fail over the Subnet Manager to the standby switch",
    "Reset the port counters with perfquery -R"
  ],
  answer: 0, multi: false,
  explanation: "The fabric is fine — the alarm is about the management server itself. UFM's System Health tab reports server-side conditions (disk, memory, CPU, service status). Telemetry history and logs grow quickly; when the disk fills, collection stops. Identify what consumed the disk, rotate/purge logs or telemetry retention, then confirm the services resume.",
  ref: "UFM Enterprise UM · System Health", tags: ["ufm", "system-health", "disk"]
},
{
  id: "tshoot-008", domain: "tshoot", topic: "Physical error localization", difficulty: 2,
  q: "UFM shows a new physical-error (symbol error) alarm on a switch port during a job. Which next comparison helps localize the suspect connection?",
  options: [
    "Compare error counters on both ends of that link (the switch port and its peer port) and inspect the cable/transceiver with mlxlink",
    "Compare the switch's uptime with the spine's uptime",
    "Compare the LID of the port with the LID of the SM",
    "Compare the PKey tables of the two tenants"
  ],
  answer: 0, multi: false,
  explanation: "Symbol errors are counted by the receiver; comparing both ends tells you which direction is failing. Errors only on one side point at that receiver's optic or the far-end transmitter; errors on both sides point at the cable. iblinkinfo shows the peer port; perfquery reads both counters; mlxlink -c/-e gives BER and eye data. Then replace the cable or transceiver.",
  ref: "Module 10 · Worked Fault", tags: ["symbol-errors", "mlxlink", "peer-port"]
},
{
  id: "tshoot-009", domain: "tshoot", topic: "perftest utilities", difficulty: 1,
  q: "A pair of endpoints passes an RDMA bandwidth test, but the application's requirement also specifies RDMA write-operation latency. Which additional utility measures that missing characteristic?",
  options: ["ib_write_lat", "ib_write_bw with --report_gbits", "ibping", "ib_send_bw"],
  answer: 0, multi: false,
  explanation: "perftest has paired tools: ib_write_bw / ib_read_bw / ib_send_bw measure bandwidth with large messages, and ib_write_lat / ib_read_lat / ib_send_lat measure round-trip latency with small messages (reporting t_min, t_max, t_avg in µs). ibping measures MAD round-trip at the IB layer, not RDMA write latency.",
  ref: "Module 3 · Lab 3.1", tags: ["ib_write_lat", "perftest", "latency"]
},
{
  id: "tshoot-010", domain: "tshoot", topic: "Fabric link reporting", difficulty: 2,
  q: "After recabling a fabric, an administrator wants a node-by-node report of link information (peer, state, negotiated speed and width) for every port throughout the InfiniBand subnet. Which utility fits this reporting scope?",
  options: ["iblinkinfo", "ibstat", "ibping", "perfquery"],
  answer: 0, multi: false,
  explanation: "iblinkinfo walks the whole subnet and prints, for every switch and CA, each port's state, physical state, width and speed (e.g. '4X 25.78125 Gbps Active/LinkUp') together with the remote node and port it connects to — exactly a node-by-node link report. It is the fastest way to spot a link that negotiated down (e.g. 2X or EDR instead of HDR) or landed on the wrong peer after recabling. ibstat only reports the local host's HCA ports; ibping tests reachability between two nodes; perfquery reads counters for one port. ibnetdiscover also walks the subnet but is a topology dump oriented to GUIDs and links rather than a per-port speed/state report.",
  distractors: "ibnetdiscover is the usual confusion: it maps the topology, while iblinkinfo reports link state and rate per port.",
  ref: "Module 2 · The Diagnostic Toolbox", tags: ["iblinkinfo", "link-speed", "topology", "missed-before"]
},
{
  id: "tshoot-011", domain: "tshoot", topic: "Fabric-wide diagnostics", difficulty: 1,
  q: "Which single command produces a fabric-wide InfiniBand health report that includes port counters and clears them for the next run, so recurring errors can be measured?",
  options: ["ibdiagnet --pc --pm", "ibnetdiscover", "ibnodes", "sminfo"],
  answer: 0, multi: false,
  explanation: "ibdiagnet performs discovery, validates routing and partitions, dumps switch/HCA configuration and collects performance counters. '--pm' reads the port counters and '--pc' clears them after reading, so a second run shows only new errors. Output goes to /var/tmp/ibdiagnet2 (ibdiagnet2.log, .db_csv, .pm). Read the summary section, not just the exit code.",
  ref: "Module 10 · Connectivity Issues", tags: ["ibdiagnet", "counters"]
},
{
  id: "tshoot-012", domain: "tshoot", topic: "ibping", difficulty: 1,
  q: "An administrator wants to prove InfiniBand-layer reachability between two hosts without relying on IP. Which sequence is correct?",
  options: [
    "On the target: ibping -S; on the source: ibping -L <target LID> (or -G <target port GUID>)",
    "On both hosts: ibping <peer IP>",
    "On the source: ibping -S <target LID>",
    "On the target: ibping -L; on the source: ibping -S"
  ],
  answer: 0, multi: false,
  explanation: "ibping works with MADs at the IB layer: one side must run as a server (-S), the other sends requests by LID (-L) or by Port GUID (-G). A successful 'Pong' proves the SM has routed both ports and the fabric path works; if ibping works but the application does not, the problem is above the fabric (IPoIB, PKey, firewall, app).",
  ref: "Module 2 · ibping", tags: ["ibping", "reachability"]
},
{
  id: "tshoot-013", domain: "tshoot", topic: "Path tracing", difficulty: 2,
  q: "Data transfer between two specific nodes is slow while the rest of the fabric is fine. The administrator wants to see every switch hop between them to find a suboptimal or faulty link. Which command?",
  options: ["ibtracert <src_lid> <dst_lid>", "ibswitches", "ibstat -d mlx5_0", "ibdiagnet --sharp"],
  answer: 0, multi: false,
  explanation: "ibtracert follows the Linear Forwarding Tables from the source LID to the destination LID and prints each switch and exit port along the way. You can then check counters on exactly those ports (perfquery) or compare paths for different LIDs when LMC > 0. ibswitches lists switches, ibstat shows local state, --sharp validates aggregation trees.",
  ref: "Module 7 · The Linear Forwarding Table", tags: ["ibtracert", "path"]
},
{
  id: "tshoot-014", domain: "tshoot", topic: "Switch forwarding tables", difficulty: 2,
  q: "The administrator wants to see exactly which output port a given switch (LID 4) uses for each destination LID. Which command dumps that table?",
  options: ["ibroute 4", "ibtracert 4", "smpquery ND 4", "ibhosts"],
  answer: 0, multi: false,
  explanation: "ibroute <switch_lid> dumps the switch's unicast Linear Forwarding Table: destination LID → output port, with the destination node description. It is the table the SM programmed. ibtracert needs two LIDs and shows one path; smpquery ND returns the node description string; ibhosts lists HCAs.",
  ref: "Module 7 · ibroute", tags: ["ibroute", "lft"]
},
{
  id: "tshoot-015", domain: "tshoot", topic: "Port counters", difficulty: 2,
  q: "perfquery on a switch port shows SymbolErrorCounter = 1,842. Why should the administrator read the counter twice a known interval apart (or reset it) before concluding the link is bad now?",
  options: [
    "Port counters are cumulative since the last clear; only the delta over time shows whether errors are still occurring (perfquery -R resets them)",
    "perfquery rounds values and the second read is more precise",
    "The SM must approve the first read before the counter is valid",
    "Symbol errors are only reported on even-numbered reads"
  ],
  answer: 0, multi: false,
  explanation: "Error counters accumulate since boot or last reset, so 1,842 could be months old. Read, wait (e.g. 60 s), read again and compute the rate — or 'perfquery -R <lid> <port>' to reset, then re-read after an interval. A flat counter after a cable swap proves the fix; a rising one means the problem persists.",
  ref: "Module 10 · Worked Fault / Checkpoint Q4", tags: ["perfquery", "counters", "delta"]
},
{
  id: "tshoot-016", domain: "tshoot", topic: "Locating the master SM", difficulty: 1,
  q: "Which two-step command sequence identifies which server is currently the master Subnet Manager by hostname?",
  options: [
    "sminfo (returns the master SM LID and GUID), then smpquery ND <lid> (resolves the LID to its node description)",
    "ibstat, then ibhosts",
    "ibping -S, then ibping -L 1",
    "ibdiagnet, then ibroute"
  ],
  answer: 0, multi: false,
  explanation: "sminfo queries SMInfo and prints 'sm lid X sm guid 0x… priority N state 3 SMINFO_MASTER'. 'smpquery ND X' (NodeDescription) turns that LID into the node's name, e.g. 'ufm01 HCA-1'. ibstat's 'SM lid' also gives the LID but not the name.",
  ref: "Module 2 · ibping / sminfo", tags: ["sminfo", "smpquery", "master-sm"]
},
{
  id: "tshoot-017", domain: "tshoot", topic: "mlxlink BER", difficulty: 2,
  q: "mlxlink -c on a port shows Raw Physical BER 3E-9 and Effective Physical BER 15E-255, with Effective Physical Errors = 0. How should this be interpreted?",
  options: [
    "Healthy: raw errors are being corrected by FEC and the post-FEC (effective) error rate seen by the application is effectively zero",
    "Failing: any raw BER above 1E-15 means the cable must be replaced",
    "Failing: 15E-255 indicates an overflow in the counter",
    "Unknown: mlxlink cannot report BER on InfiniBand links"
  ],
  answer: 0, multi: false,
  explanation: "Raw BER is measured before forward error correction; some raw errors are normal at HDR/NDR speeds. Effective BER is after FEC and is what the link actually delivers — it should be ~0. If Effective Physical Errors keep incrementing, do L1 troubleshooting (clean/reseat/replace). Clear with 'mlxlink … --pc', wait, re-read.",
  ref: "Module 10 · Reading mlxlink", tags: ["mlxlink", "ber", "fec"]
},
{
  id: "tshoot-018", domain: "tshoot", topic: "mlxlink options", difficulty: 2,
  q: "Which mlxlink option combination shows transceiver/module information and the FEC mode in use on a flapping link?",
  options: [
    "mlxlink -d /dev/mst/<device> -p <port> -m --show_fec",
    "mlxlink -d /dev/mst/<device> --pc",
    "mlxlink -d /dev/mst/<device> -e",
    "mlxlink -d /dev/mst/<device> --json -c"
  ],
  answer: 0, multi: false,
  explanation: "mlxlink flags: -m module info (vendor, part number, temperature, Tx/Rx power), --show_fec FEC mode, -c counters and BER, -e eye-opening, --pc clear counters, --json machine output. For a flapping link start with -m (optics health, Rx/Tx power) and FEC/speed agreement, then -c for BER. MST must be started first (mst start) to create /dev/mst devices.",
  ref: "Module 10 · Hardware / Physical Layer Issues", tags: ["mlxlink", "module", "fec"]
},
{
  id: "tshoot-019", domain: "tshoot", topic: "Link diagnostics", difficulty: 3,
  q: "On an NVIDIA InfiniBand switch, 'show interfaces ib link-diagnostics' reports opcode 2 on a port that will not come up. What does this indicate and what is the mitigation?",
  options: [
    "Auto-negotiation failure (speed/FEC disagreement): verify both ends use the same speed and FEC settings or full auto-negotiation, and check Tx/Rx optical power",
    "Port administratively closed: re-enable it with no shutdown",
    "Logical mismatch / no block lock: escalate with dumps",
    "No issue observed: wait and re-check"
  ],
  answer: 0, multi: false,
  explanation: "Link-diagnostic opcodes group the failure stage: 0 no issue; 1 port closed by command (admin down); 2-4 auto-negotiation failures (speed/FEC mismatch, next-page exchange); 5-8 link-training failures; 9-12 logical mismatches (block/AM/FEC lock). Opcode 2 therefore means AN failed — align speed and FEC on both sides and check optical power (low Tx → suspect this transceiver; low Rx → suspect far-end Tx and both optics).",
  ref: "Module 10 · Link Diagnostics opcodes", tags: ["link-diagnostics", "opcode", "autoneg"]
},
{
  id: "tshoot-020", domain: "tshoot", topic: "Fabric inventory", difficulty: 1,
  q: "After adding 16 servers to an InfiniBand fabric, the administrator wants a quick count to confirm that every new HCA joined the subnet. Which command lists all HCAs in the fabric?",
  options: ["ibhosts", "ibswitches", "ibstat", "ibv_devinfo"],
  answer: 0, multi: false,
  explanation: "ibhosts lists every Channel Adapter the SM knows (GUID, port count, node description); ibswitches lists switches; ibnodes lists both. ibstat and ibv_devinfo only describe the local host's adapters. Compare the ibhosts count with the expected number after an expansion.",
  ref: "Module 2 · Diagnostic Toolbox", tags: ["ibhosts", "inventory"]
},
{
  id: "tshoot-021", domain: "tshoot", topic: "Topology discovery", difficulty: 1,
  q: "Which command performs a full topology scan of the InfiniBand subnet, printing every node (with GUIDs and LIDs) and every link between switch ports and host ports?",
  options: ["ibnetdiscover", "ibstat", "sminfo", "ib_write_bw"],
  answer: 0, multi: false,
  explanation: "ibnetdiscover walks the subnet with directed-route MADs and outputs the complete connectivity graph (switch/CA records with GUIDs, LIDs, port numbers, link widths/speeds and peers). Use '-p' for a ports-only view. It is the tool to map the fabric after a change; UFM's topology file is the equivalent source-of-truth artifact.",
  ref: "Module 2 · Diagnostic Toolbox", tags: ["ibnetdiscover", "topology"]
},
{
  id: "tshoot-022", domain: "tshoot", topic: "ibstat interpretation", difficulty: 2,
  q: "ibstat on a ConnectX-7 host connected to a Quantum-2 NDR switch shows 'Rate: 100' and 'State: Active'. What does this tell the administrator?",
  options: [
    "The link is up but negotiated down to EDR (100 Gb/s) instead of NDR (400 Gb/s) — investigate cable, transceiver or port speed settings",
    "The link is healthy at full NDR speed",
    "The port is in Initializing state",
    "The HCA is in Ethernet mode"
  ],
  answer: 0, multi: false,
  explanation: "ibstat's Rate is the negotiated 4x link rate in Gb/s: 40 QDR, 56 FDR, 100 EDR, 200 HDR, 400 NDR, 800 XDR. An NDR-capable pair showing 100 has fallen back to EDR — commonly a cable/optic that does not support NDR, a port speed restriction (ibportstate/switch config) or a bad lane (reduced width). Active only means the SM configured the port; it says nothing about speed.",
  ref: "Module 1 · Lab 1.1 / Evolution of InfiniBand", tags: ["ibstat", "rate", "negotiation"]
},
{
  id: "tshoot-023", domain: "tshoot", topic: "RoCE device state", difficulty: 1,
  q: "On a Spectrum-X host, which command quickly shows the RDMA devices, their port state and whether the link layer is Ethernet (RoCE) or InfiniBand?",
  options: ["rdma link show", "nv show qos roce", "ip addr show", "netq show agents"],
  answer: 0, multi: false,
  explanation: "rdma link show (from rdma-core/iproute2) lists each RDMA device/port with state (ACTIVE/DOWN), physical state and the netdev it is bound to, e.g. 'link mlx5_0/1 state ACTIVE physical_state LINK_UP netdev eth1'. ibv_devinfo adds link_layer: Ethernet vs InfiniBand. 'nv show qos roce' runs on the switch, not the host.",
  ref: "Module 11 · RoCE Lab", tags: ["rdma", "roce", "link-layer"]
},
{
  id: "tshoot-024", domain: "tshoot", topic: "Driver validation", difficulty: 1,
  q: "After installing MLNX_OFED on a new GPU server, which command confirms that the kernel exposes the ConnectX adapter to RDMA user space and reports its GUIDs and port attributes?",
  options: ["ibv_devinfo", "lspci", "ethtool -i eth0", "nvidia-smi"],
  answer: 0, multi: false,
  explanation: "ibv_devinfo queries the verbs layer (ib_uverbs) and prints device name, firmware, node GUID, port state, MTU, link layer and (with -v) GIDs. If the device is missing, the driver stack (mlx5_core/mlx5_ib/ib_uverbs) is not loaded — check 'lsmod | grep mlx' and 'ofed_info -s'. lspci only proves the PCI device is present.",
  ref: "Module 5 · Installing and Verifying OFED", tags: ["ibv_devinfo", "ofed", "verbs"]
},
{
  id: "tshoot-025", domain: "tshoot", topic: "Driver validation", difficulty: 1,
  q: "A host behaves as if RDMA is unavailable. Which pair of commands shows (a) which Mellanox kernel modules are loaded and (b) which OFED release is installed?",
  options: [
    "lsmod | grep mlx  and  ofed_info -s",
    "ibstat  and  ibhosts",
    "mst status  and  mlxlink",
    "dmesg | grep gpu  and  nvidia-smi"
  ],
  answer: 0, multi: false,
  explanation: "lsmod shows mlx5_core (hardware driver), mlx5_ib (IB protocol driver), ib_core and ib_uverbs; 'modinfo mlx5_core | grep filename' shows whether the module comes from the OFED path or the inbox kernel. 'ofed_info -s' prints the MLNX_OFED/DOCA-Host version string. Together they tell you whether the right stack is active after an install or kernel update.",
  ref: "Module 1 · Kernel Modules / Module 5", tags: ["lsmod", "ofed_info", "driver"]
},
{
  id: "tshoot-026", domain: "tshoot", topic: "MFT tools", difficulty: 1,
  q: "mlxconfig and mlxlink fail with 'No devices found'. Which step is required first?",
  options: ["Start the Mellanox Software Tools service with 'mst start' and list devices with 'mst status'", "Reboot into the OFED kernel", "Run 'opensm -B'", "Enable the port with 'ibportstate … enable'"],
  answer: 0, multi: false,
  explanation: "MFT tools address adapters through /dev/mst/<device> nodes (e.g. /dev/mst/mt4123_pciconf0). Those nodes exist only after 'mst start' loads the mst kernel modules; 'mst status' lists them. Then run 'mlxconfig -d /dev/mst/… q' or 'mlxlink -d /dev/mst/… -p 1'.",
  ref: "Module 12 · Verifying and Changing DPU Mode", tags: ["mst", "mft", "mlxconfig"]
},
{
  id: "tshoot-027", domain: "tshoot", topic: "WJH drop analysis", difficulty: 2,
  q: "WJH reports that packets to a destination are dropped because no route exists (Layer 3 'blackhole'/no-route reason). The relevant links remain up. Which investigation most directly addresses the reported reason?",
  options: [
    "Check the routing table / RIB for the destination prefix on that switch (nv show vrf <vrf> router rib ipv4 route) and the BGP advertisements that should supply it",
    "Replace the optics on the uplink because links flap",
    "Increase the switch buffer thresholds",
    "Change the VLAN of the host port"
  ],
  answer: 0, multi: false,
  explanation: "A 'no route' drop means the ASIC had no matching forwarding entry — a control-plane problem: missing or filtered BGP route, wrong VRF, missing redistribution, or a prefix not advertised by the leaf. Verify the RIB/FIB in the correct VRF and the BGP neighbor's received routes. Physical and buffer tuning are unrelated to this reason code.",
  ref: "Module 12 · WJH Event Categories (Layer 3)", tags: ["wjh", "no-route", "rib"]
},
{
  id: "tshoot-028", domain: "tshoot", topic: "Telemetry interpretation", difficulty: 2,
  q: "During a training burst, switch telemetry shows rising egress queue occupancy and buffer tail drops on an uplink, while physical error counters stay flat. Which condition is best supported by this evidence?",
  options: [
    "Congestion / oversubscription on that uplink (incast or hashing imbalance), not a physical-layer fault",
    "A failing transceiver on the uplink",
    "A VXLAN VNI mismatch between leaves",
    "A Subnet Manager failover"
  ],
  answer: 0, multi: false,
  explanation: "Queue build-up plus buffer drops with clean CRC/symbol counters is the signature of congestion: more traffic is offered to the egress port than it can drain. Remedies are adaptive routing / better load balancing, ECN+PFC for RoCE losslessness, or more uplink capacity. Physical faults show up as CRC/symbol/FEC errors; VNI mismatches drop at the VXLAN layer; SM failover is an InfiniBand concept.",
  ref: "Module 12 · WJH Buffer & Congestion", tags: ["congestion", "buffer-drops", "telemetry"]
},
{
  id: "tshoot-029", domain: "tshoot", topic: "WJH commands", difficulty: 2,
  q: "Which pairing correctly matches an on-box and an off-box way to view What Just Happened drop events?",
  options: [
    "On the switch: nv show system wjh (status/config) and the WJH service output; on the NetQ server: netq show wjh-drop",
    "On the switch: netq show wjh-drop; on the NetQ server: nv show system wjh",
    "On the switch: ibdiagnet --wjh; on UFM: WJH dashboard",
    "On the switch: cl-resource-query; on NetQ: netq check bgp"
  ],
  answer: 0, multi: false,
  explanation: "WJH has two components on Cumulus: the on-box what-just-happened service (enabled by default; 'nv show system wjh' and channel/trigger config) and the WJH agent that streams events to NetQ. On the NetQ server, 'netq show wjh-drop [between now and 1h]' lists drops with reasons across the fabric. ibdiagnet/UFM are InfiniBand tools.",
  ref: "Module 12 · WJH Useful Commands", tags: ["wjh", "netq", "nv-show"]
},
{
  id: "tshoot-030", domain: "tshoot", topic: "perftest utilities", difficulty: 2,
  q: "An administrator runs 'ib_write_bw' on a server and 'ib_write_bw -d mlx5_0 --report_gbits 192.168.0.219' on a client. BW average is 23 Gb/s on a 40 Gb/s (QDR) link. What is the most reasonable next step?",
  options: [
    "Compare against the expected near-line-rate baseline for QDR (~32-35 Gb/s), then check link width/speed (iblinkinfo), PCIe generation/width of the HCA slot, and run with more QPs (-q) before blaming the fabric",
    "Conclude the switch is faulty and replace it",
    "Switch to ib_write_lat, which reports higher bandwidth",
    "Enable PFC on the InfiniBand switch"
  ],
  answer: 0, multi: false,
  explanation: "Bandwidth tests should approach line rate minus protocol overhead. A shortfall is usually host-side: a PCIe slot narrower than the HCA needs, a port that negotiated down (check iblinkinfo/ibstat Rate), single-QP limits (try -q 4/8) or CPU/NUMA placement. ib_write_lat measures latency, not bandwidth; PFC is an Ethernet mechanism.",
  ref: "Module 3 · Lab 3.1", tags: ["ib_write_bw", "baseline", "pcie"]
},
{
  id: "tshoot-031", domain: "tshoot", topic: "Subnet Administrator queries", difficulty: 2,
  q: "Which tool queries the Subnet Administrator (SA) database for records such as the list of SMs, node records or path records, rather than sending SMPs directly to a port?",
  options: ["saquery (e.g. saquery -s for SMInfo records)", "smpquery", "ibportstate", "ibroute"],
  answer: 0, multi: false,
  explanation: "saquery talks to the Subnet Administrator (part of the SM) using GMP MADs to retrieve SA records: SMInfoRecord (-s), NodeRecord, PathRecord, PKeyTableRecord, etc. smpquery instead sends Subnet Management Packets directly to a specific LID/port to read its attributes (NodeDesc, PortInfo, PKeys, SL2VL). ibportstate changes a port's state/speed; ibroute dumps LFTs.",
  ref: "Module 10 · Troubleshooting Stack (SM health)", tags: ["saquery", "sa", "smpquery"]
},
{
  id: "tshoot-032", domain: "tshoot", topic: "RoCE connectivity test", difficulty: 2,
  q: "On two Spectrum-X hosts with RoCE devices, which test proves that a Reliable Connected queue pair can be established over Ethernet before running bandwidth tests?",
  options: [
    "Server: ibv_rc_pingpong -d <dev> -g 0; Client: ibv_rc_pingpong -d <dev> -g 0 <server IP>",
    "ping -c 3 <server IP>",
    "ibping -S on the server and ibping -L on the client",
    "nv show qos roce on both hosts"
  ],
  answer: 0, multi: false,
  explanation: "ibv_rc_pingpong is a verbs-level test that creates RC QPs and exchanges messages; '-g 0' selects GID index 0, which is required on RoCE because addressing is GID-based. ping only proves IP; ibping uses MADs and the Subnet Manager, which do not exist on RoCE; 'nv show qos roce' is a switch command.",
  ref: "Module 11 · Verify RoCE Connectivity", tags: ["roce", "ibv_rc_pingpong", "gid"]
},
{
  id: "tshoot-033", domain: "tshoot", topic: "Optical diagnostics", difficulty: 2,
  q: "mlxlink -m on a flapping link shows normal Tx power on the local transceiver but very low Rx power. Where should the administrator look first?",
  options: [
    "At the far-end transmitter and the fiber/connectors between the two transceivers (far-end Tx or dirty/damaged fiber), then the local receiver",
    "At the local transceiver's laser, because low Rx means the local Tx is failing",
    "At the Subnet Manager, because low Rx power is assigned by the SM",
    "At the VL arbitration table"
  ],
  answer: 0, multi: false,
  explanation: "Rx power is what arrives from the other side. Low Rx with normal local Tx implicates the far-end transmitter, the cable/fiber or the connectors (contamination, bends, wrong fiber type). Low Tx power would implicate the local transceiver. Clean/inspect, swap the far-end optic, then the cable.",
  ref: "Module 10 · Link Diagnostics (power)", tags: ["mlxlink", "optical-power", "rx"]
},
{
  id: "tshoot-034", domain: "tshoot", topic: "Port counters", difficulty: 2,
  q: "Which perfquery counter indicates that a port repeatedly lost and re-established its link (flapping), as opposed to bit errors on a stable link?",
  options: ["LinkDownedCounter", "SymbolErrorCounter", "PortXmitWait", "PortRcvData"],
  answer: 0, multi: false,
  explanation: "LinkDownedCounter increments every time the port's link went down (training failure, cable pull, remote reset). SymbolErrorCounter counts corrupted symbols on an up link; LinkErrorRecoveryCounter counts successful retrains. PortXmitWait is congestion; PortRcvData is traffic volume.",
  ref: "Module 10 · perfquery", tags: ["perfquery", "linkdowned", "flapping"]
},
{
  id: "tshoot-035", domain: "tshoot", topic: "ibdiagnet output", difficulty: 2,
  q: "Where does ibdiagnet place its results by default, and which files should be reviewed for fabric errors and counters?",
  options: [
    "/var/tmp/ibdiagnet2 — ibdiagnet2.log (summary and errors), ibdiagnet2.db_csv (fabric database) and ibdiagnet2.pm (port counters)",
    "/etc/opensm — opensm.log and partitions.conf",
    "/var/log/messages — kernel RDMA events",
    "/opt/ufm/log — ufm.log"
  ],
  answer: 0, multi: false,
  explanation: "ibdiagnet writes to /var/tmp/ibdiagnet2 by default (-o changes it). ibdiagnet2.log holds the per-stage summary with error/warning counts; .db_csv is the full fabric dump; .pm has the collected counters when --pm is used; additional files cover routing (.fdbs), PKeys and SHARP. Always read the summary section rather than only the exit status.",
  ref: "Module 10 · ibdiagnet", tags: ["ibdiagnet", "output-files"]
},
{
  id: "tshoot-036", domain: "tshoot", topic: "Collective performance verification", difficulty: 2,
  q: "Point-to-point RDMA tests are at line rate, yet distributed training is slower after a network change. Which test most directly verifies GPU-to-GPU collective performance across the fabric against the site baseline?",
  options: [
    "NCCL tests such as all_reduce_perf (e.g. all_reduce_perf -b 8 -e 8G -f 2 -g <gpus>), comparing bus bandwidth with the CloudAI/NCCL baseline",
    "ibping between every pair of nodes",
    "ibstat on each node to confirm Active state",
    "nv show interface counters on the leaf switches"
  ],
  answer: 0, multi: false,
  explanation: "ib_write_bw validates one link/pair; collectives stress many paths simultaneously and depend on NCCL topology choices (rings/trees, PXN, SHARP). nccl-tests report busbw per message size; compare with the baseline captured by CloudAI Benchmark. A drop with healthy point-to-point results points to routing/AR, rail alignment, SHARP trees or NCCL configuration.",
  ref: "Module 10 · Performance Issues / Module 12 CloudAI", tags: ["nccl-tests", "all_reduce_perf", "baseline"]
},
{ id: "__end__", domain: "dc", topic: "placeholder", difficulty: 1, q: "", options: ["a","b","c","d"], answer: 0, multi: false, explanation: "", ref: "", tags: [] }
);
// remove placeholder
window.NCP_QUESTIONS = window.NCP_QUESTIONS.filter(function (q) { return q.id !== "__end__"; });
// Authoring convention in this file: the correct option is written first for readability.
// Deterministically rotate options per question (by id) so the correct answer is not always "A",
// even if the app does not shuffle. The answer index is adjusted accordingly.
(function () {
  var mine = /^(dc|ib|tshoot)-\d{3}$/;
  window.NCP_QUESTIONS.forEach(function (q) {
    if (!mine.test(q.id) || q._rotated) return;
    var h = 0; for (var i = 0; i < q.id.length; i++) h = (h * 31 + q.id.charCodeAt(i)) >>> 0;
    var n = q.options.length, r = h % n;
    if (r) {
      q.options = q.options.slice(r).concat(q.options.slice(0, r));
      var fix = function (a) { return (a - r + n) % n; };
      q.answer = Array.isArray(q.answer) ? q.answer.map(fix) : fix(q.answer);
    }
    q._rotated = true;
  });
})();

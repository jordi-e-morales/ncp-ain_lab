// Official NCP-AIN exam blueprint (nvidia.com/learn/certification/ai-networking-professional)
// Weights drive the exam-mode sampler; objectives feed the dashboard and study tab.
window.NCP_SYLLABUS = {
  exam: {
    code: "NCP-AIN",
    name: "NVIDIA-Certified Professional: AI Networking",
    duration_min: 120,
    questions: "70-75",
    pass_note: "Pass/fail; practice sets use 70% as the bar. Valid 2 years.",
    price: "$500",
    audience: "2-3 years hands-on data-center experience with NVIDIA networking (InfiniBand + Spectrum-X).",
    training: [
      "InfiniBand Essentials (self-paced)",
      "InfiniBand Network Administration (self-paced)",
      "Cumulus Linux Essentials (self-paced)"
    ]
  },
  domains: [
    {
      key: "dc", weight: 5, name: "AI Data Center Design and Optimization",
      color: "#76b900",
      objectives: [
        "Describe an AI factory networking architecture and its components (GPUs, BlueField, scalable units, switches)",
        "Describe rail-optimized topologies for high-performance AI workloads",
        "Describe GPU-to-GPU communications (NVLink scale-up, InfiniBand/Spectrum-X scale-out, GPUDirect RDMA, PXN)"
      ]
    },
    {
      key: "spx", weight: 30, name: "NVIDIA Spectrum Networking",
      color: "#00a3e0",
      objectives: [
        "Configure Spectrum-X switches for RoCE (lossless profile, PFC, ECN, DSCP trust) to enable high-speed low-latency communication",
        "Enable and verify QoS, ECN, PFC and advanced features like adaptive routing and telemetry",
        "Configure multi-tenancy BGP-EVPN (VRF + L3VNI, VXLAN, route targets) to isolate tenant workloads",
        "Use NVIDIA DSX Air to simulate network environments and identify potential issues",
        "Diagnose congestion or packet loss using in-band telemetry and What Just Happened (WJH)",
        "Use NetQ for real-time monitoring, congestion detection and latency measurement",
        "Install NVIDIA DOCA (DOCA-Host, matching architecture and OS release)",
        "Configure NVIDIA SuperNIC functionality (programmable congestion control, packet reordering)"
      ]
    },
    {
      key: "ib", weight: 30, name: "NVIDIA InfiniBand Networking",
      color: "#8e44ad",
      objectives: [
        "Perform initial configuration and provisioning, including high availability (SM priority, UFM HA pair)",
        "Configure partition keys (PKeys) to ensure secure multi-tenancy (full vs limited membership, partitions.conf)",
        "Configure QoS (SL to VL mapping, VL arbitration) and adaptive routing",
        "Use UFM to monitor link status, bandwidth utilization and congestion (XmitWait)"
      ]
    },
    {
      key: "k8s", weight: 5, name: "Kubernetes Integration",
      color: "#e67e22",
      objectives: [
        "Deploy the NVIDIA Network Operator to manage RDMA interfaces and InfiniBand networks in Kubernetes",
        "Verify Network Operator functionality (NicClusterPolicy, device plugins, RDMA resources on pods)"
      ]
    },
    {
      key: "tshoot", weight: 20, name: "Troubleshooting Tools",
      color: "#c0392b",
      objectives: [
        "Use cl-resource-query to check ASIC resource allocation on Spectrum switches",
        "Use WJH for real-time drop/event analysis",
        "Verify low-latency interconnects between GPUs, CPUs and storage (nvidia-smi topo, perftest)",
        "Use UFM system health to diagnose InfiniBand issues",
        "Use ib_write_lat, ib_write_bw, ibping, ibstat, ibdiagnet, ibnodes, iblinkinfo to diagnose connectivity"
      ]
    },
    {
      key: "auto", weight: 10, name: "Automation and Configuration",
      color: "#16a085",
      objectives: [
        "Manage Spectrum-X switch configurations through NVUE templates (patch/replace, diff, revisions, save)",
        "Write Ansible playbooks (nvidia.nvue collection, inventory groups, group_vars) to automate VLAN or RoCE configuration"
      ]
    }
  ]
};
window.NCP_DOMAIN = Object.fromEntries(window.NCP_SYLLABUS.domains.map(d => [d.key, d]));

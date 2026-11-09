// ---------------------------------------------------------------------------
// NVUE model for Cumulus Linux switches.
//   nv set <path...>        -> pending tree (a numbered revision is opened)
//   nv config diff          -> pending vs applied, in `nv set / nv unset` form
//   nv config apply         -> pending becomes applied, revision recorded
//   nv config apply <rev>   -> rollback to that revision's configuration
//   nv config save          -> applied is written to startup (survives reboot)
//   nv config patch <file>  -> merge a YAML fragment into pending (incremental)
//   nv show <path...>       -> operational views derived from applied + topology
// The tree is generic: every token becomes a nested key, so any NVUE path works.
// ---------------------------------------------------------------------------
window.SIM = window.SIM || {};

SIM.NVUE = {
  create(name) {
    const m = { name, pending: {}, applied: {}, revisions: [], nextRev: 1, saved: true, autosave: false, pendingOpen: false };
    (SIM.baseline[name] || []).forEach(line => SIM.NVUE.setPath(m.applied, line.split(/\s+/)));
    m.pending = SIM.NVUE.clone(m.applied);
    m.revisions.push({ id: m.nextRev++, ts: SIM.NVUE.now(), user: "system", note: "baseline", config: SIM.NVUE.clone(m.applied) });
    return m;
  },
  clone: o => JSON.parse(JSON.stringify(o)),
  now() { return new Date().toISOString().replace("T", " ").slice(0, 19); },

  // Insert tokens as nested keys. Range/comma tokens in position 1 (interface list) expand.
  // Keys whose children are a collection (several values may coexist). Everything
  // else is a scalar: setting a new value REPLACES the old one (like real NVUE).
  COLLECTIONS: new Set(["address", "neighbor", "vlan", "interface", "vrf", "domain", "channel", "trigger", "member", "route", "port-group", "rule", "acl", "bond"]),
  isCollection(pathToParent) {
    const key = pathToParent[pathToParent.length - 1], gp = pathToParent[pathToParent.length - 2];
    if (key === "vni" && gp === "evpn") return true;          // nv set evpn vni 10010 ...
    if (key === "vlan" && gp === "interface") return false;    // (never happens, safety)
    return SIM.NVUE.COLLECTIONS.has(key);
  },
  setPath(tree, toks) {
    if (!toks.length) return;
    const lists = toks.map((t, i) => (i === 1 && /[,-]/.test(t) && /^[a-z]+\d/.test(t)) ? SIM.expandRange(t) : [t]);
    const walk = (node, i, path) => {
      if (i === toks.length) return;
      // last token = a value: replace the previous value unless the parent is a collection
      if (i === toks.length - 1 && i > 0 && !SIM.NVUE.isCollection(path)) {
        const existing = Object.keys(node);
        if (existing.length && existing.every(k => !Object.keys(node[k]).length)) existing.forEach(k => delete node[k]);
      }
      lists[i].forEach(k => { node[k] = node[k] || {}; walk(node[k], i + 1, path.concat(k)); });
    };
    walk(tree, 0, []);
  },
  unsetPath(tree, toks) {
    const lists = toks.map((t, i) => (i === 1 && /[,-]/.test(t)) ? SIM.expandRange(t) : [t]);
    const walk = (node, i) => {
      if (i === toks.length - 1) { lists[i].forEach(k => delete node[k]); return; }
      lists[i].forEach(k => { if (node[k]) walk(node[k], i + 1); });
    };
    walk(tree, 0);
  },
  // Flatten to leaf paths ("interface swp1 ip address 10.0.0.1/30")
  flatten(tree, prefix, out) {
    out = out || []; prefix = prefix || [];
    const keys = Object.keys(tree);
    if (!keys.length) { if (prefix.length) out.push(prefix.join(" ")); return out; }
    keys.forEach(k => SIM.NVUE.flatten(tree[k], prefix.concat(k), out));
    return out;
  },
  get(tree, toks) { let n = tree; for (const t of toks) { if (!n || !n[t]) return null; n = n[t]; } return n; },
  // value of a leaf like "qos roce enable" -> "on"
  val(tree, toks) { const n = SIM.NVUE.get(tree, toks); if (!n) return null; const k = Object.keys(n); return k.length ? k[0] : null; },

  diff(a, b) {   // returns {added:[], removed:[]} as path strings (b relative to a)
    const fa = new Set(SIM.NVUE.flatten(a)), fb = new Set(SIM.NVUE.flatten(b));
    return { added: [...fb].filter(x => !fa.has(x)), removed: [...fa].filter(x => !fb.has(x)) };
  },

  // ---- command entry -------------------------------------------------------
  run(st, m, argv) {
    const [verb, ...rest] = argv;
    switch (verb) {
      case "set": return this.cmdSet(st, m, rest);
      case "unset": return this.cmdUnset(st, m, rest);
      case "show": return this.cmdShow(st, m, rest);
      case "config": return this.cmdConfig(st, m, rest);
      case "action": return this.cmdAction(st, m, rest);
      case undefined: return "Usage: nv [set|unset|show|config|action] ...\nTry: nv show interface | nv set qos roce enable on | nv config diff | nv config apply";
      default: return `Error: Invalid command '${verb}'. Valid: set, unset, show, config, action`;
    }
  },
  cmdSet(st, m, toks) {
    if (!toks.length) return "Error: nv set requires an object path";
    if (toks[0] === "system" && toks[1] === "config" && toks[2] === "auto-save") { m.autosave = toks[3] === "enabled"; }
    SIM.NVUE.setPath(m.pending, toks);
    m.pendingOpen = true;
    return "";
  },
  cmdUnset(st, m, toks) {
    if (!toks.length) return "Error: nv unset requires an object path";
    SIM.NVUE.unsetPath(m.pending, toks);
    m.pendingOpen = true;
    return "";
  },
  cmdConfig(st, m, toks) {
    const sub = toks[0];
    if (sub === "diff") {
      if (toks[1] && toks[2]) {
        const r1 = m.revisions.find(r => String(r.id) === toks[1]), r2 = m.revisions.find(r => String(r.id) === toks[2]);
        if (!r1 || !r2) return "Error: unknown revision id";
        return this.renderDiff(SIM.NVUE.diff(r1.config, r2.config));
      }
      const d = SIM.NVUE.diff(m.applied, m.pending);
      if (!d.added.length && !d.removed.length) return "";   // real NVUE prints nothing when no changes
      return this.renderDiff(d);
    }
    if (sub === "apply") {
      let target = toks[1];
      const yes = toks.includes("-y") || toks.includes("--assume-yes");
      if (target && !target.startsWith("-")) {
        const rev = m.revisions.find(r => String(r.id) === target);
        if (!rev) return `Error: revision '${target}' not found. See nv config history.`;
        m.pending = SIM.NVUE.clone(rev.config);
      }
      const d = SIM.NVUE.diff(m.applied, m.pending);
      if (!d.added.length && !d.removed.length && !target) return "No changes to apply.";
      m.applied = SIM.NVUE.clone(m.pending);
      const id = m.nextRev++;
      m.revisions.push({ id, ts: SIM.NVUE.now(), user: "cumulus", note: target ? `rollback to rev ${target}` : `${d.added.length} set / ${d.removed.length} unset`, config: SIM.NVUE.clone(m.applied) });
      m.pendingOpen = false;
      SIM.NVUE.applySideEffects(st, m);
      if (m.autosave) { m.saved = true; return `applied [rev_id: ${id}]\nsaved [startup]`; }
      m.saved = false;
      return `applied [rev_id: ${id}]${yes ? "" : "\nUse 'nv config save' to make the configuration persistent across reboots."}`;
    }
    if (sub === "save") { m.saved = true; return "saved"; }
    if (sub === "history") {
      return m.revisions.slice().reverse().map(r => `rev_id: ${r.id}\n  apply: ${r.ts}\n  user:  ${r.user}\n  note:  ${r.note}`).join("\n");
    }
    if (sub === "detach") { m.pending = SIM.NVUE.clone(m.applied); m.pendingOpen = false; return "Pending changes discarded."; }
    if (sub === "show") {
      const yaml = toks.includes("-o") && toks[toks.indexOf("-o") + 1] === "yaml";
      const flat = SIM.NVUE.flatten(m.applied);
      if (yaml) return "- set:\n" + SIM.NVUE.toYaml(m.applied, 4);
      return flat.map(p => "nv set " + p).join("\n");
    }
    if (sub === "patch" || sub === "replace") {
      const file = toks[1];
      if (!file) return `Error: nv config ${sub} <file>`;
      const path = file.startsWith("/") ? file : "/home/cumulus/" + file;
      const content = st.files[path];
      if (content == null) return `Error: file not found: ${file}`;
      const paths = SIM.NVUE.yamlToPaths(content);
      if (!paths.length) return "Error: could not parse YAML fragment (expected '- set:' with nested keys)";
      if (sub === "replace") m.pending = {};
      paths.forEach(p => SIM.NVUE.setPath(m.pending, p.split(" ")));
      m.pendingOpen = true;
      return `${sub === "patch" ? "Patched" : "Replaced"} pending configuration with ${paths.length} setting(s) from ${file}. Review with 'nv config diff', then 'nv config apply'.`;
    }
    return "Usage: nv config [apply [<rev>] [-y] | diff [<rev1> <rev2>] | history | save | show [-o yaml] | patch <file> | replace <file> | detach]";
  },
  cmdAction(st, m, toks) {
    if (toks.join(" ").startsWith("reboot")) {
      // reboot discards unsaved applied config
      const saved = m.saved;
      if (!saved) { const last = m.revisions.find(r => r.note === "baseline"); m.applied = SIM.NVUE.clone(last.config); m.pending = SIM.NVUE.clone(m.applied); SIM.NVUE.applySideEffects(st, m); return "Rebooting... (unsaved configuration was LOST: running config reverted to startup)"; }
      return "Rebooting... configuration restored from startup (nv config save had been run).";
    }
    return "Supported: nv action reboot system";
  },

  renderDiff(d) {
    const lines = [];
    d.removed.forEach(p => lines.push("- nv unset " + p));
    d.added.forEach(p => lines.push("+ nv set " + p));
    return lines.join("\n");
  },
  toYaml(tree, indent) {
    let out = "";
    const pad = " ".repeat(indent);
    for (const k of Object.keys(tree)) {
      const kids = Object.keys(tree[k]);
      if (!kids.length) out += `${pad}${/^[0-9]/.test(k) ? "'" + k + "'" : k}: {}\n`;
      else if (kids.length === 1 && !Object.keys(tree[k][kids[0]]).length) out += `${pad}${k}: ${kids[0]}\n`;
      else out += `${pad}${/^[0-9]/.test(k) ? "'" + k + "'" : k}:\n` + SIM.NVUE.toYaml(tree[k], indent + 2);
    }
    return out;
  },
  // minimal YAML (2-space indented maps, "key: value", "key: {}") -> flat paths
  yamlToPaths(text) {
    const lines = text.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
    const stack = []; const out = [];
    let base = null;
    for (let raw of lines) {
      let line = raw.replace(/^- /, "  ");               // "- set:" list marker
      const ind = line.search(/\S/); const t = line.trim();
      if (t === "set:" ) { base = ind; stack.length = 0; continue; }
      if (base === null) continue;
      const depth = Math.round((ind - base) / 2) - 1;
      const mm = t.match(/^['"]?([^'":]+)['"]?:\s*(.*)$/); if (!mm) continue;
      const key = mm[1], val = mm[2].trim();
      stack.length = depth; stack[depth] = key;
      if (val === "{}") out.push(stack.slice(0, depth + 1).join(" "));
      else if (val) out.push(stack.slice(0, depth + 1).join(" ") + " " + val.replace(/^['"]|['"]$/g, ""));
    }
    return out;
  },

  // Fault flags that map to configuration: expressed as real config so the user can fix them with nv set.
  injectFaults(st) {
    const f = st.faults;
    if (f.bgpAsn) { const m = st.switches.leaf02; SIM.NVUE.unsetPath(m.applied, ["vrf", "default", "router", "bgp", "neighbor", "10.0.1.2", "remote-as"]); SIM.NVUE.setPath(m.applied, ["vrf", "default", "router", "bgp", "neighbor", "10.0.1.2", "remote-as", "65001"]); }
    if (f.mtuMismatch) { const m = st.switches.leaf01; SIM.NVUE.unsetPath(m.applied, ["interface", "swp51", "link", "mtu"]); SIM.NVUE.setPath(m.applied, ["interface", "swp51", "link", "mtu", "1500"]); }
    if (f.l3vniMismatch) { const m = st.switches.leaf02; SIM.NVUE.unsetPath(m.applied, ["vrf", "RED", "evpn", "vni"]); SIM.NVUE.setPath(m.applied, ["vrf", "RED", "evpn", "vni", "4002"]); }
    if (!f.roceOff) ["leaf01", "leaf02"].forEach(n => SIM.NVUE.setPath(st.switches[n].applied, ["qos", "roce", "enable", "on"]));
    Object.values(st.switches).forEach(m => { m.pending = SIM.NVUE.clone(m.applied); m.revisions[0].config = SIM.NVUE.clone(m.applied); });
  },
  applySideEffects(st, m) { /* derived views read applied directly; nothing cached */ },

  // ---- derived operational state --------------------------------------------
  ifaceList(m) {
    const names = new Set(["lo", "eth0"]);
    Object.keys(SIM.NVUE.get(m.applied, ["interface"]) || {}).forEach(n => names.add(n));
    SIM.topology.ethLinks.forEach(l => { if (l.a[0] === m.name) names.add(l.a[1]); if (l.b[0] === m.name) names.add(l.b[1]); });
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  },
  ifaceIp(m, i) { const n = SIM.NVUE.get(m.applied, ["interface", i, "ip", "address"]); return n ? Object.keys(n) : []; },
  ifaceMtu(m, i) { return SIM.NVUE.val(m.applied, ["interface", i, "link", "mtu"]) || (i === "lo" ? "65536" : i === "eth0" ? "1500" : "9216"); },
  ifaceState(m, i) { const s = SIM.NVUE.val(m.applied, ["interface", i, "link", "state"]); return s === "down" ? "down" : "up"; },
  mySwitchForIp(st, ip) {  // which switch owns this interface IP
    for (const [n, m] of Object.entries(st.switches)) for (const i of SIM.NVUE.ifaceList(m)) for (const a of SIM.NVUE.ifaceIp(m, i)) if (a.split("/")[0] === ip) return { sw: n, iface: i, cidr: a };
    return null;
  },
  bgpNeighbors(st, m) {
    const out = [];
    const nb = SIM.NVUE.get(m.applied, ["vrf", "default", "router", "bgp", "neighbor"]) || {};
    const myAs = SIM.NVUE.val(m.applied, ["vrf", "default", "router", "bgp", "autonomous-system"]);
    for (const ip of Object.keys(nb)) {
      const remoteAs = SIM.NVUE.val(m.applied, ["vrf", "default", "router", "bgp", "neighbor", ip, "remote-as"]);
      const peer = SIM.NVUE.mySwitchForIp(st, ip);
      let state = "Idle", reason = "no peer reachable";
      let peerAs = null, evpn = false, pfxRx = 0;
      if (peer) {
        const pm = st.switches[peer.sw];
        peerAs = SIM.NVUE.val(pm.applied, ["vrf", "default", "router", "bgp", "autonomous-system"]);
        const back = Object.keys(SIM.NVUE.get(pm.applied, ["vrf", "default", "router", "bgp", "neighbor"]) || {}).find(pip => SIM.NVUE.mySwitchForIp(st, pip)?.sw === m.name);
        const backAs = back ? SIM.NVUE.val(pm.applied, ["vrf", "default", "router", "bgp", "neighbor", back, "remote-as"]) : null;
        if (!back) { state = "Active"; reason = "peer has no neighbor statement for us"; }
        else if (remoteAs !== peerAs) { state = "Idle"; reason = `remote-as ${remoteAs} configured, peer announces AS ${peerAs} (OPEN rejected: bad peer AS)`; }
        else if (backAs !== myAs) { state = "Active"; reason = `peer expects AS ${backAs}, we are ${myAs}`; }
        else {
          state = "Established"; reason = "";
          evpn = !!SIM.NVUE.get(m.applied, ["vrf", "default", "router", "bgp", "neighbor", ip, "address-family", "l2vpn-evpn", "state", "enabled"]) &&
                 !!SIM.NVUE.get(pm.applied, ["vrf", "default", "router", "bgp", "neighbor", back, "address-family", "l2vpn-evpn", "state", "enabled"]);
          pfxRx = SIM.NVUE.ifaceList(pm).reduce((a, i) => a + SIM.NVUE.ifaceIp(pm, i).length, 0);
        }
      }
      out.push({ ip, remoteAs, peer: peer ? peer.sw : "?", peerAs, state, reason, evpn, pfxRx });
    }
    return out;
  },
  vnis(st, m) {
    const out = [];
    const vl = SIM.NVUE.get(m.applied, ["bridge", "domain", "br_default", "vlan"]) || {};
    for (const vlan of Object.keys(vl)) { const vni = SIM.NVUE.val(m.applied, ["bridge", "domain", "br_default", "vlan", vlan, "vni"]); if (vni) out.push({ vni, type: "L2", vlan, vrf: SIM.NVUE.val(m.applied, ["interface", "vlan" + vlan, "vrf"]) || "default" }); }
    const vrfs = SIM.NVUE.get(m.applied, ["vrf"]) || {};
    for (const v of Object.keys(vrfs)) { const vni = SIM.NVUE.val(m.applied, ["vrf", v, "evpn", "vni"]); if (vni) out.push({ vni, type: "L3", vlan: "-", vrf: v }); }
    return out;
  },
  remoteVteps(st, m, vniObj) {
    // another leaf with vxlan enabled, same VNI (and same type), evpn enabled, and an EVPN-capable established session on both
    const out = [];
    const myEvpn = SIM.NVUE.get(m.applied, ["evpn", "state", "enabled"]);
    if (!myEvpn || !SIM.NVUE.get(m.applied, ["nve", "vxlan", "state", "enabled"])) return out;
    const mine = SIM.NVUE.bgpNeighbors(st, m).some(n => n.state === "Established" && n.evpn);
    if (!mine) return out;
    for (const [n, pm] of Object.entries(st.switches)) {
      if (n === m.name) continue;
      if (!SIM.NVUE.get(pm.applied, ["nve", "vxlan", "state", "enabled"]) || !SIM.NVUE.get(pm.applied, ["evpn", "state", "enabled"])) continue;
      if (!SIM.NVUE.bgpNeighbors(st, pm).some(x => x.state === "Established" && x.evpn)) continue;
      const has = SIM.NVUE.vnis(st, pm).some(v => v.vni === vniObj.vni && v.type === vniObj.type);
      if (has) out.push(SIM.NVUE.val(pm.applied, ["nve", "vxlan", "source", "address"]) || "?");
    }
    return out;
  },
  roceOn(m) { return SIM.NVUE.val(m.applied, ["qos", "roce", "enable"]) === "on"; }
};

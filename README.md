# NCP-AIN Simulator

A self-contained trainer for the **NVIDIA-Certified Professional: AI Networking (NCP-AIN)** exam:
question bank, flashcards, timed exam simulation and a stateful CLI lab for InfiniBand (OpenSM, `ib*` tools, UFM concepts) and Spectrum-X (Cumulus NVUE, RoCE, BGP-EVPN, NetQ, WJH, Network Operator, Ansible).

Pure static HTML/CSS/JS. No build step, no backend, no external dependencies. Progress is kept in the browser's localStorage.

## Deployment

The whole application is three things: `index.html`, the `css/` folder and the `js/` folder. There is nothing to compile, no package to install and no backend. "Deploying" means putting those files where a browser can load them. Pick one of the options below; they all serve exactly the same files.

### Requirements

* A current browser: Chrome, Edge, Firefox or Safari.
* For option B: Python 3 **or** Node.js, whichever is already on the machine.
* For option C: Docker.
* No internet access is needed at runtime. The app never calls the network, so it works on an air-gapped laptop.

### Step 1 · Get the files

```bash
git clone https://github.com/jordi-e-morales/ncp-ain_lab.git
cd ncp-ain_lab
```

No git? Use **Code → Download ZIP** on GitHub and unzip it. Keep the folder structure intact (`index.html` next to `css/` and `js/`).

### Step 2 · Choose how to serve it

#### Option A · Open the file directly (one person, one laptop)

Double-click `index.html`, or from a terminal:

| OS | Command |
|---|---|
| Windows | `start index.html` |
| macOS | `open index.html` |
| Linux | `xdg-open index.html` |

Works offline and needs nothing installed. Progress is saved in that browser.

#### Option B · Local static web server (shared machine, classroom, LAN)

Run **one** of these from inside the `ncp-ain_lab` folder:

```bash
# Python 3
python -m http.server 8765
```

```bash
# Node.js
npx serve -l 8765 .
```

```powershell
# Windows PowerShell (Python installed from python.org)
py -m http.server 8765
```

Then open <http://localhost:8765/>.

To let other machines on the network use it, bind to all interfaces and share your IP:

```bash
python -m http.server 8765 --bind 0.0.0.0
# others open http://<your-ip>:8765/
```

Stop the server with `Ctrl-C`.

#### Option C · Docker (nginx)

A `Dockerfile` is included.

```bash
docker build -t ncp-ain-sim .
docker run --rm -d -p 8080:80 --name ncp-ain-sim ncp-ain-sim
```

Open <http://localhost:8080/>. Stop with `docker stop ncp-ain-sim`.

Without building an image, mount the folder into a stock nginx:

```bash
docker run --rm -d -p 8080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine
```

#### Option D · Any existing web server or static hosting

Copy `index.html`, `css/` and `js/` into the server's document root (nginx `/usr/share/nginx/html`, Apache `/var/www/html`, IIS `C:\inetpub\wwwroot`, an S3 bucket with static website hosting, Netlify, Vercel, GitHub Pages, an internal intranet share served over HTTP). Rules:

* `index.html` must stay at the root of whatever path you publish, with `css/` and `js/` as siblings. Relative paths are used, so a sub-path like `https://intranet/tools/ncp-ain/` is fine.
* Serve `.js` as `application/javascript` and `.css` as `text/css` (every default server configuration already does).
* No rewrite rules, no server-side code, no environment variables.

### Step 3 · Verify

1. Open the URL. The **Dashboard** should show the six exam domains and "Question bank 180".
2. Open **CLI Lab**, type `help` and press Enter. You should get the command list for `oob-mgmt-server`.
3. Open **Practice → Mixed set → Start** and answer one question; the explanation box must appear.

If the page is blank or the question bank reads 0, the `js/` folder was not copied next to `index.html` or the browser blocked the scripts (open the browser console: `F12` → Console).

### Updating

```bash
git pull
```

Then reload the page (or rebuild the Docker image). Saved progress is unaffected: it lives in the browser, not in the files.

### Keeping progress

Progress (question history, exam results, labs done) lives in the browser's localStorage, per browser and per origin. Use **Progress → Export progress (JSON)** before switching machines; **Reset all progress** wipes it.

## What is inside

| Tab | What it does |
|---|---|
| **Dashboard** | The official blueprint (6 domains, weights 5/30/30/5/20/10), your accuracy per domain, weak spots, last exam. |
| **Study** | 32 concept cards, one per exam objective, each with a one-line "exam hook" and self-check questions. |
| **Flashcards** | The self-check pairs as a spaced deck (space = flip, arrows = navigate, k = known). |
| **Practice** | 180 scenario questions with instant explanations. By domain, blueprint-weighted mix, weak spots, or the items you missed on the official practice set (`missed-before`). |
| **Exam** | Timed simulation (default 70 questions / 120 min), blueprint-weighted sampling, flag & review, per-domain report like the NVIDIA practice test. |
| **CLI Lab** | A stateful virtual fabric and 20 guided labs (see below). |
| **Commands** | Searchable command reference across InfiniBand, Cumulus/NVUE, NetQ, Kubernetes, Ansible, MLNX-OS, UFM. |
| **Progress** | Accuracy per topic (weakest first), labs done, export/reset. |

## The virtual fabric (CLI Lab)

```
Ethernet / Spectrum-X (Cumulus Linux 5.16, SN5600)       InfiniBand (NDR, QM9700, opensm on gpu01)
  spine01 AS65100 ── leaf01 AS65101 ── gpu01, gpu03         ibsw-spine01 LID5
  spine02 AS65100 ── leaf02 AS65102 ── gpu02, gpu04           ├─ ibsw-leaf01 LID4: gpu01 LID1, gpu03 LID7
  eBGP underlay, EVPN-VXLAN VNI 10010, VRF RED L3VNI 4001     └─ ibsw-leaf02 LID6: gpu02 LID3, gpu04 LID8
  oob-mgmt-server: NetQ, kubectl, helm, ansible              ufm-server
```

Everything is derived from state, so:

* `nv set … ` → `nv config diff` → `nv config apply` → `nv show …` behaves like NVUE (revisions, rollback with `nv config apply <rev>`, `nv config save`, `nv config patch <yaml>`, `nv config replace`, `-o yaml`).
* `nv show vrf default router bgp neighbor`, `nv show evpn vni`, `nv show nve vxlan`, `nv show qos roce`, `nv show interface swp51 link` are computed from both ends of every link (wrong `remote-as` → Idle, MTU mismatch → WJH drops, different L3VNI → EVPN check fails).
* `ibstat`, `sminfo`, `iblinkinfo`, `ibnetdiscover`, `ibtracert`, `ibroute`, `ibdiagnet --pc --pm`, `perfquery`, `smpquery PKeys/SL2VL/VLArb`, `ibaddr`, `mlxlink`, `mlxconfig`, `ib_write_bw/lat`, `nvidia-smi topo -m` react to the SM state: stop `opensm` and ports go INIT; edit `/etc/opensm/partitions.conf` or `opensm.conf` (`echo … >>`, `sed -i`) and restart or `kill -HUP` to see PKeys, LMC and the routing engine change.
* `netq check bgp|evpn|mtu|roce`, `netq show wjh-drop|events`, `kubectl get nicclusterpolicy -o yaml`, `kubectl describe node`, `ansible-playbook … --limit` all read the same state.

Type `help` on any node and `topology` for the map. `ssh <node>` or the node buttons switch hosts.

### Guided labs

InfiniBand: link-up & master SM · ports stuck in INIT · inventory & path tracing · PKey partition (full/limited) · ftree + LMC · QoS SL→VL/VLArb.
Spectrum-X: enable lossless RoCE · BGP remote-as fault · EVPN L3VNI mismatch · WJH MTU drops · stretch VLAN 20 · BlueField DPU mode.
Automation: NVUE revisions/rollback · `nv config patch` · Ansible groups/group_vars/--limit.
Kubernetes: verify Network Operator + pod RDMA resource · NicClusterPolicy notReady.
Troubleshooting: degraded IB link (iblinkinfo → perfquery → mlxlink) · cl-resource-query · nvidia-smi topo -m.

Each lab resets the fabric (with a fault when relevant), verifies tasks against the live state or the commands you typed, and ends with the teaching point.

## Files

```
index.html                 app shell
Dockerfile                 nginx image for option C
css/app.css
js/app.js                  UI: dashboard, study, flashcards, practice, exam, lab, commands, progress
js/data/syllabus.js        official blueprint and weights
js/data/concepts.js        concept cards + flashcard pairs
js/data/questions-*.js     question bank (schema in js/data/SCHEMA.md)
js/data/labs.js            guided labs and their checkers
js/sim/lab.js              topology, baseline configs, files, faults
js/sim/nvue.js             NVUE model (pending/applied/revisions, patch/replace, diff)
js/sim/nvue-show.js        nv show renderers (derived operational state)
js/sim/ibtools.js          ib*/perftest/mlx*/opensm behaviour
js/sim/ops.js              NetQ, kubectl, helm, ansible, cl-resource-query
js/sim/shell.js            prompt, ssh, Linux basics, dispatcher
```

### Adding questions

Append objects to either `questions-*.js` following `SCHEMA.md` (`id`, `domain`, `topic`, `q`, `options`, `answer`, `explanation`, `tags`). Tag an item `missed-before` to have Practice draw it more often.

## Sources used to build it

* NVIDIA NCP-AIN certification page (exam topics and weights).
* "NVIDIA AI Networking Complete Course" deck (13 modules), the official 50-question practice set (stems and your results), and your lab command notes.
* Public NVIDIA documentation for Cumulus Linux / NVUE, NetQ, UFM, MLNX_OFED tools, Network Operator, DOCA.

Simulated outputs are modelled on real tool output but shortened; treat exact numbers (firmware versions, counters) as illustrative.

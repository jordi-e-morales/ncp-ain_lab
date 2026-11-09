# Data schema for the NCP-AIN simulator

All data files are plain JS loaded with `<script>` so the app works from `file://`
(no fetch, no server). Each file appends to a global array.

## Domains (keys used everywhere)

| key    | Exam domain                              | weight |
|--------|------------------------------------------|--------|
| dc     | AI Data Center Design and Optimization   | 5%     |
| spx    | NVIDIA Spectrum Networking               | 30%    |
| ib     | NVIDIA InfiniBand Networking             | 30%    |
| k8s    | Kubernetes Integration                   | 5%     |
| tshoot | Troubleshooting Tools                    | 20%    |
| auto   | Automation and Configuration             | 10%    |

## Questions (`js/data/questions-*.js`)

```js
window.NCP_QUESTIONS = window.NCP_QUESTIONS || [];
window.NCP_QUESTIONS.push(
  {
    id: "ib-001",              // unique: <domain>-<nnn>
    domain: "ib",              // one of the keys above
    topic: "Partitions (PKeys)", // short human topic, reused across questions
    difficulty: 2,             // 1 easy, 2 exam-level, 3 hard
    q: "Scenario-style stem ...?",
    options: ["...", "...", "...", "..."],   // 4 options (5 allowed for multi)
    answer: 1,                 // index into options; array of indexes when multi
    multi: false,
    explanation: "Why the right answer is right, 2-5 sentences, cite the concept.",
    distractors: "Optional: one line on why the main distractor is wrong.",
    ref: "Module 6 · partitions.conf",   // where to review (deck module or NVIDIA doc)
    tags: ["pkey", "membership", "guid"]
  }
);
```

Rules for authors:
- Scenario-based stems like the real exam ("An administrator ... Which ... first?").
- Exactly one best answer unless `multi: true`.
- Every option must be plausible; no joke options.
- Explanations must teach, not just restate.
- Use the exact command spelling the exam uses (`nv config apply`, `ibdiagnet --pc --pm`, `netq check evpn`, `cl-resource-query`, `iblinkinfo`, `ib_write_lat` ...).

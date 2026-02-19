# ForensicFlow — Graph-Based Money Muling Detection Engine

> 🔍 **RIFT 2026 Hackathon** • Graph Theory / Financial Crime Detection Track

## 🌐 Live Demo

**[Live Application URL]** — *(deployed on Vercel/Netlify)*

## 📋 Overview

ForensicFlow is a web-based Financial Forensics Engine that processes transaction data (CSV upload) and exposes money muling networks through advanced graph analysis and interactive visualization.

**Money muling** is a critical component of financial crime where criminals use networks of individuals ("mules") to transfer and layer illicit funds through multiple accounts. Traditional database queries fail to detect these sophisticated multi-hop networks — ForensicFlow solves this using graph algorithms.

## 🛠️ Tech Stack

| Component          | Technology                                |
| ------------------ | ----------------------------------------- |
| **Frontend**       | Vanilla JS + Vite (build tool)            |
| **Graph Viz**      | Cytoscape.js                              |
| **CSV Parsing**    | PapaParse                                 |
| **Styling**        | Custom CSS (glassmorphism, dark theme)    |
| **Graph Engine**   | Custom algorithms (pure JavaScript)       |
| **Deployment**     | Vercel / Netlify (static site)            |

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      ForensicFlow Web App                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────┐   │
│  │ CSV Upload│──▶│ PapaParse    │──▶│ Graph Analysis Engine  │   │
│  │ (Drag&Drop)│  │ (Parser)     │   │                        │   │
│  └──────────┘   └──────────────┘   │ ├─ buildGraph()        │   │
│                                     │ ├─ detectCycles()      │   │
│                                     │ ├─ detectSmurfing()    │   │
│                                     │ ├─ detectShellNetworks│   │
│                                     │ ├─ filterFalsePositive│   │
│                                     │ └─ suspicionScoring() │   │
│                                     └──────────┬─────────────┘   │
│                                                │                 │
│                    ┌───────────────────────────┼──────────┐      │
│                    ▼                           ▼          ▼      │
│         ┌─────────────────┐  ┌──────────────┐  ┌────────────┐   │
│         │ Cytoscape.js    │  │ Summary Table│  │ JSON Export│   │
│         │ Interactive     │  │ (Fraud Rings)│  │ (Download) │   │
│         │ Graph           │  └──────────────┘  └────────────┘   │
│         └─────────────────┘                                      │
└──────────────────────────────────────────────────────────────────┘
```

**All processing happens client-side** — no server backend required. This means:
- Zero data leaves the user's browser (privacy-preserving)
- No server costs
- Instant deployment as a static site

## 🧠 Algorithm Approach

### 1. Circular Fund Routing (Cycle Detection)
- **Algorithm**: DFS-based cycle detection with path tracking
- **Complexity**: O(V + E) per starting node, bounded by max cycle length 5
- **Method**: For each node, perform DFS up to depth 5. When we revisit the start node with path length 3–5, a cycle is recorded. Cycles are deduplicated via canonical rotation (smallest node first).

### 2. Smurfing Patterns (Fan-in / Fan-out)
- **Algorithm**: Degree analysis + sliding window temporal clustering
- **Complexity**: O(V + E) for degree computation, O(E log E) for temporal analysis
- **Method**: Identify accounts with 10+ unique senders (fan-in) or 10+ unique receivers (fan-out). Apply a sliding 72-hour window to measure temporal density — transactions clustered in time are more suspicious.

### 3. Layered Shell Networks
- **Algorithm**: Chain tracing through low-degree intermediary accounts
- **Complexity**: O(V × L) where L is maximum chain length
- **Method**: Identify "shell" accounts (2–3 total transactions, both in and out). Trace chains from non-shell nodes through consecutive shell accounts. Chains of 3+ hops indicate layered laundering.

### 4. False Positive Filtering
- **Merchant Detection**: High fan-in + low variance in amounts → legitimate merchant
- **Payroll Detection**: High fan-out + consistent amounts + low fan-in → payroll account
- **Method**: Coefficient of variation (CV) of transaction amounts is used as a proxy for regularity

## 📊 Suspicion Score Methodology

Each account scores 0–100 based on weighted contributions:

| Factor                     | Points | Description                                       |
| -------------------------- | ------ | ------------------------------------------------- |
| Cycle membership           | +30    | Part of a detected cycle (length 3–5)             |
| Smurfing center            | +25    | Hub of a fan-in or fan-out pattern                |
| Smurfing connected         | +15    | Connected to a known smurfing hub                 |
| Shell network membership   | +20    | Part of a layered shell chain                     |
| High velocity              | +10    | Very short intervals between transactions         |
| Degree anomaly             | +10    | Extremely unbalanced in/out ratio (>5:1)          |
| Pass-through behavior      | +5     | Amount in ≈ amount out (potential layering)        |
| **Legitimate discount**    | **-50%** | Applied if account matches merchant/payroll profile |

**Score cap**: 100. Accounts sorted by score in descending order.

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm

### Local Development
```bash
# Clone the repository
git clone <repo-url>
cd forensicflow

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 📦 Usage Instructions

1. **Open the web application** in your browser
2. **Upload a CSV file** using drag-and-drop or the file browser
   - Required columns: `transaction_id`, `sender_id`, `receiver_id`, `amount`, `timestamp`
   - Timestamp format: `YYYY-MM-DD HH:MM:SS`
3. **View results**:
   - 📊 **Summary stats** at the top
   - 🕸️ **Interactive graph** — hover/click nodes for details, click ring members to highlight the entire ring
   - 📋 **Fraud Ring Table** — shows all detected rings with pattern types and risk scores
   - 🚨 **Suspicious Accounts Table** — all flagged accounts sorted by suspicion score
4. **Download JSON report** using the download button
5. **Upload a new dataset** using the button at the bottom

## ⚠️ Known Limitations

1. **Client-side processing**: Datasets over ~50K transactions may cause browser performance issues
2. **Cycle detection scalability**: DFS-based approach is O(V × 5!) in worst case; very dense graphs may take longer
3. **Temporal analysis**: 72-hour window is fixed; real-world systems would benefit from adaptive windows
4. **Smurfing thresholds**: Fan-in/fan-out threshold of 10 is fixed; some fraud networks use fewer accounts
5. **No ML model**: Current approach is purely heuristic; a trained ML model could improve precision
6. **No persistence**: Analysis results are lost on page refresh

## 👥 Team Members

- **Abhinav** — Full-stack Development, Algorithm Design

---

*Built for RIFT 2026 Hackathon — Graph Theory / Financial Crime Detection Track*
*Follow the money. 💰🔍*

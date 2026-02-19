# 🔌 ForensicFlow — Backend API Reference

> **FastAPI** backend for the ForensicFlow Money Muling Detection Engine.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- pip

### Installation

```bash
cd backend

# Create & activate virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### Run the Server

```bash
# Development (auto-reload)
python main.py

# OR with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at **`http://localhost:8000`**

### Interactive Docs

FastAPI auto-generates interactive API documentation:

| Docs UI      | URL                                  |
| ------------ | ------------------------------------ |
| **Swagger**  | `http://localhost:8000/docs`         |
| **ReDoc**    | `http://localhost:8000/redoc`        |

---

## 📋 API Endpoints

### 1. `GET /` — Root / Welcome

**Description:** Returns a welcome message confirming the API is running.

**Request:**

```
GET /
```

**Response:** `200 OK`

```json
{
  "message": "ForensicFlow API is running",
  "version": "1.0.0"
}
```

**Use Case:** Quick check that the server is deployed and reachable.

---

### 2. `GET /health` — Health Check

**Description:** Lightweight health-check endpoint for monitoring, load balancers, or container orchestration probes.

**Request:**

```
GET /health
```

**Response:** `200 OK`

```json
{
  "status": "ok"
}
```

**Use Case:** Used by deployment pipelines, Kubernetes liveness/readiness probes, or UptimeRobot-style monitors to verify the server is alive.

---

### 3. `POST /api/analyze` — Analyze Transaction Data

**Description:** The core endpoint. Upload a CSV file containing transaction data. The backend parses the CSV, builds a directed graph, runs multi-pattern fraud detection algorithms, computes suspicion scores, and returns a full analysis report with graph visualization data.

**Request:**

```
POST /api/analyze
Content-Type: multipart/form-data
```

| Parameter | Type         | Required | Description                      |
| --------- | ------------ | -------- | -------------------------------- |
| `file`    | `UploadFile` | ✅ Yes   | A `.csv` file with transactions  |

**Required CSV Columns:**

| Column           | Type     | Example                 |
| ---------------- | -------- | ----------------------- |
| `transaction_id` | string   | `TXN_001`               |
| `sender_id`      | string   | `ACC_101`               |
| `receiver_id`    | string   | `ACC_202`               |
| `amount`         | float    | `5000.00`               |
| `timestamp`      | datetime | `2025-01-15 14:30:00`   |

**Example using `curl`:**

```bash
curl -X POST http://localhost:8000/api/analyze \
  -F "file=@sample_transactions.csv"
```

**Example using Python `requests`:**

```python
import requests

with open("sample_transactions.csv", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/analyze",
        files={"file": ("transactions.csv", f, "text/csv")}
    )

data = response.json()
print(data["summary"])
```

**Success Response:** `200 OK`

```json
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_101",
      "suspicion_score": 75.0,
      "detected_patterns": ["cycle_length_3", "high_velocity"],
      "ring_id": "RING_001"
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "member_accounts": ["ACC_101", "ACC_202", "ACC_303"],
      "pattern_type": "cycle",
      "cycle_length": 3,
      "risk_score": 65.0
    }
  ],
  "summary": {
    "total_accounts_analyzed": 50,
    "total_transactions": 200,
    "suspicious_accounts_flagged": 12,
    "fraud_rings_detected": 3,
    "processing_time_seconds": 0.42
  },
  "graph_data": {
    "nodes": [
      {
        "id": "ACC_101",
        "type": "ring",
        "score": 75.0,
        "inDeg": 5,
        "outDeg": 7,
        "totalIn": 25000.00,
        "totalOut": 24800.00,
        "txCount": 12,
        "ringId": "RING_001",
        "patterns": ["cycle_length_3", "high_velocity"],
        "sizeVal": 35.2
      }
    ],
    "edges": [
      {
        "id": "ACC_101->ACC_202",
        "source": "ACC_101",
        "target": "ACC_202",
        "totalAmount": 15000.00,
        "txCount": 3,
        "suspicious": true,
        "weight": 3.45
      }
    ],
    "totalNodes": 50,
    "renderedNodes": 50,
    "isFiltered": false
  }
}
```

**Error Responses:**

| Status | Condition                          | Example Body                                                |
| ------ | ---------------------------------- | ----------------------------------------------------------- |
| `400`  | File is not a `.csv`               | `{"error": "Please upload a .csv file"}`                    |
| `400`  | No valid transactions in file      | `{"error": "No valid transactions found in the CSV"}`       |
| `400`  | Missing required columns           | `{"error": "Missing columns: sender_id, timestamp"}`        |

**Use Case:** Primary analysis endpoint called by the React frontend when a user uploads a CSV file. Returns everything needed to render the dashboard: stats, graph visualization data, fraud ring table, and suspicious accounts list.

---

## 🧠 Analysis Pipeline (What `/api/analyze` Does Internally)

The endpoint triggers the following sequential pipeline inside `graph_engine.py`:

```
CSV Upload
    │
    ▼
┌─────────────────────────┐
│ 1. parse_csv_content()  │  Parse CSV text → list of dicts
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 2. build_graph()        │  Build adjacency lists + node statistics
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 3. detect_cycles()      │  DFS cycle detection (length 3–5)
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 4. detect_smurfing()    │  Fan-in / Fan-out with temporal density
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│ 5. detect_shell_networks│  Layered shell chain tracing
└──────────┬──────────────┘
           ▼
┌──────────────────────────────────┐
│ 6. identify_legitimate_accounts()│  Merchant & payroll false-positive filter
└──────────┬───────────────────────┘
           ▼
┌──────────────────────────────────┐
│ 7. calculate_suspicion_scores()  │  Weighted scoring 0–100 per account
└──────────┬───────────────────────┘
           ▼
┌──────────────────────────────────┐
│ 8. _build_graph_data_for_frontend│  Cytoscape-ready nodes & edges
└──────────────────────────────────┘
```

---

## 📊 Response Schema Details

### `suspicious_accounts[]`

| Field               | Type       | Description                                             |
| ------------------- | ---------- | ------------------------------------------------------- |
| `account_id`        | `string`   | Unique account identifier                               |
| `suspicion_score`   | `float`    | Score from 0–100 (higher = more suspicious)             |
| `detected_patterns` | `string[]` | List of patterns detected for this account              |
| `ring_id`           | `string?`  | Assigned fraud ring ID (e.g., `RING_001`), or `null`    |

### `fraud_rings[]`

| Field             | Type       | Description                                              |
| ----------------- | ---------- | -------------------------------------------------------- |
| `ring_id`         | `string`   | Unique ring identifier                                   |
| `member_accounts` | `string[]` | Account IDs in this ring                                 |
| `pattern_type`    | `string`   | One of: `cycle`, `fan_in`, `fan_out`, `shell_network`    |
| `risk_score`      | `float`    | Average suspicion score of ring members                  |
| `cycle_length`    | `int?`     | Length of cycle (only for `cycle` type)                   |
| `temporal_score`  | `float?`   | Temporal clustering density (only for smurfing patterns)  |
| `hop_count`       | `int?`     | Number of hops in chain (only for `shell_network`)        |

### `summary`

| Field                        | Type    | Description                        |
| ---------------------------- | ------- | ---------------------------------- |
| `total_accounts_analyzed`    | `int`   | Number of unique accounts          |
| `total_transactions`         | `int`   | Number of transactions parsed      |
| `suspicious_accounts_flagged`| `int`   | Accounts with score > 0            |
| `fraud_rings_detected`       | `int`   | Total fraud rings found            |
| `processing_time_seconds`    | `float` | Wall-clock processing time         |

### `graph_data`

| Field           | Type      | Description                                          |
| --------------- | --------- | ---------------------------------------------------- |
| `nodes`         | `array`   | Cytoscape-formatted node objects                     |
| `edges`         | `array`   | Cytoscape-formatted edge objects                     |
| `totalNodes`    | `int`     | Total nodes in the original graph                    |
| `renderedNodes` | `int`     | Nodes after filtering (for large graphs)             |
| `isFiltered`    | `boolean` | `true` if graph was smart-filtered (500+ nodes)      |

---

## 📂 File Structure

```
backend/
├── main.py              # FastAPI app, route definitions, CORS setup
├── graph_engine.py      # Core graph analysis algorithms
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

---

## 🔧 Dependencies

| Package            | Version  | Purpose                                    |
| ------------------ | -------- | ------------------------------------------ |
| `fastapi`          | 0.115.0  | Web framework for building the REST API    |
| `uvicorn`          | 0.30.0   | ASGI server to run FastAPI                 |
| `python-multipart` | 0.0.9    | Required for file upload (`UploadFile`)    |

---

## 🌐 CORS Configuration

The backend allows all origins (`*`) by default for development. For production, restrict `allow_origins` in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

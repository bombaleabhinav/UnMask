"""
ForensicFlow — FastAPI Backend
Exposes REST endpoints for CSV upload and graph analysis.
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from graph_engine import analyze_transactions, parse_csv_content

app = FastAPI(
    title="ForensicFlow API",
    description="Graph-Based Money Muling Detection Engine",
    version="1.0.0",
)

# Allow React dev server (localhost:5173) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "ForensicFlow API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Upload a CSV file and run the full graph analysis pipeline.
    Returns suspicious accounts, fraud rings, summary, and graph data for visualization.
    """
    if not file.filename.endswith(".csv"):
        return JSONResponse(
            status_code=400,
            content={"error": "Please upload a .csv file"},
        )

    content = await file.read()
    csv_text = content.decode("utf-8")

    transactions = parse_csv_content(csv_text)
    if not transactions:
        return JSONResponse(
            status_code=400,
            content={"error": "No valid transactions found in the CSV"},
        )

    # Validate columns
    required = {"transaction_id", "sender_id", "receiver_id", "amount", "timestamp"}
    headers = set(transactions[0].keys())
    missing = required - headers
    if missing:
        return JSONResponse(
            status_code=400,
            content={"error": f"Missing columns: {', '.join(missing)}"},
        )

    result = analyze_transactions(transactions)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

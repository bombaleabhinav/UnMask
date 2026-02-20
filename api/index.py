"""
ForensicFlow — Vercel Serverless Function
Wraps the FastAPI app for Vercel's Python runtime.
"""

import sys
import os

# Add backend directory to Python path so graph_engine can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app

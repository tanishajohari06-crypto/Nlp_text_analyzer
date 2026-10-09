"""
Configuration file for the NLP Text Analyzer project.
Store your API keys and model settings here.
"""

import os

# ─── Gemini API Configuration ────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-3.8-flash"          # Fast, capable, free-tier model

# ─── Server Configuration ─────────────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 5000
DEBUG = True

# ─── Analysis Settings ────────────────────────────────────────────────────────
MAX_INPUT_CHARS  = 50_000   # Maximum characters allowed per analysis request
MAX_KEY_TOPICS   = 8        # Maximum number of key topics to extract
MAX_ENTITIES     = 10       # Maximum named entities to extract
SUMMARY_LENGTHS  = {        # Approximate word-count targets per summary style
    "brief":      80,
    "standard":  200,
    "detailed":  400,
}

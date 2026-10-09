"""
app.py — Flask backend for the NLP Text Analyzer
Handles API calls to Google Gemini and serves the frontend.
"""

import json
import re
import time
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai

import config
from prompts import (
    SYSTEM_PROMPT,
    ANALYSIS_PROMPT_TEMPLATE,
    QUICK_SUMMARY_PROMPT_TEMPLATE,
    KEYWORD_PROMPT_TEMPLATE,
)

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static", template_folder="static")
CORS(app)

# ─── Gemini Setup ─────────────────────────────────────────────────────────────
genai.configure(api_key=config.GEMINI_API_KEY)
_generation_config = genai.types.GenerationConfig(
    temperature=0.3,          # Lower = more deterministic / factual
    top_p=0.9,
    max_output_tokens=4096,
)
_model = genai.GenerativeModel(
    model_name=config.GEMINI_MODEL,
    generation_config=_generation_config,
    system_instruction=SYSTEM_PROMPT,
)


# ─── Helper: call Gemini and parse JSON ───────────────────────────────────────
def _call_gemini(prompt: str) -> str:
    """Send a prompt to Gemini and return the raw text response."""
    logger.info("Sending request to Gemini model: %s", config.GEMINI_MODEL)
    t0 = time.time()
    response = _model.generate_content(prompt)
    elapsed = time.time() - t0
    logger.info("Gemini responded in %.2fs", elapsed)
    return response.text


def _extract_json(raw: str) -> dict:
    """
    Robustly extract a JSON object from the model's response,
    handling accidental markdown fences or leading/trailing text.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$",          "", cleaned.strip(), flags=re.MULTILINE)
    # Find first { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError("No JSON object found in model response.")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Full NLP analysis endpoint.
    Body: { "text": "...", "summary_length": "standard" }
    Returns: structured JSON analysis from Gemini.
    """
    data = request.get_json(force=True)
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "No text provided."}), 400
    if len(text) > config.MAX_INPUT_CHARS:
        return jsonify({"error": f"Text exceeds {config.MAX_INPUT_CHARS:,} character limit."}), 400

    # Build the prompt using our template
    prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        text=text,
        brief_words=config.SUMMARY_LENGTHS["brief"],
        standard_words=config.SUMMARY_LENGTHS["standard"],
        detailed_words=config.SUMMARY_LENGTHS["detailed"],
        max_topics=config.MAX_KEY_TOPICS,
        max_entities=config.MAX_ENTITIES,
    )

    try:
        raw     = _call_gemini(prompt)
        result  = _extract_json(raw)
        # Attach metadata
        result["_meta"] = {
            "model":          config.GEMINI_MODEL,
            "input_chars":    len(text),
            "input_words":    len(text.split()),
        }
        return jsonify(result)
    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s", e)
        return jsonify({"error": "Model returned malformed JSON. Please try again."}), 500
    except Exception as e:
        logger.error("Analysis error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/summarize", methods=["POST"])
def summarize():
    """
    Quick summary endpoint.
    Body: { "text": "...", "word_count": 100 }
    """
    data       = request.get_json(force=True)
    text       = (data.get("text") or "").strip()
    word_count = int(data.get("word_count", 150))

    if not text:
        return jsonify({"error": "No text provided."}), 400

    prompt = QUICK_SUMMARY_PROMPT_TEMPLATE.format(text=text, word_count=word_count)
    try:
        summary = _call_gemini(prompt).strip()
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/keywords", methods=["POST"])
def keywords():
    """
    Keyword extraction endpoint.
    Body: { "text": "...", "n": 10 }
    """
    data = request.get_json(force=True)
    text = (data.get("text") or "").strip()
    n    = int(data.get("n", 10))

    if not text:
        return jsonify({"error": "No text provided."}), 400

    prompt = KEYWORD_PROMPT_TEMPLATE.format(text=text, n=n)
    try:
        raw      = _call_gemini(prompt).strip()
        cleaned  = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        cleaned  = re.sub(r"\s*```$",          "", cleaned.strip())
        kws      = json.loads(cleaned)
        return jsonify({"keywords": kws})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": config.GEMINI_MODEL})


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("Starting NLP Analyzer on http://%s:%d", config.HOST, config.PORT)
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)

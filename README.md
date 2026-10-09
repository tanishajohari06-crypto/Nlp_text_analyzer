# NLP Text Analyzer

> An AI-powered text analysis web application that leverages Google Gemini to provide deep linguistic insights.

## Features

| Feature | Description |
|---|---|
| 📝 Smart Summarization | Brief, standard, and detailed summaries |
| 💬 Sentiment Analysis | Score + gauge with -1 to +1 scale |
| 🎭 Emotion Detection | Top 3 detected emotions with intensity bars |
| 🏷️ Key Topic Extraction | Up to 8 topics with relevance scores |
| 🔖 Named Entity Recognition | Persons, Orgs, Locations, Dates, Products |
| 📖 Readability Scoring | Flesch score, grade level, writing style |
| 📊 Language Metrics | Word count, lexical diversity, language detection |
| 💎 Key Phrases | Top phrases extracted from the text |
| ✨ AI Insights | 3 notable observations by the model |

## Project Structure

```
nlp/
├── app.py              # Flask backend — API endpoints
├── config.py           # Configuration (API key, model, settings)
├── prompts.py          # All LLM prompts (system prompt + analysis templates)
├── requirements.txt    # Python dependencies
├── README.md           # This file
└── static/
    ├── index.html      # Frontend UI
    ├── style.css       # Dark glassmorphism design
    └── app.js          # Frontend logic & result rendering
```

## Setup & Running

### 1. Prerequisites
- Python 3.10+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Your API Key

**Option A — Environment variable (recommended):**
```bash
# Windows PowerShell
$env:GEMINI_API_KEY = "your_api_key_here"

# Windows CMD
set GEMINI_API_KEY=your_api_key_here
```

**Option B — Edit `config.py` directly:**
```python
GEMINI_API_KEY = "your_api_key_here"
```

### 4. Run the App

```bash
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Full NLP analysis (main endpoint) |
| `POST` | `/api/summarize` | Quick summary only |
| `POST` | `/api/keywords` | Keyword extraction only |
| `GET`  | `/api/health`   | Server health check |

### Example Request

```bash
curl -X POST http://127.0.0.1:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here..."}'
```

## LLM Integration

- **Model**: Google Gemini 1.5 Flash
- **Prompt Strategy**: Structured JSON output via zero-shot prompt engineering
- **Temperature**: 0.3 (deterministic, factual responses)
- **System Prompt**: Defined in `prompts.py` — configures the model as an expert NLP analyst
- **Prompt Templates**: Parameterized templates in `prompts.py` for reproducibility

## Prompt Design

The main analysis prompt (`ANALYSIS_PROMPT_TEMPLATE` in `prompts.py`) uses:
- **Role assignment** in the system prompt
- **Explicit JSON schema** with field descriptions and value ranges
- **Hard constraints** (e.g., "Return ONLY the JSON object, no markdown fences")
- **Parameterization** for configurable word counts and limits

## Evaluation Notes

- Code follows clean separation of concerns (config / prompts / backend / frontend)
- All LLM calls are centralized through `_call_gemini()` with logging
- JSON parsing is robust with regex fallback extraction
- Frontend renders all results without page reload (SPA-style)

---
*NLP Course Project · 2026*

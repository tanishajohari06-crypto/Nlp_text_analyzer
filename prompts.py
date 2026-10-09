# ─── System Prompt ────────────────────────────────────────────────────────────
# This file contains all prompts used with the Gemini LLM.
# Modifying these prompts changes the model's analytical behavior.

SYSTEM_PROMPT = """
You are an expert NLP analyst and linguist. Your role is to perform deep, 
structured text analysis with precision, clarity, and actionable insight.
Always respond in valid JSON format as specified. Be factual, objective,
and comprehensive. Never hallucinate information not present in the text.
"""

# ─── Full Analysis Prompt ─────────────────────────────────────────────────────
ANALYSIS_PROMPT_TEMPLATE = """
Analyze the following text and return a JSON object with EXACTLY these fields:

{{
  "summary": {{
    "brief":    "<one-sentence summary, ~{brief_words} words>",
    "standard": "<paragraph summary, ~{standard_words} words>",
    "detailed": "<comprehensive summary, ~{detailed_words} words>"
  }},
  "sentiment": {{
    "label":       "<Positive | Negative | Neutral | Mixed>",
    "score":       <float from -1.0 (very negative) to 1.0 (very positive)>,
    "confidence":  <float from 0.0 to 1.0>,
    "explanation": "<one sentence explaining the sentiment>"
  }},
  "emotions": [
    {{"emotion": "<primary emotion>",   "intensity": <0.0-1.0>}},
    {{"emotion": "<secondary emotion>", "intensity": <0.0-1.0>}},
    {{"emotion": "<tertiary emotion>",  "intensity": <0.0-1.0>}}
  ],
  "key_topics": [
    {{"topic": "<topic name>", "relevance": <0.0-1.0>, "description": "<brief description>"}},
    ...up to {max_topics} topics
  ],
  "named_entities": [
    {{"text": "<entity>", "type": "<PERSON|ORG|LOCATION|DATE|PRODUCT|EVENT|OTHER>", "count": <occurrences>}},
    ...up to {max_entities} entities
  ],
  "readability": {{
    "grade_level":   "<e.g. College, High School, Middle School, Elementary>",
    "flesch_score":  <estimated Flesch Reading Ease 0-100>,
    "avg_sentence_length": <estimated average words per sentence>,
    "vocabulary_richness": "<Rich | Moderate | Simple>",
    "writing_style":  "<Academic | Journalistic | Conversational | Technical | Literary | Other>"
  }},
  "language_metrics": {{
    "detected_language": "<full language name>",
    "word_count":        <integer>,
    "sentence_count":    <integer>,
    "paragraph_count":   <integer>,
    "unique_word_ratio": <float 0.0-1.0, lexical diversity>
  }},
  "key_phrases": ["<phrase 1>", "<phrase 2>", "<phrase 3>", ...up to 10 phrases],
  "content_category": "<News | Academic | Blog | Social Media | Fiction | Business | Legal | Technical | Other>",
  "objectivity_score": <float 0.0 (very subjective) to 1.0 (very objective)>,
  "insights": [
    "<notable insight 1>",
    "<notable insight 2>",
    "<notable insight 3>"
  ]
}}

IMPORTANT: Return ONLY the JSON object, no markdown fences, no extra text.

TEXT TO ANALYZE:
\"\"\"
{text}
\"\"\"
"""

# ─── Quick Summary-Only Prompt ────────────────────────────────────────────────
QUICK_SUMMARY_PROMPT_TEMPLATE = """
Summarize the following text in approximately {word_count} words.
Be concise, accurate, and preserve all key information.
Return ONLY the summary text, nothing else.

TEXT:
\"\"\"
{text}
\"\"\"
"""

# ─── Keyword Extraction Prompt ────────────────────────────────────────────────
KEYWORD_PROMPT_TEMPLATE = """
Extract the {n} most important keywords and key phrases from the following text.
Return a JSON array of strings only. Example: ["keyword1", "phrase two", "keyword3"]
Return ONLY the JSON array, no extra text.

TEXT:
\"\"\"
{text}
\"\"\"
"""

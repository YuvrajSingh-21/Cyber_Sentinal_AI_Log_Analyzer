import os
import json
import google.generativeai as genai
# Configure Gemini
genai.configure(api_key=os.getenv("API_KEY"))

MODEL_NAME = "gemini-2.5-flash"

SYSTEM_PROMPT = """
You are a cybersecurity analyst.
Explain why a security anomaly was detected.
Use only the provided signals.
Do not invent facts.
Be concise, technical, and human-readable.
Return valid JSON only with this structure:

{
  "summary": string,
  "factors": [
    {
      "name": string,
      "description": string,
      "severity": "low" | "medium" | "high"
    }
  ],
  "confidence": number
}
"""

def generate_xai_explanation(anomaly_type, risk_score, signals):
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=SYSTEM_PROMPT
    )

    prompt = {
        "anomaly_type": anomaly_type,
        "risk_score": risk_score,
        "signals": signals
    }

    response = model.generate_content(
        json.dumps(prompt),
        generation_config={
            "temperature": 0.2,
            "response_mime_type": "application/json"
        }
    )

    return json.loads(response.text)

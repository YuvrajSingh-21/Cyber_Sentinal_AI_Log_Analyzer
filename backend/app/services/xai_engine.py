import os
import json
import re
from typing import List, Dict, Any, Optional

import google.generativeai as genai


# ============================================================
# Gemini Configuration
# ============================================================


# ✅ VALID MODEL NAME (THIS WAS THE BLOCKER)
MODEL_NAME = "gemini-2.5-flash"
# MODEL_NAME = "models/gemini-1.5-pro"  # optional higher quality


# ============================================================
# System Prompt (XAI Contract)
# ============================================================

SYSTEM_PROMPT = """
You are an expert cyber forensic analyst and incident responder.

Your task is to generate an Explainable AI (XAI) report for a detected security anomaly.

You are provided with:
- Anomaly metadata (type, risk score, timestamp)
- Observed signals and indicators
- Involved entities (user, IP, process, file, device if present)
- Relevant log evidence
- Behavioral baseline context (if available)

CRITICAL RULES:
- Use ONLY the provided data. Do NOT invent IPs, users, processes, files, or events.
- Base explanations strictly on observed deviations from baseline or expected behavior.
- Maintain forensic clarity and integrity.
- Be concise, technical, and investigator-focused.

REMEDIATION & PREVENTION RULES:
- If risk_score ≥ 70, provide at least one remediation step and one preventive measure.
- Use cautious language: verify, inspect, review, consider.
- Avoid generic SOC boilerplate.

Return VALID JSON ONLY using this schema:

{
  "summary": string,
  "risk_score": number,
  "confidence": number,
  "why_flagged": [
    {
      "signal": string,
      "explanation": string,
      "severity": "low" | "medium" | "high"
    }
  ],
  "remediation_steps": [
    {
      "step": number,
      "action": string,
      "reason": string
    }
  ],
  "preventive_measures": [
    {
      "control": string,
      "purpose": string
    }
  ],
  "evidence": [
    {
      "type": "log" | "metric" | "event",
      "source": string,
      "description": string
    }
  ]
}
"""


# ============================================================
# Helpers
# ============================================================

def _sanitize_logs(
    logs: List[Dict[str, Any]],
    max_logs: int = 10,
    max_message_length: int = 300
) -> List[Dict[str, Any]]:
    sanitized = []
    for log in logs[:max_logs]:
        sanitized.append({
            "timestamp": log.get("timestamp"),
            "source": log.get("source"),
            "message": str(log.get("message", ""))[:max_message_length]
        })
    return sanitized


def _safe_json_load(text: str) -> Dict[str, Any]:
    """
    Gemini may return extra text — safely extract JSON object.
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in Gemini output")
    return json.loads(match.group(0))


# ============================================================
# Main XAI Generator
# ============================================================

def generate_xai_explanation(
    anomaly: Dict[str, Any],
    entities: Dict[str, Any],
    signals: List[Dict[str, Any]],
    logs: List[Dict[str, Any]],
    baseline: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:

    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=SYSTEM_PROMPT
    )

    payload = {
        "anomaly": {
            "id": anomaly.get("id"),
            "type": anomaly.get("type"),
            "risk_score": anomaly.get("risk_score"),
            "detected_at": anomaly.get("detected_at")
        },
        "entities": entities,
        "signals": signals,
        "logs": _sanitize_logs(logs),
        "baseline": baseline or {}
    }

    response = model.generate_content(
        json.dumps(payload),
        generation_config={
            "temperature": 0.15,
            "response_mime_type": "application/json"
        }
    )

    # ✅ SAFE PARSE
    result = _safe_json_load(response.text)

    # ============================================================
    # 🔒 MINIMUM PROTOTYPE SAFETY (DO NOT REMOVE)
    # ============================================================

    risk_score = anomaly.get("risk_score", 0)

    if risk_score >= 70:
        if not result.get("remediation_steps"):
            result["remediation_steps"] = [
                {
                    "step": 1,
                    "action": "Review the anomalous activity on the affected system",
                    "reason": "High-risk anomaly requires analyst verification"
                }
            ]

        if not result.get("preventive_measures"):
            result["preventive_measures"] = [
                {
                    "control": "Enhanced monitoring",
                    "purpose": "Detect similar anomalous behavior earlier"
                }
            ]

    return result

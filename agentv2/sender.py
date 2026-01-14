import requests, json
from config import BACKEND_URL

def send_log(payload: dict):
    try:
        payload["raw_data"] = json.dumps(payload["raw_data"], default=str)

        r = requests.post(
            BACKEND_URL,
            json=payload,
            timeout=2
        )

        if r.status_code != 200:
            print("❌", r.status_code, r.text)

    except Exception as e:
        print("⚠️ send error:", e)

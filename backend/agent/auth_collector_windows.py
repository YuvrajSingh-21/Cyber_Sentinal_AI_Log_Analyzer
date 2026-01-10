import win32evtlog
import win32evtlogutil
import time
import socket
import requests
from endpoint_id import get_endpoint_id
from config import BACKEND_URL

ENDPOINT_ID = get_endpoint_id()
HOSTNAME = socket.gethostname()

SECURITY_LOG = "Security"

EVENT_TYPES = {
    4624: ("Login success", "info"),
    4625: ("Login failed", "warning"),
    4634: ("Logoff", "info"),
    4647: ("User logoff", "info"),
}

def run_auth_collector():
    server = "localhost"
    logtype = SECURITY_LOG

    hand = win32evtlog.OpenEventLog(server, logtype)
    flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

    last_record = 0

    while True:
        events = win32evtlog.ReadEventLog(hand, flags, 0)
        if not events:
            time.sleep(2)
            continue

        for event in events:
            if event.RecordNumber <= last_record:
                continue

            event_id = event.EventID & 0xFFFF
            if event_id not in EVENT_TYPES:
                continue

            message, severity = EVENT_TYPES[event_id]

            payload = {
                "endpoint_id": ENDPOINT_ID,
                "log_type": "auth",
                "source": HOSTNAME,
                "severity": severity,
                "message": message,
                "raw_data": str({
                    "event_id": event_id,
                    "time": str(event.TimeGenerated),
                    "user": event.StringInserts
                })
            }

            try:
                requests.post(BACKEND_URL, json=payload, timeout=2)
            except:
                pass

            last_record = event.RecordNumber

        time.sleep(1)

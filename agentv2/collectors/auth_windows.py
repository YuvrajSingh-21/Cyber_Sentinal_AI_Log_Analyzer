import win32evtlog
import time, socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()

LOGTYPE = "Security"
FLAGS = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

# High-signal only
EVENTS = {
    4624: ("Login success", "low"),
    4625: ("Login failed", "high"),
    4634: ("Logoff", "low"),
}

def run():
    server = "localhost"
    hand = win32evtlog.OpenEventLog(server, LOGTYPE)
    last_record = 0

    while True:
        events = win32evtlog.ReadEventLog(hand, FLAGS, 0)
        if not events:
            time.sleep(3)
            continue

        for e in events:
            if e.RecordNumber <= last_record:
                continue

            event_id = e.EventID & 0xFFFF
            if event_id not in EVENTS:
                continue

            desc, sev = EVENTS[event_id]

            send_log({
                "endpoint_id": EID,
                "log_type": "auth",
                "source": HOST,
                "severity": sev,
                "message": desc,
                "raw_data": {
                    "event_id": event_id,
                    "time": str(e.TimeGenerated),
                    "details": e.StringInserts
                }
            })

            last_record = e.RecordNumber

        time.sleep(2)

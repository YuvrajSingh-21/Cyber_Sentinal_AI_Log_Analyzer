import win32evtlog
import time, socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()

LOGTYPE = "Application"
FLAGS = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

# High-signal Application Event IDs
INTERESTING_EVENTS = {
    1000: ("Application crash", "high"),          # Faulting application
    1001: ("Application error report", "warning"),
    1026: ("Application .NET crash", "high"),
    11707:("Application install failed", "warning"),
}

def run():
    hand = win32evtlog.OpenEventLog("localhost", LOGTYPE)
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
            if event_id not in INTERESTING_EVENTS:
                continue

            desc, severity = INTERESTING_EVENTS[event_id]

            send_log({
                "endpoint_id": EID,
                "log_type": "application",
                "source": HOST,
                "severity": severity,
                "message": f"Application event: {desc}",
                "raw_data": {
                    "event_id": event_id,
                    "source_name": e.SourceName,
                    "time": str(e.TimeGenerated),
                    "details": e.StringInserts
                }
            })

            last_record = e.RecordNumber

        time.sleep(2)

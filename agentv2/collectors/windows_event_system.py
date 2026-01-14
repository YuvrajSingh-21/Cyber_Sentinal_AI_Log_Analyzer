import win32evtlog
import time, socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()

LOGTYPE = "System"
FLAGS = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

# High-signal System Event IDs
INTERESTING_EVENTS = {
    41:  ("Unexpected system shutdown", "high"),     # Kernel-Power
    6008:("Unexpected reboot", "high"),
    7031:("Service crashed", "warning"),
    7034:("Service terminated unexpectedly", "warning"),
    7023:("Service failed to start", "warning"),
    1001:("System bugcheck / BSOD", "high"),
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
                "log_type": "system",
                "source": HOST,
                "severity": severity,
                "message": f"System event: {desc}",
                "raw_data": {
                    "event_id": event_id,
                    "source_name": e.SourceName,
                    "time": str(e.TimeGenerated),
                    "details": e.StringInserts
                }
            })

            last_record = e.RecordNumber

        time.sleep(2)

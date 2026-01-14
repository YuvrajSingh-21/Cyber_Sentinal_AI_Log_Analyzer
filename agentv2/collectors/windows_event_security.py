import win32evtlog
import time, socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()

LOGTYPE = "Security"
FLAGS = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

# High-signal Security Event IDs
SECURITY_EVENTS = {
    4624: ("Login success", "low"),
    4625: ("Login failure", "high"),
    4648: ("Explicit credentials used", "high"),
    4672: ("Admin privileges assigned", "high"),
    4688: ("Process created", "medium"),
    4697: ("Service installed", "high"),
    4673: ("Privileged service called", "high"),
    4657: ("Registry value modified", "medium"),
    4719: ("Audit policy changed", "high"),
    1102: ("Security log cleared", "critical"),
}

def extract_fields(event):
    """
    Best-effort extraction from StringInserts.
    Security logs vary by policy, so we stay flexible.
    """
    data = {}
    inserts = event.StringInserts or []

    for i, v in enumerate(inserts):
        data[f"field_{i}"] = v

    return data


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
            if event_id not in SECURITY_EVENTS:

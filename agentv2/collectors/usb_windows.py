import win32evtlog, time, socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()

EVENTS = {2003: "USB Inserted", 2100: "USB Removed"}
FLAGS = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

def run():
    hand = win32evtlog.OpenEventLog("localhost", "System")
    last = 0

    while True:
        events = win32evtlog.ReadEventLog(hand, FLAGS, 0)
        if not events:
            time.sleep(2)
            continue

        for e in events:
            if e.RecordNumber <= last:
                continue

            eid = e.EventID & 0xFFFF
            if eid in EVENTS and e.SourceName == "Kernel-PnP":
                send_log({
                    "endpoint_id": EID,
                    "log_type": "usb",
                    "source": HOST,
                    "severity": "warning",
                    "message": EVENTS[eid],
                    "raw_data": {
                        "event_id": eid,
                        "time": str(e.TimeGenerated),
                        "details": e.StringInserts
                    }
                })

            last = e.RecordNumber

        time.sleep(1)

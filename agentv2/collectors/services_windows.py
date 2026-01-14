import psutil, time, socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()
KNOWN = {}

def run():
    global KNOWN
    while True:
        for svc in psutil.win_service_iter():
            info = svc.as_dict()
            name = info["name"]
            state = info["status"]

            if name not in KNOWN:
                KNOWN[name] = state
                continue

            if KNOWN[name] != state:
                send_log({
                    "endpoint_id": EID,
                    "log_type": "system",
                    "source": HOST,
                    "severity": "warning",
                    "message": "Service state changed",
                    "raw_data": {
                        "service": name,
                        "old": KNOWN[name],
                        "new": state
                    }
                })
                KNOWN[name] = state

        time.sleep(10)

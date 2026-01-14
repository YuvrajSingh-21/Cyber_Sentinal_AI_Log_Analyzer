import psutil, socket, time
from sender import send_log
from endpoint import get_endpoint_id
from config import PROCESS_INTERVAL

EID = get_endpoint_id()
HOST = socket.gethostname()
SEEN = set()

def run():
    while True:
        for p in psutil.process_iter(["pid","ppid","name","exe","cmdline"]):
            if p.pid in SEEN:
                continue
            SEEN.add(p.pid)

            send_log({
                "endpoint_id": EID,
                "log_type": "process",
                "source": HOST,
                "severity": "info",
                "message": f"Process started: {p.info['name']}",
                "raw_data": p.info
            })

        time.sleep(PROCESS_INTERVAL)

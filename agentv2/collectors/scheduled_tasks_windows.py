import subprocess, time, socket
from sender import send_log
from endpoint import get_endpoint_id
from utils.silent_subprocess import run_silent
EID = get_endpoint_id()
HOST = socket.gethostname()
LAST = set()

def list_tasks():
    r = run_silent(["schtasks", "/query", "/fo", "LIST"])
    tasks = set()
    for line in r.stdout.splitlines():
        if line.startswith("TaskName:"):
            tasks.add(line.split(":", 1)[1].strip())
    return tasks

def run():
    global LAST
    while True:
        current = list_tasks()
        for t in current - LAST:
            send_log({
                "endpoint_id": EID,
                "log_type": "system",
                "source": HOST,
                "severity": "warning",
                "message": "Scheduled task created",
                "raw_data": {"task": t}
            })
        LAST = current
        time.sleep(30)

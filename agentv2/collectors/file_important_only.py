from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()

EXCLUDED = [
    "\\windows\\temp",
    "\\appdata\\local\\temp",
    "\\appdata\\local\\microsoft",
    "\\appdata\\local\\google",
    "\\appdata\\local\\packages",
    "\\winsxs",
    "\\$recycle.bin"
]

IMPORTANT_EXT = (".exe",".dll",".ps1",".bat",".cmd",".vbs",".js")

def noisy(path):
    p = path.lower()
    return any(x in p for x in EXCLUDED)

class Handler(FileSystemEventHandler):
    def on_created(self, e):
        if e.is_directory:
            return
        if noisy(e.src_path):
            return
        if not e.src_path.lower().endswith(IMPORTANT_EXT):
            return

        send_log({
            "endpoint_id": EID,
            "log_type": "file",
            "source": HOST,
            "severity": "medium",
            "message": "Important file created",
            "raw_data": {"path": e.src_path}
        })

def run():
    obs = Observer()
    obs.schedule(Handler(), "C:\\", recursive=True)
    obs.start()
    obs.join()

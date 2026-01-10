from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import socket
import requests
from endpoint_id import get_endpoint_id
from config import BACKEND_URL

ENDPOINT_ID = get_endpoint_id()
HOSTNAME = socket.gethostname()

class FileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.is_directory:
            return

        payload = {
            "endpoint_id": ENDPOINT_ID,
            "log_type": "file",
            "source": HOSTNAME,
            "severity": "medium",
            "message": f"File modified: {event.src_path}",
            "raw_data": "{}"
        }

        try:
            requests.post(BACKEND_URL, json=payload, timeout=2)
        except:
            pass

def run_file_watcher(path="C:\\"):
    observer = Observer()
    observer.schedule(FileHandler(), path, recursive=True)
    observer.start()

    try:
        observer.join()
    except KeyboardInterrupt:
        observer.stop()

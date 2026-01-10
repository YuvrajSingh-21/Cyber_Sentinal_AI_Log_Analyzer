import psutil
import time
import socket
import requests
import platform

from endpoint_id import get_endpoint_id
from config import BACKEND_URL, SYSTEM_INTERVAL, DISK_MODE, SELECTED_DRIVES

ENDPOINT_ID = get_endpoint_id()
HOSTNAME = socket.gethostname()


def get_disk_usage():
    drives_data = {}
    max_used = 0.0

    for part in psutil.disk_partitions(all=False):
        if platform.system() == "Windows":
            if "cdrom" in part.opts or not part.fstype:
                continue

        drive = part.device.replace("\\", "")

        # 🔒 Apply drive filter
        if DISK_MODE == "selected" and drive not in SELECTED_DRIVES:
            continue

        try:
            usage = psutil.disk_usage(part.mountpoint)
            drives_data[drive] = {
                "used_percent": usage.percent,
                "total_gb": round(usage.total / (1024**3), 2),
                "free_gb": round(usage.free / (1024**3), 2),
            }
            max_used = max(max_used, usage.percent)

        except Exception:
            continue

    return {
        "drives": drives_data,
        "max_used": round(max_used, 2),
        "drive_count": len(drives_data)
    }


def run_system_collector():
    while True:
        try:
            cpu = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory().percent
            disk = get_disk_usage()

            payload = {
                "endpoint_id": ENDPOINT_ID,
                "log_type": "system",
                "source": HOSTNAME,
                "severity": "info",
                "message": (
                    f"CPU {cpu}% | MEM {mem}% | "
                    f"DISK {disk['max_used']}%"
                ),
                "raw_data": {
                    "cpu": cpu,
                    "mem": mem,
                    "disk": disk
                }
            }

            requests.post(BACKEND_URL, json=payload, timeout=3)

        except Exception as e:
            print("❌ System collector error:", e)

        time.sleep(SYSTEM_INTERVAL)

import psutil
import socket
import time
import platform

from sender import send_log
from endpoint import get_endpoint_id
from config import SYSTEM_INTERVAL

EID = get_endpoint_id()
HOST = socket.gethostname()
BOOT_SENT = False


def get_disk_usage():
    disks = {}
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks[part.device] = {
                "used_percent": usage.percent,
                "total_gb": round(usage.total / (1024 ** 3), 2),
                "free_gb": round(usage.free / (1024 ** 3), 2),
            }
        except Exception:
            continue
    return disks


def run():
    global BOOT_SENT

    # 🔑 Prime CPU measurement (important)
    psutil.cpu_percent(interval=None)

    while True:
        now = int(time.time())
        uptime = int(now - psutil.boot_time())

        # ✅ Force real delta sampling
        cpu = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory().percent
        disks = get_disk_usage()

        # 1️⃣ BOOT EVENT (ONCE)
        if not BOOT_SENT:
            send_log({
                "endpoint_id": EID,
                "log_type": "system",
                "source": HOST,
                "severity": "info",
                "timestamp": now,          # 🔑 REQUIRED
                "message": "System boot detected",
                "raw_data": {
                    "uptime_seconds": uptime,
                    "os": platform.system(),
                    "os_version": platform.version()
                }
            })
            BOOT_SENT = True

        # 2️⃣ LIVE SYSTEM METRICS
        send_log({
            "endpoint_id": EID,
            "log_type": "system_metrics",
            "source": HOST,
            "severity": "info",
            "timestamp": now,              # 🔥 THIS FIXES THE DASHBOARD
            "message": "System metrics snapshot",
            "raw_data": {
                "cpu_percent": cpu,
                "memory_percent": mem,
                "disks": disks,
                "uptime_seconds": uptime
            }
        })

        time.sleep(SYSTEM_INTERVAL)

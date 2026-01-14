import psutil, socket, time
from sender import send_log
from endpoint import get_endpoint_id
from config import NETWORK_INTERVAL

EID = get_endpoint_id()
HOST = socket.gethostname()
SEEN = set()

def run():
    while True:
        for c in psutil.net_connections(kind="tcp"):
            if not c.raddr:
                continue

            src_ip, src_port = c.laddr
            dst_ip, dst_port = c.raddr

            key = (src_ip, dst_ip, dst_port)
            if key in SEEN:
                continue
            SEEN.add(key)

            send_log({
                "endpoint_id": EID,
                "log_type": "network",
                "source": HOST,
                "severity": "info",
                "message": f"TCP {src_ip}:{src_port} → {dst_ip}:{dst_port}",
                "raw_data": {
                    "src_ip": src_ip,
                    "src_port": src_port,
                    "dst_ip": dst_ip,
                    "dst_port": dst_port,
                    "status": c.status
                }
            })

        time.sleep(NETWORK_INTERVAL)

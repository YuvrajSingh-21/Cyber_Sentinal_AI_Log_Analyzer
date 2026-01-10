from collections import defaultdict
from time import time

# Memory-based tracking (fast, SOC-style)
PORT_SCAN_THRESHOLD = 10        # ports
PORT_SCAN_WINDOW = 10           # seconds

BRUTE_FORCE_THRESHOLD = 5       # attempts
BRUTE_FORCE_WINDOW = 60

DOS_PACKET_THRESHOLD = 100      # packets
DOS_WINDOW = 10

port_scan_tracker = defaultdict(list)
brute_force_tracker = defaultdict(list)
dos_tracker = defaultdict(list)

def detect_attacks(log):
    alerts = []
    now = time()

    src_ip = log.get("src_ip")
    dst_port = log.get("dst_port")
    protocol = log.get("protocol")
    size = log.get("size")

    # 1️⃣ Port Scan Detection
    if dst_port:
        key = (src_ip)
        port_scan_tracker[key].append((dst_port, now))
        port_scan_tracker[key] = [
            p for p in port_scan_tracker[key]
            if now - p[1] <= PORT_SCAN_WINDOW
        ]

        unique_ports = len(set(p[0] for p in port_scan_tracker[key]))
        if unique_ports >= PORT_SCAN_THRESHOLD:
            alerts.append("Port scanning detected")

    # 2️⃣ Brute Force (SSH / RDP)
    if dst_port in [22, 3389]:
        key = (src_ip, dst_port)
        brute_force_tracker[key].append(now)
        brute_force_tracker[key] = [
            t for t in brute_force_tracker[key]
            if now - t <= BRUTE_FORCE_WINDOW
        ]

        if len(brute_force_tracker[key]) >= BRUTE_FORCE_THRESHOLD:
            alerts.append("Possible brute force attack")

    # 3️⃣ DoS / Flood
    if size:
        dos_tracker[src_ip].append(now)
        dos_tracker[src_ip] = [
            t for t in dos_tracker[src_ip]
            if now - t <= DOS_WINDOW
        ]

        if len(dos_tracker[src_ip]) >= DOS_PACKET_THRESHOLD:
            alerts.append("Possible DoS attack")

    return alerts

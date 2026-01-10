from scapy.all import sniff, IP, TCP, UDP
import socket
import requests
from endpoint_id import get_endpoint_id
from config import BACKEND_URL

ENDPOINT_ID = get_endpoint_id()
HOSTNAME = socket.gethostname()

def packet_handler(packet):
    if IP not in packet:
        return

    proto = "OTHER"
    sport = dport = None

    if TCP in packet:
        proto = "TCP"
        sport = packet[TCP].sport
        dport = packet[TCP].dport
    elif UDP in packet:
        proto = "UDP"
        sport = packet[UDP].sport
        dport = packet[UDP].dport

    payload = {
        "endpoint_id": ENDPOINT_ID,
        "log_type": "network",
        "source": HOSTNAME,
        "severity": "info",
        "message": f"{proto} {packet[IP].src}:{sport} → {packet[IP].dst}:{dport}",
        "raw_data": "{}"
    }

    try:
        requests.post(BACKEND_URL, json=payload, timeout=1)
    except:
        pass

def run_network_collector():
    sniff(prn=packet_handler, store=False)

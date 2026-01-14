import subprocess, time, socket, json
from sender import send_log
from endpoint import get_endpoint_id
from utils.silent_subprocess import run_silent

EID = get_endpoint_id()
HOST = socket.gethostname()
LAST = None

def get_status():
    cmd = [
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-MpComputerStatus | ConvertTo-Json"
    ]

    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    r = run_silent([
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        "Get-MpComputerStatus | ConvertTo-Json"
    ])

    if not r.stdout:
        return None

    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return None


def run():
    global LAST
    while True:
        status = get_status()
        if not status:
            time.sleep(10)
            continue

        current = {
            "RealTimeProtection": status.get("RealTimeProtectionEnabled"),
            "AntivirusEnabled": status.get("AntivirusEnabled"),
            "TamperProtection": status.get("IsTamperProtected")
        }

        if current != LAST:
            send_log({
                "endpoint_id": EID,
                "log_type": "system",
                "source": HOST,
                "severity": "warning",
                "message": "Windows Defender configuration changed",
                "raw_data": current
            })
            LAST = current

        time.sleep(15)

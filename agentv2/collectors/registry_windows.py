import winreg, time, socket
from sender import send_log
from endpoint import get_endpoint_id

EID = get_endpoint_id()
HOST = socket.gethostname()

RUN_KEYS = [
    r"Software\Microsoft\Windows\CurrentVersion\Run",
    r"Software\Microsoft\Windows\CurrentVersion\RunOnce"
]

LAST = {}

def read_keys():
    data = {}
    for path in RUN_KEYS:
        try:
            k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, path)
            i = 0
            while True:
                name, value, _ = winreg.EnumValue(k, i)
                data[f"{path}\\{name}"] = value
                i += 1
        except:
            pass
    return data

def run():
    global LAST
    while True:
        current = read_keys()

        for k, v in current.items():
            if k not in LAST:
                send_log({
                    "endpoint_id": EID,
                    "log_type": "file",
                    "source": HOST,
                    "severity": "warning",
                    "message": "Registry persistence added",
                    "raw_data": {
                        "registry_key": k,
                        "value": v
                    }
                })

        LAST = current
        time.sleep(20)

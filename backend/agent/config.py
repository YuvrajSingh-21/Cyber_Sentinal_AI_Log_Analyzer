BACKEND_URL = "http://127.0.0.1:8000/api/logs/ingest"

SYSTEM_INTERVAL = 5   # seconds

# Disk collection mode
DISK_MODE = "all"  
# options: "all" | "selected"

# Only used if DISK_MODE == "selected"
SELECTED_DRIVES = ["C:", "D:", "E:"]  # example

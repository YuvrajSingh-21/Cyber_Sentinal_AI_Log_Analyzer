import threading
from network_collector import run_network_collector
from system_collector import run_system_collector
from auth_collector_windows import run_auth_collector
from file_collector_windows import run_file_watcher

threads = [
    threading.Thread(target=run_network_collector, daemon=True),
    threading.Thread(target=run_system_collector, daemon=True),
    threading.Thread(target=run_auth_collector, daemon=True),
    threading.Thread(target=run_file_watcher, daemon=True),
]

for t in threads:
    t.start()

for t in threads:
    t.join()

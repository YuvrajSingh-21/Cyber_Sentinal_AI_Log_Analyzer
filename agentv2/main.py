import threading
import time

from collectors import (
    system,
    # process,
    network,
    file_important_only,

    auth_windows,
    defender_windows,
    registry_windows,
    services_windows,
    scheduled_tasks_windows,
    usb_windows,
)


def start_collectors():
    threading.Thread(target=system.run, daemon=True).start()
    # threading.Thread(target=process.run, daemon=True).start()
    threading.Thread(target=network.run, daemon=True).start()
    threading.Thread(target=file_important_only.run, daemon=True).start()

    threading.Thread(target=auth_windows.run, daemon=True).start()
    threading.Thread(target=defender_windows.run, daemon=True).start()
    threading.Thread(target=registry_windows.run, daemon=True).start()
    threading.Thread(target=services_windows.run, daemon=True).start()
    threading.Thread(target=scheduled_tasks_windows.run, daemon=True).start()
    threading.Thread(target=usb_windows.run, daemon=True).start()


def main():
    start_collectors()

    # 🔒 Keep EXE alive forever
    while True:
        time.sleep(10)


if __name__ == "__main__":
    main()

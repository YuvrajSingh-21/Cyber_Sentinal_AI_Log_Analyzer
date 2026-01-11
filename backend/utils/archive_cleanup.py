import os, time
from config import ARCHIVE_DIR, ARCHIVE_RETENTION_DAYS


def cleanup_old_archives():
    cutoff = time.time() - (ARCHIVE_RETENTION_DAYS * 86400)

    for file in os.listdir(ARCHIVE_DIR):
        path = os.path.join(ARCHIVE_DIR, file)

        if file.endswith(".zip") and os.path.getmtime(path) < cutoff:
            os.remove(path)

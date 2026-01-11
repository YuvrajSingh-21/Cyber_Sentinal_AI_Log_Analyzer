from datetime import datetime, timedelta, timezone
from app.models.logs import LogEvent
from config import DB_RETENTION_DAYS
from utils.log_archiver import (
    archive_to_csv,
    archive_to_json,
    zip_and_cleanup,
    enough_disk_space
)


def archive_and_delete_logs(db):
    if not enough_disk_space():
        print("⚠️ Low disk space, skipping archive")
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=DB_RETENTION_DAYS)

    logs = (
        db.query(LogEvent)
        .filter(LogEvent.timestamp < cutoff)
        .all()
    )

    if not logs:
        return 0

    csv_path = archive_to_csv(logs)
    json_path = archive_to_json(logs)
    zip_and_cleanup(csv_path, json_path)

    deleted = (
        db.query(LogEvent)
        .filter(LogEvent.timestamp < cutoff)
        .delete(synchronize_session=False)
    )

    db.commit()
    return deleted

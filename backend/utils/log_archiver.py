import os, csv, json, zipfile, shutil
from datetime import datetime
from config import ARCHIVE_DIR, MIN_FREE_DISK_GB

os.makedirs(ARCHIVE_DIR, exist_ok=True)


def enough_disk_space():
    free = shutil.disk_usage(ARCHIVE_DIR).free / (1024**3)
    return free >= MIN_FREE_DISK_GB


def archive_date_name():
    return datetime.utcnow().date().isoformat()  # YYYY-MM-DD


def archive_to_csv(logs):
    date = archive_date_name()
    csv_name = f"logs_{date}.csv"
    csv_path = os.path.join(ARCHIVE_DIR, csv_name)

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "id",
            "timestamp",
            "endpoint_id",
            "log_type",
            "source",
            "severity",
            "message",
            "raw_data"
        ])

        for l in logs:
            writer.writerow([
                l.id,
                l.timestamp.isoformat(),
                l.endpoint_id,
                l.log_type,
                l.source,
                l.severity,
                l.message,
                l.raw_data
            ])

    return csv_path


def archive_to_json(logs):
    date = archive_date_name()
    json_name = f"logs_{date}.json"
    json_path = os.path.join(ARCHIVE_DIR, json_name)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(
            [{
                "id": l.id,
                "timestamp": l.timestamp.isoformat(),
                "endpoint_id": l.endpoint_id,
                "log_type": l.log_type,
                "source": l.source,
                "severity": l.severity,
                "message": l.message,
                "raw_data": l.raw_data
            } for l in logs],
            f,
            indent=2
        )

    return json_path


def zip_and_cleanup(csv_path, json_path):
    zip_path = csv_path.replace(".csv", ".zip")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(csv_path, arcname=os.path.basename(csv_path))
        z.write(json_path, arcname=os.path.basename(json_path))

    os.remove(csv_path)
    os.remove(json_path)

    return zip_path

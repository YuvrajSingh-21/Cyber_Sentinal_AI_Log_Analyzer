import uuid
import os

ENDPOINT_FILE = "endpoint_id.txt"

def get_endpoint_id():
    if os.path.exists(ENDPOINT_FILE):
        return open(ENDPOINT_FILE).read().strip()
    else:
        eid = str(uuid.uuid4())
        with open(ENDPOINT_FILE, "w") as f:
            f.write(eid)
        return eid

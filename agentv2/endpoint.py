import socket, uuid, os

ID_FILE = "endpoint.id"

def get_endpoint_id():
    if os.path.exists(ID_FILE):
        return open(ID_FILE).read().strip()

    eid = f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
    with open(ID_FILE, "w") as f:
        f.write(eid)
    return eid

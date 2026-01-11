from sqlalchemy.orm import Session
from uuid import uuid4
import json
import re

from app.models.anomalies import Anomaly
from app.models.anomaly_logs import AnomalyLog
from app.models.logs import LogEvent
from app.services.xai_engine import generate_xai_explanation


# =====================================================
# CONFIG
# =====================================================

WINDOWS_CRITICAL_PATHS = [
    "c:\\windows\\system32",
    "c:\\windows\\syswow64",
    "c:\\windows\\system32\\drivers",
    "c:\\program files",
    "c:\\program files (x86)",
    "c:\\users\\public",
    "c:\\windows\\temp",
    "c:\\temp"
]

SENSITIVE_EXTENSIONS = [
    ".exe", ".dll", ".ps1", ".bat", ".vbs", ".js"
]

SUSPICIOUS_WINDOWS_COMMANDS = [
    "powershell -enc",
    "frombase64string",
    "invoke-webrequest",
    "iex ",
    "certutil",
    "bitsadmin",
    "mshta",
    "wmic"
]

GENERIC_THREAT_KEYWORDS = [
    "malware",
    "exploit",
    "unauthorized",
    "bruteforce",
    "backdoor",
    "mimikatz",
    "credential dump",
    "ransomware",
    "port scan"
]


# =====================================================
# HELPERS
# =====================================================

IP_REGEX = r"(?:\d{1,3}\.){3}\d{1,3}"


def extract_ip(text: str | None):
    if not text:
        return None
    match = re.search(IP_REGEX, text)
    return match.group(0) if match else None


def recent_logs(db, *, log_type=None, endpoint_id=None, limit=50):
    q = db.query(LogEvent).order_by(LogEvent.id.desc())

    if log_type:
        q = q.filter(LogEvent.log_type == log_type)

    if endpoint_id:
        q = q.filter(LogEvent.endpoint_id == endpoint_id)

    return q.limit(limit).all()


def count_recent(db, **kwargs):
    return len(recent_logs(db, **kwargs))


def anomaly_exists(db, rule_id, log_id):
    return db.query(AnomalyLog).join(Anomaly).filter(
        AnomalyLog.log_id == log_id,
        Anomaly.explanation_json.contains(rule_id)
    ).first() is not None


# =====================================================
# GUARDRAIL (CRITICAL – DOES NOT REMOVE RULES)
# =====================================================

def should_analyze(log: LogEvent) -> bool:
    msg = (log.message or "").lower()

    # 🔕 Ignore pure telemetry
    if log.log_type == "system" and log.severity == "info":
        if any(k in msg for k in ["cpu", "mem", "disk", "uptime"]):
            return False

    # 🔕 Ignore raw packet noise
    if log.log_type == "network" and log.severity == "info":
        return False

    # 🔕 Ignore normal process creation
    if log.log_type == "process" and log.severity == "info":
        return False

    # 🔕 Ignore benign USB activity
    if log.log_type == "usb" and log.severity in ("low", "medium"):
        return False

    return True


# =====================================================
# ANOMALY CREATION
# =====================================================

def create_anomaly(
    db: Session,
    *,
    rule_id: str,
    anomaly_type: str,
    source: str,
    risk_score: int,
    log: LogEvent,
    signals: dict
):
    if anomaly_exists(db, rule_id, log.id):
        return

    anomaly_id = f"anom_{uuid4().hex[:12]}"
    signals["rule_id"] = rule_id

    try:
        xai = generate_xai_explanation(
            anomaly_type=anomaly_type,
            risk_score=risk_score,
            signals=signals
        )
    except Exception:
        xai = {
            "summary": "Security anomaly detected using rule-based analysis",
            "factors": signals,
            "confidence": 0.7
        }

    anomaly = Anomaly(
        id=anomaly_id,
        type=anomaly_type,
        status="active",
        risk_score=risk_score,
        source=source,
        explanation_json=json.dumps(xai)
    )

    db.add(anomaly)
    db.add(AnomalyLog(anomaly_id=anomaly_id, log_id=log.id))
    db.commit()

    print(f"🚨 [{rule_id}] {anomaly_type} (risk={risk_score})")


# =====================================================
# RULE REGISTRY (ALL YOUR RULES — NONE REMOVED)
# =====================================================

RULES = [

    # ================= AUTH =================
    {
        "id": "AUTH-001",
        "type": "auth_failure",
        "log_type": "auth",
        "condition": lambda l, d: "failed" in l.message.lower(),
        "risk": 40
    },
    {
        "id": "AUTH-002",
        "type": "brute_force_attempt",
        "log_type": "auth",
        "condition": lambda l, d:
            count_recent(d, log_type="auth", endpoint_id=l.endpoint_id, limit=10) >= 5,
        "risk": 85
    },
    {
        "id": "AUTH-003",
        "type": "success_after_failure",
        "log_type": "auth",
        "condition": lambda l, d:
            "success" in l.message.lower() and
            count_recent(d, log_type="auth", endpoint_id=l.endpoint_id, limit=10) >= 3,
        "risk": 95
    },
    {
        "id": "AUTH-004",
        "type": "admin_login_attempt",
        "log_type": "auth",
        "condition": lambda l, d: "admin" in l.message.lower(),
        "risk": 75
    },
    {
        "id": "AUTH-005",
        "type": "password_change_activity",
        "log_type": "auth",
        "condition": lambda l, d: "password" in l.message.lower(),
        "risk": 65
    },

    # ================= NETWORK =================
    {
        "id": "NET-001",
        "type": "port_scan_detected",
        "log_type": "network",
        "condition": lambda l, d:
            "port scan" in l.message.lower(),
        "risk": 80
    },
    {
        "id": "NET-002",
        "type": "suspicious_ip_mentioned",
        "log_type": "network",
        "condition": lambda l, d:
            extract_ip(l.message) is not None and (
                "scan" in l.message.lower()
                or "denied" in l.message.lower()
                or count_recent(
                    d,
                    log_type="network",
                    endpoint_id=l.endpoint_id,
                    limit=20
                ) >= 15
            ),
        "risk": 70
    },
    {
        "id": "NET-003",
        "type": "ddos_indicator",
        "log_type": "network",
        "condition": lambda l, d:
            "flood" in l.message.lower() or "ddos" in l.message.lower(),
        "risk": 90
    },
    {
        "id": "NET-004",
        "type": "lateral_movement_indicator",
        "log_type": "network",
        "condition": lambda l, d:
            "internal" in l.message.lower() and "connection" in l.message.lower(),
        "risk": 85
    },

    # ================= FILE =================
    {
        "id": "FILE-WIN-001",
        "type": "executable_in_temp",
        "log_type": "file",
        "condition": lambda l, d:
            "\\temp\\" in (l.raw_data or "").lower() and
            any((l.raw_data or "").lower().endswith(ext) for ext in SENSITIVE_EXTENSIONS),
        "risk": 95
    },
    {
        "id": "FILE-WIN-002",
        "type": "system_binary_modified",
        "log_type": "file",
        "condition": lambda l, d:
            "system32" in (l.raw_data or "").lower(),
        "risk": 90
    },
    {
        "id": "FILE-WIN-003",
        "type": "startup_persistence",
        "log_type": "file",
        "condition": lambda l, d:
            "startup" in (l.raw_data or "").lower(),
        "risk": 95
    },
    {
        "id": "FILE-WIN-004",
        "type": "script_drop",
        "log_type": "file",
        "condition": lambda l, d:
            any(ext in (l.raw_data or "").lower() for ext in [".ps1", ".vbs", ".bat"]),
        "risk": 85
    },
    {
        "id": "FILE-WIN-005",
        "type": "mass_file_activity",
        "log_type": "file",
        "condition": lambda l, d:
            count_recent(d, log_type="file", endpoint_id=l.endpoint_id, limit=30) >= 20,
        "risk": 85
    },

    # ================= SYSTEM =================
    {
        "id": "SYS-WIN-001",
        "type": "powershell_abuse",
        "log_type": "system",
        "condition": lambda l, d:
            "powershell" in l.message.lower(),
        "risk": 85
    },
    {
        "id": "SYS-WIN-002",
        "type": "encoded_command",
        "log_type": "system",
        "condition": lambda l, d:
            "-enc" in l.message.lower() or "base64" in l.message.lower(),
        "risk": 95
    },
    {
        "id": "SYS-WIN-003",
        "type": "lolbin_usage",
        "log_type": "system",
        "condition": lambda l, d:
            any(x in l.message.lower() for x in ["certutil", "bitsadmin", "mshta"]),
        "risk": 90
    },
    {
        "id": "SYS-WIN-004",
        "type": "defender_disabled",
        "log_type": "system",
        "condition": lambda l, d:
            "defender" in l.message.lower() and "disabled" in l.message.lower(),
        "risk": 98
    },
    {
        "id": "SYS-WIN-005",
        "type": "credential_dumping",
        "log_type": "system",
        "condition": lambda l, d:
            "lsass" in l.message.lower(),
        "risk": 98
    },
    {
        "id": "SYS-WIN-006",
        "type": "scheduled_task_created",
        "log_type": "system",
        "condition": lambda l, d:
            "scheduled task" in l.message.lower(),
        "risk": 90
    },

    # ================= GENERIC =================
    {
        "id": "GEN-001",
        "type": "malware_indicator",
        "log_type": None,
        "condition": lambda l, d:
            any(k in l.message.lower() for k in GENERIC_THREAT_KEYWORDS),
        "risk": 70
    },
    {
        "id": "GEN-002",
        "type": "ransomware_indicator",
        "log_type": None,
        "condition": lambda l, d:
            "ransom" in l.message.lower(),
        "risk": 95
    },
    {
        "id": "GEN-003",
        "type": "backdoor_activity",
        "log_type": None,
        "condition": lambda l, d:
            "backdoor" in l.message.lower(),
        "risk": 90
    },
]


# =====================================================
# MAIN ENTRY POINT
# =====================================================

def detect_anomalies(db: Session, log: LogEvent):
    if not should_analyze(log):
        return

    for rule in RULES:
        if rule["log_type"] and rule["log_type"] != log.log_type:
            continue

        try:
            if rule["condition"](log, db):
                create_anomaly(
                    db=db,
                    rule_id=rule["id"],
                    anomaly_type=rule["type"],
                    source=log.log_type,
                    risk_score=rule["risk"],
                    log=log,
                    signals={
                        "endpoint_id": log.endpoint_id,
                        "severity": log.severity,
                        "ip": extract_ip(log.message),
                        "message": log.message
                    }
                )
        except Exception as e:
            print(f"⚠️ Rule {rule['id']} failed → {e}")

from sqlalchemy.orm import Session
from uuid import uuid4
import json
from datetime import datetime, timezone, timedelta

from app.models.anomalies import Anomaly
from app.models.anomaly_logs import AnomalyLog
from app.models.logs import LogEvent
from app.services.xai_engine import generate_xai_explanation


# =====================================================
# CONFIGURATION (WINDOWS)
# =====================================================

BUSINESS_HOURS = range(6, 22)

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
    "wmic",
]

GENERIC_THREAT_KEYWORDS = [
    "malware", "exploit", "unauthorized",
    "bruteforce", "backdoor", "mimikatz",
    "credential dump", "lsass", "ransomware"
]


# =====================================================
# HELPER FUNCTIONS
# =====================================================
def parse_raw_data(log: LogEvent) -> dict:
    if not log.raw_data:
        return {}
    if isinstance(log.raw_data, dict):
        return log.raw_data
    try:
        return json.loads(log.raw_data)
    except Exception:
        return {}

def get_src_ip(log: LogEvent):
    data = parse_raw_data(log)
    return data.get("src_ip") or data.get("ip")


def get_dst_ip(log: LogEvent):
    data = parse_raw_data(log)
    return data.get("dst_ip")


def recent_logs(db, *, log_type=None, ip=None, minutes=5):
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    q = db.query(LogEvent).filter(LogEvent.timestamp >= since)

    if log_type:
        q = q.filter(LogEvent.log_type == log_type)

    logs = q.all()

    if ip:
        return [l for l in logs if get_src_ip(l) == ip]

    return logs



def count_recent(db, **kwargs):
    return len(recent_logs(db, **kwargs))


def anomaly_exists(db, rule_id, log_id):
    return db.query(AnomalyLog).join(Anomaly).filter(
        AnomalyLog.log_id == log_id,
        Anomaly.explanation_json.contains(rule_id)
    ).first() is not None


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
            "summary": "Suspicious activity detected by rule-based engine",
            "confidence": 0.7,

            "why_flagged": [
                {
                    "signal": k,
                    "explanation": str(v),
                    "severity": "high"
                }
                for k, v in signals.items()
            ],

            "remediation_steps": [
                {
                    "step": 1,
                    "action": "Review the affected endpoint and verify the activity",
                    "reason": "Confirm whether the detected behavior is authorized"
                },
                {
                    "step": 2,
                    "action": "Inspect related logs and network connections",
                    "reason": "Identify potential lateral movement or misuse"
                }
            ],

            "preventive_measures": [
                {
                    "control": "Network monitoring",
                    "purpose": "Detect abnormal internal traffic patterns"
                },
                {
                    "control": "Least privilege enforcement",
                    "purpose": "Reduce the impact of compromised accounts"
                }
            ],

            "evidence": [
                {
                    "type": "log",
                    "source": log.log_type,
                    "description": "Rule-based anomaly triggered"
                }
            ]
        }


    anomaly = Anomaly(
        id=anomaly_id,
        type=anomaly_type,
        status="active",
        risk_score=risk_score,
        source=source,
        created_at=datetime.now(timezone.utc),
        explanation_json=json.dumps(xai)
    )

    db.add(anomaly)
    db.add(AnomalyLog(anomaly_id=anomaly_id, log_id=log.id))
    db.commit()

    print(f"🚨 [{rule_id}] {anomaly_type} | Risk={risk_score}")



RULES = [

    # =================================================
    # IGNORE SYSTEM METRICS (VERY IMPORTANT)
    # =================================================
    {
        "id": "SYS-METRIC-IGNORE",
        "type": "ignore_system_metrics",
        "log_type": "system_metrics",
        "condition": lambda l, d: False,
        "risk": 0
    },

    # ================= AUTH RULES =================

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
        "condition": lambda l, d: count_recent(
            d, log_type="auth", ip=get_src_ip(l), minutes=2
        ) >= 5,
        "risk": 85
    },
    {
        "id": "AUTH-003",
        "type": "success_after_failure",
        "log_type": "auth",
        "condition": lambda l, d:
            "success" in l.message.lower() and
            count_recent(d, log_type="auth", ip=get_src_ip(l), minutes=5) >= 3,
        "risk": 95
    },
    {
        "id": "AUTH-004",
        "type": "login_outside_business_hours",
        "log_type": "auth",
        "condition": lambda l, d: l.timestamp.hour not in BUSINESS_HOURS,
        "risk": 70
    },

    # ================= NETWORK =================

    {
        "id": "NET-001",
        "type": "port_scan",
        "log_type": "network",
        "condition": lambda l, d: "scan" in l.message.lower(),
        "risk": 80
    },
    {
        "id": "NET-002",
        "type": "connection_flood",
        "log_type": "network",
        "condition": lambda l, d: (
            parse_raw_data(l).get("src_ip") and
            count_recent(
                d,
                log_type="network",
                ip=get_src_ip(l),
                minutes=1
            ) >= 100
        ),
        "risk": 85
    },

    {
        "id": "NET-003",
        "type": "internal_lateral_movement",
        "log_type": "network",
        "condition": lambda l, d: 
            get_src_ip(l) and get_dst_ip(l) and
            get_src_ip(l).startswith("10.") and
            get_dst_ip(l).startswith("10."),
        "risk": 85
    },


    # ================= FILE =================

    {
        "id": "FILE-WIN-001",
        "type": "executable_in_temp",
        "log_type": "file",
        "condition": lambda l, d:
            l.raw_data and "\\temp\\" in l.raw_data.lower() and
            any(l.raw_data.lower().endswith(ext) for ext in SENSITIVE_EXTENSIONS),
        "risk": 95
    },

    # ================= PROCESS =================

    # {
    #     "id": "PROC-001",
    #     "type": "suspicious_shell_process",
    #     "log_type": "process",
    #     "condition": lambda l, d:
    #         l.raw_data and any(
    #             x in l.raw_data.lower()
    #             for x in ["powershell.exe", "cmd.exe", "wscript.exe"]
    #         ),
    #     "risk": 75
    # },

    # ================= REGISTRY =================

    {
        "id": "REG-001",
        "type": "registry_run_key_persistence",
        "log_type": "registry",
        "condition": lambda l, d:
            l.raw_data and any(
                k in l.raw_data.lower()
                for k in ["\\run\\", "\\runonce\\"]
            ),
        "risk": 90
    },

    # ================= SCHEDULED TASK =================

    {
        "id": "TASK-001",
        "type": "scheduled_task_created",
        "log_type": "task",
        "condition": lambda l, d:
            l.raw_data and "create" in l.raw_data.lower(),
        "risk": 70
    },

    # ================= SERVICE =================

    {
        "id": "SERVICE-001",
        "type": "service_created_or_modified",
        "log_type": "service",
        "condition": lambda l, d:
            l.raw_data and any(
                k in l.raw_data.lower()
                for k in ["create", "config", "change"]
            ),
        "risk": 75
    },

    # ================= USB =================

    {
        "id": "USB-001",
        "type": "usb_device_connected",
        "log_type": "usb",
        "condition": lambda l, d: True,
        "risk": 20
    },

    # ================= DEFENDER =================

    {
        "id": "DEF-001",
        "type": "defender_disabled",
        "log_type": "defender",
        "condition": lambda l, d:
            "disabled" in l.message.lower() or "tamper" in l.message.lower(),
        "risk": 95
    },

    # ================= GENERIC (LAST RESORT) =================

    {
        "id": "GEN-001",
        "type": "generic_threat_indicator",
        "log_type": None,
        "condition": lambda l, d:
            any(k in l.message.lower() for k in GENERIC_THREAT_KEYWORDS),
        "risk": 65
    },
]

# =====================================================
# MAIN ENTRY POINT
# =====================================================

# def detect_anomalies(db: Session, log: LogEvent):
#     if log.log_type == "system_metrics":
#         return
    
    
#     for rule in RULES:
#         if rule["log_type"] and rule["log_type"] != log.log_type:
#             continue

#         try:
#             if rule["condition"](log, db):
#                 create_anomaly(
#                     db=db,
#                     rule_id=rule["id"],
#                     anomaly_type=rule["type"],
#                     source=log.log_type,
#                     risk_score=rule["risk"],
#                     log=log,
#                     signals={
#                         "message": log.message,
#                         "ip": log.source_ip,
#                         "user": log.user,
#                         "timestamp": log.created_at.isoformat()
#                     }
#                 )
#         except Exception as e:
#             print(f"⚠️ Rule {rule['id']} failed → {e}")

def detect_anomalies(db: Session, log: LogEvent):
    # 🚫 Metrics are not security events
    if log.log_type == "system_metrics":
        return

    # ✅ Parse raw_data safely
    try:
        raw = json.loads(log.raw_data) if log.raw_data else {}
    except Exception:
        raw = {}

    src_ip = raw.get("src_ip") or raw.get("ip")
    user = raw.get("user")

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
                        "message": log.message,
                        "ip": src_ip,
                        "user": user,
                        "log_type": log.log_type,
                        "timestamp": log.timestamp.isoformat()
                    }
                )
        except Exception as e:
            print(f"⚠️ Rule {rule['id']} failed → {e}")

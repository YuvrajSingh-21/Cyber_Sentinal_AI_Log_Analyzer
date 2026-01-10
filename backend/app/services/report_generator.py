from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from hashlib import sha256
from datetime import datetime
import os

REPORTS_DIR = "generated_reports"
os.makedirs(REPORTS_DIR, exist_ok=True)


def generate_pdf_report(report_id: str, name: str, logs: list, anomalies: list):
    file_path = os.path.join(REPORTS_DIR, f"{report_id}.pdf")

    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4
    y = height - 2 * cm

    # ---------------- HEADER ----------------
    c.setFont("Helvetica-Bold", 18)
    c.drawString(2 * cm, y, "CyberSentinel Forensic Report")
    y -= 1.2 * cm

    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, y, f"Report Name: {name}")
    y -= 0.6 * cm

    c.drawString(2 * cm, y, f"Generated At: {datetime.utcnow().isoformat()} UTC")
    y -= 1 * cm

    # ---------------- SUMMARY ----------------
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2 * cm, y, "Summary")
    y -= 0.8 * cm

    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, y, f"Total Logs: {len(logs)}")
    y -= 0.5 * cm

    c.drawString(2 * cm, y, f"Total Anomalies: {len(anomalies)}")
    y -= 1 * cm

    # ---------------- ANOMALIES ----------------
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2 * cm, y, "Detected Anomalies")
    y -= 0.8 * cm

    c.setFont("Helvetica", 9)
    for a in anomalies[:10]:
        c.drawString(
            2 * cm,
            y,
            f"[{a['severity'].upper()}] {a['title']} ({a['type']})"
        )
        y -= 0.4 * cm
        c.drawString(2.5 * cm, y, a["description"][:120])
        y -= 0.6 * cm

        if y < 3 * cm:
            c.showPage()
            y = height - 2 * cm
            c.setFont("Helvetica", 9)

    # ---------------- LOG SNAPSHOT ----------------
    c.showPage()
    y = height - 2 * cm

    c.setFont("Helvetica-Bold", 14)
    c.drawString(2 * cm, y, "Log Snapshot (Latest 20)")
    y -= 0.8 * cm

    c.setFont("Helvetica", 8)
    for log in logs[:20]:
        line = f"{log['timestamp']} | {log['log_type']} | {log['message'][:100]}"
        c.drawString(2 * cm, y, line)
        y -= 0.4 * cm

        if y < 3 * cm:
            c.showPage()
            y = height - 2 * cm
            c.setFont("Helvetica", 8)

    # ---------------- FINALIZE ----------------
    c.save()

    # SHA256 hash
    with open(file_path, "rb") as f:
        file_hash = sha256(f.read()).hexdigest()

    return file_path, file_hash

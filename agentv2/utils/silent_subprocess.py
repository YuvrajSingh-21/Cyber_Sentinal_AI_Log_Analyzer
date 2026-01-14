# utils/silent_subprocess.py
import subprocess

def run_silent(cmd):
    si = subprocess.STARTUPINFO()
    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    si.wShowWindow = 0

    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        stdin=subprocess.DEVNULL,
        startupinfo=si,
        creationflags=subprocess.CREATE_NO_WINDOW,
        text=True
    )

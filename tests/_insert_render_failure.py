from pathlib import Path
idx = Path(r"C:/Users/fallo/Documents/HermesProjects/canned-run/index.html")
ins = Path(r"C:/Users/fallo/Documents/HermesProjects/canned-run/tests/_render_failure_insert.js")
text = idx.read_text(encoding="utf-8")
block = ins.read_text(encoding="utf-8")
marker = "function runFullSelfCheck(){"
if block.strip() in text:
    print("already inserted")
elif marker not in text:
    raise SystemExit("marker missing")
else:
    text = text.replace(marker, block + marker, 1)
    idx.write_text(text, encoding="utf-8")
    print("inserted", len(block))
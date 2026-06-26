from pathlib import Path
idx = Path(r"C:/Users/fallo/Documents/HermesProjects/canned-run/index.html")
ins = Path(r"C:/Users/fallo/Documents/HermesProjects/canned-run/tests/_harness_isolation_insert.js")
text = idx.read_text(encoding="utf-8")
block = ins.read_text(encoding="utf-8")
marker = "function showCrSelfCheckOverlay(result){"
if marker not in text:
    raise SystemExit("marker missing")
text = text.replace(marker, block + "\n" + marker, 1)
idx.write_text(text, encoding="utf-8")
print("inserted", len(block))
# -*- coding: utf-8 -*-
"""Step 1 of the content pipeline: PDF -> plain text (PyMuPDF).

    pip install pymupdf
    python scripts/extract_text.py

Writes scripts/_pdf_text.txt, consumed by parse_pdf.py.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = ROOT / "99 Recipes Under 99-2.pdf"
OUT = ROOT / "scripts" / "_pdf_text.txt"

try:
    import pymupdf  # type: ignore
except ImportError:  # pragma: no cover
    print("pip install pymupdf", file=sys.stderr)
    raise

doc = pymupdf.open(PDF)
parts = []
for i, page in enumerate(doc):
    parts.append(f"\n===== PAGE {i + 1} =====\n" + page.get_text())
OUT.write_text("".join(parts), encoding="utf-8")
print(f"wrote {OUT} · {len(doc)} pages · {sum(len(p) for p in parts)} chars")

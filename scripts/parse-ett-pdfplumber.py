"""
Better ETT PDF parser using pdfplumber's table extraction.
The ETT pages have 4 columns: Код ТН ВЭД | Наименование | Доп. ед. изм. | Ставка.
"""
import sys, io, json, re
from pathlib import Path
import pdfplumber

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PDF = Path(sys.argv[1])
OUT = Path(sys.argv[2])

entries = []
parents = {}  # current parent text by indent level


def looks_like_full_code(s: str) -> bool:
    """True if string is a 10-digit code (with optional spaces)."""
    return bool(re.fullmatch(r'\d{4}\s*\d{2}\s*\d{3}\s*\d', s.strip()))


def normalize_code(s: str) -> str:
    return re.sub(r'\s+', '', s.strip())


def looks_like_subheading(s: str) -> bool:
    """True if string is 4 or 6 digits (subheading without leaf)."""
    return bool(re.fullmatch(r'\d{4}(\s*\d{2})?', s.strip()))


with pdfplumber.open(PDF) as pdf:
    for page in pdf.pages:
        # Try extracting tables. ETT pages have 4 columns
        tables = page.extract_tables({
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines",
        })
        if not tables:
            # Fallback to text
            continue
        for table in tables:
            for row in table:
                if not row or len(row) < 2:
                    continue
                code_cell = (row[0] or "").strip()
                desc_cell = (row[1] or "").strip()
                # Normalize whitespace
                desc_cell = re.sub(r'\s+', ' ', desc_cell)

                if looks_like_full_code(code_cell):
                    entries.append({
                        "code": normalize_code(code_cell),
                        "description": desc_cell,
                    })
                elif looks_like_subheading(code_cell) and desc_cell:
                    # Save as parent context — could improve later
                    pass

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')

print(f"Entries: {len(entries)}")
for e in entries[:8]:
    print(f"  {e['code']:14} | {e['description'][:80]}")
print('  ...')
for e in entries[-5:]:
    print(f"  {e['code']:14} | {e['description'][:80]}")

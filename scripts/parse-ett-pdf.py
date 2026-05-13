"""
Parse EEC ETT chapter PDFs into structured JSON.

Each entry: { code: "6203399000", description: "...", parents: [...] }

Reads text extracted by pdftotext, identifies 10-digit codes (format
"XXXX XX XXX X"), and extracts their description + hierarchical parents.
"""
import re
import json
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

INPUT_TXT = Path(sys.argv[1])
OUTPUT_JSON = Path(sys.argv[2])

text = INPUT_TXT.read_text(encoding='utf-8')

# Pattern for 10-digit codes — accept variable whitespace
# Format: 4 digits + space(s) + 2 digits + space(s) + 3 digits + space(s) + 1 digit
CODE_RE = re.compile(r'^\s*(\d{4})\s+(\d{2})\s+(\d{3})\s+(\d)\s+(.*?)(?:\s{2,}шт|\s{2,}кг|\s{2,}-|\s*$)', re.MULTILINE)

# 6-digit subheading (no trailing 1-digit leaf yet): "6203 32  – – из хлопчатобумажной пряжи:"
SUB6_RE = re.compile(r'^\s*(\d{4})\s+(\d{2})\s+(\d{3})?\s+(?!\d)(.+?)(?::|$)', re.MULTILINE)
SUB6_SHORT_RE = re.compile(r'^\s*(\d{4})\s+(\d{2})\s+(.+?):\s*$', re.MULTILINE)
# 4-digit heading
HDG_RE = re.compile(r'^\s*(\d{4})\s+(?!\d)(.+?)(?::|$)', re.MULTILINE)

# Sweep lines, tracking parent context
lines = text.split('\n')
entries = []

# Walk through lines, track hierarchy
current_4digit_desc = None
current_6digit_desc = None
current_dash1_desc = None   # text after single "–" (level 1)
current_dash2_desc = None   # text after "– –" (level 2)
current_dash3_desc = None   # text after "– – –" (level 3)


def clean(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip(' –-:.')


def extract_dashes_and_text(line: str):
    """Returns (dash_count, text) — counts leading dashes/em-dashes."""
    m = re.match(r'^\s*((?:[–\-]\s*){0,5})\s*(.+)', line)
    if not m:
        return 0, line.strip()
    dashes = m.group(1)
    dash_count = len(re.findall(r'[–\-]', dashes))
    return dash_count, m.group(2).strip()


for i, raw_line in enumerate(lines):
    line = raw_line.rstrip()
    if not line.strip():
        continue

    # Try matching 10-digit code line
    code_match = re.match(r'^\s*(\d{4})\s+(\d{2})\s+(\d{3})\s+(\d)\s+(.+?)(?:\s{2,}(?:шт|кг|см|м|тыс|пар)|\s*$)', line)
    if code_match:
        code = code_match.group(1) + code_match.group(2) + code_match.group(3) + code_match.group(4)
        leaf_desc = code_match.group(5).strip()
        # Get continuation lines (if next lines are indented continuation)
        # Often description spans multiple lines with leading dashes
        dashes, leaf_text = extract_dashes_and_text(leaf_desc)
        # Use parent context to fill in if leaf_text is too short
        parents = [p for p in [current_4digit_desc, current_6digit_desc, current_dash1_desc, current_dash2_desc, current_dash3_desc] if p]
        entries.append({
            'code': code,
            'description': clean(leaf_text),
            'parents': parents,
            'full': ' / '.join(parents + [clean(leaf_text)]),
        })
        continue

    # 6-digit subheading like "6203 32  – – из хлопчатобумажной пряжи:"
    sub6_match = re.match(r'^\s*(\d{4})\s+(\d{2})\s+(.+?)(?::|$)', line)
    if sub6_match and not re.search(r'\d{3}\s+\d', line):
        code6 = sub6_match.group(1) + sub6_match.group(2)
        desc = sub6_match.group(3).strip()
        dashes, text_part = extract_dashes_and_text(desc)
        if dashes == 0:
            # 4-digit heading like "6203  Костюмы..."  -- actually 6203 is 4-digit not 6
            pass
        current_6digit_desc = clean(text_part)
        continue

    # 4-digit heading like "6203  Костюмы мужские..."
    hdg_match = re.match(r'^\s*(\d{4})\s+(?!\d)(.+)', line)
    if hdg_match:
        current_4digit_desc = clean(hdg_match.group(2))
        current_6digit_desc = None
        current_dash1_desc = None
        current_dash2_desc = None
        current_dash3_desc = None
        continue

    # Dash-prefixed lines (level hints)
    dashes, text_part = extract_dashes_and_text(line)
    if dashes == 1 and text_part and not text_part[0].isdigit():
        current_dash1_desc = clean(text_part)
        current_dash2_desc = None
        current_dash3_desc = None
    elif dashes == 2 and text_part:
        current_dash2_desc = clean(text_part)
        current_dash3_desc = None
    elif dashes == 3 and text_part:
        current_dash3_desc = clean(text_part)

OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_JSON.write_text(
    json.dumps(entries, ensure_ascii=False, indent=2),
    encoding='utf-8',
)

# Print stats
print(f'Total leaf entries: {len(entries)}')
print(f'Output: {OUTPUT_JSON}')
print()
print('Sample entries:')
for e in entries[:5]:
    print(f"  {e['code']:14} | {e['description'][:70]}")
print('  ...')
for e in entries[-3:]:
    print(f"  {e['code']:14} | {e['description'][:70]}")

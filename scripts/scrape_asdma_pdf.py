#!/usr/bin/env python3
"""
Scrape the latest ASDMA Daily Flood Report PDF and update the React app data.

Source
------
    https://sdrf.assam.gov.in/dfr/  (Assam State Disaster Management Authority
    / SDRF — Daily Flood Report portal, backed by DRIMS)

What it does
------------
1. Walks back day-by-day from today up to N days, POSTing the DFR download
   form until it finds the newest available flood report PDF.
2. Downloads and caches it in scripts/raw/.
3. Parses the PDF (via pdfplumber) — extracts CWC river levels, per-district
   population / crop area / villages / relief camps / human lives lost /
   revenue-circle level details.
4. Writes JSON files that match the React app's data schema in src/data/.

Usage
-----
    python3 -m pip install -r scripts/requirements.txt
    python3 scripts/scrape_asdma_pdf.py               # newest available
    python3 scripts/scrape_asdma_pdf.py --date 2026-07-24
    python3 scripts/scrape_asdma_pdf.py --lookback 14 # search up to 14 days back
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Callable, Iterable

import requests

try:
    import pdfplumber
except ImportError:  # pragma: no cover
    sys.stderr.write(
        "pdfplumber is required. Install with:\n"
        "    python3 -m pip install -r scripts/requirements.txt\n"
    )
    sys.exit(1)


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
RAW_DIR = ROOT / "scripts" / "raw"
UA = (
    "FloodAssistAssam/1.0 (+public disaster-info scraper; "
    "contacts local-dev; respects robots)"
)

DFR_URL = "https://sdrf.assam.gov.in/dfr/download?type=flood"
DFR_POST = "https://sdrf.assam.gov.in/dfr/download"


# ---------------------------------------------------------------------------
# Assam district canonical list + approximate centroids for map pins.
# ---------------------------------------------------------------------------
DISTRICTS: dict[str, dict[str, float]] = {
    "Bajali": {"lat": 26.4994, "lng": 91.1792},
    "Baksa": {"lat": 26.6935, "lng": 91.5082},
    "Barpeta": {"lat": 26.3228, "lng": 91.0065},
    "Biswanath": {"lat": 26.7333, "lng": 93.15},
    "Bongaigaon": {"lat": 26.4833, "lng": 90.55},
    "Cachar": {"lat": 24.8333, "lng": 92.7789},
    "Charaideo": {"lat": 27.0333, "lng": 95.0},
    "Chirang": {"lat": 26.525, "lng": 90.5},
    "Darrang": {"lat": 26.45, "lng": 92.03},
    "Dhemaji": {"lat": 27.4855, "lng": 94.556},
    "Dhubri": {"lat": 26.0234, "lng": 89.9867},
    "Dibrugarh": {"lat": 27.4728, "lng": 94.912},
    "Dima Hasao": {"lat": 25.5, "lng": 93.0},
    "Dima-Hasao": {"lat": 25.5, "lng": 93.0},
    "Goalpara": {"lat": 26.1734, "lng": 90.6263},
    "Golaghat": {"lat": 26.5234, "lng": 93.9623},
    "Hailakandi": {"lat": 24.6848, "lng": 92.561},
    "Hojai": {"lat": 26.0, "lng": 92.8667},
    "Jorhat": {"lat": 26.7509, "lng": 94.2037},
    "Kamrup": {"lat": 26.3161, "lng": 91.5986},
    "Kamrup Metro": {"lat": 26.1445, "lng": 91.7362},
    "Karbi Anglong": {"lat": 26.0, "lng": 93.45},
    "Karimganj": {"lat": 24.8667, "lng": 92.35},
    "Kokrajhar": {"lat": 26.4015, "lng": 90.2667},
    "Lakhimpur": {"lat": 27.2364, "lng": 94.1036},
    "Majuli": {"lat": 26.95, "lng": 94.1667},
    "Morigaon": {"lat": 26.2523, "lng": 92.3423},
    "Nagaon": {"lat": 26.3509, "lng": 92.6925},
    "Nalbari": {"lat": 26.445, "lng": 91.439},
    "Sivasagar": {"lat": 26.9844, "lng": 94.6378},
    "Sibsagar": {"lat": 26.9844, "lng": 94.6378},
    "Sonitpur": {"lat": 26.634, "lng": 92.79},
    "South Salmara": {"lat": 25.85, "lng": 89.95},
    "South Salmara-Mankachar": {"lat": 25.85, "lng": 89.95},
    "Sribhumi": {"lat": 24.87, "lng": 92.36},
    "Tinsukia": {"lat": 27.4922, "lng": 95.3468},
    "Udalguri": {"lat": 26.7536, "lng": 92.102},
    "West Karbi Anglong": {"lat": 25.85, "lng": 92.65},
}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def coords_for(name: str) -> dict[str, float]:
    if name in DISTRICTS:
        return DISTRICTS[name]
    # case-insensitive fallback
    for k, v in DISTRICTS.items():
        if k.lower() == name.lower():
            return v
    return {"lat": 26.2, "lng": 92.9}


# ---------------------------------------------------------------------------
# Download the newest available PDF from the SDRF DFR portal
# ---------------------------------------------------------------------------
def request_with_retries(
    do_request: Callable[[], requests.Response],
    *,
    label: str,
    attempts: int = 5,
    base_delay: float = 8.0,
) -> requests.Response:
    """Retry transient network failures against the ASDMA portal."""
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return do_request()
        except (
            requests.exceptions.ConnectTimeout,
            requests.exceptions.ReadTimeout,
            requests.exceptions.ConnectionError,
        ) as exc:
            last_exc = exc
            if attempt >= attempts:
                break
            delay = base_delay * attempt
            print(
                f"  ⟳ {label} timed out (attempt {attempt}/{attempts}); "
                f"retrying in {delay:.0f}s…",
                flush=True,
            )
            time.sleep(delay)
    assert last_exc is not None
    raise last_exc


def fetch_pdf(target_date: dt.date, lookback: int) -> tuple[bytes, dt.date, str]:
    session = requests.Session()
    session.headers.update({"User-Agent": UA})

    print(f"→ Fetching DFR form (CSRF, session cookie)…", flush=True)
    page = request_with_retries(
        lambda: session.get(DFR_URL, timeout=60),
        label="DFR form GET",
    )
    page.raise_for_status()
    token_match = re.search(r'name="_token" value="([^"]+)"', page.text)
    if not token_match:
        raise RuntimeError("Could not extract CSRF _token from DFR page")
    token = token_match.group(1)

    tried: list[str] = []
    for i in range(lookback + 1):
        candidate = target_date - dt.timedelta(days=i)
        date_str = candidate.isoformat()
        print(f"→ Trying date {date_str} …", end=" ", flush=True)
        resp = request_with_retries(
            lambda ds=date_str, tok=token: session.post(
                DFR_POST,
                data={"_token": tok, "type": "flood", "date": ds},
                headers={"Referer": DFR_URL},
                timeout=90,
                allow_redirects=True,
            ),
            label=f"DFR POST {date_str}",
        )
        ct = resp.headers.get("Content-Type", "")
        if resp.status_code == 200 and "pdf" in ct.lower() and len(resp.content) > 1024:
            # Portal sometimes returns an older report for a newer date.
            # Peek the "as on DD-MM-YYYY" line before accepting the file.
            pdf_date = None
            try:
                import pdfplumber  # local import — already a project dependency

                probe = RAW_DIR / f"_fetch_probe_{date_str}.pdf"
                RAW_DIR.mkdir(parents=True, exist_ok=True)
                probe.write_bytes(resp.content)
                with pdfplumber.open(probe) as pdf:
                    head = "\n".join((p.extract_text() or "") for p in pdf.pages[:2])
                pdf_date = extract_report_date(head)
                probe.unlink(missing_ok=True)
            except Exception as exc:
                print(f"⚠ could not verify PDF date ({exc}); accepting download")
                print(f"✓ found ({len(resp.content):,} bytes)")
                return resp.content, candidate, date_str

            if pdf_date and pdf_date != candidate:
                tried.append(f"{date_str}(wrong-date:{pdf_date.isoformat()})")
                print(
                    f"× wrong report date inside PDF "
                    f"({pdf_date.isoformat()}, wanted {date_str})"
                )
                continue

            print(f"✓ found ({len(resp.content):,} bytes)")
            return resp.content, candidate, date_str
        tried.append(f"{date_str}({resp.status_code})")
        print(f"× {resp.status_code}")
        # 419 usually means session expired — refresh token
        if resp.status_code == 419:
            page = request_with_retries(
                lambda: session.get(DFR_URL, timeout=60),
                label="DFR form refresh",
            )
            token_match = re.search(r'name="_token" value="([^"]+)"', page.text)
            if token_match:
                token = token_match.group(1)

    raise RuntimeError(f"No flood report found within lookback. Tried: {', '.join(tried)}")


# ---------------------------------------------------------------------------
# PDF parsing — pdfplumber gives us clean per-line text that we can regex.
# ---------------------------------------------------------------------------
# Word-wrap fixes: pdfplumber can split a district cell across two lines when
# adjacent columns wrap. Two flavours:
#   A) DIGIT-GLUED: "Biswanat0 ..." (last letter cut off, next-column digit
#      immediately follows) — repair to "Biswanath 0 ..."
#   B) LETTER-CONTINUATION: "Biswanat0 ...\nCentres h\n" — the missing letter
#      appears at the start of a later line as a lone token — drop that token.
# Truncated stem immediately followed by a digit (next column).
# Longer stems first so "Charaide" wins over "Charaid".
GLUED_TRUNCATIONS = [
    ("Biswanat", "Biswanath"),
    ("Charaide", "Charaideo"),
    ("Charaid", "Charaideo"),
    ("Dibrugar", "Dibrugarh"),
    ("Dibruga", "Dibrugarh"),
    ("Kokrajha", "Kokrajhar"),
    ("Kokraj", "Kokrajhar"),
    ("Sivasaga", "Sivasagar"),
    ("Sivasa", "Sivasagar"),
    ("Hailakan", "Hailakandi"),
    ("Hailak", "Hailakandi"),
    ("Bongaigao", "Bongaigaon"),
    ("Bongaiga", "Bongaigaon"),
    ("Bongaig", "Bongaigaon"),
    ("Golagha", "Golaghat"),
    ("Karimgan", "Karimganj"),
    ("Karim", "Karimganj"),
    ("Sonitpu", "Sonitpur"),
    ("Tinsuki", "Tinsukia"),
    ("Lakhimpu", "Lakhimpur"),
    ("Goalpar", "Goalpara"),
    ("Nalbari", "Nalbari"),
]

# Truncated stem + leftover letters on the next line: "Charaid\neo" → Charaideo
SPLIT_NAME_FIXES = [
    (r"\bCharaid\s*\n\s*eo\b", "Charaideo"),
    (r"\bDibruga\s*\n\s*rh\b", "Dibrugarh"),
    (r"\bGolagha\s*\n\s*t\b", "Golaghat"),
    (r"\bBongaigao\s*\n\s*n\b", "Bongaigaon"),
    (r"\bBiswanat\s*\n\s*h\b", "Biswanath"),
    (r"\bSivasa\s*\n\s*gar\b", "Sivasagar"),
    (r"\bKokraj\s*\n\s*har\b", "Kokrajhar"),
    (r"\bHailak\s*\n\s*andi\b", "Hailakandi"),
    (r"\bKarim\s*\n\s*ganj\b", "Karimganj"),
    (r"\bSonitpu\s*\n\s*r\b", "Sonitpur"),
    (r"\bTinsuki\s*\n\s*a\b", "Tinsukia"),
]

CONTINUATION_LETTERS = ["h", "o", "har", "ganj", "gar", "andi", "aon", "eo", "rh", "t"]

WORDWRAP_FIXES = [
    # "Karbi <numbers/details>\nAnglong" — name split across the row
    (r"\bKarbi\s+(\d[\d,]*.*?)\n\s*Anglong\b", r"Karbi Anglong \1"),
    (r"Karbi\s*\n?\s*Anglong\b", "Karbi Anglong"),
    (r"Dima\s*\n?\s*Hasao\b", "Dima Hasao"),
    # "Kamrup 6 (Azara | 1), (Sonapur | 5)\n(M)" — metro marker on the next line
    (r"\bKamrup\s+(\d[\d,]*)\s+((?:\([^()\n]*\)(?:,\s*)?)+)\s*\n\s*\(M\)", r"Kamrup Metro \1 \2"),
    # Population rows: "Kamrup 0 0 0 0 0 (Sonapur…)\n(M)"
    (r"\bKamrup\s+(\d[\d,]*(?:\s+[\d,\.]+){4,}.*?)\n\s*\(M\)", r"Kamrup Metro \1"),
    (r"Kamrup\s*\n?\s*\(M\)", "Kamrup Metro"),
    (r"Kamrup\s*\(M\)", "Kamrup Metro"),
    (r"South\s*\n?\s*Salmara(?:-\s*\n?\s*Mankachar)?", "South Salmara"),
    (r"West\s*\n?\s*Karbi\s*\n?\s*Anglong", "West Karbi Anglong"),
]


def normalize_text(text: str) -> str:
    """Fix district-name word-wraps and other pdfplumber artefacts."""
    out = text
    # A) Re-join split district names before dropping orphan tails
    for pat, repl in SPLIT_NAME_FIXES:
        out = re.sub(pat, repl, out)
    # B) Repair digit-glued truncations: "Golagha18787" -> "Golaghat 18787"
    for short, full in sorted(GLUED_TRUNCATIONS, key=lambda x: len(x[0]), reverse=True):
        out = re.sub(rf"\b{short}(?=\d)", f"{full} ", out)
    # C) Truncated stem + space + digits (continuation letters landed elsewhere):
    #    "Area Charaid 71578" -> "Area Charaideo 71578"
    for short, full in sorted(GLUED_TRUNCATIONS, key=lambda x: len(x[0]), reverse=True):
        if short == full:
            continue
        out = re.sub(rf"\b{short}\s+(?=\d)", f"{full} ", out)
    # D) Drop leftover continuation tokens that were not re-joined
    for tail in CONTINUATION_LETTERS:
        out = re.sub(rf"(?<=[A-Za-z0-9\)])\s+{tail}\s*(?=\n)", "", out)
    # E) Multi-line district-name fixes
    for pat, repl in WORDWRAP_FIXES:
        out = re.sub(pat, repl, out)
    return out


DISTRICT_NAMES_RE = "|".join(
    sorted({re.escape(k) for k in DISTRICTS}, key=len, reverse=True)
)

# Population line: District Male Female Children Total Crop
# Optional header-fragment prefixes ("And Crop"/"Area"/"Submerged") leak when
# pdfplumber wraps the section title onto the first district row.
POP_LINE_RE = re.compile(
    rf"^\s*(?:And\s+Crop|Crop\s+Area|Crop|Area|Submerged|Submerge|d|ed)?\s*"
    rf"({DISTRICT_NAMES_RE})\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+([\d,\.]+)"
)
# Circle-level detail inside Population section
CIRCLE_DETAIL_RE = re.compile(
    r"\(([^|()]+?)\s*\|\s*Population Affected:\s*([\d,\.]+)\s*\|\s*Crop Area Submerged:\s*([\d,\.]+)\)",
    re.IGNORECASE,
)
# Relief camp line
# Relief Camps section: District | Total | ReliefCamp count | (details) | RDC count | (details)
# Capture Total (grp 2), Relief-Camp count (grp 3), and RDC count if present.
CAMP_LINE_RE = re.compile(
    rf"^\s*(?:Relief\s+|/?\s*Centres\s+|Camps\s*/\s*Centres\s+Opened\s*|Centres\s+Opened\s*|Opened\s*|Camps\s*/\s*)?"
    rf"({DISTRICT_NAMES_RE})\s+(\d[\d,]*)\s+(\d[\d,]*)\b"
)
# Human lives lost — Total is the 3rd column after District, first is a "date"
# but format is: District Total FloodDeath General Male Female Children Others ...
HLL_LINE_RE = re.compile(
    rf"^\s*({DISTRICT_NAMES_RE})\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)"
)


def to_int(v: str) -> int:
    try:
        return int(v.replace(",", ""))
    except Exception:
        return 0


def to_float(v: str) -> float:
    try:
        return float(v.replace(",", ""))
    except Exception:
        return 0.0


def extract_report_date(text: str) -> dt.date | None:
    m = re.search(r"Assam Flood Report as on\s+(\d{1,2})-(\d{1,2})-(\d{4})", text)
    if not m:
        return None
    d, mo, y = (int(x) for x in m.groups())
    try:
        return dt.date(y, mo, d)
    except ValueError:
        return None


def slice_section(text: str, start_pattern: str, next_patterns: Iterable[str]) -> str:
    """Return the block of text from a section header until the next section header.
    Patterns are regex (whitespace-tolerant so section labels wrapped across
    lines still match).
    """
    m = re.search(start_pattern, text)
    if not m:
        return ""
    start = m.start()
    end = len(text)
    for np in next_patterns:
        nm = re.search(np, text[m.end():])
        if nm:
            end = min(end, m.end() + nm.start())
    return text[start:end]


SECTION_ORDER = [
    "Rivers\nflowing",
    "District\nAffected",
    "No. Of\nRevenue",
    "Name Of",
    "Villages",
    "Population",
    "Relief Camps",
    "Inmates In",
    "Non Camp",
    "Human Lives Lost",
    "Human Lives Missing",
    "Animals\nAffected",
    "Animals\nWashed Away",
    "Houses\nDamaged",
    "Rescue",
    "Relief\nDistributed",
    "Baby Food",
    "Infrastructure",
    "Embankment",
    "Wildlife",
    "Remarks",
]


def parse_pdf(pdf_path: Path) -> dict[str, Any]:
    with pdfplumber.open(pdf_path) as pdf:
        pages_text = [p.extract_text() or "" for p in pdf.pages]
    full = normalize_text("\n".join(pages_text))

    result: dict[str, Any] = {
        "reportDate": None,
        "rivers": {"danger": [], "flood": []},
        "affectedDistricts": [],
        "population": {},
        "reliefCamps": {},
        "hll": {},
        "camps": {},
    }
    result["reportDate"] = extract_report_date(full)

    # --- Rivers section ---
    # In some PDFs the danger-level list appears BEFORE the label; grab both
    # patterns by locating each label independently.
    danger = re.search(
        r"([^\n]{2,400})\s*Rivers flowing above danger level|"
        r"Rivers flowing above danger level\s*([^\n]{2,400})",
        full,
    )
    flood = re.search(
        r"Rivers flowing above highest flood level\s*([^\n]{1,400})",
        full,
    )

    def clean_rivers(raw: str | None) -> list[str]:
        if not raw:
            return []
        raw = raw.strip()
        if raw.lower().startswith("nil") or not raw:
            return []
        # Strip label-fragment prefixes that sometimes leak from adjacent cells
        raw = re.sub(
            r"^(?:flowing|above|Danger|Level|Rivers|CWC|bulletin|issued|AM|Nil|[\s\-])+",
            "",
            raw,
            flags=re.IGNORECASE,
        ).strip()
        parts = [
            re.sub(r"\s+", " ", r).strip()
            for r in raw.split(",")
        ]
        return [
            p for p in parts
            if p and p.lower() != "nil" and len(p) <= 80
            and re.search(r"[A-Za-z]{3,}", p)  # must contain a real word
        ]

    if danger:
        result["rivers"]["danger"] = clean_rivers(danger.group(1) or danger.group(2))
    if flood:
        result["rivers"]["flood"] = clean_rivers(flood.group(1))
    # Rivers can span multiple lines — also look for continuation lines with
    # station patterns like `Xyz (Location)` immediately after the label.
    danger_block = slice_section(
        full,
        r"Rivers flowing above danger level",
        [r"Rivers flowing above highest flood level", r"District\s+No\. of"],
    )
    extra = re.findall(r"[A-Z][A-Za-z]+\s*\([^)]+\)", danger_block)
    if extra and not result["rivers"]["danger"]:
        result["rivers"]["danger"] = extra
    elif extra:
        # merge unique
        seen = set(result["rivers"]["danger"])
        for r in extra:
            if r not in seen:
                result["rivers"]["danger"].append(r)
                seen.add(r)

    # --- Affected districts list ---
    # Formats:
    #   "Name of Affected Districts\n12 Golaghat, Charaideo, …"
    #   "Name of Affected Districts\nAffected 5 Golaghat, Sivasagar, …"
    #   "Name of Affected Districts\nAffected Districts\nAffected\n4 Sivasagar, …"
    ad_match = re.search(
        r"Name of Affected Districts.{0,200}?\n\s*(?:Affected\s+)?"
        r"(\d+)\s+([A-Z][A-Za-z][^\n]*?(?:,\s*[A-Z][A-Za-z][^\n]*)+)",
        full,
        re.DOTALL,
    )
    if not ad_match:
        # Single-district day (no commas)
        ad_match = re.search(
            r"Name of Affected Districts.{0,200}?\n\s*(?:Affected\s+)?"
            r"(\d+)\s+([A-Z][A-Za-z][A-Za-z \-]{2,40})\s*$",
            full,
            re.DOTALL | re.MULTILINE,
        )
    if ad_match:
        result["_affectedDistrictCount"] = to_int(ad_match.group(1))
        raw = ad_match.group(2)
        m2 = re.search(
            r"Name of Affected Districts.{0,200}?\n\s*(?:Affected\s+)?"
            r"\d+\s+[^\n]+\n\s*([A-Z][A-Za-z][A-Za-z ,\-]+)",
            full,
            re.DOTALL,
        )
        if m2 and "," in m2.group(1):
            raw += " " + m2.group(1)
        known = {n.lower(): n for n in DISTRICTS}
        names: list[str] = []
        for part in raw.split(","):
            token = re.sub(r"\s+", " ", part).strip(" .")
            if not token or "|" in token or len(token) > 40:
                continue
            hit = known.get(token.lower())
            if not hit:
                for canon, orig in known.items():
                    if token.lower().startswith(canon) or canon.startswith(token.lower()):
                        hit = orig
                        break
            if hit and hit not in names:
                names.append(hit)
        result["affectedDistricts"] = names

    # --- Population & Crop Area section ---
    # Headers vary by PDF export: "Population District Male…" vs wrapped
    # "And Crop Area Submerged" fragments; camps header is usually
    # "Relief Camps District Total Relief Camp…".
    pop_end = [
        r"Relief\s+Camps\s*/?\s*Centres\s+Opened",
        r"Relief\s+Camps\s+District\s+Total",
        r"Relief\s+District\s+Total\s+Relief\s+Camp",
        r"Inmates\s+In\s+Relief",
        r"Inmates\s+In\b",
        r"Inmates\s+District\s+Total",
    ]
    pop_block = slice_section(
        full,
        r"Populat(?:io(?:n)?)?\s+District\s+Male|Population\s+Total\s+Crop|Population\s+and\s+Crop",
        pop_end,
    )
    if not pop_block:
        # fallback: wrapped headers ("Population Total Crop Area…")
        pop_block = slice_section(
            full,
            r"Populat(?:io(?:n)?)?\s+District\s+Male|Population\s+Total\s+Crop|And Crop\s+Area|Population\s+and\s+Crop|Population\s+District",
            pop_end,
        )
    # Iterate line-by-line so we grab per-district totals AND collect circle details
    pop_data: dict[str, dict[str, Any]] = {}
    current_district: str | None = None
    detail_buffer: list[str] = []

    def flush_detail(district: str | None, buf: list[str]) -> None:
        if not district or district not in pop_data:
            return
        buf_text = " ".join(buf)
        circles = []
        for m in CIRCLE_DETAIL_RE.finditer(buf_text):
            circles.append(
                {
                    "circle": m.group(1).strip(),
                    "population": to_int(m.group(2)),
                    "cropArea": to_float(m.group(3)),
                }
            )
        pop_data[district]["circles"] = circles

    for raw_line in pop_block.splitlines():
        line = raw_line.strip()
        m = POP_LINE_RE.match(raw_line)
        if m:
            flush_detail(current_district, detail_buffer)
            current_district = m.group(1)
            next_row = {
                "male": to_int(m.group(2)),
                "female": to_int(m.group(3)),
                "children": to_int(m.group(4)),
                "population": to_int(m.group(5)),
                "cropArea": to_float(m.group(6)),
                "circles": [],
            }
            # Later PDF sections reuse "District N N N…" shapes (HLL, animals,
            # infrastructure). Never let a zero row wipe a real population total.
            prev = pop_data.get(current_district)
            if prev and prev.get("population", 0) > 0 and next_row["population"] == 0:
                current_district = None
                detail_buffer = []
                continue
            pop_data[current_district] = next_row
            detail_buffer = [line]
        elif current_district and line and not line.startswith("Total"):
            detail_buffer.append(line)
        elif line.startswith("Total"):
            flush_detail(current_district, detail_buffer)
            current_district = None
            detail_buffer = []
    flush_detail(current_district, detail_buffer)
    result["population"] = pop_data

    # --- Relief Camps opened section ---
    camps_block = slice_section(
        full,
        r"District\s+Total\s+Relief\s+Camp|Relief\s+Camps\s+District\s+Total|Relief\s+District\s+Total\s+Relief\s+Camp|Relief\s+Camps\s*/\s*Centres\s+Opened",
        [
            r"Inmates\s+In\b",
            r"Inmates\s+District\s+Total",
            r"Non\s*Camp\b",
            r"Human\s+Lives",
            r"Animals\s+District",
            r"Animals\s+Affected",
        ],
    )
    camps_data: dict[str, dict[str, int]] = {}
    for raw_line in camps_block.splitlines():
        m = CAMP_LINE_RE.match(raw_line)
        if not m:
            continue
        d = m.group(1)
        total = to_int(m.group(2))
        rc = to_int(m.group(3))
        prev = camps_data.get(d, {"total": 0, "rc": 0})
        camps_data[d] = {
            "total": max(prev["total"], total),
            "rc": max(prev["rc"], rc),
        }
    # Store both — "reliefCamps" is Relief Camp column proper; "campsAndCentres" total.
    result["reliefCamps"] = {k: v["rc"] for k, v in camps_data.items()}
    result["campsAndCentres"] = {k: v["total"] for k, v in camps_data.items()}

    # --- Inmates in Relief Camps (state-level totals per district) ---
    # The "Non Camp Inmates" section that follows uses a different column
    # order — we terminate BEFORE reaching it to keep numbers clean.
    inmates_block = slice_section(
        full,
        r"Inmates\s+In\b|Inmates\s+District\s+Total|Inmates\s+In\s+Relief",
        [
            r"Non\s*Camp\b",
            r"Human\s+Lives",
            r"Animals\s+District",
            r"Animals\s+Affected",
            r"Animals\s+Washed",
            r"Houses\s+Damaged",
        ],
    )
    inmates_data: dict[str, int] = {}
    inmate_lines = inmates_block.splitlines()
    for idx, raw_line in enumerate(inmate_lines):
        line = raw_line.strip()
        if re.match(r"^Total\b", line):
            m_tot = re.match(r"^Total\s+(\d[\d,]*)\b", line)
            if m_tot:
                result["_inmatesTotal"] = to_int(m_tot.group(1))
            elif idx + 1 < len(inmate_lines):
                # "Total" alone, numbers on the next line
                m_next = re.match(r"^(\d[\d,]*)\b", inmate_lines[idx + 1].strip())
                if m_next:
                    result["_inmatesTotal"] = to_int(m_next.group(1))
            break
        m = re.match(rf"^\s*({DISTRICT_NAMES_RE})\s+(\d[\d,]*)\b", raw_line)
        if m:
            inmates_data[m.group(1)] = max(
                inmates_data.get(m.group(1), 0), to_int(m.group(2))
            )
    result["camps"] = inmates_data
    # If district rows sum cleanly, prefer that; statewide Total is a fallback
    # used later when building stats if district sum is zero but Total exists.

    # --- Human Lives Lost ---
    hll_block = slice_section(
        full,
        r"Human\s+Lives\s+Lost",
        [
            r"Human\s+Lives\s+Missing",
            r"Animals\s+Affected",
            r"Animals\s+Washed",
            r"Animals\s+District",
        ],
    )
    hll_data: dict[str, int] = {}
    for raw_line in hll_block.splitlines():
        m = HLL_LINE_RE.match(raw_line)
        if m:
            hll_data[m.group(1)] = to_int(m.group(2))
    result["hll"] = hll_data

    # --- Villages Affected ---
    # Population header often wraps to "Populatio District…" in pdfplumber text.
    villages_block = slice_section(
        full,
        r"Villages\s+District\s+Total|Villages\s+Affected",
        [
            r"Populat(?:io(?:n)?)?\s+District",
            r"Population\s+District",
            r"Population\s+and\s+Crop",
            r"And\s+Crop",
            r"Population\s+And\s+Crop",
            r"Relief\s+Camps\s+District",
            r"Relief\s+District",
        ],
    )
    villages_data: dict[str, int] = {}
    for raw_line in villages_block.splitlines():
        line = raw_line.strip()
        # Statewide total ends the villages table — stop before population rows.
        if re.match(r"^Total\s+\d+", line):
            break
        # Optional "Affected" title fragment glued onto the first district row.
        m = re.match(
            rf"^\s*(?:Affected\s+)?({DISTRICT_NAMES_RE})\s+(\d[\d,]*)\b",
            raw_line,
        )
        if not m:
            continue
        count = to_int(m.group(2))
        # Guard: Assam districts never have tens of thousands of villages; those
        # figures are leaked population columns when section slicing fails.
        if count > 5_000:
            continue
        prev = villages_data.get(m.group(1))
        if prev is not None and prev > 0 and count == 0:
            continue
        villages_data[m.group(1)] = count
    result["villages"] = villages_data

    return result


# ---------------------------------------------------------------------------
# Transform → React app schemas
# ---------------------------------------------------------------------------
def severity_for(population: int, camps: int, is_affected: bool) -> str:
    if population >= 10_000 or camps >= 5:
        return "severe"
    if population >= 1_000 or camps >= 1:
        return "moderate"
    if population > 0 or is_affected:
        return "waterlogging"
    return "normal"


def flood_status_for(severity: str) -> str:
    return {
        "severe": "flooded",
        "moderate": "waterlogging",
        "waterlogging": "waterlogging",
        "normal": "safe",
    }[severity]


def rivers_for_district(rivers: dict[str, list[str]], district: str) -> str | None:
    """Return CWC river names that mention this district (or station in it).

    Official ASDMA/CWC lines look like ``Dikhou (Sivasagar)``. We only attach a
    river when the parenthetical or name clearly matches the district — never
    invent a default river for every district.
    """
    matched: list[str] = []
    d_key = district.lower().replace(" ", "")
    aliases = {
        "kamrupmetro": "kamrupmetropolitan",
        "sribhumi": "karimganj",
        "southsalmaramankachar": "southsalmara",
    }
    d_keys = {d_key, aliases.get(d_key, d_key)}

    for raw in rivers.get("flood", []) + rivers.get("danger", []):
        m = re.search(r"\(([^)]+)\)", raw)
        loc_raw = (m.group(1) if m else "").strip()
        loc = loc_raw.lower().replace(" ", "")
        # Ignore single-letter station suffixes like "(S)"
        if len(loc) < 4:
            loc = ""
        name = raw.split("(")[0].strip()
        river_key = re.sub(r"[^a-z]", "", raw.lower())

        if loc and any(k and (k in loc or loc in k) for k in d_keys if len(k) >= 4):
            if name and name not in matched:
                matched.append(name)
        # Station / district name equality (e.g. SRIBHUMI)
        elif any(k and len(k) >= 6 and k in river_key for k in d_keys):
            if name and name not in matched:
                matched.append(name)

    return ", ".join(matched) if matched else None


def build_datasets(parsed: dict[str, Any], report_date: dt.date, pdf_url: str) -> dict[str, Any]:
    last_updated = dt.datetime.combine(report_date, dt.time(8, 0)).isoformat() + "Z"
    scraped_at = dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"

    affected_names = set(parsed["affectedDistricts"])
    all_names = set(parsed["population"].keys()) | affected_names | set(parsed["reliefCamps"].keys())

    districts_out: list[dict[str, Any]] = []
    flood_reports_out: list[dict[str, Any]] = []
    relief_camps_out: list[dict[str, Any]] = []

    for name in sorted(all_names):
        pop = parsed["population"].get(name, {})
        population = int(pop.get("population", 0))
        camps = int(parsed["reliefCamps"].get(name, 0))
        inmates = int(parsed["camps"].get(name, 0))
        crop_area = float(pop.get("cropArea", 0.0))
        villages = int(parsed["villages"].get(name, 0))
        circles = pop.get("circles", []) or []
        is_affected = name in affected_names
        sev = severity_for(population, camps, is_affected)

        # Human lives lost from this month/day
        hll = int(parsed["hll"].get(name, 0))

        d_slug = slugify(name)
        coords = coords_for(name)

        river_names = rivers_for_district(parsed["rivers"], name)

        districts_out.append(
            {
                "id": d_slug,
                "name": name,
                # Impact level derived from ASDMA population/camp counts (not an official severity code)
                "severity": sev,
                "affectedVillages": villages or len([c for c in circles if c["population"] > 0]),
                "river": river_names,
                "populationAffected": population,
                "reliefCamps": camps,
                "campInmates": inmates,
                "cropAreaHa": crop_area,
                "humanLivesLost": hll,
                "lastUpdated": last_updated,
                "coordinates": coords,
                "coordinatesNote": "Approximate district headquarters location",
                "source": "ASDMA Daily Flood Report (SDRF/DFR)",
            }
        )

        # Skip unaffected districts from map reports
        if sev == "normal" and population == 0 and camps == 0:
            continue

        status = flood_status_for(sev)

        # One map pin per district at HQ coords — never invent jittered circle pins.
        # Circle-level ASDMA numbers stay in the description when available.
        circle_bits = []
        for c in circles:
            if c["population"] <= 0 and c["cropArea"] <= 0:
                continue
            bit = f"{c['circle']}: {c['population']:,} people"
            if c["cropArea"] > 0:
                bit += f", {c['cropArea']:g} ha crop"
            circle_bits.append(bit)

        description = (
            f"ASDMA report {report_date.strftime('%d %b %Y')}: "
            f"{population:,} people affected, {villages} villages, {camps} relief camps."
        )
        if circle_bits:
            description += " Revenue circles — " + "; ".join(circle_bits) + "."

        flood_reports_out.append(
            {
                "id": f"asdma-{d_slug}",
                "district": name,
                "districtId": d_slug,
                "location": f"{name} district",
                "status": status,
                "description": description,
                "lastUpdated": last_updated,
                "coordinates": coords,
                "coordinatesNote": "Approximate district headquarters location",
                "source": "ASDMA Daily Flood Report",
            }
        )

        # District-level camp totals only — individual camp addresses are not in the state PDF
        if camps > 0:
            relief_camps_out.append(
                {
                    "id": f"asdma-camp-{d_slug}",
                    "name": f"{name} — district relief camps (total)",
                    "district": name,
                    "districtId": d_slug,
                    "campCount": camps,
                    "summary": (
                        f"{camps} relief camp(s) reported open in {name} district "
                        f"with {inmates:,} inmates (ASDMA {report_date.strftime('%d %b %Y')}). "
                        f"Individual camp addresses are published by the District Administration — "
                        f"call District Control Room (1077)."
                    ),
                    "campInmates": inmates,
                    "phone": "1077",
                    "coordinates": coords,
                    "coordinatesNote": "Approximate district headquarters location",
                    "source": "ASDMA Daily Flood Report",
                }
            )

    total_pop = sum(d["populationAffected"] for d in districts_out)
    total_camps = sum(d["reliefCamps"] for d in districts_out)
    total_inmates = sum(d["campInmates"] for d in districts_out)
    if total_inmates == 0 and parsed.get("_inmatesTotal"):
        total_inmates = int(parsed["_inmatesTotal"])
    flooded_count = sum(1 for d in districts_out if d["severity"] != "normal")
    # Prefer official affected-district count from the PDF header when present.
    if parsed.get("_affectedDistrictCount"):
        flooded_count = int(parsed["_affectedDistrictCount"])
    elif parsed.get("affectedDistricts"):
        flooded_count = len(parsed["affectedDistricts"])

    stats = {
        "floodedDistricts": flooded_count,
        "reliefCamps": total_camps,
        "lastUpdated": last_updated,
        "peopleAffected": total_pop,
        "campInmates": total_inmates,
        "activeAlerts": len(parsed["rivers"]["danger"]) + len(parsed["rivers"]["flood"]),
        "riverWarnings": len(parsed["rivers"]["danger"]) + len(parsed["rivers"]["flood"]),
        "source": "ASDMA Daily Flood Report (SDRF/DFR)",
        "period": report_date.isoformat(),
        "reportDate": report_date.isoformat(),
    }

    # River / impact alerts from ASDMA+CWC only (no fabricated IMD forecasts)
    weather = [
        {
            "id": "asdma-cwc-danger",
            "type": "river-level",
            "title": "Rivers Above Danger Level",
            "level": "red" if parsed["rivers"]["danger"] else "green",
            "value": (
                f"{len(parsed['rivers']['danger'])} rivers"
                if parsed["rivers"]["danger"]
                else "None"
            ),
            "unit": "CWC bulletin · 8 AM (via ASDMA)",
            "description": (
                ", ".join(parsed["rivers"]["danger"])
                if parsed["rivers"]["danger"]
                else "No rivers flowing above danger level as per today's CWC bulletin."
            ),
            "validUntil": last_updated,
            "source": "CWC via ASDMA Daily Flood Report",
        },
        {
            "id": "asdma-cwc-flood",
            "type": "river-level",
            "title": "Rivers Above Highest Flood Level",
            "level": "red" if parsed["rivers"]["flood"] else "green",
            "value": (
                f"{len(parsed['rivers']['flood'])} rivers"
                if parsed["rivers"]["flood"]
                else "None"
            ),
            "unit": "CWC bulletin · 8 AM (via ASDMA)",
            "description": (
                ", ".join(parsed["rivers"]["flood"])
                if parsed["rivers"]["flood"]
                else "No rivers flowing above highest flood level today."
            ),
            "validUntil": last_updated,
            "source": "CWC via ASDMA Daily Flood Report",
        },
        {
            "id": "asdma-impact",
            "type": "impact",
            "title": "Flood Impact Snapshot",
            "level": "orange" if flooded_count >= 5 else "warning",
            "value": f"{flooded_count} districts",
            "unit": f"{total_pop:,} people affected",
            "description": (
                f"ASDMA report as on {report_date.strftime('%d %b %Y')}: "
                f"{total_camps} relief camps housing {total_inmates:,} inmates."
            ),
            "validUntil": last_updated,
            "source": "ASDMA Daily Flood Report",
        },
    ]

    updates = [
        {
            "id": f"asdma-{report_date.isoformat()}",
            "title": f"ASDMA Daily Flood Report — {report_date.strftime('%d %b %Y')}",
            "date": last_updated,
            "source": "ASDMA / SDRF",
            "summary": (
                f"{flooded_count} districts affected. "
                f"{total_pop:,} people affected across "
                f"{sum(d['affectedVillages'] for d in districts_out)} villages. "
                f"{total_camps} relief camps with {total_inmates:,} inmates. "
                + (
                    "Rivers above danger level: "
                    + ", ".join(parsed["rivers"]["danger"]) + ". "
                    if parsed["rivers"]["danger"]
                    else ""
                )
                + f"Source: {pdf_url}"
            ),
        },
    ]
    if parsed["rivers"]["danger"]:
        updates.append(
            {
                "id": f"cwc-danger-{report_date.isoformat()}",
                "title": "CWC: rivers flowing above danger level",
                "date": last_updated,
                "source": "CWC via ASDMA",
                "summary": ", ".join(parsed["rivers"]["danger"]),
            }
        )

    meta = {
        "scrapedAt": scraped_at,
        "period": report_date.isoformat(),
        "reportDate": report_date.isoformat(),
        "floodDataOrigin": "asdma-daily-pdf",
        "pdfUrl": pdf_url,
        "sources": [
            {
                "name": "ASDMA / SDRF Daily Flood Report",
                "url": "https://sdrf.assam.gov.in/dfr/",
                "notes": "Official Daily Flood Report portal (DRIMS-backed).",
            },
            {
                "name": "ASDMA website",
                "url": "https://asdma.assam.gov.in",
                "notes": "Toll-free numbers, safety tips and disaster info.",
            },
        ],
        "counts": {
            "districts": len(districts_out),
            "floodReports": len(flood_reports_out),
            "reliefCamps": len(relief_camps_out),
            "updates": len(updates),
        },
    }

    return {
        "districts": districts_out,
        "floodReports": flood_reports_out,
        "reliefCamps": relief_camps_out,
        "stats": stats,
        "weather": weather,
        "updates": updates,
        "meta": meta,
    }


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  ✓ Wrote {path.relative_to(ROOT)}")


def update_sitemap_lastmod(report_date: dt.date) -> None:
    """Bump <lastmod> in public/sitemap.xml so Search Console sees fresh dates."""
    sitemap = ROOT / "public" / "sitemap.xml"
    if not sitemap.exists():
        return
    iso = report_date.isoformat()
    text = sitemap.read_text(encoding="utf-8")
    updated = re.sub(r"<lastmod>\d{4}-\d{2}-\d{2}</lastmod>", f"<lastmod>{iso}</lastmod>", text)
    if updated != text:
        sitemap.write_text(updated, encoding="utf-8")
        print(f"  ✓ Updated sitemap lastmod → {iso}")


def build_history_entry(data: dict[str, Any], parsed: dict[str, Any], report_date: dt.date) -> dict[str, Any]:
    """Compact snapshot used for trends, comparison and timeline."""
    top = sorted(
        data["districts"],
        key=lambda d: d.get("populationAffected", 0),
        reverse=True,
    )[:10]
    return {
        "date": report_date.isoformat(),
        "scrapedAt": data["meta"]["scrapedAt"],
        "stats": {
            "peopleAffected": data["stats"]["peopleAffected"],
            "floodedDistricts": data["stats"]["floodedDistricts"],
            "reliefCamps": data["stats"]["reliefCamps"],
            "campInmates": data["stats"].get("campInmates", 0),
            "riverWarnings": data["stats"].get("activeAlerts", 0),
            "activeAlerts": data["stats"].get("activeAlerts", 0),
        },
        "rivers": {
            "danger": parsed.get("rivers", {}).get("danger", []),
            "flood": parsed.get("rivers", {}).get("flood", []),
        },
        "topDistricts": [
            {
                "id": d["id"],
                "name": d["name"],
                "populationAffected": d["populationAffected"],
                "severity": d["severity"],
                "reliefCamps": d.get("reliefCamps", 0),
                "affectedVillages": d.get("affectedVillages", 0),
                "campInmates": d.get("campInmates", 0),
                "humanLivesLost": d.get("humanLivesLost", 0),
            }
            for d in top
        ],
        "districts": data["districts"],
        "summary": {
            "affectedNames": parsed.get("affectedDistricts", []),
        },
    }


def upsert_history(entry: dict[str, Any]) -> None:
    history_path = DATA_DIR / "history.json"
    if history_path.exists():
        try:
            history = json.loads(history_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = {"reports": []}
    else:
        history = {"reports": []}

    reports = [r for r in history.get("reports", []) if r.get("date") != entry["date"]]
    reports.append(entry)
    reports.sort(key=lambda r: r.get("date", ""), reverse=True)
    history = {
        "reports": reports,
        "updatedAt": dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
    write_json(history_path, history)


def process_one_day(
    target: dt.date,
    lookback: int,
    *,
    archive_only: bool,
    keep_existing_camps: bool,
) -> dt.date:
    pdf_bytes, requested_date, date_str = fetch_pdf(target, lookback)

    parsed_probe_path = RAW_DIR / f"_probe_{date_str}.pdf"
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    parsed_probe_path.write_bytes(pdf_bytes)

    parsed = parse_pdf(parsed_probe_path)
    report_date = parsed.get("reportDate") or requested_date

    # ASDMA sometimes returns an older PDF for a newer date request.
    # Never publish under the wrong day — rename/save using the PDF's own date.
    if report_date != requested_date:
        parsed_probe_path.unlink(missing_ok=True)
        raise RuntimeError(
            f"ASDMA returned report dated {report_date.isoformat()} when "
            f"{requested_date.isoformat()} was requested. "
            "Live JSON left unchanged — that day's PDF is not published yet "
            "(or the portal served the wrong file)."
        )

    pdf_path = RAW_DIR / f"asdma_flood_{report_date.isoformat()}.pdf"
    pdf_path.write_bytes(pdf_bytes)
    parsed_probe_path.unlink(missing_ok=True)
    print(f"  ✓ Saved PDF → {pdf_path.relative_to(ROOT)}")

    people_parsed = sum(d["population"] for d in parsed["population"].values())
    camps_parsed = sum(parsed["reliefCamps"].values())
    affected_n = len(parsed["affectedDistricts"])

    print(
        f"\nParsed report {report_date.isoformat()}: "
        f"{affected_n} affected districts, "
        f"{people_parsed:,} people, "
        f"{camps_parsed} relief camps, "
        f"{len(parsed['rivers']['danger'])} rivers > danger."
    )

    # Refuse to overwrite live/history with a clearly broken parse (PDF layout change).
    # A real ASDMA daily report always names affected districts or has population/camp rows.
    if affected_n == 0 and people_parsed == 0 and camps_parsed == 0 and not parsed["population"]:
        raise RuntimeError(
            f"Parse produced empty flood figures for {report_date.isoformat()}. "
            "Live JSON left unchanged — check PDF layout / scraper regexes."
        )

    pdf_url = "https://sdrf.assam.gov.in/dfr/"
    data = build_datasets(parsed, report_date, pdf_url)

    if not data["districts"]:
        raise RuntimeError(
            f"No district rows built for {report_date.isoformat()}. "
            "Live JSON left unchanged."
        )

    upsert_history(build_history_entry(data, parsed, report_date))

    if not archive_only:
        write_json(DATA_DIR / "districts.json", data["districts"])
        write_json(DATA_DIR / "floodReports.json", data["floodReports"])
        if data["reliefCamps"] and not keep_existing_camps:
            write_json(DATA_DIR / "reliefCamps.json", data["reliefCamps"])
        write_json(DATA_DIR / "stats.json", data["stats"])
        write_json(DATA_DIR / "weather.json", data["weather"])
        write_json(DATA_DIR / "updates.json", data["updates"])
        write_json(DATA_DIR / "meta.json", data["meta"])
        update_sitemap_lastmod(report_date)
        print(
            f"\n✓ Live dashboard updated from ASDMA report dated "
            f"{report_date.strftime('%d %b %Y')}."
        )
    else:
        print(f"\n✓ Archived {report_date.isoformat()} into history (live files unchanged).")

    return report_date


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", help="Target date YYYY-MM-DD (defaults to today, will walk backwards).")
    parser.add_argument("--lookback", type=int, default=7, help="Days to walk back (default 7).")
    parser.add_argument("--keep-existing-camps", action="store_true",
                        help="Keep existing reliefCamps.json instead of overwriting with district-aggregate.")
    parser.add_argument(
        "--archive-only",
        action="store_true",
        help="Only append to history.json — do not overwrite live dashboard JSON.",
    )
    parser.add_argument(
        "--seed-history",
        type=int,
        metavar="N",
        help="Also archive up to N previous report days into history for trends.",
    )
    args = parser.parse_args()

    target = dt.date.fromisoformat(args.date) if args.date else dt.date.today()

    print(f"FloodAssist Assam — ASDMA daily PDF scraper")
    print(f"Target: {target.isoformat()}, lookback: {args.lookback} day(s)")

    latest = process_one_day(
        target,
        args.lookback,
        archive_only=args.archive_only,
        keep_existing_camps=args.keep_existing_camps,
    )

    if args.seed_history and args.seed_history > 0:
        print(f"\n→ Seeding up to {args.seed_history} earlier report day(s)…")
        cursor = latest - dt.timedelta(days=1)
        collected = 0
        attempts = 0
        while collected < args.seed_history and attempts < args.seed_history * 3:
            attempts += 1
            try:
                found = process_one_day(
                    cursor,
                    lookback=2,
                    archive_only=True,
                    keep_existing_camps=True,
                )
                collected += 1
                cursor = found - dt.timedelta(days=1)
            except Exception as err:
                print(f"  ⚠ {cursor.isoformat()}: {err}")
                cursor = cursor - dt.timedelta(days=1)

    return 0


if __name__ == "__main__":
    sys.exit(main())

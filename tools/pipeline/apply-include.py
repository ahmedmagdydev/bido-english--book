"""Apply arabic-book/pages-include.xlsx to reviewed-page statuses.

Reads the parent's edited sheet (column `included` TRUE/FALSE) and sets
status="approved"|"skipped" on each unit's *.reviewed.json so `pack`
keeps only the marked pages. Sections: ar (unit1), ar-u2, ar-u3, ar-u4.

Usage: python apply-include.py [--xlsx PATH] [--dry-run]
"""
import json, sys, glob
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
XLSX = ROOT / "arabic-book" / "pages-include.xlsx"
SECTIONS = ["ar", "ar-u2", "ar-u3", "ar-u4"]


def load_include(path: Path) -> dict[str, bool]:
    import openpyxl
    ws = openpyxl.load_workbook(path)["pages"]
    hdr = [str(c.value or "").strip() for c in ws[1]]
    # first column holds the page stem (pNNN); its header has drifted in
    # some edits, so fall back to position 0
    pi = hdr.index("page") if "page" in hdr else 0
    ii = hdr.index("included")
    out = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        stem, inc = row[pi], row[ii]
        if stem:
            out[str(stem).strip()] = bool(inc) and str(inc).lower() not in ("false", "0", "")
    return out


def main() -> None:
    xlsx = Path(sys.argv[sys.argv.index("--xlsx") + 1]) if "--xlsx" in sys.argv else XLSX
    dry = "--dry-run" in sys.argv
    include = load_include(xlsx)
    print(f"{sum(include.values())} pages marked TRUE in {xlsx.name}")
    for sec in SECTIONS:
        wdir = ROOT / "content" / "work" / sec
        kept = dropped = missing = 0
        for f in sorted(wdir.glob("p*.reviewed.json")):
            stem = f.name.split(".")[0]
            if stem not in include:
                missing += 1
                continue
            d = json.loads(f.read_text(encoding="utf-8"))
            want = "approved" if include[stem] else "skipped"
            if d.get("status") != want:
                if include[stem]:
                    kept += 1
                else:
                    dropped += 1
                if not dry:
                    d["status"] = want
                    f.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
            elif include[stem]:
                kept += 1
        print(f"{sec}: {kept} approved, {dropped} newly skipped, {missing} not in sheet")


if __name__ == "__main__":
    main()

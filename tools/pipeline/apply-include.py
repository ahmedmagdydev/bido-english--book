"""Apply arabic-book/pages-include.xlsx to reviewed-page statuses.

Tri-state `included` column:
  TRUE  → status "approved"      (page ships in the pack)
  FALSE → status "skipped"       (excluded now; re-mark TRUE to restore)
  blank → status "needs_review"  (undecided — out of packs, kept pending)

Usage: python apply-include.py [--xlsx PATH] [--dry-run]
"""
import json, sys, glob
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
XLSX = ROOT / "arabic-book" / "pages-include.xlsx"
SECTIONS = ["ar", "ar-u2", "ar-u3", "ar-u4"]

STATUS = {True: "approved", False: "skipped", None: "needs_review"}


def load_include(path: Path) -> dict[str, bool | None]:
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
        if not stem:
            continue
        if inc is None or str(inc).strip() == "":
            out[str(stem).strip()] = None
        else:
            out[str(stem).strip()] = bool(inc) and str(inc).lower() not in ("false", "0", "")
    return out


def main() -> None:
    xlsx = Path(sys.argv[sys.argv.index("--xlsx") + 1]) if "--xlsx" in sys.argv else XLSX
    dry = "--dry-run" in sys.argv
    include = load_include(xlsx)
    t, f = sum(1 for v in include.values() if v is True), sum(1 for v in include.values() if v is False)
    print(f"{t} TRUE, {f} FALSE, {len(include)-t-f} blank in {xlsx.name}")
    for sec in SECTIONS:
        wdir = ROOT / "content" / "work" / sec
        counts = {"approved": 0, "skipped": 0, "needs_review": 0}
        missing = changed = 0
        for f_ in sorted(wdir.glob("p*.reviewed.json")):
            stem = f_.name.split(".")[0]
            if stem not in include:
                missing += 1
                continue
            d = json.loads(f_.read_text(encoding="utf-8"))
            want = STATUS[include[stem]]
            counts[want] += 1
            if d.get("status") != want:
                changed += 1
                if not dry:
                    d["status"] = want
                    f_.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
        print(
            f"{sec}: {counts['approved']} approved, {counts['skipped']} skipped, "
            f"{counts['needs_review']} pending ({changed} changed, {missing} not in sheet)"
        )


if __name__ == "__main__":
    main()

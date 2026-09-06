#!/usr/bin/env python3
"""Move legacy redirect_from URLs off their parking page and onto the real page.

Nine gated pages own inbound URLs from midwestpelvis.com. jekyll-redirect-from
emits no stub for a `published: false` page, so those URLs were parked on a live
hub page to stop them 404ing. Once a page is reviewed and published, its URLs
belong back on it.

Run after publishing any of the nine. It only acts on pages that are actually
published now, so it is safe to run repeatedly and safe to run early.

    python3 scripts/reclaim-legacy-redirects.py --dry-run
    python3 scripts/reclaim-legacy-redirects.py
"""
import argparse, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# page that should own the URLs -> (page currently parking them, [urls])
OWNERSHIP = {
    "conditions/prolapse/what-causes-uterine-prolapse.md": (
        "conditions/prolapse/uterine-prolapse.md",
        ["/what-causes-uterine-prolapse/", "/how-to-avoid-uterine-prolapse/"]),
    "conditions/prolapse/how-does-uterine-prolapse-feel.md": (
        "conditions/prolapse/uterine-prolapse.md",
        ["/how-does-uterine-prolapse-feel/", "/does-uterine-prolapse-hurt-2/",
         "/can-uterine-prolapse-cause-sciatica/", "/can-uterine-prolapse-cause-incontinence/"]),
    "conditions/prolapse/can-uterine-prolapse-be-reversed.md": (
        "conditions/prolapse/uterine-prolapse.md", ["/can-uterine-prolapse-be-reversed/"]),
    "conditions/prolapse/can-your-uterus-prolapse.md": (
        "conditions/prolapse/uterine-prolapse.md", ["/can-your-uterus-prolapse/"]),
    "conditions/prolapse/can-uterine-prolapse-cause-cramping.md": (
        "conditions/prolapse/uterine-prolapse.md", ["/can-uterine-prolapse-cause-cramping/"]),
    "conditions/prolapse/how-fast-does-uterine-prolapse-progress.md": (
        "conditions/prolapse/uterine-prolapse.md", ["/how-fast-does-uterine-prolapse-progress/"]),
    "conditions/prolapse/enterocele.md": (
        "conditions/prolapse/what-is-enterocele.md", ["/enterocele-repair/"]),
    "treatments/prolapse/vaginal-prolapse-repair.md": (
        "treatments/prolapse/index.md", ["/vaginal-prolapse-repair/"]),
    "treatments/urinary-incontinence/non-mesh-sling-procedures.md": (
        "treatments/comparisons/mesh-vs-non-mesh-sling.md", ["/non-mesh-sling-procedures/"]),
}

GATED = re.compile(r"^published:\s*false\s*$", re.M)
NOTE = re.compile(r"^# NOTE: this page's redirect_from URLs were moved to .*\n(?:^#.*\n)*", re.M)


def frontmatter_bounds(text):
    if not text.startswith("---\n"):
        raise ValueError("no frontmatter")
    end = text.index("\n---", 3)
    return 4, end + 1


def strip_urls(text, urls):
    """Remove the given `  - /url/` lines from a redirect_from block."""
    out, removed = [], []
    for line in text.split("\n"):
        if line.strip().startswith("- ") and line.strip()[2:].strip() in urls:
            removed.append(line.strip()[2:].strip())
            continue
        out.append(line)
    text = "\n".join(out)
    # drop a redirect_from key left with no entries under it
    text = re.sub(r"^redirect_from:\n(?=[a-zA-Z_-]+:|---)", "", text, flags=re.M)
    return text, removed


def add_urls(text, urls):
    s, e = frontmatter_bounds(text)
    fm = text[s:e]
    if re.search(r"^redirect_from:\s*$", fm, re.M):
        fm = re.sub(r"^(redirect_from:\s*\n)", r"\1" + "".join(f"  - {u}\n" for u in urls), fm, count=1, flags=re.M)
    else:
        fm = fm.rstrip("\n") + "\nredirect_from:\n" + "".join(f"  - {u}\n" for u in urls)
    return text[:s] + fm + text[e:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pending, moved = [], []
    for page, (parked_on, urls) in OWNERSHIP.items():
        pf, kf = ROOT / page, ROOT / parked_on
        if not pf.exists():
            print(f"  MISSING  {page}", file=sys.stderr); continue
        ptext = pf.read_text(encoding="utf-8")
        if GATED.search(ptext):
            pending.append(page); continue

        ktext = kf.read_text(encoding="utf-8")
        ktext, removed = strip_urls(ktext, set(urls))
        if not removed:
            continue  # already reclaimed

        ptext = add_urls(NOTE.sub("", ptext), urls)
        if args.dry_run:
            print(f"  WOULD MOVE {len(removed)}: {parked_on} -> {page}")
        else:
            kf.write_text(ktext, encoding="utf-8")
            pf.write_text(ptext, encoding="utf-8")
            print(f"  moved {len(removed)}: {parked_on} -> {page}")
        moved.append(page)

    print(f"\nreclaimed: {len(moved)}   still gated: {len(pending)}")
    for p in pending:
        print(f"  gated  {p}")


if __name__ == "__main__":
    main()

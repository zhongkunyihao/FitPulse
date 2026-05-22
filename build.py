#!/usr/bin/env python3
"""FitPulse build script.

Does two things:

1. Regenerates ``js/data.js`` from the JSON sources in ``data/``.
   (Edit the JSON, run this script, and the app picks up the changes.)

2. Bundles the modular app (``index.html`` + ``css/styles.css`` +
   ``js/data.js`` + ``js/app.js``) into a single, self-contained file
   at ``dist/fitpulse-standalone.html`` that works offline and can be
   installed to a phone home screen.

Usage:
    python3 build.py

No third-party dependencies — standard library only.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
JS = ROOT / "js"
CSS = ROOT / "css"
DIST = ROOT / "dist"


def jdump(value) -> str:
    """Pretty-print a Python value as JS/JSON (2-space indent, keep unicode)."""
    return json.dumps(value, indent=2, ensure_ascii=False)


def generate_data_js() -> str:
    """Build js/data.js from the JSON files in data/."""
    products = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
    week = json.loads((DATA / "schedule.json").read_text(encoding="utf-8"))
    live = json.loads((DATA / "live.json").read_text(encoding="utf-8"))
    shorts = json.loads((DATA / "shorts.json").read_text(encoding="utf-8"))

    out = (
        "/* FitPulse — runtime data.\n"
        " * Auto-generated from the JSON files in /data by build.py.\n"
        " * To change app data, edit data/*.json then run:  python3 build.py\n"
        " */\n"
        f"const PRODUCTS = {jdump(products)};\n\n"
        f"const WEEK = {jdump(week)};\n\n"
        f"const UPCOMING = {jdump(live['upcoming'])};\n\n"
        f"const LIVE_USERS = {jdump(live['users'])};\n\n"
        f"const LIVE_MSGS = {jdump(live['messages'])};\n\n"
        f"let SHORTS = {jdump(shorts)};\n"
    )
    (JS / "data.js").write_text(out, encoding="utf-8")
    return out


def bundle_standalone() -> None:
    """Inline css + js into a single dist/fitpulse-standalone.html."""
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (CSS / "styles.css").read_text(encoding="utf-8")
    qr_js = (JS / "qrcode.js").read_text(encoding="utf-8")
    data_js = (JS / "data.js").read_text(encoding="utf-8")
    app_js = (JS / "app.js").read_text(encoding="utf-8")

    # Inline the stylesheet.
    link_tag = '<link rel="stylesheet" href="css/styles.css">'
    if link_tag not in html:
        raise SystemExit("Could not find the stylesheet <link> in index.html")
    html = html.replace(link_tag, "<style>\n" + css + "\n</style>")

    # Inline the scripts as one (order matters: qrcode -> data -> app).
    script_tags = (
        '<script src="js/qrcode.js"></script>\n'
        '<script src="js/data.js"></script>\n'
        '<script src="js/app.js"></script>'
    )
    if script_tags not in html:
        raise SystemExit("Could not find the <script src> tags in index.html")
    html = html.replace(
        script_tags,
        "<script>\n" + qr_js + "\n" + data_js + "\n" + app_js + "\n</script>",
    )

    DIST.mkdir(exist_ok=True)
    (DIST / "fitpulse-standalone.html").write_text(html, encoding="utf-8")


def main() -> None:
    generate_data_js()
    print("Generated js/data.js from data/*.json")
    bundle_standalone()
    print("Built dist/fitpulse-standalone.html")
    print("Done.")


if __name__ == "__main__":
    main()

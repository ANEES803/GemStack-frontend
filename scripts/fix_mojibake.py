"""Replace UTF-8 mojibake in GemStack frontend sources with plain Unicode/ASCII."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"

# Built from actual file bytes (double-encoded UTF-8).
RIGHT_ARROW = bytes(
    [0xC3, 0x83, 0xC2, 0xA2, 0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xC2, 0xA0, 0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xE2, 0x84, 0xA2]
).decode("utf-8")
LEFT_ARROW = bytes(
    [0xC3, 0x83, 0xC2, 0xA2, 0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xC2, 0xA0, 0xC3, 0x82, 0xC2, 0x90]
).decode("utf-8")

# Longest-first replacement list (old, new)
REPLACEMENTS: list[tuple[str, str]] = [
    # Triple-nested empty placeholder used as "" in demo data
    (
        "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â",
        "",
    ),
    ("ÃƒÂ¢Ã¢â‚¬â€Ã‚Â", "✓"),
    ("ÃƒÂ¢Ã¢â‚¬â€Ã‚Â", "○"),
    ("ÃƒÂ¢Ã¢â‚¬â€Ã¢â‚¬Ëœ", "○"),
    ("ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢", "→"),
    ("ÃƒÂ¢Ã¢â‚¬Â Ã‚Â", "←"),
    ("Ãƒâ€šÃ‚Â§", "§"),
    ("Ãƒâ€šÃ‚Â·", "·"),
    ("ÃƒÆ’Ã¢â‚¬â€", "×"),
    ("ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ", '"'),
    ("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â", '"'),
    ("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦", "..."),
    ("ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢", "'"),
    ("Ã¢â‚¬â€", "—"),
    ("Ã¢â€ â€™", "→"),
    ("Ã¢â€ Â", "←"),
    ("Ã‚Â·", "·"),
    (RIGHT_ARROW, "→"),
    (LEFT_ARROW, "←"),
]


def main() -> None:
    changed = 0
    paths = sorted(ROOT.rglob("*.tsx")) + sorted(ROOT.rglob("*.ts"))
    for path in paths:
        if "node_modules" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        new = text
        for old, new_s in REPLACEMENTS:
            if old in new:
                new = new.replace(old, new_s)
        if new != text:
            path.write_text(new, encoding="utf-8", newline="\n")
            changed += 1
            print(path.relative_to(ROOT.parent.parent))
    print(f"Done. Files updated: {changed}")


if __name__ == "__main__":
    main()

"""One-off helper: replace window.alert(...) with pushToast(..., variant) in a TSX file."""
from __future__ import annotations

import re
import sys
from pathlib import Path


def transform_line(line: str) -> str:
    if "window.alert(" not in line:
        return line
    if "pushToast(" in line:
        return line
    stripped = line.strip()
    if "e instanceof Error" in line or "e.message" in line:
        return re.sub(
            r"window\.alert\(([^;]+)\);",
            r"pushToast(\1, \"error\");",
            line,
        )
    if "Demo:" in line or "demo" in line.lower() or "Wire" in line:
        return re.sub(
            r"window\.alert\(([^;]+)\);",
            r"pushToast(\1, \"info\");",
            line,
        )
    if any(
        x in line
        for x in (
            "required",
            "must",
            "Only ",
            "Enter ",
            "Add at least",
            "No lines",
            "Please ",
            "Select ",
            "Pick ",
            "Each field",
            "Enable at least",
            "Parcel split",
            "Imported stock",
        )
    ):
        return re.sub(
            r"window\.alert\(([^;]+)\);",
            r"pushToast(\1, \"error\");",
            line,
        )
    return re.sub(
        r"window\.alert\(([^;]+)\);",
        r"pushToast(\1, \"info\");",
        line,
    )


def main() -> None:
    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8")
    out_lines = [transform_line(line) for line in text.splitlines(keepends=True)]
    path.write_text("".join(out_lines), encoding="utf-8")


if __name__ == "__main__":
    main()

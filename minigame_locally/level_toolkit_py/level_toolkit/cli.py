from __future__ import annotations

import argparse
from pathlib import Path

from .editor import launch_editor
from .generator import generate_level, generate_progression
from .io_utils import export_levels_csv, load_level, save_json
from .main_app import launch_main_app
from .validator import validate_level_output


def cmd_generate(args: argparse.Namespace) -> int:
    level = generate_level(args.level)
    out = Path(args.out)
    save_json(out, level.to_dict())
    print(f"generated level={args.level} solutions={level.solution_count} -> {out}")
    return 0


def cmd_generate_progression(args: argparse.Namespace) -> int:
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    levels = generate_progression()
    for level in levels:
        p = outdir / f"level_{level.level:02d}.json"
        save_json(p, level.to_dict())
    if args.csv:
        export_levels_csv(levels, outdir / "progression_summary.csv")
    print(f"generated {len(levels)} levels into {outdir}")
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    level = load_level(Path(args.input))
    report = validate_level_output(level)
    if report.valid:
        print("VALID")
        return 0
    print("INVALID")
    for err in report.errors:
        print(f"- {err}")
    return 1


def cmd_audit(args: argparse.Namespace) -> int:
    folder = Path(args.input_dir)
    files = sorted(folder.glob("*.json"))
    lines = ["# Level Audit", ""]
    valid = 0
    for f in files:
        try:
            report = validate_level_output(load_level(f))
        except Exception as exc:
            report_ok = False
            errs = [f"parse_error: {exc}"]
        else:
            report_ok = report.valid
            errs = report.errors
        if report_ok:
            valid += 1
            lines.append(f"- {f.name}: OK")
        else:
            lines.append(f"- {f.name}: FAIL | {'; '.join(errs)}")
    lines.insert(2, f"- total: {len(files)}")
    lines.insert(3, f"- valid: {valid}")
    lines.insert(4, f"- invalid: {len(files) - valid}")

    out = folder / "AUDIT_TOOLKIT.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"audit written: {out}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="level_toolkit")
    sub = parser.add_subparsers(dest="command", required=True)

    g = sub.add_parser("generate", help="Generate one level")
    g.add_argument("--level", type=int, required=True)
    g.add_argument("--out", type=str, required=True)
    g.set_defaults(func=cmd_generate)

    gp = sub.add_parser("generate-progression", help="Generate levels 1..10")
    gp.add_argument("--outdir", type=str, required=True)
    gp.add_argument("--csv", action="store_true", help="Also export progression_summary.csv")
    gp.set_defaults(func=cmd_generate_progression)

    v = sub.add_parser("validate", help="Validate one level JSON")
    v.add_argument("--input", type=str, required=True)
    v.set_defaults(func=cmd_validate)

    a = sub.add_parser("audit", help="Validate all JSON files in folder")
    a.add_argument("--input-dir", type=str, required=True)
    a.set_defaults(func=cmd_audit)

    e = sub.add_parser("editor", help="Open GUI level editor")
    e.set_defaults(func=lambda _args: (launch_editor() or 0))

    m = sub.add_parser("main", help="Open GUI main window")
    m.set_defaults(func=lambda _args: (launch_main_app() or 0))

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)

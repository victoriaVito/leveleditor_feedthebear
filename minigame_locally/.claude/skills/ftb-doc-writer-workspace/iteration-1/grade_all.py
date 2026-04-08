#!/usr/bin/env python3
"""Grade all eval outputs for ftb-doc-writer skill iteration-1."""
import json, re, os

BASE = "/sessions/bold-affectionate-fermi/mnt/minigame_locally/.claude/skills/ftb-doc-writer-workspace/iteration-1"

def check_blank_line_before_lists(text):
    """Check that every list item has a blank line before the first item in a block."""
    lines = text.split('\n')
    violations = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if re.match(r'^[-*+]\s', stripped) or re.match(r'^\d+\.\s', stripped):
            # This is a list item - check if it's the first in a block
            if i == 0:
                continue
            prev = lines[i-1].strip()
            prev_is_list = bool(re.match(r'^[-*+]\s', prev) or re.match(r'^\d+\.\s', prev))
            if not prev_is_list and prev != '' and not prev.startswith('|'):
                violations += 1
    return violations == 0, f"{violations} list(s) missing blank line before first item"

def check_blank_line_around_code_fences(text):
    """Check that every ``` has blank lines around it."""
    lines = text.split('\n')
    violations = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('```'):
            if i > 0 and lines[i-1].strip() != '':
                violations += 1
            if i < len(lines)-1 and lines[i+1].strip() != '' and not lines[i+1].strip().startswith('```'):
                # Allow content inside code fence right after opening
                if line.strip() == '```' or line.strip().startswith('```') and i > 0:
                    pass  # closing fence or opening fence - check next line
    # Simpler: just check that line before ``` is blank (unless it's line 0 or inside fence)
    violations = 0
    in_fence = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('```'):
            if not in_fence:
                # Opening fence
                if i > 0 and lines[i-1].strip() != '':
                    violations += 1
                in_fence = True
            else:
                # Closing fence - check line after
                if i < len(lines)-1 and lines[i+1].strip() != '':
                    violations += 1
                in_fence = False
    return violations == 0, f"{violations} code fence(s) missing blank line"

def check_blank_line_after_headings(text):
    """Check that every heading has a blank line after it."""
    lines = text.split('\n')
    violations = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('#') and i < len(lines)-1:
            if lines[i+1].strip() != '':
                violations += 1
    return violations == 0, f"{violations} heading(s) missing blank line after"

def check_no_double_blank_lines(text):
    """Check no consecutive blank lines."""
    count = len(re.findall(r'\n\n\n', text))
    return count == 0, f"{count} double blank line(s) found"

def check_canonical_term_original_progressions(text):
    """Check uses 'Original Progression(s)' not bare 'progression(s)' for the concept."""
    # Look for bare "progression" used as a concept name (not in a path or variable)
    # This is tricky - just check that "Original Progression" appears if progression concept is discussed
    has_original = bool(re.search(r'Original Progression', text))
    # Check for bare "progressions" used as the primary term for the concept
    bare_uses = re.findall(r'(?<!\w)(?:the |a |three |3 )progressions?\b', text, re.IGNORECASE)
    # Filter out uses that are OK (like "progression A" or preceded by "Original")
    problematic = [u for u in bare_uses if 'original' not in u.lower()]
    return has_original, f"'Original Progression' {'found' if has_original else 'NOT found'}, {len(problematic)} bare uses"

def check_canonical_term_tutorial(text):
    """Check uses 'Tutorial' for slot 0."""
    has_tutorial = bool(re.search(r'\bTutorial\b', text))
    has_bad = bool(re.search(r'intro level|onboarding|first level', text, re.IGNORECASE))
    return has_tutorial, f"'Tutorial' {'found' if has_tutorial else 'NOT found'}, bad terms: {'yes' if has_bad else 'no'}"

def check_canonical_term_toolkit(text):
    """Check uses 'toolkit' for the editor."""
    has_toolkit = bool(re.search(r'\btoolkit\b', text, re.IGNORECASE))
    return has_toolkit, f"'toolkit' {'found' if has_toolkit else 'NOT found'}"

def check_no_absolute_paths(text):
    """Check no absolute macOS paths."""
    abs_paths = re.findall(r'/Users/[^\s]+', text)
    return len(abs_paths) == 0, f"{len(abs_paths)} absolute path(s) found"

def check_no_long_lines(text):
    """Check no lines over 500 chars."""
    violations = sum(1 for line in text.split('\n') if len(line) > 500)
    return violations == 0, f"{violations} line(s) over 500 chars"

def check_cross_references(text):
    """Check includes cross-references to related docs."""
    refs = re.findall(r'`docs/[A-Z_]+\.md`|`[A-Z_]+\.md`|See .+\.md', text)
    return len(refs) >= 2, f"{len(refs)} cross-reference(s) found"

def check_verify_flags(text):
    """Check [VERIFY] flags present for uncertain info."""
    flags = re.findall(r'\[VERIFY', text)
    return len(flags) > 0, f"{len(flags)} [VERIFY] flag(s) found"

def check_verify_pending_section(text):
    """Check [VERIFY] flags have a pending section."""
    has_flags = bool(re.search(r'\[VERIFY', text))
    has_section = bool(re.search(r'Pending.*VERIFY|VERIFY.*Pending|Pending.*Flag', text, re.IGNORECASE))
    if not has_flags:
        return True, "No [VERIFY] flags, no section needed"
    flag_count = len(re.findall(r'\[VERIFY', text))
    section_status = 'found' if has_section else 'NOT found'
    return has_section, f"Pending section {section_status} for {flag_count} flags"

def check_dated_entry(text):
    """Check memoria entry has a date."""
    has_date = bool(re.search(r'2026-\d{2}-\d{2}', text))
    return has_date, f"Date {'found' if has_date else 'NOT found'}"

def check_entry_length(text):
    """Check memoria entry is under 300 chars."""
    # Get the actual entry line (not headers)
    lines = [l for l in text.strip().split('\n') if l.strip() and not l.strip().startswith('#')]
    if not lines:
        return False, "No entry found"
    longest = max(len(l) for l in lines)
    return longest <= 300, f"Longest line: {longest} chars"

def check_relative_paths(text):
    """Check all paths are relative."""
    abs_paths = re.findall(r'/Users/|/home/|/Library/', text)
    return len(abs_paths) == 0, f"{len(abs_paths)} absolute path(s)"

def check_changes_has_detail(text):
    """Check changes entry has meaningful detail beyond a one-liner."""
    lines = [l for l in text.strip().split('\n') if l.strip()]
    return len(lines) >= 3, f"{len(lines)} non-empty lines"

def grade_eval(eval_name, config, file_path, assertions_config):
    """Grade a single run."""
    results = []
    for file_key, checks in assertions_config.items():
        full_path = os.path.join(BASE, eval_name, config, "outputs", file_key)
        if not os.path.exists(full_path):
            for check_name, _ in checks:
                results.append({"text": check_name, "passed": False, "evidence": f"File not found: {file_key}"})
            continue
        with open(full_path) as f:
            content = f.read()
        for check_name, check_fn in checks:
            passed, evidence = check_fn(content)
            results.append({"text": check_name, "passed": passed, "evidence": evidence})

    passed_count = sum(1 for r in results if r["passed"])
    total = len(results)

    grading = {
        "expectations": results,
        "summary": {
            "passed": passed_count,
            "failed": total - passed_count,
            "total": total,
            "pass_rate": round(passed_count / total, 2) if total > 0 else 0
        }
    }

    out_dir = os.path.join(BASE, eval_name, config)
    with open(os.path.join(out_dir, "grading.json"), "w") as f:
        json.dump(grading, f, indent=2)

    return grading

# Define assertions per eval
eval1_assertions = {
    "DIFFICULTY_MODEL.md": [
        ("Blank line before every list", check_blank_line_before_lists),
        ("Blank line around every code fence", check_blank_line_around_code_fences),
        ("Blank line after every heading", check_blank_line_after_headings),
        ("No double blank lines", check_no_double_blank_lines),
        ("Uses canonical term 'Original Progressions'", check_canonical_term_original_progressions),
        ("Uses canonical term 'Tutorial'", check_canonical_term_tutorial),
        ("All paths relative (no absolute macOS paths)", check_no_absolute_paths),
        ("No lines over 500 characters", check_no_long_lines),
        ("Cross-references to related docs", check_cross_references),
    ]
}

eval2_assertions_memoria = {
    "memoria_entry.md": [
        ("Dated entry (contains 2026-XX-XX)", check_dated_entry),
        ("Entry under 300 characters", check_entry_length),
        ("Relative paths only", check_relative_paths),
    ]
}
eval2_assertions_changes = {
    "changes_toolkit_entry.md": [
        ("Changes file has detail (3+ lines)", check_changes_has_detail),
        ("Relative paths only", check_relative_paths),
    ]
}
eval2_assertions = {**eval2_assertions_memoria, **eval2_assertions_changes}

eval3_assertions = {
    "ONBOARDING_LEVEL_DESIGN.md": [
        ("Blank line before every list", check_blank_line_before_lists),
        ("Blank line around every code fence", check_blank_line_around_code_fences),
        ("Blank line after every heading", check_blank_line_after_headings),
        ("No double blank lines", check_no_double_blank_lines),
        ("Uses canonical term 'Original Progressions'", check_canonical_term_original_progressions),
        ("Uses canonical term 'Tutorial'", check_canonical_term_tutorial),
        ("Uses 'toolkit' for the editor", check_canonical_term_toolkit),
        ("Contains [VERIFY] flags for uncertain info", check_verify_flags),
        ("All paths relative (no absolute macOS paths)", check_no_absolute_paths),
        ("No lines over 500 characters", check_no_long_lines),
        ("Cross-references to related docs", check_cross_references),
    ]
}

# Grade all runs
results = {}
for eval_name, assertions in [
    ("eval-difficulty-model", eval1_assertions),
    ("eval-memoria-entry", eval2_assertions),
    ("eval-onboarding-guide", eval3_assertions),
]:
    for config in ["with_skill", "without_skill"]:
        key = f"{eval_name}/{config}"
        grading = grade_eval(eval_name, config, None, assertions)
        results[key] = grading
        print(f"\n{'='*60}")
        print(f"{key}: {grading['summary']['passed']}/{grading['summary']['total']} passed ({grading['summary']['pass_rate']})")
        for exp in grading['expectations']:
            status = "PASS" if exp['passed'] else "FAIL"
            print(f"  [{status}] {exp['text']}: {exp['evidence']}")

print("\n\n" + "="*60)
print("SUMMARY")
print("="*60)
for key, g in results.items():
    print(f"  {key}: {g['summary']['pass_rate']*100:.0f}% ({g['summary']['passed']}/{g['summary']['total']})")

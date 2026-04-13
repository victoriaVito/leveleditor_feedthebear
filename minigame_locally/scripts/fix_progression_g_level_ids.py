#!/usr/bin/env python3.10
"""
Fix progression_g level IDs to match the new canonical format.
Old format: "id": "g_1"
New format: "id": "progression_g_level1"
"""

import json
from pathlib import Path

def fix_progression_g_ids():
    """Update all progression_g level IDs to match filename stems."""
    levels_dir = Path('levels/progression_g/jsons')

    if not levels_dir.exists():
        print(f"❌ {levels_dir} not found")
        return False

    fixed_count = 0
    for level_file in sorted(levels_dir.glob('progression_g_level*.json')):
        with open(level_file) as f:
            level = json.load(f)

        # Extract the slot number from filename
        stem = level_file.stem  # e.g., "progression_g_level1"
        old_id = level.get('id')

        # Update the ID to match the filename stem
        level['id'] = stem

        # Write back
        with open(level_file, 'w') as f:
            json.dump(level, f, indent=2)

        print(f"✅ {level_file.name} — updated ID from '{old_id}' to '{stem}'")
        fixed_count += 1

    return fixed_count > 0

if __name__ == '__main__':
    fix_progression_g_ids()

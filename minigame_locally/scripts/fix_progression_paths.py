#!/usr/bin/env python3.10
"""
Fix progression JSON path references to point to jsons/ subdirectory.
Handles progressions B-G which have old-style flat references.
"""

import json
from pathlib import Path

def fix_progression_paths(progression_name):
    """Update progression JSON to point to correct level file paths."""
    progression_path = Path(f'progressions/{progression_name}.json')

    if not progression_path.exists():
        print(f"❌ {progression_path} not found")
        return False

    with open(progression_path) as f:
        progression = json.load(f)

    # Map old path to new path
    for slot in progression.get('slots', []):
        if 'level_file' in slot:
            old_path = slot['level_file']

            # progression_b/b_1.json → progression_b/jsons/progression_b_level1.json
            if progression_name in old_path:
                # Extract slot number
                parts = old_path.split('/')
                if len(parts) >= 2:
                    level_file = parts[-1]  # e.g., "b_1.json"

                    # Try to extract slot number
                    if '_' in level_file and level_file.endswith('.json'):
                        slot_num = level_file.split('_')[-1].replace('.json', '')
                        new_file = f'{progression_name}_level{slot_num}.json'
                        new_path = f'levels/{progression_name}/jsons/{new_file}'
                        slot['level_file'] = new_path

    # Also fix tutorial_level_file
    if 'tutorial_level_file' in progression:
        progression['tutorial_level_file'] = 'levels/progression_a/jsons/tutorial_level.json'

    # Write back
    with open(progression_path, 'w') as f:
        json.dump(progression, f, indent=2)

    print(f"✅ {progression_name} paths updated")
    return True

def main():
    for prog in ['progression_b', 'progression_c', 'progression_d', 'progression_e', 'progression_f', 'progression_g']:
        fix_progression_paths(prog)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3.10
"""
Normalize broken levels by assigning pair types.
Fixes missing/empty 'type' fields on pairs.
"""

import json
import sys
from pathlib import Path

# Color rotation for pairs
COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan']

def normalize_level(level_dict):
    """Add missing pair types."""
    pairs = level_dict.get('pairs', [])
    for i, pair in enumerate(pairs):
        if not pair.get('type') or pair.get('type', '').strip() == '':
            pair['type'] = COLORS[i % len(COLORS)]
    return level_dict

def main():
    levels_to_fix = [
        'levels/progression_a/jsons/progression_a_level3.json',
        'levels/progression_a/jsons/progression_a_level10.json',
        'levels/progression_a/jsons/tutorial_level.json',
    ]

    for level_path in levels_to_fix:
        path = Path(level_path)
        if not path.exists():
            print(f"⚠️  {level_path} not found, skipping")
            continue

        with open(path) as f:
            level = json.load(f)

        # Normalize
        normalized = normalize_level(level)

        # Write back
        with open(path, 'w') as f:
            json.dump(normalized, f, indent=2)

        print(f"✅ {level_path} — normalized {len(normalized['pairs'])} pairs")

if __name__ == '__main__':
    main()

# Screenshot Progression Recovery

Recovered from the user-provided screenshots on 2026-03-12.

## Cache status

- Chrome local storage entries for `ftb_workspace_state_v1` were found in Google Chrome profiles.
- Exact extraction was blocked because Chrome has JavaScript execution via Apple Events disabled.
- Recovery therefore used screenshot-visible slot names plus the closest matching saved JSON files in the repository.

## Exact recovery

- `progressionA_recovered_from_screenshots.json`
- Slots 2..10 come directly from existing `p_*_a.json` files.

## Inferred recovery

### Progression B

- `progression_b_slot_7.json` was created from `levels/standalone/progressionB_level7_Easy.json`
- `progression_b_slot_8.json` was created from `levels/standalone/progressionB_level6_hard.json`
- `progression_b_slot_10.json` was created from `levels/standalone/progressionB_level9_hard.json`

### Progression C

- `progression_c_slot_5.json` was created from `levels/standalone/progressionC_level5_Medium.json`
- `progression_c_slot_6.json` was created from `levels/standalone/progressionC_level6_Hard.json`
- `progression_c_slot_7.json` was created from `levels/standalone/progressionC_level7_Easy.json`
- `progression_c_slot_8.json` was created from `levels/standalone/progressionC_level8_Medium.json`
- `progression_c_slot_9.json` was created from `levels/standalone/progressionC_level9_Hard.json`
- `progression_c_slot_10.json` was created from `levels/standalone/progressionC_level10_Hard.json`

## Output files

- `progressions/progressionA_recovered_from_screenshots.json`
- `progressions/progressionB_recovered_from_screenshots.json`
- `progressions/progressionC_recovered_from_screenshots.json`

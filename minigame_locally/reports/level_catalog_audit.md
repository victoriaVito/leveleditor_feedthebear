# Level Catalog Audit

## Summary
- Scanned JSON files: 330
- Playable levels: 236
- Play sessions: 0
- Progression configs: 17
- Parse errors: 0
- Exact duplicate groups: 85
- Same structure but different metadata groups: 16
- Same gameplay shape but different metadata groups: 3
- Canonical unique levels if you keep one per exact duplicate group: 99

## Recommended Source Of Truth
- Levels: `levels/standalone/game_unique_levels`
- Progressions: `levels/progressions`
- Generated/runtime outputs: `levels/standalone/toolkit_exports`
- Archival imports: `levels/standalone/imported_from_downloads_clean`

## Why the repo feels crowded
- There are multiple derived copies of the same levels across import folders, validation folders, canonical game folders, and runtime export folders.
- The active catalog should not read from every folder at once.
- The cleanest approach is to treat `game_unique_levels` as the active playable catalog and everything else as source/import/archive.

## Folder counts
- `levels/standalone/game_unique_levels: 73`
- `levels/standalone/valid_levels_only: 36`
- `levels/standalone/imported_from_downloads_clean/levels: 35`
- `levels/standalone/from_images: 34`
- `levels/standalone/toolkit_exports/levels: 26`
- `levels/standalone/generated_large_hard_7x7_8x8: 10`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons: 10`
- `levels/standalone/from_downloads_fixed: 6`
- `levels/standalone/discarded_levels_only: 4`
- `levels/progressions/progressions_only: 1`
- `levels/standalone: 1`

## Exact duplicate groups
### Group 1
- Canonical: `levels/progressions/progressions_only/tutorial_level.json`
- `levels/progressions/progressions_only/tutorial_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_manual_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_2_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_3_level.json`
- `levels/standalone/tutorial_level.json`

### Group 2
- Canonical: `levels/standalone/game_unique_levels/image13_level_editor.json`
- `levels/standalone/discarded_levels_only/image13_level_editor.json`
- `levels/standalone/from_images/image13_level_editor.json`
- `levels/standalone/game_unique_levels/image13_level_editor.json`

### Group 3
- Canonical: `levels/standalone/game_unique_levels/image21_level_editor.json`
- `levels/standalone/discarded_levels_only/image21_level_editor.json`
- `levels/standalone/from_images/image21_level_editor.json`
- `levels/standalone/game_unique_levels/image21_level_editor.json`

### Group 4
- Canonical: `levels/standalone/game_unique_levels/image33_level_editor.json`
- `levels/standalone/discarded_levels_only/image33_level_editor.json`
- `levels/standalone/from_images/image33_level_editor.json`
- `levels/standalone/game_unique_levels/image33_level_editor.json`

### Group 5
- Canonical: `levels/standalone/game_unique_levels/image34_level_editor.json`
- `levels/standalone/discarded_levels_only/image34_level_editor.json`
- `levels/standalone/from_images/image34_level_editor.json`
- `levels/standalone/game_unique_levels/image34_level_editor.json`

### Group 6
- Canonical: `levels/standalone/game_unique_levels/level_7_manager_ok.json`
- `levels/standalone/from_downloads_fixed/level_7_manager_ok.json`
- `levels/standalone/game_unique_levels/level_7_manager_ok.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_7_validate_level.json`
- `levels/standalone/valid_levels_only/level_7_manager_ok.json`

### Group 7
- Canonical: `levels/standalone/game_unique_levels/susanne_level_1_manager_ok.json`
- `levels/standalone/from_downloads_fixed/susanne_level_1_manager_ok.json`
- `levels/standalone/game_unique_levels/susanne_level_1_manager_ok.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_4_level.json`
- `levels/standalone/valid_levels_only/susanne_level_1_manager_ok.json`

### Group 8
- Canonical: `levels/standalone/game_unique_levels/susanne_level_2_manager_ok.json`
- `levels/standalone/from_downloads_fixed/susanne_level_2_manager_ok.json`
- `levels/standalone/game_unique_levels/susanne_level_2_manager_ok.json`
- `levels/standalone/valid_levels_only/susanne_level_2_manager_ok.json`

### Group 9
- Canonical: `levels/standalone/game_unique_levels/susanne_level_3_manager_ok.json`
- `levels/standalone/from_downloads_fixed/susanne_level_3_manager_ok.json`
- `levels/standalone/from_downloads_fixed/susanne_level_4_manager_ok.json`
- `levels/standalone/game_unique_levels/susanne_level_3_manager_ok.json`
- `levels/standalone/valid_levels_only/susanne_level_3_manager_ok.json`
- `levels/standalone/valid_levels_only/susanne_level_4_manager_ok.json`

### Group 10
- Canonical: `levels/standalone/game_unique_levels/susanne_level_5_manager_ok.json`
- `levels/standalone/from_downloads_fixed/susanne_level_5_manager_ok.json`
- `levels/standalone/game_unique_levels/susanne_level_5_manager_ok.json`
- `levels/standalone/valid_levels_only/susanne_level_5_manager_ok.json`

### Group 11
- Canonical: `levels/standalone/game_unique_levels/image01_level_editor.json`
- `levels/standalone/from_images/image01_level_editor.json`
- `levels/standalone/game_unique_levels/image01_level_editor.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_6_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_8_level.json`
- `levels/standalone/valid_levels_only/image01_level_editor.json`

### Group 12
- Canonical: `levels/standalone/game_unique_levels/image02_level_editor.json`
- `levels/standalone/from_images/image02_level_editor.json`
- `levels/standalone/game_unique_levels/image02_level_editor.json`
- `levels/standalone/valid_levels_only/image02_level_editor.json`

### Group 13
- Canonical: `levels/standalone/game_unique_levels/image03_level_editor.json`
- `levels/standalone/from_images/image03_level_editor.json`
- `levels/standalone/game_unique_levels/image03_level_editor.json`
- `levels/standalone/valid_levels_only/image03_level_editor.json`

### Group 14
- Canonical: `levels/standalone/game_unique_levels/image04_level_editor.json`
- `levels/standalone/from_images/image04_level_editor.json`
- `levels/standalone/game_unique_levels/image04_level_editor.json`
- `levels/standalone/valid_levels_only/image04_level_editor.json`

### Group 15
- Canonical: `levels/standalone/game_unique_levels/image05_level_editor.json`
- `levels/standalone/from_images/image05_level_editor.json`
- `levels/standalone/game_unique_levels/image05_level_editor.json`
- `levels/standalone/valid_levels_only/image05_level_editor.json`

### Group 16
- Canonical: `levels/standalone/game_unique_levels/image06_level_editor.json`
- `levels/standalone/from_images/image06_level_editor.json`
- `levels/standalone/game_unique_levels/image06_level_editor.json`
- `levels/standalone/valid_levels_only/image06_level_editor.json`

### Group 17
- Canonical: `levels/standalone/game_unique_levels/image07_level_editor.json`
- `levels/standalone/from_images/image07_level_editor.json`
- `levels/standalone/game_unique_levels/image07_level_editor.json`
- `levels/standalone/valid_levels_only/image07_level_editor.json`

### Group 18
- Canonical: `levels/standalone/game_unique_levels/image08_level_editor.json`
- `levels/standalone/from_images/image08_level_editor.json`
- `levels/standalone/game_unique_levels/image08_level_editor.json`
- `levels/standalone/valid_levels_only/image08_level_editor.json`

### Group 19
- Canonical: `levels/standalone/game_unique_levels/image09_level_editor.json`
- `levels/standalone/from_images/image09_level_editor.json`
- `levels/standalone/game_unique_levels/image09_level_editor.json`
- `levels/standalone/valid_levels_only/image09_level_editor.json`

### Group 20
- Canonical: `levels/standalone/game_unique_levels/image10_level_editor.json`
- `levels/standalone/from_images/image10_level_editor.json`
- `levels/standalone/game_unique_levels/image10_level_editor.json`
- `levels/standalone/valid_levels_only/image10_level_editor.json`

### Group 21
- Canonical: `levels/standalone/game_unique_levels/image11_level_editor.json`
- `levels/standalone/from_images/image11_level_editor.json`
- `levels/standalone/game_unique_levels/image11_level_editor.json`
- `levels/standalone/valid_levels_only/image11_level_editor.json`

### Group 22
- Canonical: `levels/standalone/game_unique_levels/image12_level_editor.json`
- `levels/standalone/from_images/image12_level_editor.json`
- `levels/standalone/game_unique_levels/image12_level_editor.json`
- `levels/standalone/valid_levels_only/image12_level_editor.json`

### Group 23
- Canonical: `levels/standalone/game_unique_levels/image14_level_editor.json`
- `levels/standalone/from_images/image14_level_editor.json`
- `levels/standalone/game_unique_levels/image14_level_editor.json`
- `levels/standalone/valid_levels_only/image14_level_editor.json`

### Group 24
- Canonical: `levels/standalone/game_unique_levels/image15_level_editor.json`
- `levels/standalone/from_images/image15_level_editor.json`
- `levels/standalone/game_unique_levels/image15_level_editor.json`
- `levels/standalone/valid_levels_only/image15_level_editor.json`

### Group 25
- Canonical: `levels/standalone/game_unique_levels/image16_level_editor.json`
- `levels/standalone/from_images/image16_level_editor.json`
- `levels/standalone/game_unique_levels/image16_level_editor.json`
- `levels/standalone/valid_levels_only/image16_level_editor.json`

### Group 26
- Canonical: `levels/standalone/game_unique_levels/image17_level_editor.json`
- `levels/standalone/from_images/image17_level_editor.json`
- `levels/standalone/game_unique_levels/image17_level_editor.json`
- `levels/standalone/valid_levels_only/image17_level_editor.json`

### Group 27
- Canonical: `levels/standalone/game_unique_levels/image18_level_editor.json`
- `levels/standalone/from_images/image18_level_editor.json`
- `levels/standalone/game_unique_levels/image18_level_editor.json`
- `levels/standalone/valid_levels_only/image18_level_editor.json`

### Group 28
- Canonical: `levels/standalone/game_unique_levels/image19_level_editor.json`
- `levels/standalone/from_images/image19_level_editor.json`
- `levels/standalone/game_unique_levels/image19_level_editor.json`
- `levels/standalone/valid_levels_only/image19_level_editor.json`

### Group 29
- Canonical: `levels/standalone/game_unique_levels/image20_level_editor.json`
- `levels/standalone/from_images/image20_level_editor.json`
- `levels/standalone/game_unique_levels/image20_level_editor.json`
- `levels/standalone/valid_levels_only/image20_level_editor.json`

### Group 30
- Canonical: `levels/standalone/game_unique_levels/image22_level_editor.json`
- `levels/standalone/from_images/image22_level_editor.json`
- `levels/standalone/game_unique_levels/image22_level_editor.json`
- `levels/standalone/valid_levels_only/image22_level_editor.json`

### Group 31
- Canonical: `levels/standalone/game_unique_levels/image23_level_editor.json`
- `levels/standalone/from_images/image23_level_editor.json`
- `levels/standalone/game_unique_levels/image23_level_editor.json`
- `levels/standalone/valid_levels_only/image23_level_editor.json`

### Group 32
- Canonical: `levels/standalone/game_unique_levels/image24_level_editor.json`
- `levels/standalone/from_images/image24_level_editor.json`
- `levels/standalone/game_unique_levels/image24_level_editor.json`
- `levels/standalone/valid_levels_only/image24_level_editor.json`

### Group 33
- Canonical: `levels/standalone/game_unique_levels/image25_level_editor.json`
- `levels/standalone/from_images/image25_level_editor.json`
- `levels/standalone/game_unique_levels/image25_level_editor.json`
- `levels/standalone/valid_levels_only/image25_level_editor.json`

### Group 34
- Canonical: `levels/standalone/game_unique_levels/image26_level_editor.json`
- `levels/standalone/from_images/image26_level_editor.json`
- `levels/standalone/game_unique_levels/image26_level_editor.json`
- `levels/standalone/valid_levels_only/image26_level_editor.json`

### Group 35
- Canonical: `levels/standalone/game_unique_levels/image27_level_editor.json`
- `levels/standalone/from_images/image27_level_editor.json`
- `levels/standalone/game_unique_levels/image27_level_editor.json`
- `levels/standalone/valid_levels_only/image27_level_editor.json`

### Group 36
- Canonical: `levels/standalone/game_unique_levels/image28_level_editor.json`
- `levels/standalone/from_images/image28_level_editor.json`
- `levels/standalone/game_unique_levels/image28_level_editor.json`
- `levels/standalone/valid_levels_only/image28_level_editor.json`

### Group 37
- Canonical: `levels/standalone/game_unique_levels/image29_level_editor.json`
- `levels/standalone/from_images/image29_level_editor.json`
- `levels/standalone/game_unique_levels/image29_level_editor.json`
- `levels/standalone/valid_levels_only/image29_level_editor.json`

### Group 38
- Canonical: `levels/standalone/game_unique_levels/image30_level_editor.json`
- `levels/standalone/from_images/image30_level_editor.json`
- `levels/standalone/game_unique_levels/image30_level_editor.json`
- `levels/standalone/valid_levels_only/image30_level_editor.json`

### Group 39
- Canonical: `levels/standalone/game_unique_levels/image31_level_editor.json`
- `levels/standalone/from_images/image31_level_editor.json`
- `levels/standalone/game_unique_levels/image31_level_editor.json`
- `levels/standalone/valid_levels_only/image31_level_editor.json`

### Group 40
- Canonical: `levels/standalone/game_unique_levels/image32_level_editor.json`
- `levels/standalone/from_images/image32_level_editor.json`
- `levels/standalone/game_unique_levels/image32_level_editor.json`
- `levels/standalone/valid_levels_only/image32_level_editor.json`

### Group 41
- Canonical: `levels/standalone/game_unique_levels/hard_large_01_7x7.json`
- `levels/standalone/game_unique_levels/hard_large_01_7x7.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_01_7x7.json`

### Group 42
- Canonical: `levels/standalone/game_unique_levels/hard_large_02_8x8.json`
- `levels/standalone/game_unique_levels/hard_large_02_8x8.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_02_8x8.json`

### Group 43
- Canonical: `levels/standalone/game_unique_levels/hard_large_03_7x7.json`
- `levels/standalone/game_unique_levels/hard_large_03_7x7.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_03_7x7.json`

### Group 44
- Canonical: `levels/standalone/game_unique_levels/hard_large_04_8x8.json`
- `levels/standalone/game_unique_levels/hard_large_04_8x8.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_04_8x8.json`

### Group 45
- Canonical: `levels/standalone/game_unique_levels/hard_large_05_7x7.json`
- `levels/standalone/game_unique_levels/hard_large_05_7x7.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_05_7x7.json`

### Group 46
- Canonical: `levels/standalone/game_unique_levels/hard_large_06_8x8.json`
- `levels/standalone/game_unique_levels/hard_large_06_8x8.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_06_8x8.json`

### Group 47
- Canonical: `levels/standalone/game_unique_levels/hard_large_07_7x7.json`
- `levels/standalone/game_unique_levels/hard_large_07_7x7.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_07_7x7.json`

### Group 48
- Canonical: `levels/standalone/game_unique_levels/hard_large_08_8x8.json`
- `levels/standalone/game_unique_levels/hard_large_08_8x8.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_08_8x8.json`

### Group 49
- Canonical: `levels/standalone/game_unique_levels/hard_large_09_7x7.json`
- `levels/standalone/game_unique_levels/hard_large_09_7x7.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_09_7x7.json`

### Group 50
- Canonical: `levels/standalone/game_unique_levels/hard_large_10_8x8.json`
- `levels/standalone/game_unique_levels/hard_large_10_8x8.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_10_8x8.json`

### Group 51
- Canonical: `levels/standalone/game_unique_levels/level_1.json`
- `levels/standalone/game_unique_levels/level_1.json`
- `levels/standalone/imported_from_downloads_clean/levels/level_1.json`

### Group 52
- Canonical: `levels/standalone/game_unique_levels/play_session_level_1_manual_1_level.json`
- `levels/standalone/game_unique_levels/play_session_level_1_manual_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_manual_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_10_level.json`

### Group 53
- Canonical: `levels/standalone/game_unique_levels/play_session_level_1_validate_5_level.json`
- `levels/standalone/game_unique_levels/play_session_level_1_validate_5_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_5_level.json`

### Group 54
- Canonical: `levels/standalone/game_unique_levels/play_session_level_1_validate_7_level.json`
- `levels/standalone/game_unique_levels/play_session_level_1_validate_7_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_7_level.json`

### Group 55
- Canonical: `levels/standalone/game_unique_levels/play_session_level_2_validate_level.json`
- `levels/standalone/game_unique_levels/play_session_level_2_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_2_validate_level.json`

### Group 56
- Canonical: `levels/standalone/game_unique_levels/play_session_level_3_validate_level.json`
- `levels/standalone/game_unique_levels/play_session_level_3_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_3_validate_level.json`

### Group 57
- Canonical: `levels/standalone/game_unique_levels/play_session_level_4_validate_level.json`
- `levels/standalone/game_unique_levels/play_session_level_4_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_4_validate_level.json`

### Group 58
- Canonical: `levels/standalone/game_unique_levels/play_session_level_5_manual_level.json`
- `levels/standalone/game_unique_levels/play_session_level_5_manual_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_manual_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_validate_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_validate_level.json`

### Group 59
- Canonical: `levels/standalone/game_unique_levels/play_session_level_5_validate_2_level.json`
- `levels/standalone/game_unique_levels/play_session_level_5_validate_2_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_validate_2_level.json`

### Group 60
- Canonical: `levels/standalone/game_unique_levels/play_session_level_6_validate_1_level.json`
- `levels/standalone/game_unique_levels/play_session_level_6_validate_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_6_validate_1_level.json`

### Group 61
- Canonical: `levels/standalone/game_unique_levels/play_session_level_6_validate_level.json`
- `levels/standalone/game_unique_levels/play_session_level_6_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_6_validate_level.json`

### Group 62
- Canonical: `levels/standalone/game_unique_levels/play_session_level_8_validate_level.json`
- `levels/standalone/game_unique_levels/play_session_level_8_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_8_validate_level.json`

### Group 63
- Canonical: `levels/standalone/game_unique_levels/play_session_level_9_manual_level.json`
- `levels/standalone/game_unique_levels/play_session_level_9_manual_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_9_manual_level.json`

### Group 64
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_1.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_1.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_1.json`

### Group 65
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_10.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_10.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_10.json`

### Group 66
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_2.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_2.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_2.json`

### Group 67
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_3.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_3.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_3.json`

### Group 68
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_4.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_4.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_4.json`

### Group 69
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_5.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_5.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_5.json`

### Group 70
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_6.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_6.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_6.json`

### Group 71
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_7.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_7.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_7.json`

### Group 72
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_8.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_8.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_8.json`

### Group 73
- Canonical: `levels/standalone/game_unique_levels/progression_levels_slot_9.json`
- `levels/standalone/game_unique_levels/progression_levels_slot_9.json`
- `levels/standalone/imported_from_downloads_clean/levels/progression_levels_slot_9.json`

### Group 74
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_10_a.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_10_a.json`
- `levels/standalone/toolkit_exports/levels/p_10_a.json`

### Group 75
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_4_a.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_4_a.json`
- `levels/standalone/toolkit_exports/levels/p_4_a.json`

### Group 76
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_5_a.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_5_a.json`
- `levels/standalone/toolkit_exports/levels/p_5_a.json`

### Group 77
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_6_a.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_6_a.json`
- `levels/standalone/toolkit_exports/levels/p_6_a.json`

### Group 78
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_7_a.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_7_a.json`
- `levels/standalone/toolkit_exports/levels/p_7_a.json`

### Group 79
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_8_a.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_8_a.json`
- `levels/standalone/toolkit_exports/levels/p_8_a.json`

### Group 80
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_9_a.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_9_a.json`
- `levels/standalone/toolkit_exports/levels/p_9_a.json`

### Group 81
- Canonical: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/tutorial_level.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/tutorial_level.json`
- `levels/standalone/toolkit_exports/levels/tutorial_level.json`

### Group 82
- Canonical: `levels/standalone/toolkit_exports/levels/p_2_3_new_20260310163652.json`
- `levels/standalone/toolkit_exports/levels/p_2_3.json`
- `levels/standalone/toolkit_exports/levels/p_2_3_new_20260310163652.json`

### Group 83
- Canonical: `levels/standalone/toolkit_exports/levels/p_2_4_new_20260310165931.json`
- `levels/standalone/toolkit_exports/levels/p_2_4.json`
- `levels/standalone/toolkit_exports/levels/p_2_4_new_20260310165931.json`

### Group 84
- Canonical: `levels/standalone/toolkit_exports/levels/p_2_5_new_20260310170335.json`
- `levels/standalone/toolkit_exports/levels/p_2_5.json`
- `levels/standalone/toolkit_exports/levels/p_2_5_new_20260310170335.json`

### Group 85
- Canonical: `levels/standalone/toolkit_exports/levels/p_2_6_new_20260310170645.json`
- `levels/standalone/toolkit_exports/levels/p_2_6.json`
- `levels/standalone/toolkit_exports/levels/p_2_6_new_20260310170645.json`

## Same structure, different metadata
### Group 1
- Representative: `levels/standalone/game_unique_levels/new_level1_a.json`
- Varying fields: `blockers`, `board_height`, `board_width`, `difficulty`, `meta`, `validation`
- `levels/progressions/progressions_only/tutorial_level.json`
- `levels/standalone/game_unique_levels/new_level1_a.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_manual_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_2_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_3_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_9_level.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/tutorial_level.json`
- `levels/standalone/toolkit_exports/levels/p_tutorial.json`
- `levels/standalone/toolkit_exports/levels/tutorial_level.json`
- `levels/standalone/tutorial_level.json`

### Group 2
- Representative: `levels/standalone/game_unique_levels/level_1.json`
- Varying fields: `moves`
- `levels/standalone/from_downloads_fixed/susanne_level_1_manager_ok.json`
- `levels/standalone/game_unique_levels/level_1.json`
- `levels/standalone/game_unique_levels/play_session_level_1_validate_5_level.json`
- `levels/standalone/game_unique_levels/susanne_level_1_manager_ok.json`
- `levels/standalone/imported_from_downloads_clean/levels/level_1.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_4_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_5_level.json`
- `levels/standalone/valid_levels_only/susanne_level_1_manager_ok.json`

### Group 3
- Representative: `levels/standalone/game_unique_levels/play_session_level_5_manual_level.json`
- Varying fields: `moves`
- `levels/standalone/from_downloads_fixed/susanne_level_5_manager_ok.json`
- `levels/standalone/game_unique_levels/play_session_level_5_manual_level.json`
- `levels/standalone/game_unique_levels/susanne_level_5_manager_ok.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_manual_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_validate_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_validate_level.json`
- `levels/standalone/valid_levels_only/susanne_level_5_manager_ok.json`

### Group 4
- Representative: `levels/standalone/game_unique_levels/image01_level_editor.json`
- Varying fields: `moves`
- `levels/standalone/from_images/image01_level_editor.json`
- `levels/standalone/game_unique_levels/image01_level_editor.json`
- `levels/standalone/game_unique_levels/play_session_level_1_validate_7_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_6_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_7_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_8_level.json`
- `levels/standalone/valid_levels_only/image01_level_editor.json`

### Group 5
- Representative: `levels/standalone/game_unique_levels/image02_level_editor.json`
- Varying fields: `moves`
- `levels/standalone/from_images/image02_level_editor.json`
- `levels/standalone/game_unique_levels/image02_level_editor.json`
- `levels/standalone/game_unique_levels/play_session_level_2_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_2_validate_level.json`
- `levels/standalone/valid_levels_only/image02_level_editor.json`

### Group 6
- Representative: `levels/standalone/game_unique_levels/image03_level_editor.json`
- Varying fields: `moves`
- `levels/standalone/from_images/image03_level_editor.json`
- `levels/standalone/game_unique_levels/image03_level_editor.json`
- `levels/standalone/game_unique_levels/play_session_level_3_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_3_validate_level.json`
- `levels/standalone/valid_levels_only/image03_level_editor.json`

### Group 7
- Representative: `levels/standalone/game_unique_levels/image04_level_editor.json`
- Varying fields: `moves`
- `levels/standalone/from_images/image04_level_editor.json`
- `levels/standalone/game_unique_levels/image04_level_editor.json`
- `levels/standalone/game_unique_levels/play_session_level_4_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_4_validate_level.json`
- `levels/standalone/valid_levels_only/image04_level_editor.json`

### Group 8
- Representative: `levels/standalone/game_unique_levels/image05_level_editor.json`
- Varying fields: `moves`
- `levels/standalone/from_images/image05_level_editor.json`
- `levels/standalone/game_unique_levels/image05_level_editor.json`
- `levels/standalone/game_unique_levels/play_session_level_5_validate_2_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_5_validate_2_level.json`
- `levels/standalone/valid_levels_only/image05_level_editor.json`

### Group 9
- Representative: `levels/standalone/game_unique_levels/image06_level_editor.json`
- Varying fields: `moves`
- `levels/standalone/from_images/image06_level_editor.json`
- `levels/standalone/game_unique_levels/image06_level_editor.json`
- `levels/standalone/game_unique_levels/play_session_level_6_validate_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_6_validate_level.json`
- `levels/standalone/valid_levels_only/image06_level_editor.json`

### Group 10
- Representative: `levels/standalone/game_unique_levels/image29_level_editor.json`
- Varying fields: `difficulty`, `meta`
- `levels/standalone/from_images/image29_level_editor.json`
- `levels/standalone/game_unique_levels/image29_level_editor.json`
- `levels/standalone/toolkit_exports/levels/level_1.json`
- `levels/standalone/valid_levels_only/image29_level_editor.json`

### Group 11
- Representative: `levels/standalone/game_unique_levels/hard_large_01_7x7.json`
- Varying fields: `board_height`, `board_width`, `difficulty`, `golden_path`, `meta`, `moves`, `solution_count`, `target_density`, `validation`
- `levels/standalone/game_unique_levels/hard_large_01_7x7.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_01_7x7.json`
- `levels/standalone/toolkit_exports/levels/tune_large_01_7x7.json`

### Group 12
- Representative: `levels/standalone/game_unique_levels/hard_large_02_8x8.json`
- Varying fields: `board_height`, `board_width`, `golden_path`, `meta`, `moves`
- `levels/standalone/game_unique_levels/hard_large_02_8x8.json`
- `levels/standalone/generated_large_hard_7x7_8x8/hard_large_02_8x8.json`
- `levels/standalone/toolkit_exports/levels/hard_10_2.json`

### Group 13
- Representative: `levels/standalone/game_unique_levels/play_session_level_6_validate_1_level.json`
- Varying fields: `board_height`, `board_width`, `difficulty`, `meta`, `moves`, `target_density`, `validation`
- `levels/standalone/game_unique_levels/play_session_level_6_validate_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_6_validate_1_level.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_6_a.json`
- `levels/standalone/toolkit_exports/levels/p_6_a.json`

### Group 14
- Representative: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_2_a.json`
- Varying fields: `difficulty`, `meta`, `moves`, `target_density`, `validation`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_2_a.json`
- `levels/standalone/toolkit_exports/levels/p_2_a.json`
- `levels/standalone/toolkit_exports/levels/p_medium_2_a.json`

### Group 15
- Representative: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_3_a.json`
- Varying fields: `difficulty`, `meta`, `target_density`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/p_3_a.json`
- `levels/standalone/toolkit_exports/levels/p_3_a.json`

### Group 16
- Representative: `levels/standalone/toolkit_exports/levels/p_2_2.json`
- Varying fields: `meta`
- `levels/standalone/toolkit_exports/levels/p_2_2.json`
- `levels/standalone/toolkit_exports/levels/p_2_3.json`
- `levels/standalone/toolkit_exports/levels/p_2_3_new_20260310163652.json`

## Same gameplay shape, different metadata
### Group 1
- Representative: `levels/standalone/game_unique_levels/new_level1_a.json`
- Varying fields: `meta`
- `levels/progressions/progressions_only/tutorial_level.json`
- `levels/standalone/game_unique_levels/new_level1_a.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_manual_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_1_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_2_level.json`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_3_level.json`
- `levels/standalone/tutorial_level.json`

### Group 2
- Representative: `levels/standalone/toolkit_exports/bundles/progression_a/jsons/tutorial_level.json`
- Varying fields: `blockers`, `board_height`, `board_width`, `meta`
- `levels/standalone/imported_from_downloads_clean/levels/play_session_level_1_validate_9_level.json`
- `levels/standalone/toolkit_exports/bundles/progression_a/jsons/tutorial_level.json`
- `levels/standalone/toolkit_exports/levels/p_tutorial.json`
- `levels/standalone/toolkit_exports/levels/tutorial_level.json`

### Group 3
- Representative: `levels/standalone/toolkit_exports/levels/p_2_2.json`
- Varying fields: `meta`
- `levels/standalone/toolkit_exports/levels/p_2_2.json`
- `levels/standalone/toolkit_exports/levels/p_2_3.json`
- `levels/standalone/toolkit_exports/levels/p_2_3_new_20260310163652.json`

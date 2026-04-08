## Canvas resize bug fix

**Date**: 2026-03-24

**File**: `level_toolkit_web/app.js` (line 2450)

**Issue**: The Level Editor canvas was not correctly resizing when transitioning to the editor view, causing layout issues on different screen sizes.

**Fix**: Corrected the `resizeEditorCanvas()` function to properly calculate and apply responsive canvas dimensions with appropriate max-width constraints and debounced resize handling.

**Impact**: Editor canvas now maintains correct aspect ratio and responsive behavior across all viewport sizes.


# Design System Rules (Locked)
Project: Feed the Bear  
Product: Soda (mobile casual game)  
Theme: Deep Ocean Light v1.0

This file is the mandatory reference for any slide/UI generation in this project.

## Mandatory Tokens
- `color.bg`: `#EFF6FF`
- `color.surface`: `#FFFFFF`
- `color.text`: `#0C1E2E`
- `color.muted`: `#6B8FA8`
- `color.border`: `#CBE0EF`
- `color.sky`: `#0EA5E9`
- `color.deep`: `#0284C7`
- `color.cyan`: `#0891B2`
- `color.navy`: `#0369A1`
- `color.light`: `#38BDF8`
- `color.pale`: `#BAE6FD`
- `color.darkest`: `#082F49`
- `color.warm`: `#F59E0B`
- `color.green`: `#16A34A`
- `color.amber`: `#D97706`
- `color.red`: `#DC2626`

Rule: Use token names in component code, not raw hex literals.

## Typography (Strict)
- Titles/Subtitles: Georgia only.
- Labels/Badges/UI headings: Trebuchet MS only, uppercase.
- Body/Bullets/Captions: Calibri only.
- No emoji.
- No centered paragraphs or centered bullet lists.
- No accent underline below titles.

## Slide Structure (Required on all content slides)
1. Top color bar (7px, full width, accent color).
2. Single dominant accent color per slide.
3. At least one visual element (not text-only).
4. Minimum outer margin: 40px.
5. Divider line under title: 1.2px, `color.border`.

## Card Pattern (Non-negotiable)
- White surface background (`color.surface`).
- Left accent bar: 5px, full height, solid accent.
- Header strip: accent at 85-92% transparency.
- Heading: Trebuchet MS, uppercase, accent color.
- Border: 1px accent at 40-50% transparency.
- Shadow (exact):
  - outer, blur 8px, offset 3px, angle 135deg
  - color `color.sky`
  - opacity 10%

## Approved Layouts
- Full-width card stack
- 2-column equal
- 3-column equal
- 4-column equal
- Chart + sidebar
- 2x2 grid
- 2x3 grid
- Cover layout

Rules:
- Do not use unapproved layouts.
- No identical consecutive slide layouts.
- Exercise slides must use 3 columns (Constraints / Structure / Discussion).

## Hard Anti-patterns
- Accent line/rule beneath title.
- Gradient backgrounds.
- More than 2 font families on one slide.
- Font sizes below 9pt.
- Cards without left accent bar.
- Black/gray shadows or shadow opacity > 20%.
- Borders thicker than 2px.
- White text on `color.bg` or `color.surface`.

## Pre-delivery Validation Checklist
- Top color bar exists and uses correct accent.
- Title is Georgia, 30pt, bold, `color.text`.
- Every card has left accent bar.
- Card headings are Trebuchet MS uppercase.
- Body text is Calibri.
- No emoji.
- No title underline/accent rule.
- Background is `color.bg`.
- Cards are on `color.surface`.
- Card shadow matches locked shadow token.
- Margins >= 40px, block gaps >= 12px.
- Layout is approved.
- <= 3 blue tones per slide.
- At least one visual element exists.

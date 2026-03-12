# Workflow Rules

- Reuse the same target file for each document or artifact whenever possible.
- Create a new file only if the required file does not already exist.
- Iterate on the existing file instead of generating versioned copies such as `_v2`, `_final`, `_final2`, or dated duplicates unless the user explicitly asks for a separate version.
- Keep one canonical file per deliverable so the latest state is always clear.
- Register every file creation and every substantive file update in `memoria.md`.
- Each `memoria.md` entry must include:
  - Date
  - File path
  - Action: `created` or `updated`
  - Short reason for the change
- Before creating a new document, check whether a matching canonical file already exists and continue editing that file if it does.

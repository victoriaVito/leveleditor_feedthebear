from __future__ import annotations

from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from .io_utils import export_levels_csv, load_level
from .validator import validate_level_output


class LevelManagerApp:
    def __init__(self, root: tk.Misc):
        self.root = root
        self.root.title("Feed the Bear - Level Manager")

        self.folder_var = tk.StringVar(value=str(Path.cwd()))
        self.rows: list[tuple[Path, str, str, str, str]] = []

        self._build_ui()
        self.refresh()

    def _build_ui(self) -> None:
        top = ttk.Frame(self.root)
        top.pack(fill=tk.X, padx=8, pady=8)

        ttk.Label(top, text="Folder").grid(row=0, column=0, sticky="w")
        ttk.Entry(top, textvariable=self.folder_var, width=62).grid(row=0, column=1, sticky="we", padx=6)
        ttk.Button(top, text="Browse", command=self._browse).grid(row=0, column=2)
        ttk.Button(top, text="Refresh", command=self.refresh).grid(row=0, column=3, padx=6)
        ttk.Button(top, text="Export CSV", command=self.export_csv).grid(row=0, column=4)

        cols = ("file", "level", "moves", "solutions", "density", "status")
        self.tree = ttk.Treeview(self.root, columns=cols, show="headings", height=16)
        for c, w in zip(cols, (290, 60, 70, 80, 120, 120)):
            self.tree.heading(c, text=c.upper())
            self.tree.column(c, width=w, anchor="center")
        self.tree.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 8))

        self.status = ttk.Label(self.root, text="Ready")
        self.status.pack(fill=tk.X, padx=8, pady=(0, 8))

    def _browse(self) -> None:
        selected = filedialog.askdirectory(initialdir=self.folder_var.get())
        if selected:
            self.folder_var.set(selected)
            self.refresh()

    def refresh(self) -> None:
        folder = Path(self.folder_var.get())
        self.tree.delete(*self.tree.get_children())
        self.rows.clear()

        if not folder.exists():
            self.status.configure(text="Folder does not exist")
            return

        files = sorted(folder.glob("*.json"))
        ok = 0
        for path in files:
            try:
                level = load_level(path)
                report = validate_level_output(level)
                status = "OK" if report.valid else "INVALID"
                if report.valid:
                    ok += 1
                row = (
                    path,
                    str(level.level),
                    str(level.moves) if level.moves is not None else "-",
                    str(level.solution_count),
                    level.target_density,
                    status,
                )
            except Exception:
                row = (path, "-", "-", "-", "-", "PARSE_ERROR")
            self.rows.append(row)
            self.tree.insert("", tk.END, values=(path.name, row[1], row[2], row[3], row[4], row[5]))

        self.status.configure(text=f"files={len(files)} valid={ok} invalid={len(files) - ok}")

    def export_csv(self) -> None:
        folder = Path(self.folder_var.get())
        levels = []
        for path in sorted(folder.glob("*.json")):
            try:
                levels.append(load_level(path))
            except Exception:
                continue
        if not levels:
            messagebox.showwarning("No data", "No parseable level JSON files found.")
            return

        out = filedialog.asksaveasfilename(
            title="Export CSV",
            defaultextension=".csv",
            filetypes=[("CSV", "*.csv")],
            initialfile="levels_summary.csv",
        )
        if not out:
            return
        export_levels_csv(levels, Path(out))
        messagebox.showinfo("Saved", f"CSV saved:\n{out}")


def launch_manager(parent: tk.Misc | None = None) -> None:
    if parent is None:
        root = tk.Tk()
        LevelManagerApp(root)
        root.mainloop()
        return
    window = tk.Toplevel(parent)
    LevelManagerApp(window)

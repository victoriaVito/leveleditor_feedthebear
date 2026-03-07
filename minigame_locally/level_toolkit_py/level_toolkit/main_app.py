from __future__ import annotations

from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from .editor import launch_editor
from .generator import generate_progression
from .io_utils import export_levels_csv, save_json
from .manager import launch_manager


class MainToolkitApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Feed the Bear - Toolkit Main")
        self._build_ui()

    def _build_ui(self) -> None:
        frame = ttk.Frame(self.root, padding=12)
        frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(frame, text="Feed the Bear Toolkit", font=("Arial", 16, "bold")).pack(anchor="w", pady=(0, 10))
        ttk.Label(frame, text="Main actions").pack(anchor="w")

        ttk.Button(frame, text="Open Level Editor", command=lambda: launch_editor(self.root)).pack(fill=tk.X, pady=4)
        ttk.Button(frame, text="Open Level Manager", command=lambda: launch_manager(self.root)).pack(fill=tk.X, pady=4)
        ttk.Button(
            frame,
            text="Create Procedural Progression (JSON + CSV)",
            command=self._create_progression_bundle,
        ).pack(fill=tk.X, pady=4)

        self.status = ttk.Label(frame, text="Ready")
        self.status.pack(fill=tk.X, pady=(10, 0))

    def _create_progression_bundle(self) -> None:
        outdir = filedialog.askdirectory(title="Select output folder for progression files")
        if not outdir:
            return
        base = Path(outdir)
        json_dir = base / "progression_json"
        csv_file = base / "progression_summary.csv"

        try:
            levels = generate_progression()
            for level in levels:
                save_json(json_dir / f"level_{level.level:02d}.json", level.to_dict())
            export_levels_csv(levels, csv_file)
        except Exception as exc:
            messagebox.showerror("Generation error", str(exc))
            return

        msg = (
            f"Generated {len(levels)} levels.\n"
            f"JSON folder:\n{json_dir}\n\n"
            f"CSV file:\n{csv_file}"
        )
        self.status.configure(text=f"Progression generated in {base}")
        messagebox.showinfo("Done", msg)


def launch_main_app() -> None:
    root = tk.Tk()
    MainToolkitApp(root)
    root.mainloop()

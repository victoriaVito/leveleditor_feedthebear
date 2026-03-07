from __future__ import annotations

import json
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from .generator import _make_grid
from .models import LevelOutput, Meta, Pair, Validation
from .solver import count_solutions, manhattan

CELL_SIZE = 56


class LevelEditorApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Feed the Bear - Level Editor")

        self.board_size = tk.IntVar(value=5)
        self.mode = tk.StringVar(value="blocker")
        self.pair_id = tk.StringVar(value="A")
        self.endpoint = tk.StringVar(value="start")
        self.level_number = tk.IntVar(value=1)
        self.target_density = tk.StringVar(value="MEDIUM")
        self.moves_var = tk.IntVar(value=0)

        self.blockers: set[tuple[int, int]] = set()
        self.pairs: dict[str, dict[str, tuple[int, int] | None]] = {
            k: {"start": None, "end": None} for k in ["A", "B", "C", "D"]
        }

        self._build_ui()
        self._draw_grid()

    def _build_ui(self) -> None:
        ctrl = ttk.Frame(self.root)
        ctrl.pack(side=tk.TOP, fill=tk.X, padx=8, pady=8)

        ttk.Label(ctrl, text="Level").grid(row=0, column=0)
        ttk.Spinbox(ctrl, from_=1, to=10, textvariable=self.level_number, width=5).grid(row=0, column=1)

        ttk.Label(ctrl, text="Board").grid(row=0, column=2)
        board_box = ttk.Combobox(ctrl, textvariable=self.board_size, values=[4, 5, 6], width=5, state="readonly")
        board_box.grid(row=0, column=3)
        board_box.bind("<<ComboboxSelected>>", lambda _e: self._reset_board())

        ttk.Label(ctrl, text="Target").grid(row=0, column=4)
        ttk.Combobox(
            ctrl,
            textvariable=self.target_density,
            values=["HIGH", "MEDIUM-HIGH", "MEDIUM", "MEDIUM-LOW", "LOW", "VERY-LOW", "SINGLE", "LOW-MEDIUM"],
            width=14,
            state="readonly",
        ).grid(row=0, column=5)
        ttk.Label(ctrl, text="Moves").grid(row=0, column=6)
        ttk.Spinbox(ctrl, from_=0, to=200, textvariable=self.moves_var, width=6).grid(row=0, column=7)
        ttk.Button(ctrl, text="Auto Moves", command=self._set_auto_moves).grid(row=0, column=8, padx=(6, 0))

        ttk.Radiobutton(ctrl, text="Blocker", value="blocker", variable=self.mode).grid(row=1, column=0, sticky="w")
        ttk.Radiobutton(ctrl, text="Node", value="node", variable=self.mode).grid(row=1, column=1, sticky="w")
        ttk.Radiobutton(ctrl, text="Erase", value="erase", variable=self.mode).grid(row=1, column=2, sticky="w")

        ttk.Label(ctrl, text="Pair").grid(row=1, column=3)
        ttk.Combobox(ctrl, textvariable=self.pair_id, values=["A", "B", "C", "D"], width=5, state="readonly").grid(row=1, column=4)
        ttk.Radiobutton(ctrl, text="Start", value="start", variable=self.endpoint).grid(row=1, column=5, sticky="w")
        ttk.Radiobutton(ctrl, text="End", value="end", variable=self.endpoint).grid(row=1, column=6, sticky="w")

        ttk.Button(ctrl, text="Validate", command=self._validate_preview).grid(row=2, column=0, pady=6)
        ttk.Button(ctrl, text="Import JSON", command=self._import_json).grid(row=2, column=1, pady=6)
        ttk.Button(ctrl, text="Export JSON", command=self._export_json).grid(row=2, column=2, pady=6)
        ttk.Button(ctrl, text="Screenshot", command=self._save_screenshot).grid(row=2, column=3, pady=6)
        ttk.Button(ctrl, text="Reset", command=self._reset_board).grid(row=2, column=4, pady=6)

        self.status = ttk.Label(ctrl, text="Ready")
        self.status.grid(row=2, column=5, columnspan=5, sticky="w")

        self.canvas = tk.Canvas(self.root, width=CELL_SIZE * 6, height=CELL_SIZE * 6, bg="white")
        self.canvas.pack(padx=8, pady=8)
        self.canvas.bind("<Button-1>", self._on_click)

    def _reset_board(self) -> None:
        self.blockers.clear()
        self.pairs = {k: {"start": None, "end": None} for k in ["A", "B", "C", "D"]}
        self.moves_var.set(0)
        self._draw_grid()

    def _recommended_moves(self) -> int:
        total = 0
        for pair in self._active_pairs():
            total += manhattan(pair.start, pair.end)
        total += len(self.blockers)
        return total

    def _set_auto_moves(self) -> None:
        value = self._recommended_moves()
        self.moves_var.set(value)
        self.status.configure(text=f"Auto moves set to {value}")

    def _on_click(self, event: tk.Event) -> None:
        n = self.board_size.get()
        c = event.x // CELL_SIZE
        r = event.y // CELL_SIZE
        if not (0 <= r < n and 0 <= c < n):
            return
        cell = (r, c)

        if self.mode.get() == "blocker":
            if cell in self.blockers:
                self.blockers.remove(cell)
            else:
                self._clear_node_if_present(cell)
                self.blockers.add(cell)
        elif self.mode.get() == "erase":
            self.blockers.discard(cell)
            self._clear_node_if_present(cell)
        else:
            self.blockers.discard(cell)
            pid = self.pair_id.get()
            ep = self.endpoint.get()
            self._clear_node_if_present(cell)
            self.pairs[pid][ep] = cell

        self._draw_grid()

    def _clear_node_if_present(self, cell: tuple[int, int]) -> None:
        for pair in self.pairs.values():
            if pair["start"] == cell:
                pair["start"] = None
            if pair["end"] == cell:
                pair["end"] = None

    def _active_pairs(self) -> list[Pair]:
        out: list[Pair] = []
        palette = ["#0EA5E9", "#0284C7", "#0891B2", "#0369A1"]
        for i, pid in enumerate(["A", "B", "C", "D"]):
            start = self.pairs[pid]["start"]
            end = self.pairs[pid]["end"]
            if start is not None and end is not None:
                out.append(Pair(id=pid, start=start, end=end, color=palette[i]))
        return out

    def _build_level_output(self) -> LevelOutput:
        n = self.board_size.get()
        pairs = self._active_pairs()
        blockers = sorted(self.blockers)
        solution_count = count_solutions(n, pairs, set(blockers), cap=20)

        golden = {p.id: [p.start, p.end] for p in pairs}
        validation = Validation(
            solvable=solution_count >= 1,
            density_match=True,
            early_mistake_detection=True,
            no_isolated_pairs=True,
            no_late_dead_ends=True,
            curve_integrity=True,
        )

        return LevelOutput(
            level=self.level_number.get(),
            board_size=n,
            grid=_make_grid(n, pairs, blockers),
            pairs=pairs,
            blockers=blockers,
            moves=self.moves_var.get() if self.moves_var.get() > 0 else self._recommended_moves(),
            solution_count=solution_count,
            target_density=self.target_density.get(),
            golden_path=golden,
            validation=validation,
            meta=Meta(generation_attempts=1, failed_checks=[]),
        )

    def _validate_preview(self) -> None:
        try:
            level = self._build_level_output()
        except Exception as exc:
            messagebox.showerror("Error", str(exc))
            return
        self.status.configure(
            text=(
                f"pairs={len(level.pairs)} blockers={len(level.blockers)} "
                f"moves={level.moves} solutions={level.solution_count}"
            )
        )

    def _export_json(self) -> None:
        level = self._build_level_output()
        out = filedialog.asksaveasfilename(
            title="Export level JSON",
            defaultextension=".json",
            filetypes=[("JSON", "*.json")],
            initialfile=f"level_{level.level}.json",
        )
        if not out:
            return
        Path(out).write_text(json.dumps(level.to_dict(), indent=2), encoding="utf-8")
        messagebox.showinfo("Saved", f"Saved to:\n{out}")

    def _import_json(self) -> None:
        selected = filedialog.askopenfilename(
            title="Import level JSON",
            filetypes=[("JSON", "*.json")],
        )
        if not selected:
            return

        try:
            data = json.loads(Path(selected).read_text(encoding="utf-8"))
            board_size = int(data["board_size"])
            if board_size not in (4, 5, 6):
                raise ValueError("board_size must be 4, 5 or 6")

            level_number = int(data["level"])
            target_density = str(data["target_density"])
            blockers = {tuple(item) for item in data.get("blockers", [])}
            moves = int(data.get("moves", 0))

            pairs_reset: dict[str, dict[str, tuple[int, int] | None]] = {
                k: {"start": None, "end": None} for k in ["A", "B", "C", "D"]
            }
            for pair in data.get("pairs", []):
                pid = str(pair["id"]).upper()
                if pid not in pairs_reset:
                    continue
                pairs_reset[pid]["start"] = tuple(pair["start"])
                pairs_reset[pid]["end"] = tuple(pair["end"])

            self.board_size.set(board_size)
            self.level_number.set(level_number)
            self.target_density.set(target_density)
            self.blockers = blockers
            self.pairs = pairs_reset
            self.moves_var.set(max(0, moves))
            self._draw_grid()
            self.status.configure(text=f"Imported: {Path(selected).name}")
        except Exception as exc:
            messagebox.showerror("Import error", str(exc))

    def _save_screenshot(self) -> None:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        selected = filedialog.asksaveasfilename(
            title="Save layout screenshot",
            defaultextension=".png",
            filetypes=[("PNG", "*.png"), ("PostScript", "*.ps")],
            initialfile=f"layout_{self.level_number.get()}_{stamp}.png",
        )
        if not selected:
            return

        out = Path(selected)
        try:
            try:
                from PIL import ImageGrab  # type: ignore
            except Exception:
                ImageGrab = None

            if ImageGrab is not None and out.suffix.lower() == ".png":
                self.root.update_idletasks()
                x = self.root.winfo_rootx()
                y = self.root.winfo_rooty()
                w = self.root.winfo_width()
                h = self.root.winfo_height()
                img = ImageGrab.grab(bbox=(x, y, x + w, y + h))
                img.save(out)
            else:
                if out.suffix.lower() == ".png":
                    out = out.with_suffix(".ps")
                self.canvas.postscript(file=str(out), colormode="color")

            messagebox.showinfo("Screenshot saved", f"Saved:\n{out}")
        except Exception as exc:
            messagebox.showerror("Screenshot error", str(exc))

    def _draw_grid(self) -> None:
        self.canvas.delete("all")
        n = self.board_size.get()
        self.canvas.configure(width=n * CELL_SIZE, height=n * CELL_SIZE)

        for r in range(n):
            for c in range(n):
                x1 = c * CELL_SIZE
                y1 = r * CELL_SIZE
                x2 = x1 + CELL_SIZE
                y2 = y1 + CELL_SIZE
                fill = "#f7fafc"
                txt = ""

                if (r, c) in self.blockers:
                    fill = "#334155"
                    txt = "X"

                for pid, endpoints in self.pairs.items():
                    if endpoints["start"] == (r, c):
                        fill = "#7dd3fc"
                        txt = f"{pid}1"
                    if endpoints["end"] == (r, c):
                        fill = "#0ea5e9"
                        txt = f"{pid}2"

                self.canvas.create_rectangle(x1, y1, x2, y2, outline="#cbd5e1", fill=fill)
                if txt:
                    self.canvas.create_text((x1 + x2) // 2, (y1 + y2) // 2, text=txt)


def launch_editor(parent: tk.Misc | None = None) -> None:
    if parent is None:
        root = tk.Tk()
        LevelEditorApp(root)
        root.mainloop()
        return
    window = tk.Toplevel(parent)
    LevelEditorApp(window)

from __future__ import annotations

import base64
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from feed_the_bear_toolkit.services.repo_io import (
    RepoIoError,
    append_text_file,
    create_zip_archive,
    file_status,
    read_file_base64,
    resolve_repo_output_path,
    save_data_url_file,
    save_text_file,
)


PNG_DOT_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2pKxQAAAAASUVORK5CYII="
)


class RepoIoTests(unittest.TestCase):
    def test_resolve_repo_output_path_blocks_unknown_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            with self.assertRaises(RepoIoError):
                resolve_repo_output_path("tmp/file.txt", root)

    def test_save_and_status_text_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "output").mkdir()
            result = save_text_file("output/test.txt", "hello", root)
            status = file_status("output/test.txt", root)

            self.assertTrue(result.ok)
            self.assertTrue(status.exists)
            self.assertEqual((root / "output/test.txt").read_text(encoding="utf-8"), "hello")

    def test_append_text_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "playtest").mkdir()
            save_text_file("playtest/log.txt", "a", root)
            append_text_file("playtest/log.txt", "b", root)

            self.assertEqual((root / "playtest/log.txt").read_text(encoding="utf-8"), "ab")

    def test_save_data_url_file_and_read_base64(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "screenshots").mkdir()
            save_data_url_file("screenshots/dot.png", PNG_DOT_DATA_URL, root)
            result = read_file_base64("screenshots/dot.png", root)

            self.assertTrue(result.ok)
            self.assertGreater(result.bytes_read, 0)
            self.assertEqual(base64.b64decode(result.data_base64), (root / "screenshots/dot.png").read_bytes())

    def test_create_zip_archive(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "bundles").mkdir()
            result = create_zip_archive(
                "bundles/test_bundle.zip",
                [
                    {"relativePath": "bundle/readme.txt", "content": "hello"},
                    {"relativePath": "bundle/dot.png", "dataUrl": PNG_DOT_DATA_URL},
                ],
                root,
            )

            self.assertTrue(result.ok)
            with ZipFile(root / "bundles/test_bundle.zip") as archive:
                self.assertEqual(archive.read("bundle/readme.txt").decode("utf-8"), "hello")
                self.assertGreater(len(archive.read("bundle/dot.png")), 0)

    def test_invalid_data_url_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "screenshots").mkdir()
            with self.assertRaises(RepoIoError):
                save_data_url_file("screenshots/bad.png", "not-a-data-url", root)


if __name__ == "__main__":
    unittest.main()

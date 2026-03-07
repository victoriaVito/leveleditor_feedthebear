@echo off
setlocal

set ROOT=%~dp0\..
cd /d "%ROOT%"

py -m venv .venv-build
call .venv-build\\Scripts\\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements-build.txt

python -m PyInstaller --noconfirm --clean ^
  --name FeedTheBearToolkit ^
  --windowed ^
  --onefile ^
  main_gui.py

if not exist release\\windows mkdir release\\windows
copy /Y dist\\FeedTheBearToolkit.exe release\\windows\\FeedTheBearToolkit.exe >nul

certutil -hashfile release\\windows\\FeedTheBearToolkit.exe SHA256 > release\\checksums.txt
echo Windows build ready: release\\windows\\FeedTheBearToolkit.exe

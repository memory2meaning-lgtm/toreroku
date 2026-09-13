@echo off
rem Push toreroku (main) to GitHub. Double-click and read the result.
cd /d C:\toreroku
git status --short
git push origin main
echo.
echo Done. Press any key to close.
pause >nul

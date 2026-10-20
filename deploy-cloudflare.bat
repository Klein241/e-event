@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ========================================================
echo   COMPAGNON DE CEREMONIE - DEPLOIEMENT CLOUDFLARE 1-CLIC
echo ========================================================
echo.
node scripts\deploy-cloudflare.cjs
echo.
pause

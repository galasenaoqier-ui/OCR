@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist dist (
  echo 未找到 dist 成品，请先运行 npm run build 后再启动局域网部署。
  pause
  exit /b 1
)

echo 正在启动「殷契拾文」局域网服务（0.0.0.0:4173）...
start "Yinqi LAN Server" /min cmd /k "set HOST=0.0.0.0&& node serve-dist.cjs 4173"
timeout /t 3 /nul >nul

echo.
echo 本机地址： http://localhost:4173/
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=1* delims= " %%b in ("%%a") do echo 局域网地址： http://%%b:4173/
)
echo 请确保本机 Windows 防火墙已允许 Node.js 或该端口访问。
echo.

start "" "http://localhost:4173/"
exit /b

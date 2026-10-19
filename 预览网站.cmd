@echo off
chcp 65001 >nul
title weegoto 网站 · 本机预览
cd /d "%~dp0"

echo.
echo   ============================================
echo     EEG 抑郁症识别项目 · 官方网站  本机预览
echo   ============================================
echo.

rem 检查 dist 是否已构建
if not exist "dist\index.html" (
  echo   [错误] 没有找到 dist\index.html
  echo.
  echo   请先构建：
  echo       npm install
  echo       npm run build
  echo.
  pause
  exit /b 1
)

rem 优先用 python（免安装依赖）
where python >nul 2>nul
if not errorlevel 1 (
  echo   地址： http://127.0.0.1:8080/
  echo   关闭这个窗口即可停止服务器。
  echo.
  start "" "http://127.0.0.1:8080/index.html"
  python -m http.server 8080 --bind 127.0.0.1 --directory "%~dp0dist"
  goto :eof
)

rem 退而求其次用 Node
where node >nul 2>nul
if not errorlevel 1 (
  echo   没有找到 python，改用 Node 内置服务器。
  echo   地址： http://127.0.0.1:8080/
  echo   关闭这个窗口即可停止服务器。
  echo.
  start "" "http://127.0.0.1:8080/index.html"
  npm run preview -- --host 127.0.0.1 --port 8080
  goto :eof
)

echo   [错误] 没有找到 python，也没有找到 node。
echo.
echo   替代方案：在浏览器里直接打开 HTML 是不行的（样式和链接都会失效），
echo   因为静态站点必须通过 HTTP 提供。请安装 Node.js 后运行：
echo       npm install
echo       npm run preview
echo.
pause

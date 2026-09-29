@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1

if /i "%~1"=="back" goto back
if /i "%~1"=="front" goto front

set "BACK_PYTHON=%~dp0.venv\Scripts\python.exe"
if not exist "%BACK_PYTHON%" set "BACK_PYTHON=%~dp0SCOMPTEC- Back\venv\Scripts\python.exe"
if not exist "%BACK_PYTHON%" (
    echo [ERRO] Ambiente Python nao encontrado. Crie .venv e instale as dependencias:
    echo py -m venv .venv
    echo .venv\Scripts\python.exe -m pip install -r "SCOMPTEC- Back\requirements.txt"
    goto erro
)
"%BACK_PYTHON%" -c "import uvicorn, fastapi, sqlalchemy, pymysql, email_validator, dotenv"
if errorlevel 1 (
    echo [ERRO] Instale as dependencias do backend:
    echo "%BACK_PYTHON%" -m pip install -r "SCOMPTEC- Back\requirements.txt"
    goto erro
)
where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Instale o Node.js e abra este arquivo novamente.
    goto erro
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERRO] npm nao encontrado. Verifique a instalacao do Node.js.
    goto erro
)
if not exist "scomptec-cnc front 2\node_modules\.bin\vite.cmd" (
    echo [ERRO] Instale as dependencias do frontend:
    echo cd "scomptec-cnc front 2"
    echo npm install
    goto erro
)
if /i "%~1"=="--check" (
    echo Dependencias de inicializacao encontradas.
    exit /b 0
)

start "SCOMPTEC - Backend" "%ComSpec%" /d /k call "%~f0" back
start "SCOMPTEC - Frontend" "%ComSpec%" /d /k call "%~f0" front
echo Inicializacao solicitada. Confira os logs nas duas janelas.
echo Frontend: http://localhost:5173
echo API: http://localhost:8000/docs
echo Para parar, pressione Ctrl+C em cada janela.
exit /b 0

:back
title SCOMPTEC - Backend
cd /d "%~dp0SCOMPTEC- Back"
if errorlevel 1 exit /b 1
"%BACK_PYTHON%" -m uvicorn Main:app --reload --host 0.0.0.0 --port 8000
exit /b %errorlevel%

:front
title SCOMPTEC - Frontend
cd /d "%~dp0scomptec-cnc front 2"
if errorlevel 1 exit /b 1
call npm.cmd run dev -- --port 5173 --strictPort --open
exit /b %errorlevel%

:erro
if /i not "%~1"=="--check" pause
exit /b 1

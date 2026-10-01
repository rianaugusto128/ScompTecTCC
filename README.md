# SCOMPTEC — V2

Sistema de monitoramento de máquinas CNC, com API FastAPI, painel React/Vite,
aplicativo Electron, histórico de telemetria e integração com Arduino Opta WiFi.

## Requisitos

- Python 3.10 ou superior;
- Node.js 22.12 ou superior e npm;
- MySQL 8 ou compatível, em execução e acessível;
- Git, caso o projeto seja obtido por clone.

O `requirements.txt` da raiz e a pasta `tests/` da raiz pertencem a uma versão
legada baseada em MongoDB. Para a aplicação atual, use os arquivos dentro de
`SCOMPTEC- Back` e os testes em `SCOMPTEC- Back/tests`.

## Setup inicial

Execute os comandos a partir da raiz do repositório. O backend e o frontend
usam ambientes separados: o Python usa `.venv` e o Node usa `node_modules`.

### Windows — PowerShell

```powershell
py -3 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r "SCOMPTEC- Back\requirements-dev.txt"
npm --prefix "scomptec-cnc front 2" ci
```

Se `py` não estiver disponível, substitua-o por `python`.

### Linux — Bash

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r 'SCOMPTEC- Back/requirements-dev.txt'
npm --prefix 'scomptec-cnc front 2' ci
```

Em distribuições Debian/Ubuntu, instale antes o suporte a ambientes virtuais
se necessário: `sudo apt install python3-venv`.

## Ativação dos ambientes

A ativação é opcional: os comandos acima também podem ser executados chamando
diretamente `.venv/Scripts/python.exe` (Windows) ou `.venv/bin/python` (Linux).

### Windows — PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
```

Se o PowerShell bloquear scripts apenas nesta sessão, use:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

No Prompt de Comando (`cmd.exe`), a ativação equivalente é:

```cmd
.venv\Scripts\activate.bat
```

### Linux — Bash

```bash
source .venv/bin/activate
```

Quando ativado, o terminal exibirá `(.venv)` no início da linha. Para sair do
ambiente, execute `deactivate`.

Não existe uma ativação equivalente para o frontend: depois de `npm ci`, o npm
usa automaticamente `scomptec-cnc front 2/node_modules`.

## Configuração do banco e dos arquivos `.env`

Crie o banco no MySQL antes de iniciar a API:

```sql
CREATE DATABASE cnc_monitor CHARACTER SET utf8mb4;
```

Copie os modelos de configuração. No Windows PowerShell:

```powershell
Copy-Item 'SCOMPTEC- Back/.env.example' 'SCOMPTEC- Back/.env'
Copy-Item 'scomptec-cnc front 2/.env.example' 'scomptec-cnc front 2/.env'
```

No Linux:

```bash
cp 'SCOMPTEC- Back/.env.example' 'SCOMPTEC- Back/.env'
cp 'scomptec-cnc front 2/.env.example' 'scomptec-cnc front 2/.env'
```

No `.env` do backend, ajuste pelo menos `DATABASE_URL`, `AUTH_SECRET`,
`ADMIN_EMAIL` e `ADMIN_PASSWORD`:

```dotenv
DATABASE_URL=mysql+pymysql://USUARIO:SENHA@127.0.0.1:3306/cnc_monitor?charset=utf8mb4
AUTH_SECRET=uma-chave-privada-e-aleatoria
ADMIN_EMAIL=admin@empresa.com.br
ADMIN_PASSWORD=troque-esta-senha
```

No `.env` do frontend, mantenha a API local durante o desenvolvimento:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_USE_MOCKS=false
```

Caracteres especiais na senha do MySQL devem ser codificados na URL. Nunca
versione `.env` ou coloque credenciais do banco em variáveis `VITE_*`.

## Execução local

Abra dois terminais na raiz. No primeiro, inicie o backend:

```bash
.venv/bin/python -m uvicorn Main:app --app-dir 'SCOMPTEC- Back' --reload --host 0.0.0.0 --port 8000
```

No Windows, com o ambiente ativado, o mesmo comando pode ser usado; sem
ativação, troque o executável por `.venv\\Scripts\\python.exe`.

No segundo terminal, inicie o frontend:

```bash
npm --prefix 'scomptec-cnc front 2' run dev -- --host 0.0.0.0
```

Acesse:

- Painel: http://localhost:5173
- API: http://localhost:8000/docs
- Saúde da API: http://localhost:8000/api/health

No Windows, `iniciar.cmd` automatiza a abertura do backend e do frontend em
duas janelas. Execute `.\iniciar.cmd` pelo PowerShell ou dê duplo clique no
arquivo. No Linux, use os comandos dos dois terminais acima.

Para o aplicativo Electron em desenvolvimento:

```bash
npm --prefix 'scomptec-cnc front 2' run electron:dev
```

## Testes e build

Com o ambiente Python ativado:

```bash
python -m pytest -q
npm --prefix 'scomptec-cnc front 2' run build
npm --prefix 'scomptec-cnc front 2' run lint
```

Para gerar o instalador Electron, configure o `.env` do frontend e execute
`npm --prefix 'scomptec-cnc front 2' run electron:build`. A URL da API é
incorporada no build.

## Documentação

- [Administração e primeiro acesso](docs/ADMINISTRACAO.md)
- [Integração com Arduino Opta](INTEGRACAO_OPTA.md)
- [Guia da equipe](docs/GUIA_EQUIPE.md)
- [Documentação específica do backend](SCOMPTEC-%20Back/README.md)
- [Documentação específica do frontend](scomptec-cnc%20front%202/README.md)

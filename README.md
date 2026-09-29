# SCOMPTEC — V2

Projeto privado de monitoramento de máquinas CNC, com painel web, administração de usuários e histórico de telemetria.

## Tecnologias

- Backend: Python, FastAPI e SQLAlchemy.
- Banco de dados: **MySQL**, com driver PyMySQL.
- Frontend: React e Vite, com versão desktop em Electron.
- Dispositivo: Arduino Opta WiFi.

## Configuração inicial

Tenha Python, Node.js/npm e MySQL instalados. Na raiz do projeto:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r "SCOMPTEC- Back\requirements.txt"
npm --prefix "scomptec-cnc front 2" install
```

Na primeira configuração, copie o `.env.example` de cada pasta para `.env`:

- `SCOMPTEC- Back/.env`
- `scomptec-cnc front 2/.env`

Crie o banco no MySQL:

```sql
CREATE DATABASE cnc_monitor CHARACTER SET utf8mb4;
```

No `.env` do backend, ajuste a conexão:

```dotenv
DATABASE_URL=mysql+pymysql://USUARIO:SENHA@127.0.0.1:3306/cnc_monitor?charset=utf8mb4
```

Defina também `AUTH_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` para o primeiro acesso administrativo. As tabelas são criadas ao iniciar o backend em um banco novo. Para bancos existentes, consulte as migrações em `SCOMPTEC- Back/Database/migrations`.

## Executar no Windows

Com o MySQL em execução, dê dois cliques em `iniciar.cmd` ou execute:

```powershell
.\iniciar.cmd
```

- Painel: http://localhost:5173
- Documentação da API: http://localhost:8000/docs

Para encerrar, pressione `Ctrl+C` nas janelas do backend e do frontend.

## Documentação

- [Administração e primeiro acesso](docs/ADMINISTRACAO.md)
- [Integração com Arduino Opta](INTEGRACAO_OPTA.md)
- [Guia da equipe](docs/GUIA_EQUIPE.md)

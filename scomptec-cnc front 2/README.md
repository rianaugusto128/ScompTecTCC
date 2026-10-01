# SCOMPTEC — Monitoramento CNC (Frontend)

Frontend do sistema de monitoramento remoto para máquinas de usinagem CNC,
construído com React + Vite + Tailwind CSS + React Router. Em produção, consome
a API REST FastAPI em `SCOMPTEC- Back`; o modo mock continua disponível para
apresentações sem backend.

## Stack

- React 19 + Vite
- Tailwind CSS 3
- React Router 6
- Lucide React (ícones)
- Recharts (gráfico de utilização)

## Requisitos e como rodar localmente

Use Node.js 22.12 ou superior. Na raiz do repositório, instale as dependências
com o lockfile versionado:

```bash
npm --prefix "scomptec-cnc front 2" ci
```

Depois, nesta pasta (`scomptec-cnc front 2`):

```bash
npm run dev
```

O projeto sobe por padrão em `http://localhost:5173`.

Para gerar o build de produção:

```bash
npm run build
npm run preview
```

## Aplicativo Electron com backend no Render

O instalador abre a interface local em `scomptec://app`, sem precisar hospedar o
frontend. Essa origem é autorizada pelo backend. Em desenvolvimento, a interface
continua em `http://localhost:5173`.

Antes de gerar o instalador, configure o `.env` desta pasta:

```dotenv
VITE_API_BASE_URL=https://SEU-BACKEND.onrender.com/api
VITE_USE_MOCKS=false
```

Substitua `SEU-BACKEND` pelo serviço real. Execute `npm run electron:build` e
instale a nova versão disponível em `release/`. A URL é incorporada durante o
build: alterar o `.env` não atualiza um `.exe` já distribuído. Ao atualizar do
protocolo antigo `file://`, será necessário fazer login novamente.

No Render, use a pasta raiz `SCOMPTEC- Back`, build `pip install -r requirements.txt`
e início `uvicorn Main:app --host 0.0.0.0 --port $PORT` (o `M` é maiúsculo).
Cadastre lá as variáveis do backend, incluindo `DATABASE_URL` e `AUTH_SECRET`.
As credenciais do banco não devem entrar no `.env` do frontend.
Após publicar, verifique `/api/health`: deve retornar banco e serviço com status `ok`.

## Fluxo de navegação

```
/               → Splash (abertura)
/inicio         → Landing page do produto
/login          → Login
/registro       → Criação de conta
/selecionar-empresa → Seleção de empresa/unidade (multi-tenant)

/dashboard      → Dashboard principal
/maquinas       → Listagem de máquinas
/maquinas/:id   → Detalhe de uma máquina
/alertas        → Alertas (com filtros)
/historico      → Histórico de estados (com filtros)
/clientes       → Clientes (área SCOMPTEC)
/unidades       → Unidades / setores
/dispositivos   → Dispositivos físicos de aquisição
/configuracoes  → Configurações de conta

/tv             → Modo TV (painel para monitores industriais)
```

## Estrutura do projeto

```
src/
├── components/     # Componentes reutilizáveis (Sidebar, Header, StatCard, MachineCard,
│                   #  StatusBadge, AlertCard, charts/UtilizationChart, EmptyState, LoadingState)
├── layouts/        # DashboardLayout (com sidebar) e TVLayout (sem sidebar)
├── pages/          # Uma pasta por tela do fluxo
├── services/       # api.js (camada REST mockada) e websocket.js (tempo real, stub)
├── data/           # mockData.js — dados de exemplo, isolados da interface
├── hooks/          # useMachines, useAlerts — consomem services/api.js
└── utils/          # status.js — configuração central de cores/ícones/labels de estado
```

## Conectando à API real (FastAPI)

Toda a comunicação com dados passa por `src/services/api.js`. Com `VITE_USE_MOCKS=false`,
as operações implementadas usam os endpoints FastAPI configurados em `VITE_API_BASE_URL`.
Com `VITE_USE_MOCKS=true`, o frontend usa dados de demonstração para os painéis ainda
sem integração completa.

Para atualização em tempo real via WebSocket, `src/services/websocket.js` já expõe uma
interface (`connect`, `onMachineUpdate`) pronta para ser implementada com STOMP/SockJS
ou WebSocket nativo, sem quebrar o contrato usado pelos hooks.

## Estados de máquina

A paleta e os rótulos de cada estado (Operando, Parada, Alarme, Emergência, Desligada,
Sem comunicação) estão centralizados em `src/utils/status.js`. Qualquer novo componente
que precise exibir status deve consumir esse arquivo para manter consistência visual.

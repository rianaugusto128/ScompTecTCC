# SCOMPTEC — Monitoramento CNC (Frontend)

Frontend do sistema de monitoramento remoto para máquinas de usinagem CNC, desenvolvido
para o desafio da SCOMPTEC. Construído com React + Vite + Tailwind CSS + React Router,
com dados mockados prontos para serem substituídos por uma API REST em Spring Boot.

## Stack

- React 19 + Vite
- Tailwind CSS 3
- React Router 6
- Lucide React (ícones)
- Recharts (gráfico de utilização)

## Como rodar localmente

```bash
npm install
npm run dev
```

O projeto sobe por padrão em `http://localhost:5173`.

Para gerar o build de produção:

```bash
npm run build
npm run preview
```

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

## Conectando à API real (Spring Boot)

Toda a comunicação com dados passa por `src/services/api.js`. Cada função já simula o
formato de resposta esperado; para plugar o backend real, basta trocar o corpo de cada
função por uma chamada `fetch`/`axios` ao endpoint correspondente, mantendo a mesma
assinatura. Os hooks em `src/hooks/` e as páginas não precisam ser alterados.

Para atualização em tempo real via WebSocket, `src/services/websocket.js` já expõe uma
interface (`connect`, `onMachineUpdate`) pronta para ser implementada com STOMP/SockJS
ou WebSocket nativo, sem quebrar o contrato usado pelos hooks.

## Estados de máquina

A paleta e os rótulos de cada estado (Operando, Parada, Alarme, Emergência, Desligada,
Sem comunicação) estão centralizados em `src/utils/status.js`. Qualquer novo componente
que precise exibir status deve consumir esse arquivo para manter consistência visual.

> Atualização: o dispositivo adotado é o **Arduino Opta WiFi**. Consulte [o contrato de integração e a configuração atual](INTEGRACAO_OPTA.md). Referências a ESP32 abaixo são legadas e não orientam o firmware do Opta.
>
> A Central administrativa agora salva contas, ocorrências, limites e histórico no banco. Consulte [Administração e primeiro acesso](docs/ADMINISTRACAO.md).

## Iniciar back e front no Windows

Dê dois cliques em `iniciar.cmd`, na raiz do projeto, ou execute ` .\iniciar.cmd`
no terminal. Ele abre o backend na porta 8000 e o frontend na porta 5173 em
janelas separadas, e abre o frontend no navegador. Para parar, pressione
`Ctrl+C` em cada janela.

O iniciador usa o Python de `.venv` (ou `SCOMPTEC- Back/venv`) e as dependências
já instaladas do frontend. Se faltar alguma dependência, ele mostra como instalar.
Para conferir os pré-requisitos sem iniciar os servidores, use ` .\iniciar.cmd --check`.
As configurações dos arquivos `.env` são mantidas; o banco configurado no backend
precisa estar disponível, pois o iniciador não sobe um serviço de banco de dados.

# CNC Monitor Backend V1

Backend de monitoramento de máquinas CNC industriais com ESP32.

**Stack**: Python 3.11+ • FastAPI • MongoDB • PyMongo • Uvicorn

## Arquitetura

```
CNC → ESP32 → FastAPI → MongoDB → Consultas GET
```

- A ESP32 ficará dentro do gabinete elétrico e observa sinais da máquina
- O backend **NÃO controla** a CNC
- Apenas registro, monitoramento e consultas

## Features V1

- ✅ Cadastro, alteração e exclusão de CNCs
- ✅ Registro automático de ESP32
- ✅ Identificação por MAC Address
- ✅ Geração automática de UUID + códigos amigáveis (CNC01, DVC01, etc.)
- ✅ Associação Device → CNC
- ✅ Recebimento de telemetria
- ✅ Atualização automática de status (ACTIVE/INACTIVE/UNKNOWN)
- ✅ Cálculo automático de `last_seen` e status online/offline
- ✅ Histórico de telemetria
- ✅ Consultas via GET

## O que **NÃO** está na V1

- ❌ JWT / Autenticação
- ❌ Usuários / Permissões
- ❌ `.env` / Variáveis de ambiente
- ❌ Docker
- ❌ PostgreSQL / MySQL
- ❌ MQTT / WebSocket
- ❌ Dashboard
- ❌ IA
- ❌ Controle da CNC

## Instalação

### 1. Requisitos

- Python 3.11+
- MongoDB (local)
- pip

### 2. Clonar o projeto

```bash
cd ScompTecTCC-main
```

### 3. Criar ambiente virtual

```bash
# Linux/Mac
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 4. Instalar dependências

```bash
pip install -r requirements.txt
```

### 5. Instalar e iniciar MongoDB

#### Linux

```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb

# Iniciar
sudo systemctl start mongodb
sudo systemctl status mongodb
```

#### Mac

```bash
# Com Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Iniciar
brew services start mongodb-community
```

#### Windows

- Baixar em: https://www.mongodb.com/try/download/community
- Instalar
- MongoDB será iniciado como serviço

#### Docker (opcional)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 6. Verificar MongoDB

```bash
mongosh --eval "db.adminCommand('ping')"
```

Resultado esperado:
```
{ ok: 1 }
```

## Execução

### Iniciar o servidor FastAPI

```bash
# No diretório do projeto
uvicorn app.main:app --reload --port 8000
```

Saída esperada:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Acessar a documentação interativa

Abra no navegador:
```
http://localhost:8000/docs
```

Você verá o Swagger UI com todos os endpoints.

### Health Check

```bash
curl http://localhost:8000/health
```

Resposta:
```json
{"status":"ok"}
```

## Endpoints

### CNCs

#### 1. Criar CNC

```bash
# curl (Linux/Mac)
curl -X POST http://localhost:8000/cncs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresadora CNC Alpha",
    "description": "Fresadora 3 eixos com controle Siemens"
  }'

# PowerShell (Windows)
$body = @{
    name = "Fresadora CNC Alpha"
    description = "Fresadora 3 eixos com controle Siemens"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/cncs" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body
```

Resposta:
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "code": "CNC01",
  "name": "Fresadora CNC Alpha",
  "description": "Fresadora 3 eixos com controle Siemens",
  "status": "UNKNOWN",
  "status_since": "2026-09-01T20:00:00.000Z",
  "last_seen": null,
  "created_at": "2026-09-01T20:00:00.000Z",
  "duration_seconds": 0.5
}
```

#### 2. Listar todas as CNCs

```bash
curl http://localhost:8000/cncs
```

#### 3. Obter CNC específica

```bash
curl http://localhost:8000/cncs/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

#### 4. Atualizar CNC

```bash
curl -X PUT http://localhost:8000/cncs/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresadora CNC Alpha V2",
    "description": "Atualizado"
  }'
```

#### 5. Obter status da CNC

```bash
curl http://localhost:8000/cncs/f47ac10b-58cc-4372-a567-0e02b2c3d479/status
```

Resposta:
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "code": "CNC01",
  "name": "Fresadora CNC Alpha",
  "status": "ACTIVE",
  "status_since": "2026-09-01T20:00:00.000Z",
  "duration_seconds": 125.5,
  "last_seen": "2026-09-01T20:02:05.000Z",
  "online": true
}
```

#### 6. Histórico de telemetria da CNC

```bash
curl http://localhost:8000/cncs/f47ac10b-58cc-4372-a567-0e02b2c3d479/history?limit=50
```

#### 7. Deletar CNC

```bash
curl -X DELETE http://localhost:8000/cncs/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### Devices (ESP32)

#### 1. Registrar Device

A ESP32 envia seu MAC Address e informações.

```bash
curl -X POST http://localhost:8000/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "mac_address": "A4:CF:12:8B:34:91",
    "ip_address": "192.168.1.37",
    "name": "Gateway ESP32 Alpha",
    "firmware_version": "1.0.0"
  }'
```

Resposta (primeira vez):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "DVC01",
  "mac_address": "A4:CF:12:8B:34:91",
  "name": "Gateway ESP32 Alpha",
  "ip_address": "192.168.1.37",
  "firmware_version": "1.0.0",
  "cnc_id": null,
  "last_seen": "2026-09-01T20:00:00.000Z",
  "online": true,
  "created_at": "2026-09-01T20:00:00.000Z"
}
```

Se o MAC já existe, o device é atualizado e retorna o mesmo com dados novos.

#### 2. Listar Devices

```bash
curl http://localhost:8000/devices
```

#### 3. Obter Device específico

```bash
curl http://localhost:8000/devices/550e8400-e29b-41d4-a716-446655440000
```

#### 4. Atualizar Device

```bash
curl -X PUT http://localhost:8000/devices/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gateway ESP32 Beta",
    "ip_address": "192.168.1.38",
    "firmware_version": "1.1.0",
    "cnc_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'
```

#### 5. Associar Device à CNC

```bash
curl -X PUT http://localhost:8000/devices/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "cnc_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'
```

#### 6. Obter status do Device

```bash
curl http://localhost:8000/devices/550e8400-e29b-41d4-a716-446655440000/status
```

Resposta:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "DVC01",
  "mac_address": "A4:CF:12:8B:34:91",
  "name": "Gateway ESP32 Alpha",
  "online": true,
  "last_seen": "2026-09-01T20:02:30.000Z",
  "cnc_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Status Online/Offline**: Device fica `online: true` se o `last_seen` foi há menos de **5 segundos**.

#### 7. Deletar Device

```bash
curl -X DELETE http://localhost:8000/devices/550e8400-e29b-41d4-a716-446655440000
```

### Telemetria

#### 1. Enviar telemetria

A ESP32 envia dados dos sensores a cada segundo (ou conforme configurado).

```bash
curl -X POST http://localhost:8000/devices/550e8400-e29b-41d4-a716-446655440000/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-09-01T20:00:00Z",
    "machine_active": true,
    "voltage_24v": true,
    "digital_signals": {
      "D01_MOTOR_RUN": true,
      "D02_SPINDLE": true,
      "D03_PUMP": false
    },
    "analog_signals": {
      "A01_TEMP_MOTOR": 35.5,
      "A02_PRESSURE": 2.8
    },
    "extra_signals": {
      "cycle": true,
      "alarm": false,
      "emergency": false
    }
  }'
```

Resposta:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-09-01T20:00:00Z",
  "machine_active": true,
  "voltage_24v": true,
  "digital_signals": {
    "D01_MOTOR_RUN": true,
    "D02_SPINDLE": true,
    "D03_PUMP": false
  },
  "analog_signals": {
    "A01_TEMP_MOTOR": 35.5,
    "A02_PRESSURE": 2.8
  },
  "extra_signals": {
    "cycle": true,
    "alarm": false,
    "emergency": false
  },
  "received_at": "2026-09-01T20:00:00.123Z"
}
```

**Comportamento automático**:
- Quando `machine_active: true` → CNC status muda para **ACTIVE**
- Quando `machine_active: false` → CNC status muda para **INACTIVE**
- Quando Device fica offline (> 5 segundos) → CNC status muda para **UNKNOWN**
- `status_since` é atualizado **apenas quando o status muda**

## Fluxo Completo de Exemplo

### 1. Criar a CNC

```bash
curl -X POST http://localhost:8000/cncs \
  -H "Content-Type: application/json" \
  -d '{"name": "Torno CNC", "description": "Torno automático"}'
```

Receba: `CNC01` com ID `cnc-uuid-1`

### 2. ESP32 registra-se

```bash
curl -X POST http://localhost:8000/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "ip_address": "192.168.1.100",
    "name": "ESP32-Torno",
    "firmware_version": "1.0.0"
  }'
```

Receba: `DVC01` com ID `device-uuid-1` (sem CNC associada)

### 3. Associar Device à CNC

```bash
curl -X PUT http://localhost:8000/devices/device-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"cnc_id": "cnc-uuid-1"}'
```

### 4. ESP32 envia telemetria (máquina ativa)

```bash
curl -X POST http://localhost:8000/devices/device-uuid-1/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-09-01T20:00:00Z",
    "machine_active": true,
    "voltage_24v": true,
    "digital_signals": {},
    "analog_signals": {},
    "extra_signals": {}
  }'
```

→ CNC status muda para **ACTIVE**

### 5. Consultar status da CNC

```bash
curl http://localhost:8000/cncs/cnc-uuid-1/status
```

Resposta:
```json
{
  "id": "cnc-uuid-1",
  "code": "CNC01",
  "name": "Torno CNC",
  "status": "ACTIVE",
  "status_since": "2026-09-01T20:00:00Z",
  "duration_seconds": 45.2,
  "last_seen": "2026-09-01T20:00:45Z",
  "online": true
}
```

### 6. Máquina para

```bash
curl -X POST http://localhost:8000/devices/device-uuid-1/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-09-01T20:05:00Z",
    "machine_active": false,
    "voltage_24v": true,
    "digital_signals": {},
    "analog_signals": {},
    "extra_signals": {}
  }'
```

→ CNC status muda para **INACTIVE**, `status_since` é resetado

### 7. Consultar histórico

```bash
curl http://localhost:8000/cncs/cnc-uuid-1/history?limit=100
```

Retorna todos os registros de telemetria da máquina, ordenados por timestamp descendente.

## Testes

### Instalar dependências de teste

```bash
pip install pytest pytest-asyncio httpx mongomock
```

### Executar testes

```bash
# Todos os testes
pytest

# Com cobertura
pytest --cov=app tests/

# Testes específicos
pytest tests/test_services.py
pytest tests/test_endpoints.py
```

Testes cobrem:
- ✅ Criação de CNC
- ✅ Geração de códigos (CNC01, CNC02, DVC01, DVC02)
- ✅ Registro de Device
- ✅ Reconhecimento de MAC existente
- ✅ Associação Device → CNC
- ✅ Envio de telemetria
- ✅ Estados ACTIVE/INACTIVE
- ✅ Mudança de estado e `status_since`
- ✅ Cálculo de duração
- ✅ Status online/offline
- ✅ Exclusão de registros
- ✅ Registros não encontrados (404)

## Estrutura do Projeto

```
app/
├── main.py                 # Aplicação FastAPI
├── database/
│   └── connection.py       # Conexão MongoDB
├── models/
│   ├── cnc.py            # Modelo CNC
│   ├── device.py         # Modelo Device
│   └── telemetry.py      # Modelo Telemetria
├── schemas/
│   ├── cnc.py            # Schemas Pydantic (CNC)
│   ├── device.py         # Schemas Pydantic (Device)
│   └── telemetry.py      # Schemas Pydantic (Telemetria)
├── services/
│   ├── cnc_service.py    # Lógica de negócio (CNC)
│   ├── device_service.py # Lógica de negócio (Device)
│   └── telemetry_service.py  # Lógica de negócio (Telemetria)
├── routers/
│   ├── cnc.py           # Endpoints CNC
│   ├── devices.py       # Endpoints Device
│   └── telemetry.py     # Endpoints Telemetria
tests/
├── conftest.py          # Fixtures pytest
├── test_services.py     # Testes de serviços
└── test_endpoints.py    # Testes de endpoints
requirements.txt
README.md
```

## Configuração MongoDB

O MongoDB local usa:

```
URL: mongodb://localhost:27017
Database: cnc_monitor
Collections:
  - cncs (index único em "code")
  - devices (index único em "mac_address", index em "cnc_id")
  - telemetry (index em "device_id", "timestamp")
```

## Status HTTP

- `200 OK` - Sucesso
- `201 Created` - Recurso criado
- `204 No Content` - Deletado com sucesso
- `404 Not Found` - Recurso não existe
- `500 Internal Server Error` - Erro no servidor

## Timeout e Online/Offline

- **DEVICE_ONLINE_TIMEOUT_SECONDS**: 5 segundos
- Se o device não enviar telemetria nos últimos 5 segundos, marca como `offline`
- CNC associada a device offline muda para status `UNKNOWN`

## Próximos Passos (V2+)

- JWT e autenticação
- Dashboard Web
- MQTT para comunicação bidirecional
- WebSocket para atualizações em tempo real
- IA para detecção de anomalias
- Histórico com compressão
- Alertas e notificações
- PostgreSQL para escalabilidade

## Troubleshooting

### MongoDB não conecta

```bash
# Verificar se MongoDB está rodando
mongosh --eval "db.adminCommand('ping')"

# Reiniciar MongoDB (Linux)
sudo systemctl restart mongodb

# Reiniciar MongoDB (Mac)
brew services restart mongodb-community
```

### Erro de porta já em uso

```bash
# Liberar porta 8000
lsof -i :8000  # Identificar processo
kill -9 <PID>  # Matar processo

# Usar porta diferente
uvicorn app.main:app --port 8001
```

### Testar endpoint sem internet

Usar Swagger UI em http://localhost:8000/docs

## Licença

MIT

## Autor

SCOMPTEC CNC Monitor - Backend V1
# Configuração de conexão com .env

O frontend usa `scomptec-cnc front 2/.env` e o backend usa `SCOMPTEC- Back/.env`.
Os arquivos `.env` são locais e ignorados pelo Git. Ao clonar o projeto, copie
o `.env.example` de cada pasta para `.env`.

Para apontar o front para um backend hospedado, altere no `.env` do frontend:

```dotenv
VITE_API_BASE_URL=https://api.seu-dominio.com/api
VITE_USE_MOCKS=false
```

Mantenha `/api` no endereço. Reinicie `npm run dev` após alterar o arquivo.
Para publicar o site, execute `npm run build` novamente e publique o novo `dist`.
Para o aplicativo Electron, gere um novo instalador com `npm run electron:build`.
O Vite incorpora as variáveis ao gerar o frontend; editar o `.env` depois da
compilação não altera um site ou aplicativo já distribuído. Não coloque senhas
ou chaves privadas em variáveis `VITE_`, pois ficam disponíveis no frontend.
Um `.env.local`, se criado, tem prioridade sobre `.env` no Vite.

No `.env` do backend, configure `DATABASE_URL` para o banco e `CORS_ORIGINS`
com os endereços do frontend permitidos, separados por vírgula, por exemplo:

```dotenv
CORS_ORIGINS=https://seu-front.com,http://localhost:5173
```

As origens devem incluir protocolo e porta quando necessária, sem caminho ou
barra final. Defina também `AUTH_SECRET` com uma chave privada aleatória antes
de hospedar. Instale as dependências com
`pip install -r "SCOMPTEC- Back/requirements.txt"` e reinicie o backend após
editar seu `.env`. Ele é carregado pelo caminho da pasta do backend, independentemente
da pasta de execução; variáveis definidas pela hospedagem têm prioridade.

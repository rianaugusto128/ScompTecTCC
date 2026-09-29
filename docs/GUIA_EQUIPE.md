# Guia da equipe: API, Opta, banco e frontend

Revisão do código em 15/09/2026. Este documento descreve o que está implementado e as pendências observadas. Nesta revisão foram acrescentados documentos, uma exportação OpenAPI e um roteiro de teste; as pendências abaixo não foram automaticamente corrigidas.

## 1. Arquitetura e limites

```mermaid
flowchart LR
    S[Sensores I1 a I7] --> C[Controle local no Opta]
    C --> O[Comandos O1 a O3]
    C --> T[Cópia dos sinais para telemetria]
    T -->|POST HTTP JSON| A[FastAPI /api]
    A --> D[(MySQL via SQLAlchemy/PyMySQL)]
    F[React / navegador ou Electron] -->|GET periódico| A
    D --> A
    A --> F
```

O servidor recebe HTTP, não uma conexão direta ao MySQL enviada pelo Opta. O frontend também usa HTTP. O firmware não aceita comandos remotos do backend. Não há MQTT, WebSocket real, rota para acionar relés, endpoint administrativo completo nem serviço de descoberta automática do IP do servidor.

O fluxo mínimo do Opta é: conectar ao WiFi → registrar MAC → guardar UUID → enviar leituras. A resposta HTTP de sucesso confirma a gravação no backend; os sinais físicos e o funcionamento dos atuadores exigem ensaio separado.

## 2. Preparação do ambiente

Pela raiz do repositório, no PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r "SCOMPTEC- Back/requirements-dev.txt"
.\.venv\Scripts\python.exe -m uvicorn Main:app --app-dir "SCOMPTEC- Back" --host 0.0.0.0 --port 8000
```

Use Python 3.10 ou superior, compatível com os tipos utilizados. Para o frontend, execute `npm ci` e `npm run dev` na pasta `scomptec-cnc front 2`, usando o lockfile versionado pela equipe. O `requirements.txt` da raiz é legado de MongoDB: **não é a lista correta do backend atual**.

O MySQL deve existir e aceitar conexões antes do startup. `create_all()` cria tabelas ausentes; não cria o banco MySQL nem migra estruturas existentes. As credenciais devem ficar em `SCOMPTEC- Back/.env`, tomando `.env.example` como modelo.

| Configuração | Local | Efeito |
|---|---|---|
| `DATABASE_URL` | Backend `.env` | Ex.: `mysql+pymysql://USUARIO:SENHA@SERVIDOR:3306/cnc_monitor?charset=utf8mb4` |
| `SQL_ECHO` | Backend `.env` | Log SQL; evite ativá-lo indiscriminadamente em dados reais |
| `DEVICE_API_KEY` | Backend `.env` | Chave de cadastro automático e ingestão; vazia desativa a exigência |
| `DEVICE_OFFLINE_TIMEOUT_SECONDS` | Backend `.env` | Padrão 90; mínimo aceito 10 |
| `CORS_ORIGINS` | Backend `.env` | Origens do navegador, separadas por vírgula; sem `/api` |
| `AUTH_SECRET` | Backend `.env` | Assinatura dos tokens de usuários; definir segredo próprio |
| `AUTH_TOKEN_TTL_MINUTES` | Backend `.env` | Validade dos tokens; padrão 480 minutos |
| `VITE_API_BASE_URL` | Frontend `.env` | URL do backend incluindo `/api` |
| `VITE_USE_MOCKS` | Frontend `.env` | `false` para leituras reais |
| `OPTA_WIFI_SSID` / `OPTA_WIFI_PASSWORD` | `opta_secrets.h` | Rede do Opta |
| `OPTA_API_HOST`, `OPTA_API_PORT`, `OPTA_API_PREFIX` | `opta_secrets.h` | Host sem esquema/caminho; porta 8000; prefixo `/api` |
| `OPTA_DEVICE_KEY` | `opta_secrets.h` | Mesmo valor de `DEVICE_API_KEY` |

Não colocar chave do Opta em variável `VITE_*`: variáveis desse tipo são incorporadas ao frontend. Não versionar `.env` ou `opta_secrets.h`. Reiniciar backend/Vite depois de modificar configurações; frontend empacotado precisa de novo build.

Para um teste na LAN, exemplo de endereço: `http://192.168.1.100:8000/api`. Troque pelo IP real. `0.0.0.0` é o endereço de escuta; `localhost` no Opta representa o próprio Opta. Verifique porta, firewall e isolamento entre clientes WiFi. CORS afeta navegador/Electron, não o Opta ou o PowerShell. A versão de firmware entregue usa HTTP; um servidor que só aceita HTTPS requer cliente TLS/certificados no firmware.

## 3. Catálogo completo das rotas

Todas as rotas de negócio têm prefixo `/api`. `device_id` e `cnc_id` nos caminhos são os IDs retornados pelo cadastro, não `OPTA-001`/`CNC-001`.

| Método | Rota | Corpo / parâmetros | Sucesso | Proteção atual |
|---|---|---|---|---|
| GET | `/api/health` | Sem corpo | 200 | Pública |
| POST | `/api/devices/register` | Registro por MAC | 201 | `X-Device-Key` se configurada |
| POST | `/api/devices/{device_id}/telemetry` | Leitura | 201 | `X-Device-Key` se configurada |
| POST | `/api/devices` | Cadastro manual vinculado a CNC existente | 201 | Sem autenticação de usuário |
| GET | `/api/devices` | Sem corpo; sem paginação | 200 | Sem autenticação de usuário |
| GET | `/api/devices/{device_id}` | ID no caminho | 200 | Sem autenticação de usuário |
| PUT | `/api/devices/{device_id}` | Atualização parcial | 200 | Sem autenticação de usuário |
| DELETE | `/api/devices/{device_id}` | ID no caminho | 204 | Sem autenticação de usuário |
| GET | `/api/devices/{device_id}/status` | ID no caminho | 200 | Sem autenticação de usuário |
| POST | `/api/cncs` | Cadastro de CNC | 201 | Sem autenticação de usuário |
| GET | `/api/cncs` | Sem corpo; sem paginação | 200 | Sem autenticação de usuário |
| GET | `/api/cncs/{cnc_id}` | ID no caminho | 200 | Sem autenticação de usuário |
| PUT | `/api/cncs/{cnc_id}` | Atualização parcial | 200 | Sem autenticação de usuário |
| DELETE | `/api/cncs/{cnc_id}` | ID no caminho | 204 | Sem autenticação de usuário |
| GET | `/api/cncs/{cnc_id}/status` | ID no caminho | 200 | Sem autenticação de usuário |
| GET | `/api/cncs/{cnc_id}/history` | `start`, `end`, `page`, `limit` | 200 | Sem autenticação de usuário |
| POST | `/api/auth/register` | Nome, email, senha | 201 | Pública |
| POST | `/api/auth/login` | Email, senha | 200 | Pública |
| GET | `/api/auth/me` | Header `Authorization: Bearer TOKEN` | 200 | Usuário ativo com token válido |

O FastAPI também expõe `/docs`, `/redoc` e `/openapi.json`, sem prefixo `/api`. Há uma exportação estática em [`openapi.json`](openapi.json), importável em ferramentas que suportam OpenAPI. O arquivo é um retrato desta revisão; a versão servida pela aplicação representa o código que está em execução.

**A chave do dispositivo não protege as demais rotas.** O token de login não é atualmente exigido nas consultas e alterações de CNC/dispositivo. Isso é uma pendência do servidor, não uma garantia dada pela tela de login.

## 4. Cadastro automático pelo Opta

```http
POST /api/devices/register HTTP/1.1
Host: 192.168.1.100:8000
Content-Type: application/json
X-Device-Key: CHAVE_DA_INSTALACAO
```

```json
{
  "mac_address": "02:00:00:00:00:99",
  "ip_address": "192.168.1.50",
  "firmware_version": "mesa-opta-scomptec-1.0.0"
}
```

| Campo | Obrigatório | Regra atual |
|---|---|---|
| `mac_address` | Sim | Seis pares hexadecimais com `:`; servidor normaliza maiúsculas |
| `ip_address` | Não | String até 45 caracteres, ou `null`; não valida se é IP real |
| `firmware_version` | Não | String até 50 caracteres, ou `null` |

Não envie `device_id` nesse cadastro. O servidor cria automaticamente CNC e dispositivo para um MAC novo. A resposta contém:

```json
{
  "created": true,
  "device": {
    "id": "11111111-1111-4111-8111-111111111111",
    "code": "OPTA-001",
    "name": "Arduino Opta WiFi 01",
    "mac_address": "02:00:00:00:00:99",
    "ip_address": "192.168.1.50",
    "cnc_id": "22222222-2222-4222-8222-222222222222",
    "firmware_version": "mesa-opta-scomptec-1.0.0",
    "last_seen": "2026-09-15T12:00:00Z",
    "created_at": "2026-09-15T12:00:00Z"
  },
  "cnc": {
    "id": "22222222-2222-4222-8222-222222222222",
    "code": "CNC-001",
    "name": "CNC 01"
  },
  "server_time_unix": 1789473600,
  "telemetry_session_id": "33333333-3333-4333-8333-333333333333"
}
```

Valores ilustrativos; sempre usar os retornados pelo seu servidor. `device.id` vai na rota de telemetria; `cnc.id` vai nas consultas de estado/histórico. Códigos legíveis são para apresentação. `server_time_unix` é a referência UTC em segundos. `telemetry_session_id` é um identificador aleatório para compor eventos, **não é token de autenticação nem uma sessão persistida no banco**.

O mesmo MAC retorna os mesmos IDs, `created:false` e status HTTP **201**, atualizando última comunicação/IP/firmware. Um novo identificador de sessão é gerado em cada resposta; o firmware mantém o primeiro do boot nas reconexões. Se IP/firmware forem omitidos em um recadastro, seus valores atuais são substituídos por `null`.

O cadastro manual é diferente: `POST /api/devices` exige `name` (1–255), `mac_address` e `cnc_id`, com IP/firmware opcionais. Não cria outra CNC. Para usá-lo, primeiro crie uma CNC com `POST /api/cncs`, corpo `{"name":"Mesa de teste","description":"Ensaio da equipe"}`. Não misture os dois fluxos sem controlar o vínculo.

## 5. Envio da leitura

```http
POST /api/devices/UUID_REAL_DO_DISPOSITIVO/telemetry HTTP/1.1
Host: 192.168.1.100:8000
Content-Type: application/json
X-Device-Key: CHAVE_DA_INSTALACAO
```

Para o teste mínimo, basta:

```json
{"machine_active":true}
```

Isso não preenche o painel específico da mesa. Para testar sinais e contadores, use:

```json
{
  "event_id": "IDENTIFICADOR_DA_SESSAO:1",
  "machine_active": true,
  "voltage_24v": null,
  "digital_signals": {
    "ciclo": true,
    "alarme": false,
    "altura_media_bloqueada": false,
    "altura_pequena_bloqueada": true,
    "altura_grande_bloqueada": false,
    "metal_presente": true,
    "queda1_ocupada": false,
    "queda2_ocupada": false,
    "rampa1_cheia": false,
    "rampa2_cheia": false
  },
  "analog_signals": {},
  "extra_signals": {
    "boot_id": "IDENTIFICADOR_DA_SESSAO",
    "rssi": -60,
    "uptime_seconds": 60,
    "amostras_descartadas": 0,
    "mesa": {
      "estado": "acionando_queda1",
      "altura": "pequena",
      "metal_memorizado": true,
      "rampa1_cheia": false,
      "rampa2_cheia": false,
      "capturado_millis": 60000,
      "entradas_brutas": {"I1":false,"I2":true,"I3":false,"I4":true,"I5":true,"I6":false,"I7":false},
      "saidas_comandadas": {"O1":true,"O2":true,"O3":false},
      "contadores": {"total":3,"reto":1,"queda1":0,"queda2":1,"falhas":0}
    }
  }
}
```

No teste inicial, omitir `timestamp` faz o servidor usar o horário atual. O [`mesa_sample.json`](../firmware/opta_mesa_monitor/mesa_sample.json) existente contém uma data fixa: remova ou atualize essa data ao testar dados atuais. Uma amostra histórica pode ser gravada com sucesso e corretamente aparecer como desatualizada.

| Campo | Obrigatório | Tipo e significado |
|---|---|---|
| `machine_active` | Sim | Booleano estrito `true`/`false`; não usar string ou 0/1 |
| `voltage_24v` | Não | Booleano estrito ou `null`; omitido equivale a desconhecido |
| `event_id` | Não, mas recomendado | String 1–100; único por leitura no dispositivo e repetido somente no reenvio da mesma leitura |
| `timestamp` | Não | Data/hora; usar ISO 8601 com `Z`/offset. Data sem fuso é assumida UTC; frações de segundo são descartadas |
| `digital_signals` | Não | Objeto de booleanos; aceita coerções reconhecidas pelo validador. Use booleanos JSON para evitar ambiguidades; não enviar `null` |
| `analog_signals` | Não | Objeto de números finitos; não enviar `null`, NaN ou infinito |
| `extra_signals` | Não | Objeto JSON adicional ou `null`; estrutura interna genérica |

Campos desconhecidos na **raiz** da telemetria são rejeitados com `422`. Não coloque `device_id`, `cnc_id`, MAC ou `estado` soltos na raiz: o dispositivo está no caminho, e os detalhes da mesa estão em `extra_signals.mesa`. O backend não valida uma correspondência física entre os vários campos da mesa; a equipe deve manter a consistência do contrato.

O firmware da mesa não mede 24 V, emergência física, corrente, tensão analógica, temperatura ou potência. Portanto envia 24 V desconhecido, não publica emergência como falsa e deixa medições analógicas vazias. Para sensores futuros, o adaptador do frontend reconhece `current`/`corrente` em A, `voltage`/`tensao` em V, `temperature`/`temperatura` em °C e `power_kw`/`powerKw`/`potencia_kw` em kW. A conversão elétrica e a calibração não são feitas automaticamente pelo backend.

A resposta `201` traz `id`, `device_id`, `timestamp`, `received_at`, `machine_active`, `voltage_24v` e os três mapas de sinais. **Não devolve `event_id`**. `id` é o identificador da linha de telemetria. O servidor realiza o commit antes de responder.

Repetir um `event_id` com o mesmo conteúdo retorna o mesmo `id` e HTTP 201, sem outra linha. Conteúdo diferente com a mesma chave retorna 409. Sem `event_id`, cada POST cria uma linha. As comparações são dos dados normalizados, não dos bytes brutos: espaços/ordem das chaves JSON não importam. O firmware preserva o JSON serializado nos reenvios. Reenviar uma leitura já existente não atualiza `last_seen`; novas leituras são necessárias para manter presença.

## 6. Interpretação e consulta

Prioridade implementada em `Services/telemetry.py`:

1. `voltage_24v` explicitamente `false` → `DESLIGADA`.
2. `emergencia` ou `emergency` ativo → `EMERGENCIA`.
3. `alarme` ou `alarm` ativo → `ALARME`.
4. `manutencao` ou `maintenance` ativo → `MANUTENCAO`.
5. `machine_active`, `ciclo` ou `cycle` ativo → `OPERANDO`.
6. Caso contrário → `PARADA`.

As chaves digitais são comparadas sem diferenciar maiúsculas/minúsculas para essa derivação. Os nomes dentro de `extra_signals.mesa` não decidem o estado. Se o JSON diz `mesa.estado="falha"`, mas `alarme=false`, o servidor não corrige essa contradição.

Na mesa, espera por peça é `PARADA`, mesmo com a esteira comandada ligada. `FALHA` da classificação é `ALARME`. Saídas são comandos, não confirmação de movimento. Rampas cheias usam 1,7 s de ocupação contínua, não contagem real de três peças.

Após o cadastro, consultar:

```text
GET /api/devices/DEVICE_UUID/status
GET /api/cncs/CNC_UUID/status
GET /api/cncs/CNC_UUID/history?page=1&limit=50
```

O status do dispositivo retorna `online`, `last_seen` e identificação. O status da CNC retorna `status`, `last_known_status`, `status_since`, duração em segundos, `gateway_online`, `last_seen`, horários da última telemetria e sinais. O cadastro sem telemetria pode mostrar dispositivo online e CNC com `DADOS_DESATUALIZADOS`: não é contradição, pois conexão e leitura válida são coisas distintas.

Sem comunicação por mais de 90 segundos, a consulta mostra `SEM_COMUNICACAO`. Com comunicação, mas última coleta antiga/ausente, mostra `DADOS_DESATUALIZADOS`. A condição é calculada na consulta; não existe evento persistente de desconexão nem tarefa que atualiza a coluna SQL de status a cada timeout. A coluna `cncs.status` conserva o estado operacional derivado da telemetria, enquanto a API pode apresentar o estado efetivo de comunicação.

Histórico retorna `{"items":[...],"total":123,"page":1,"limit":50}`. `page` começa em 1; `limit` padrão 50, mínimo 1, máximo 500. `start` e `end` filtram **timestamp de coleta**, inclusivamente, com normalização UTC. `start > end` retorna 422. A ordenação é da coleta mais recente para a mais antiga; empates usam a ordem de ingestão para registros novos. Paginação por offset pode deslocar páginas enquanto novas leituras chegam.

Exemplo de filtro, usando parâmetros da ferramenta HTTP para codificar corretamente o `+` de um offset:

```text
start=2026-09-15T00:00:00Z
end=2026-09-15T23:59:59Z
page=1
limit=100
```

O frontend carrega dispositivos/CNCs e, para cada CNC, status e últimas 100 leituras. Agende aproximadamente 5 segundos **depois de terminar** o ciclo de consultas; não é uma frequência rígida de cinco segundos. Gráficos usam até 30 amostras. As amostras do histórico não são uma auditoria de transições de estado nem cálculo completo de produtividade diária.

## 7. Roteiro de teste prático

Há um roteiro pronto: [`testar-opta.ps1`](testar-opta.ps1). Ele testa saúde, registro, envio, reenvio e consultas.

```powershell
.\docs\testar-opta.ps1 -BaseUrl 'http://192.168.1.100:8000/api'
```

Se a chave estiver habilitada, forneça `DEVICE_API_KEY` no ambiente local ou use o parâmetro `-DeviceKey` com cuidado para não registrar o segredo no histórico do terminal. O script não lê automaticamente o `.env` do backend.

**Esse script grava dados quando executado**: usa por padrão o MAC de teste `02:00:00:00:00:99`, cria uma CNC/dispositivo na primeira execução e acrescenta uma leitura por execução. Não faz exclusões e não deve usar o MAC de uma máquina real. Nesta revisão foi verificada sua sintaxe, mas ele não foi executado contra o MySQL real.

Resultados esperados: saúde `database=ok`; cadastro com IDs; envio e reenvio com mesmo `id`; status `OPERANDO`; uma ocorrência dessa leitura no histórico. Abra a CNC correspondente em `/maquinas/CNC-XXX` no frontend para inspecionar o painel da mesa. Observe que o frontend usa o código legível nessa URL, enquanto as rotas do backend usam UUID.

Depois do ensaio básico, execute estes cenários no banco de teste:

| Cenário | Resultado esperado |
|---|---|
| Mesmo MAC novamente | IDs preservados e `created:false` |
| Nova leitura com outro `event_id` | Outra linha no histórico |
| Mesmo `event_id`, corpo igual | Mesmo ID, sem duplicar |
| Mesmo `event_id`, corpo diferente | 409 |
| `machine_active="true"` | 422 |
| `voltage_24v=null` e ciclo ativo | OPERANDO, sem inventar desligamento |
| Ciclo inativo, alarme falso | PARADA |
| `alarme=true` | ALARME, salvo se 24 V explicitamente falso |
| ID inexistente | 404, com chave válida se exigida |
| Chave incorreta | 401 |
| Leitura de duas horas atrás | Grava histórico; não substitui leitura atual mais recente |
| Sem leituras novas por mais de 90 s | SEM_COMUNICACAO, salvo registro/contato novo que indique presença |
| Backend indisponível | Frontend sinaliza falha, mantém leituras como desatualizadas e tenta reconectar |

Erros 5xx podem ocorrer por falha no banco; não há um contrato que converta todo erro SQL em 503. `/api/health` faz essa conversão especificamente. Se o MySQL falhar no startup, o servidor pode nem abrir a porta. Resposta 204 de exclusão não tem JSON. Requisições GET não precisam de corpo.

## 8. Outros corpos de requisição

- `POST /api/cncs`: `name` obrigatório (1–255), `description` opcional (até 1000).
- `PUT /api/cncs/{id}`: `name`/`description` opcionais. `name:null` é rejeitado; `description:null` limpa o campo. Embora o método seja PUT, comporta-se como atualização parcial.
- `POST /api/devices`: `name`, `mac_address`, `cnc_id` obrigatórios; IP/firmware opcionais. MAC/CNC já ocupados normalmente retornam 409.
- `PUT /api/devices/{id}`: `name`, `cnc_id`, `ip_address`, `firmware_version` opcionais. Não altera MAC/código. Nome/CNC não podem ser nulos. Outra CNC já ocupada ou dispositivo com histórico impedem realocação com 409.
- `POST /api/auth/register`: `{"name":"Integrante Teste","email":"teste@exemplo.com","password":"SENHA_DE_TESTE"}`; nome 2–120, email válido, senha 8–128. Cria usuário de acesso com perfil padrão CLIENTE e retorna token/usuário.
- `POST /api/auth/login`: email e senha; sucesso retorna `access_token`, `token_type:"bearer"`, `user`.
- `GET /api/auth/me`: header `Authorization: Bearer TOKEN`; valida assinatura, expiração e usuário ativo.

O token atual é um formato próprio assinado com HMAC, com duas partes; não é JWT padrão. O Opta não usa o login de usuário para enviar telemetria. `telemetry_session_id`, `DEVICE_API_KEY` e `access_token` têm finalidades diferentes.

## 9. Mapa de arquivos

### Backend — pasta `SCOMPTEC- Back`

| Arquivo | Responsabilidade / quando editar |
|---|---|
| `Main.py` | Aplicação, CORS, startup, inclusão dos routers e health |
| `config.py` | Carrega o `.env` do backend sem substituir variáveis do ambiente |
| `Database/Connection.py` | Engine, pool, sessões por requisição e criação das tabelas |
| `Database/models.py` | Estrutura SQL e relacionamentos; qualquer alteração requer pensar em migração |
| `Schema/device.py` | Contrato de cadastro, atualização e respostas do dispositivo |
| `Schema/telemetry.py` | Tipos/validação do JSON de leitura e formato do histórico |
| `Schema/cnc.py` | Contratos da CNC e status |
| `Schema/auth.py` | Nome/email/senha e respostas de autenticação |
| `Schema/common.py` | Serialização dos horários UTC para respostas de CNC/dispositivo/telemetria |
| `Services/deviceservice.py` | Rotas do dispositivo, vínculo automático, contadores de códigos e conflitos |
| `Services/telemetry.py` | Ingestão, chave de evento, gravação transacional e derivação de estado |
| `Services/cncservice.py` | CRUD de CNC, estado efetivo e histórico paginado |
| `Services/clock.py` | UTC, normalização de timestamps e janela de presença |
| `Services/device_auth.py` | Comparação de `X-Device-Key` com a configuração |
| `Services/authservice.py` | Cadastro/login/me e dependência de usuário autenticado |
| `Services/security.py` | Hash de senha PBKDF2 e tokens assinados |
| `requirements.txt` / `requirements-dev.txt` | Dependências do backend atual e de testes |
| `.env.example` | Modelo de configuração sem segredo real |
| `tests/test_device_provisioning.py` | Cadastro/vínculo e códigos não reutilizados |
| `tests/test_opta_api.py` | Testes HTTP, armazenamento, sinais da mesa, UTC, reenvios e conflitos |
| `data/seed.test.json` | Massa de dados de referência; `Main.py` não a importa no startup |
| `cnc_monitor.db` | Arquivo SQLite local; não significa que o backend esteja usando SQLite. A escolha vem de DATABASE_URL |

### Firmware — pasta `firmware`

| Arquivo | Responsabilidade |
|---|---|
| `opta_mesa_monitor/opta_mesa_monitor.ino` | Entrada Arduino; chama setup/loop da mesa e cede 1 ms ao RTOS |
| `opta_mesa_monitor/MesaControl.cpp` | Pinos, temporizadores, máquina de estados, classificação, contadores e comandos de saída |
| `opta_mesa_monitor/MesaControl.h` | Declarações de entrada do controle |
| `opta_mesa_monitor/Telemetry.h` | Estrutura de snapshot compartilhada e interface de telemetria |
| `opta_mesa_monitor/Telemetry.cpp` | Thread de rede, cadastro, JSON, timestamp, envio, resposta e tentativas |
| `opta_mesa_monitor/Config.h` | Frequências, limites de timeout, versão e inclusão da configuração local |
| `opta_mesa_monitor/opta_secrets.example.h` | Modelo; copiar localmente para `opta_secrets.h` |
| `opta_mesa_monitor/mesa_sample.json` | Contrato de exemplo reutilizado nos testes |
| `opta_mesa_monitor/README.md` | Guia físico/lógico e compilação |
| `reference/mesa_opta_v2_original.ino` | Original recebido; preservar para comparação |
| `esp32_cnc_monitor/*` | Firmware antigo; não usar no Opta |
| `opta_mesa_monitor.zip` | Pacote de entrega; é uma cópia, não a fonte principal. Regenerar após mudanças |

O controle captura cópias a cada 10 ms, a rede envia aproximadamente a cada 1 segundo, e o loop cede 1 ms. Thread de rede tem prioridade inferior e pilha de 16 KiB. Existe somente amostra pendente mais a cópia recente; pendências acima de 15 s são descartadas. Não há histórico de todas as bordas ou fila persistente em flash. Os contadores reiniciam com o dispositivo.

### Frontend — pasta `scomptec-cnc front 2`

| Arquivo / conjunto | Responsabilidade |
|---|---|
| `src/main.jsx` | Inicialização React e escolha de roteador |
| `src/App.jsx` | Rotas das páginas e provider global de monitoramento |
| `src/services/api.js` | HTTP, base URL, Bearer, erros e adaptação snake_case → dados de tela |
| `src/services/telemetry.js` | Conversões de leitura, marcação de dados antigos e agendamento periódico |
| `src/contexts/MonitoringContext.jsx` | Estado compartilhado: máquinas, alertas, histórico, seleção e conexão |
| `src/services/adminSession.js` | Leitura da sessão local e apresentação do perfil; não concede autorização no servidor |
| `src/services/eventBus.js` | Comunicação interna de eventos no frontend |
| `src/services/websocket.js` | Esqueleto sem conexão WebSocket real |
| `src/hooks/useMachines.js`, `useAlerts.js`, `useRelativeDuration.js` | Acesso simplificado ao contexto e duração relativa; algumas ações ainda são placeholders |
| `src/utils/status.js`, `severity.js`, `problems.js`, `time.js` | Estados, prioridade de problemas, apresentação e horários |
| `src/components/MesaSignals/MesaSignals.jsx` | Painel específico: estados/contadores, níveis brutos e comandos da mesa |
| `src/components/ConnectionNotice/ConnectionNotice.jsx` | Aviso de conexão e última atualização |
| `src/components/MachineCard`, `StatusBadge`, `AlertCard`, `OccurrenceCard` | Apresentação de máquinas, estados e ocorrências |
| `src/components/OperatingTimeline`, `charts/UtilizationChart` | Visualizações; não assumir que dados demonstrativos constituem auditoria diária real |
| `src/components/Header`, `Sidebar`, `Breadcrumb`, `ContextSwitcher` | Navegação e contexto de seleção |
| `src/components/ClientCard`, `ToastCenter`, `StatCard`, `EmptyState`, `LoadingState`, `Logo` | Componentes auxiliares de exibição |
| `src/pages/Dashboard`, `Machines`, `MachineDetails`, `Devices`, `Alerts`, `History`, `TVDashboard` | Monitoramento e consultas através do contexto |
| `src/pages/Login`, `Register` | Formulários de autenticação ligados à API |
| `src/pages/Admin/Admin.jsx`, `adminModel.js`, `AdminAccess.jsx`, `admin.css` | Administração demonstrativa e controle de apresentação da tela |
| `src/pages/Clients`, `Units`, `CompanySelection`, `Settings` | Organização/acesso/configurações; não há persistência multiempresa correspondente no backend |
| `src/pages/Landing`, `Splash` | Páginas de entrada |
| `src/data/mockData.js` | Dados demonstrativos; não transformar em cadastro real |
| `src/index.css`, `tailwind.config.js`, `postcss.config.js`, assets/public | Aparência, tokens e arquivos estáticos |
| `vite.config.js` | Servidor de desenvolvimento e base relativa do build |
| `package.json`, lockfile | Dependências, comandos de build e entrada Electron |
| `electron/main.cjs` | Entrada Electron efetivamente apontada pelo package.json |
| `electron/main.js` | Entrada alternativa/duplicada; conferir uso antes de editar |
| `src/services/telemetry.test.js`, `src/pages/Admin/adminModel.test.js` | Testes de lógica do frontend |
| `dist/`, `release/` | Resultados compilados/empacotados; editar o fonte e reconstruir |

Na raiz: `README.md`, `INTEGRACAO_OPTA.md` e `IMPLEMENTATION_REPORT.md` são documentação de etapas diferentes; o código/OpenAPI atuais prevalecem em divergências. `pytest.ini` seleciona o diretório correto dos testes. `tests/` e `requirements.txt` da raiz são legado da aplicação MongoDB. `.venv`, `.tools`, `.build`, `node_modules`, caches e `__pycache__` são artefatos locais, não fonte da aplicação.

## 10. Modelo do banco

| Tabela | Conteúdo |
|---|---|
| `users` | Usuário, email único, hash de senha, perfil e situação |
| `cncs` | UUID, código único, nome, descrição, último estado operacional e horários |
| `devices` | UUID, código único, MAC único, IP, firmware, presença e CNC vinculada |
| `telemetry` | UUID, dispositivo, coleta/recebimento, atividade, 24 V e mapas JSON |
| `telemetry_order` | Sequência de chegada associada a uma leitura, para desempate temporal |
| `code_sequences` | Contadores de códigos legíveis CNC-/OPTA- |

Uma CNC pode estar sem dispositivo; `devices.cnc_id` é único, portanto admite no máximo um dispositivo por CNC no esquema atual. Cada dispositivo tem muitas leituras. O histórico pertence à CNC indiretamente através do dispositivo. Exclusões de CNC/dispositivo propagam a remoção do histórico pelo relacionamento/cascata. As restrições efetivas de um banco antigo precisam ser inspecionadas, porque `create_all()` não as corrige.

`extra_signals.mesa.contadores` é um snapshot JSON, não tabela de produção acumulada. Não some `contadorTotal` de todas as amostras: isso contaria repetidamente as mesmas peças. Para produção por período, trabalhar com diferenças por dispositivo/boot e tratar reinício, falhas e lacunas.

## 11. Incoerências e pendências para a equipe

Achados observados no código; propostas abaixo são recomendações, não alterações já implementadas nesta revisão.

| Prioridade | Achado e evidência | Impacto / ação sugerida |
|---|---|---|
| Alta | Routers CNC/device sem dependência de usuário; somente ingestão/registro automático usam `require_device_key` | Quem alcança a API pode consultar, alterar e excluir. Aplicar autorização no servidor, separando operadores, administradores e dispositivos |
| Alta | Chave do dispositivo vazia é permitida; `security.py` possui segredo padrão conhecido | Exigir configuração adequada por ambiente antes de expor o serviço; não confundir HMAC com JWT padrão |
| Alta | Exclusões em cascata; histórico ligado pelo vínculo atual | Definir política de retenção, exclusão lógica e substituição física com histórico preservado. Não apagar para trocar o Opta |
| Alta | Sem migrações versionadas; `create_all()` apenas cria tabelas | Um banco antigo pode divergir do modelo. Versionar migrações e validar MySQL real |
| Alta para auditoria de eventos | Firmware retém uma pendência e descarta após 15 s; coleta 10 ms não implica transmissão de cada borda | Eventos curtos podem não aparecer. Implementar fila/eventos persistentes se o requisito for rastrear cada mudança |
| Média | Ingestão aceita timestamp até 60 s no futuro; `is_online()` aceita somente idade não negativa | Amostra ligeiramente futura pode ser aceita e aparecer temporariamente desatualizada. Alinhar tolerância de relógio entre ingestão e consulta |
| Média | `PUT /cncs` retorna estado armazenado, enquanto GET calcula estado de comunicação | Após renomear uma CNC offline, PUT pode responder estado operacional antigo. Unificar a montagem da resposta |
| Média | Campos de cadastro/atualização não proíbem extras; IP é só string; nomes são validados antes de alguns trims | Erros de digitação podem ser ignorados e espaços podem passar validação. Padronizar contratos e validações |
| Média | Há pré-checagens de duplicidade, mas captura de `IntegrityError` não cobre todo CRUD/login | Corridas de cadastro podem virar 500 em vez de 409. Tratar integridade transacional consistentemente |
| Média | `extra_signals` é genérico e a lógica de estado está duplicada no Python e no JS | Payload contraditório pode gerar tela divergente; adotar contrato de perfil da mesa e testes compartilhados |
| Média | `Schema/auth.py` não usa o serializador UTC comum; existem três funções utcnow com precisão diferente | Horários de usuário podem perder indicação de fuso conforme banco. Centralizar convenção temporal |
| Média | `Admin.jsx` usa estado local demonstrativo, sem gravação via API | Usuários/limites/ocorrências não são compartilhados entre integrantes e somem ao sair/recarregar. Implementar tabelas/rotas antes de anunciar persistência |
| Média | Modelos não têm empresa/unidade/setor; frontend ainda possui telas e referências demonstrativas | Não há isolamento multiempresa ou cadastro corporativo real. Projetar entidades e permissões |
| Média | N CNCs geram aproximadamente `2 + 2N` requisições por ciclo no frontend, além de consultas adicionais no backend | Agregar snapshots, paginar e estudar índices de histórico; há índice por device, mas falta índice composto para consultas temporais |
| Média | Histórico da tela limitado a 100 amostras; gráficos a 30; paginação por offset | Não representa todo o período nem auditoria de transições. Acrescentar paginação/filtros e agregações persistentes |
| Média | Falha de qualquer consulta rejeita o ciclo inteiro; alertas ativos são limpos na falha | Uma CNC problemática pode marcar tudo como desatualizado e ocultar alertas antigos. Considerar falhas parciais e preservar alertas com sinalização de antiguidade |
| Média | Electron empacotado usa file://; CORS padrão só permite localhost/127.0.0.1 | Validar Origin efetiva e estratégia de CORS no executável. O build web sozinho não valida o Electron |
| Baixa/organização | requirements/testes MongoDB na raiz, firmware ESP32, entradas Electron duplicadas e documentação de etapas distintas | Definir fonte principal; arquivar claramente o legado para evitar edição/instalação equivocada |
| Baixa/organização | Algumas funções de hooks e WebSocket são placeholders; limites analógicos têm valores de referência | Não tratar interface existente como funcionalidade persistente ou regra calibrada por CNC |

O ponto de relógio foi confirmado por inspeção das duas condições; sua correção não foi aplicada aqui. Também não se afirma que todas as falhas de concorrência ocorreram nesta instalação: são riscos identificados no tratamento atual e precisam de testes específicos contra MySQL.

## 12. Trabalho conjunto

1. Definir `SCOMPTEC- Back/requirements*.txt`, `firmware/opta_mesa_monitor` e `scomptec-cnc front 2/src` como fontes ativas. Usar este guia e a OpenAPI como contrato, não o ZIP/binário antigo.
2. Cada integrante trabalha em branch própria e banco de desenvolvimento próprio; evitar editar simultaneamente a mesma pasta sincronizada do OneDrive. Commits/PRs devem conter arquivos de fonte, testes e migrações necessários.
3. Versionar o contrato do perfil da mesa. Ao adicionar um sinal, revisar `MesaSnapshot`/serialização do firmware, schema/derivação do backend, adaptador do frontend, componente e amostra JSON/testes.
4. Para mudar o significado de um estado, alterar juntos `Services/telemetry.py` e `src/services/telemetry.js`. Documentar aliases, prioridade, polaridade e unidade.
5. Para alterar banco, incluir migração e plano de preservação dos dados. Testar em MySQL separado, nunca usar limpeza de testes no banco de produção.
6. Manter segredos locais e exemplos neutros. O MAC de teste deve diferir do equipamento de operação.
7. Distinguir no PR: testado automaticamente, compilado, testado em MySQL, testado no navegador/Electron e ensaiado na bancada. São evidências diferentes.
8. Após mudar firmware, compilar para Opta, atualizar README/amostra, regenerar o ZIP e ensaiar antes de gravar no equipamento em operação.

Sugestão de divisão: integrante de firmware assume pinos/temporização/payload; integrante de backend assume contrato/persistência/autorização; integrante de frontend assume adaptador/painéis/estado de conexão. Mudanças compartilhadas em `models.py`, schemas e `api.js` devem ser combinadas antes.

Comandos de verificação pela raiz:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
node --test "scomptec-cnc front 2/src/services/telemetry.test.js" "scomptec-cnc front 2/src/pages/Admin/adminModel.test.js"
npm.cmd run build --prefix "scomptec-cnc front 2"
npm.cmd run lint --prefix "scomptec-cnc front 2"
```

Nesta revisão, passaram 23 testes do backend e 11 testes de lógica do frontend. O backend emitiu quatro avisos de descontinuação relacionados ao startup e às bibliotecas de teste, sem falhas. Os testes do backend usam SQLite isolado. A compilação do firmware Opta e do frontend foi realizada na etapa anterior; a validação com equipamento físico e MySQL real continua separada. O roteiro PowerShell teve a sintaxe verificada e só deve ser executado depois de escolher o ambiente de teste destinado aos registros de ensaio.

ATUALIZAÇÃO — CORREÇÃO DO CADASTRO NO MYSQL (15/09/2026)
O MySQL instalado tinha uma tabela devices antiga, sem mac_address e ip_address. Isso causava HTTP 500 no cadastro, embora /api/health retornasse 200.
Foi aplicada a migração Database/migrations/001_device_network_fields.sql, acrescentando as colunas e índice único de MAC. Os dois dispositivos existentes foram preservados. Seus MACs permanecem NULL até serem informados com valores reais; nenhum MAC fictício foi atribuído a eles.
O modelo SQL e as respostas de dispositivo/status aceitam MAC ausente para o legado. Novos cadastros continuam exigindo MAC válido. Reiniciar o backend para carregar os ajustes de código.
Verificação realizada contra o servidor e MySQL reais: cadastro HTTP 201; telemetria HTTP 201; estado OPERANDO; reenvio sem duplicação. Foi criado/reutilizado o dispositivo de teste de MAC 02:00:00:00:00:99, vinculado à CNC-003, e gravada uma amostra da mesa. A consulta dos três dispositivos foi validada com o código atualizado usando TestClient contra o MySQL real.
A OpenAPI foi atualizada. Foi acrescentado teste de regressão para leitura de dispositivos legados e exigência de MAC nos novos cadastros. Isso não substitui o ensaio com Opta físico e frontend/Electron.
A migração SQL é específica para a estrutura antiga identificada; não reaplicar quando as colunas já existirem. Outras divergências históricas do banco não foram automaticamente migradas.

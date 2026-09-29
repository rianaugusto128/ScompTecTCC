> Firmware da mesa recebido e integrado: veja [configuração, mapeamento e limites do Opta](firmware/opta_mesa_monitor/README.md).

# Integração Arduino Opta WiFi — SCOMPTEC

## Fluxo implementado

```mermaid
flowchart LR
    CNC[Sinais da CNC] --> OPTA[Arduino Opta WiFi]
    OPTA -->|HTTP POST /api/devices/register| API[FastAPI]
    OPTA -->|HTTP POST /api/devices/UUID/telemetry| API
    API -->|Transação SQLAlchemy / PyMySQL| DB[(MySQL)]
    DB -->|Cadastro, estado e histórico| API
    FRONT[React / navegador ou Electron] -->|Consultas REST e atualização a cada 5 s| API
    API -->|JSON com horários UTC| FRONT
```

O Opta envia dados ao backend. Somente o backend acessa o MySQL. O frontend consulta o backend; ele não precisa acessar diretamente o Opta. O ciclo de atualização aguarda a conclusão das consultas antes de agendar a próxima, evitando sobreposição. Uma falha mantém as últimas leituras identificadas como desatualizadas e continua tentando conectar.

O transporte escolhido é HTTP com JSON. A documentação oficial do [Arduino Opta](https://docs.arduino.cc/hardware/opta) e o [manual oficial com exemplo de WiFiClient e HTTP](https://github.com/arduino/docs-content/blob/main/content/hardware/07.opta/opta-family/opta/tutorials/01.user-manual/content.md) fundamentam essa opção. Não há servidor MQTT nem WebSocket implementado neste backend. O firmware antigo em `firmware/esp32_cnc_monitor` é legado e não deve ser gravado no Opta. O firmware `firmware/opta_mesa_monitor` integra a mesa seletora enviada pelo usuário e preserva suas entradas, saídas e temporizadores. O mapeamento específico está no README do firmware.

## 1. Configuração do banco e da rede

Use Python 3.10 ou superior. Na raiz do projeto:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r "SCOMPTEC- Back/requirements-dev.txt"
```

O MySQL deve estar instalado e acessível. Crie um banco próprio e um usuário da aplicação com permissões nesse banco. Exemplo de criação do banco, executado pelo administrador do MySQL:

```sql
CREATE DATABASE IF NOT EXISTS cnc_monitor CHARACTER SET utf8mb4;
```

Configure `SCOMPTEC- Back/.env` usando `.env.example` como referência, sem sobrescrever credenciais existentes:

```dotenv
DATABASE_URL=mysql+pymysql://USUARIO:SENHA@127.0.0.1:3306/cnc_monitor?charset=utf8mb4
SQL_ECHO=false
DEVICE_OFFLINE_TIMEOUT_SECONDS=90
DEVICE_API_KEY=CHAVE_PRIVADA_COMPARTILHADA_COM_OPTA
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://IP_DO_FRONTEND:5173
AUTH_SECRET=SEGREDO_PRIVADO_DA_INSTALACAO
```

Codifique caracteres especiais da senha na URL. Para MySQL com autenticação `caching_sha2_password` sem TLS, o driver pode exigir o extra `pymysql[rsa]`; a configuração de autenticação/TLS deve ser verificada no servidor escolhido.

Inicie pela raiz:

```powershell
.\.venv\Scripts\python.exe -m uvicorn Main:app --app-dir "SCOMPTEC- Back" --host 0.0.0.0 --port 8000
```

O startup cria tabelas ausentes; não cria o banco MySQL e não altera tabelas existentes. As colunas existentes foram preservadas. O startup também cria a tabela auxiliar `telemetry_order`, que registra a ordem de chegada na mesma transação da leitura e resolve empates de timestamp no mesmo segundo. Leituras legadas sem essa ordem mantêm a ordenação histórica disponível. Se o banco tiver um esquema diferente dos modelos atuais, será necessário comparar e migrar esse esquema antes do uso. A conexão usa verificação de conexões ociosas e reciclagem do pool.

No Opta, configure `http://IP_DO_COMPUTADOR_BACKEND:8000/api`. `127.0.0.1` e `localhost` no Opta apontam para o próprio dispositivo. Garanta acesso entre as máquinas na rede e liberação da porta 8000 no firewall. `0.0.0.0` é endereço de escuta do servidor, não endereço de destino.

No frontend, configure `scomptec-cnc front 2/.env`:

```dotenv
VITE_API_BASE_URL=http://IP_DO_COMPUTADOR_BACKEND:8000/api
VITE_USE_MOCKS=false
```

Execute `npm run dev -- --host 0.0.0.0` na pasta do frontend. Reinicie o Vite após alterações no `.env`; para Electron ou frontend compilado, gere novamente o build. Se o frontend for servido por HTTPS, o backend também precisa ser acessível por HTTPS para evitar bloqueio de conteúdo misto. CORS deve listar a origem real do navegador; o Opta não depende de CORS.

`GET /api/health` executa `SELECT 1`: retorna `200` com `{"status":"ok","database":"ok"}` se o banco responder, ou `503` se ficar indisponível depois de iniciado o servidor. Se o MySQL não responder no startup, o backend não termina a inicialização.

## 2. Cadastro do Opta

Ao conectar ou reiniciar, envie:

```http
POST /api/devices/register
Content-Type: application/json
X-Device-Key: CHAVE_PRIVADA_COMPARTILHADA_COM_OPTA
```

```json
{
  "mac_address": "AA:BB:CC:DD:EE:11",
  "ip_address": "192.168.1.50",
  "firmware_version": "opta-1.0.0"
}
```

Use o MAC da interface WiFi, sempre a mesma interface para a identidade. Na primeira chamada o servidor cria uma CNC e um dispositivo `OPTA-001`, nomeado `Arduino Opta WiFi 01`. A resposta `201` contém `created`, `device` e `cnc`; guarde **`device.id`**, que é o UUID usado na URL de telemetria. `device.code` é apenas o código legível na tela.

Repetir o mesmo MAC atualiza IP, firmware e última comunicação sem duplicar a CNC. `created` será `false`. Os códigos antigos de dispositivos existentes são preservados; nenhuma linha do banco é automaticamente renomeada ou excluída. Trocar o MAC físico cria um cadastro novo. A substituição de um dispositivo existente na mesma CNC com preservação histórica exige uma migração explícita; não exclua a CNC antiga para fazer essa troca.

Os contadores usam incremento transacional específico de MySQL para evitar colisões entre cadastros simultâneos. Respostas `409` indicam conflito; no registro automático, tente novamente com o mesmo MAC.

## 3. Leituras periódicas

Envie uma leitura completa a cada 5–10 segundos e quando houver mudança relevante de sinal, mesmo que a CNC esteja parada ou desligada. Essa periodicidade é o contrato proposto para o firmware futuro; o backend não configura o intervalo do dispositivo.

```http
POST /api/devices/UUID_RETORNADO_NO_CADASTRO/telemetry
Content-Type: application/json
X-Device-Key: CHAVE_PRIVADA_COMPARTILHADA_COM_OPTA
```

```json
{
  "event_id": "boot-UUID-unico:123",
  "machine_active": true,
  "voltage_24v": true,
  "digital_signals": {
    "ciclo": true,
    "alarme": false,
    "emergencia": false,
    "manutencao": false,
    "I1": true
  },
  "analog_signals": {},
  "extra_signals": {
    "rssi": -60,
    "uptime_seconds": 1234
  }
}
```

- `machine_active` é obrigatório e booleano JSON. `voltage_24v` é opcional: use `null` ou omita quando não houver sensor dedicado. `voltage_24v` indica presença do sinal monitorado de 24 V, não uma tensão analógica medida.
- `digital_signals` é um mapa booleano; o backend normaliza valores booleanos reconhecidos e rejeita valores inválidos. Use preferencialmente `true` e `false`.
- `analog_signals` aceita apenas números finitos. Envie somente grandezas realmente medidas e convertidas na unidade definida. Campos reconhecidos pela interface: `current` em A, `voltage` em V, `temperature` em °C e `power_kw` em kW. Também são aceitos os aliases portugueses presentes no adaptador. Entradas brutas `I1`, etc. ficam preservadas, mas não são automaticamente convertidas em corrente ou temperatura.
- `extra_signals` aceita metadados JSON. `rssi` está em dBm e `uptime_seconds` em segundos. Ambos são opcionais.
- `timestamp` é opcional. Com relógio sincronizado, envie ISO 8601 com `Z` ou offset. Sem sincronização, omita o campo; o servidor aplica seu horário UTC. O banco e o protocolo desta versão usam precisão de segundos, compatível com as colunas MySQL atuais. Datas sem offset são interpretadas como UTC. Horários mais de 60 segundos no futuro são rejeitados com `422`.
- `event_id` é opcional, mas deve ser enviado para garantir idempotência. Use identificador de boot único mais contador, ou outro identificador persistente que nunca seja reutilizado para uma leitura diferente. Guarde o corpo da leitura até receber confirmação e repita exatamente o mesmo identificador e conteúdo em caso de timeout.

A resposta `201` confirma a gravação e traz a leitura. Repetir o mesmo `event_id` retorna a leitura já gravada, sem duplicá-la. Reutilizá-lo com conteúdo diferente retorna `409`. Uma repetição idêntica não atualiza a presença do dispositivo: envie também novas leituras periódicas. Sem `event_id`, cada POST é uma nova linha.

`404` significa dispositivo não encontrado: refaça o cadastro. `401` significa chave inválida. `422` aponta erro no JSON, nos tipos ou no relógio. Timeout ou erro `5xx` permite repetir a mesma leitura com espera progressiva. Antes de esvaziar uma fila antiga, envie uma leitura atual para representar o estado presente da CNC.

## 4. Estado, presença e histórico

Prioridade de estado: ausência de 24 V → `DESLIGADA`; emergência → `EMERGENCIA`; alarme → `ALARME`; manutenção → `MANUTENCAO`; atividade/ciclo → `OPERANDO`; caso contrário → `PARADA`. Aliases ingleses: `emergency`, `alarm`, `maintenance`, `cycle`. A semântica e a polaridade física desses sinais serão confirmadas com o firmware.

`received_at` e `last_seen` usam o relógio do servidor. `timestamp` representa a coleta. Leituras antigas são armazenadas, mas não substituem o estado de uma leitura mais recente. A leitura e a atualização de estado são gravadas na mesma transação. As respostas JSON identificam UTC com `Z`, evitando interpretar o horário MySQL como horário local do navegador.

Após 90 segundos sem comunicação, o estado consultado é `SEM_COMUNICACAO`. Se o Opta está comunicando, mas sua última amostra é antiga ou ausente, o estado é `DADOS_DESATUALIZADOS`. `last_known_status` mantém o último estado operacional. O timeout é calculado na consulta, inclusive na lista de CNCs; não há tarefa de fundo gravando eventos de desconexão.

O frontend consulta `/api/cncs`, `/api/devices`, `/api/cncs/{id}/status` e `/api/cncs/{id}/history`. O histórico visível contém as últimas **100 amostras por CNC**, identificadas como leituras, não como mudanças de estado inventadas. O gráfico usa as últimas 30 amostras. O histórico integral pode ser consultado com `page`, `limit` (até 500), `start` e `end`; o total é contado pelo banco. Esse carregamento é adequado à integração inicial e deve ser agregado no backend antes de ampliar muito a frota.

Alertas ativos são recalculados a cada consulta. Durante falha da API, há um aviso de conexão, sem dados simulados. A simulação exige `VITE_USE_MOCKS=true` ou a rota de demonstração administrativa em desenvolvimento. As telas de empresas/unidades não recebem cadastros fictícios no modo real: esses recursos ainda não têm tabelas e endpoints no backend atual. Indicadores diários consolidados, auditoria de transições e mudanças de vínculo ainda exigem implementação própria; não são inferidos como se as últimas 100 leituras representassem o dia inteiro.

Os limites analógicos da interface ainda são referências predefinidas, não parâmetros calibrados por CNC. Não devem ser tratados como calibração dos sensores.

## 5. Acesso e preservação dos dados

`DEVICE_API_KEY` protege cadastro automático e ingestão quando preenchida. Vazia, permite a integração inicial em rede isolada. A chave nunca deve entrar em variável `VITE_*` ou ser enviada pelo frontend. É uma chave compartilhada da instalação, não credencial individual por Opta.

O backend existente possui login e sessão, mas as rotas de consulta e CRUD de CNC/dispositivo ainda não aplicam autorização por usuário/empresa. Não exponha essa instalação diretamente à internet sem implementar essa autorização e configurar TLS. Esta adaptação não constitui implementação de multiempresa ou controle remoto da CNC.

O vínculo atual é de um dispositivo por CNC. A realocação de um dispositivo com telemetria foi bloqueada com `409`, porque o histórico era associado à CNC através do vínculo atual e mudaria de máquina silenciosamente. Exclusões continuam tendo o comportamento cascata já existente. Nenhuma exclusão ou migração foi executada nesta revisão.

## 6. Validação e limites desta entrega

```powershell
.\.venv\Scripts\python.exe -m pytest -q
node --test "scomptec-cnc front 2/src/services/telemetry.test.js" "scomptec-cnc front 2/src/pages/Admin/adminModel.test.js"
npm.cmd run build --prefix "scomptec-cnc front 2"
npm.cmd run lint --prefix "scomptec-cnc front 2"
```

A configuração pytest seleciona `SCOMPTEC- Back/tests`. Os antigos testes em `tests/` apontam para `app.main`/MongoDB, ausentes no projeto atual, e foram preservados como legado fora da suíte ativa.

Resultado local: **23 testes de backend e 11 testes de frontend passaram**; o build do frontend terminou com sucesso. O lint não apresentou erros, mas ainda há avisos de código preexistente; o build também avisa sobre o tamanho do pacote JavaScript. Não foi feita validação visual em navegador nesta revisão.

Os testes da API usam SQLite isolado com os modelos SQLAlchemy, sem escrever no banco configurado. Cobrem cadastro, persistência, leitura para o frontend, estados, timeout, ordenação temporal, validação, idempotência, paginação, UTC, chave do dispositivo e preservação do vínculo histórico. Isso não substitui a execução contra MySQL, especialmente dos casos concorrentes e das restrições de um banco já existente.

Na verificação local de 10/09/2026, o `.env` apontava para MySQL e a tentativa de conexão a `127.0.0.1` foi recusada. Não havia serviço MySQL identificado. A validação real de gravação/leitura no MySQL continua pendente da disponibilidade desse servidor. O firmware da mesa foi fornecido e integrado posteriormente nesta mesma revisão. O Opta físico continua sem validação de bancada nesta sessão. Também não foi feito ensaio elétrico ou de rede WiFi com a CNC. Esses são os passos restantes para homologar a comunicação de ponta a ponta.

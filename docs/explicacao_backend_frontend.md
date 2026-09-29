# Funcionamento do backend e do frontend do SCOMPTEC

## Guia completo do projeto de monitoramento

O SCOMPTEC reúne coleta de sinais industriais, armazenamento de leituras e uma interface para acompanhar máquinas. O frontend apresenta as informações e recebe as ações do usuário. O backend valida solicitações, aplica regras e mantém os dados no banco. O Arduino Opta WiFi executa o programa local da mesa seletora e envia ao servidor uma cópia do estado observado.

Este guia explica a arquitetura, os arquivos principais, as telas, as regras de monitoramento, a autenticação, a administração e a comunicação entre essas partes. A finalidade é permitir que o leitor compreenda o funcionamento do trabalho e consiga apresentá-lo, relacionando cada recurso à sua implementação.

O núcleo de monitoramento e a central administrativa possuem integração com o servidor. A organização por empresas e unidades, algumas preferências de conta e indicadores diários ainda têm partes demonstrativas ou incompletas. Essas diferenças aparecem ao longo do texto para que uma possibilidade visual não seja confundida com uma função já integrada.

### Como usar este guia

Os capítulos 1 a 3 apresentam a estrutura geral. Os capítulos 4 a 9 explicam o backend e suas regras. Os capítulos 10 a 14 percorrem o frontend. Os capítulos 15 a 18 descrevem a integração com o Opta, exemplos completos, execução e limites da versão atual.

### Mapa de leitura

- 1 Visão geral e divisão de responsabilidades
- 2 Tecnologias utilizadas
- 3 Organização dos arquivos
- 4 Inicialização e banco de dados
- 5 Cadastro de máquinas e dispositivos
- 6 Telemetria e determinação do estado
- 7 Histórico e indicadores de utilização
- 8 Autenticação e administração
- 9 Catálogo das rotas da API
- 10 Estrutura e atualização do frontend
- 11 Telas de acesso e monitoramento
- 12 Detalhes da máquina e gráficos
- 13 Central administrativa e telas complementares
- 14 Componentes visuais e modo demonstrativo
- 15 Integração com a mesa seletora
- 16 Exemplos do fluxo completo
- 17 Configuração e verificação
- 18 Limites atuais e glossário

Data de referência do código analisado: 15 de setembro de 2026.

---

# 1 Visão geral e divisão de responsabilidades

### O problema que o sistema atende

Em uma operação com máquinas, olhar apenas para o equipamento não produz um histórico centralizado do que aconteceu. O SCOMPTEC recebe sinais, organiza leituras por máquina e mostra o estado atual, problemas ativos e informações anteriores. Na integração da mesa seletora, também apresenta entradas, comandos de saída e contadores de classificação de peças.

### O que significa frontend

Frontend é a parte com a qual a pessoa interage: páginas, menus, botões, campos, cartões e gráficos. Neste projeto, ele permite entrar na conta, consultar máquinas, filtrar estados, visualizar histórico e administrar usuários e ocorrências. O frontend transforma os dados recebidos em uma apresentação compreensível.

O navegador não consulta o banco diretamente. Quando precisa de dados, faz uma requisição HTTP para a API. API é o conjunto de endereços e formatos que permite a comunicação com o servidor. As respostas usam principalmente JSON, um formato de texto com campos e valores.

### O que significa backend

Backend é o programa que atende às requisições e executa as regras do sistema. Ele cadastra máquinas e dispositivos, recebe telemetria, identifica o estado da máquina, registra horários, consulta histórico, calcula tempos e processa autenticação e administração. Também é responsável por gravar as alterações no banco.

### O papel do banco e do Opta

O banco preserva dados entre execuções do programa. Uma leitura gravada continua disponível mesmo que o navegador seja fechado. Já o Opta é o dispositivo instalado junto ao processo físico: no firmware da mesa, ele executa a classificação local e envia informações para o backend.

O fluxo principal é: sensores da mesa → programa do Opta → HTTP com JSON → backend FastAPI → banco relacional → consultas do frontend → cartões, gráficos e histórico.

A comunicação também ocorre no sentido frontend → backend quando alguém cria uma conta ou registra uma ocorrência. Isso altera registros administrativos. Não há rota de comando remoto para ligar a esteira ou acionar os desviadores. O controle físico permanece no firmware local.

### Exemplo rápido

Se o Opta informa que existe um ciclo de classificação em andamento, o backend pode classificar a máquina como OPERANDO. O frontend busca esse resultado e atualiza o cartão. Se a comunicação deixa de chegar, o backend passa a responder SEM_COMUNICACAO após o tempo configurado. Esse estado não comprova que a máquina foi desligada.

Referências no projeto: Main.py, Services/telemetry.py e src/services/api.js.

---

# 2 Tecnologias utilizadas

### Tecnologias do backend

Python é a linguagem usada para escrever as regras do servidor. FastAPI organiza as rotas HTTP, recebe as requisições e produz respostas. Uvicorn é o servidor que executa a aplicação e atende conexões na porta configurada.

Pydantic define os formatos aceitos e devolvidos pela API. Por exemplo, valida e-mail, tamanho da senha, formato do MAC e tipos dos sinais. Os arquivos da pasta Schema descrevem esses contratos. Um conteúdo inválido normalmente produz resposta 422 antes de ser processado pelo serviço.

SQLAlchemy representa tabelas como classes Python e permite consultar, relacionar, inserir e excluir registros. PyMySQL é o driver usado para a conexão MySQL configurada por padrão. O projeto também usa SQLite em testes isolados. A presença de cnc_monitor.db no diretório não significa que esse arquivo seja o banco ativo: quem determina a conexão é DATABASE_URL.

python-dotenv carrega as configurações do arquivo .env do backend. email-validator participa da validação de endereços de e-mail. As dependências atuais estão em SCOMPTEC- Back/requirements.txt.

### Tecnologias do frontend

React constrói a interface por componentes. React DOM insere essa interface na página. React Router escolhe a tela a partir do endereço, como /maquinas ou /historico, permitindo navegar sem carregar um documento HTML completo a cada clique.

Vite fornece o ambiente de desenvolvimento e gera os arquivos finais da aplicação. Tailwind CSS fornece classes de estilo para cores, espaçamento, tamanho e adaptação da tela. PostCSS e Autoprefixer participam do processamento do CSS. O projeto também possui CSS próprio para ajustes visuais.

Recharts desenha gráficos a partir de listas de dados. Lucide React fornece os ícones. A função fetch, disponível no navegador, realiza as chamadas HTTP; não existe necessidade de uma biblioteca adicional para esse transporte na implementação atual.

### Aplicativo desktop

Electron abre o frontend em uma janela de aplicativo. electron-builder empacota essa janela e os arquivos gerados pelo Vite, com configuração para instalador Windows NSIS. O pacote inclui a interface, mas o arquivo principal do Electron não inicia o servidor Python nem o banco. Eles precisam estar disponíveis separadamente.

Em desenvolvimento, o Electron abre o endereço do Vite. No pacote final, abre dist/index.html. A aplicação escolhe HashRouter quando é carregada por file:// e BrowserRouter quando é carregada pela web. Isso permite que as rotas funcionem nas duas formas de execução.

### Documentação antiga

O README da raiz e a pasta tests da raiz ainda contêm referências a MongoDB, ESP32 e uma estrutura app.main anterior. A aplicação atual em SCOMPTEC- Back usa SQLAlchemy e configuração MySQL, e a integração adotada é com Arduino Opta WiFi.

---

# 3 Organização dos arquivos

### Backend na pasta SCOMPTEC Back

O nome real da pasta é SCOMPTEC- Back. Main.py monta a aplicação e registra as rotas. config.py carrega o .env. Database/Connection.py cria a conexão e fornece uma sessão de banco para cada requisição. Database/models.py define as tabelas e seus relacionamentos.

Schema contém os contratos de entrada e saída: cnc.py trata máquinas; device.py trata dispositivos; telemetry.py trata leituras; auth.py trata cadastro e login; admin.py trata administração. common.py padroniza a saída de datas em UTC.

Services contém as operações executadas pelas rotas. cncservice.py cuida das CNCs e consultas associadas. deviceservice.py cuida dos gateways e do provisionamento. telemetry.py recebe leituras. utilization.py calcula os tempos por estado. clock.py concentra regras de horário e comunicação.

authservice.py processa login, cadastro e identificação do usuário. security.py cria hashes de senha e tokens. device_auth.py confere a chave dos dispositivos. adminservice.py processa contas, ocorrências, limites e auditoria. admin_bootstrap.py sincroniza a conta administrativa configurada no servidor. create_admin.py é um utilitário adicional para criação de administrador.

### Frontend na pasta scomptec cnc front 2

O nome real da pasta é scomptec-cnc front 2. index.html é o documento de entrada. src/main.jsx inicia o React e escolhe o roteador. src/App.jsx registra todas as rotas e envolve a navegação no MonitoringProvider.

src/pages reúne as páginas. src/layouts contém a estrutura compartilhada do painel e do modo TV. src/components reúne peças reutilizáveis como cartões, avisos, gráficos e menu. src/contexts/MonitoringContext.jsx mantém o estado compartilhado do monitoramento.

src/services/api.js concentra o acesso ao servidor. telemetry.js transforma leituras e controla as consultas periódicas. utilization.js combina os tempos das máquinas. adminSession.js trata o usuário em cache e a saída da sessão. eventBus.js distribui eventos locais, principalmente para a demonstração. websocket.js contém apenas uma estrutura preparada para uso futuro, sem conexão real.

src/hooks simplifica o acesso aos dados e aos contadores de duração. src/utils reúne regras visuais de estado, severidade, problemas e formatação de horários. src/data/mockData.js reúne os dados de demonstração. public e src/assets guardam imagens e ícones.

### Firmware e documentação

firmware/opta_mesa_monitor contém o programa integrado da mesa. MesaControl.cpp executa o controle e Telemetry.cpp cuida da comunicação. Config.h contém intervalos; Telemetry.h define a estrutura compartilhada. O exemplo de payload está em mesa_sample.json.

firmware/reference preserva o programa original; firmware/esp32_cnc_monitor contém material legado. docs reúne guias e contratos. Pastas como node_modules, dist e release contêm dependências ou resultados de construção, não a lógica principal escrita para o trabalho.

---

# 4 Inicialização e banco de dados

### O que acontece ao iniciar o servidor

Main.py importa config antes dos serviços para que as variáveis do ambiente estejam disponíveis. Em seguida, cria a aplicação FastAPI com nome e versão, configura CORS e registra os grupos de rotas sob /api. CORS define quais origens de navegador podem fazer chamadas à API; não substitui autenticação.

Na inicialização, create_tables cria as tabelas que ainda não existem. Depois, sync_admin cria ou atualiza a conta administrativa configurada. A rota /api/health executa SELECT 1 para confirmar acesso ao banco. Ela responde sucesso quando a consulta funciona e 503 quando o banco está indisponível.

A conexão usa pool_pre_ping para verificar conexões reutilizadas e pool_recycle de 1800 segundos. get_db abre uma sessão, entrega-a ao serviço e fecha-a ao terminar. Operações que alteram dados fazem commit para confirmar a gravação. Em conflitos tratados, rollback desfaz a transação pendente.

### Tabelas principais

| Tabela | Conteúdo armazenado |
| cncs | UUID, código, nome, descrição, estado, início do estado, última comunicação e criação. |
| devices | UUID, código, nome, MAC, IP, CNC vinculada, firmware e horários. |
| telemetry | UUID, dispositivo, coleta, recebimento, atividade e grupos de sinais. |
| telemetry_order | Número crescente associado à leitura para desempatar a ordem de chegada. |
| code_sequences | Último número utilizado para cada prefixo de código. |
| users | Nome, e-mail, hash da senha, perfil, conta ativa e horários. |
| admin_incidents | Máquina, título, prioridade, andamento, responsável, observação e atendimento. |
| admin_rules | Conjunto de limites administrativos em um campo JSON. |
| admin_audit | Autor, descrição da ação administrativa e horário. |

### Relacionamentos e identificação

UUID é o identificador interno, usado nas requisições e relações. O código, como CNC-001 ou OPTA-001, é a identificação legível exibida ao usuário. Eles têm funções diferentes e não devem ser trocados ao chamar a API.

Cada Device deve apontar para uma CNC, e cnc_id é único na tabela de dispositivos. Assim, uma CNC pode ter no máximo um dispositivo nessa modelagem, embora a propriedade devices da classe CNC seja uma lista. Um dispositivo pode possuir muitas leituras de telemetria.

Excluir uma CNC pela aplicação exclui seus dispositivos e leituras em cascata; excluir um dispositivo remove sua telemetria. Ocorrências e auditoria administrativa usam registros separados e não possuem a mesma relação em cascata com a CNC. Uma exclusão não é apenas esconder um cartão.

create_all não atualiza automaticamente todos os campos de tabelas antigas. Há uma migração SQL para campos de rede, mas a atualização de uma instalação existente precisa considerar as diferenças de esquema. O arquivo dessa migração adiciona MAC, IP e unicidade do MAC, sem representar todas as mudanças possíveis do modelo.

---

# 5 Cadastro de máquinas e dispositivos

### Cadastro manual de CNC

POST /api/cncs recebe nome e descrição. O backend gera o UUID e um código progressivo com prefixo CNC-. A nova máquina começa como SEM_COMUNICACAO. PUT permite alterar nome e descrição; GET consulta; DELETE exclui. Esses recursos existem na API, mas a tela de máquinas atual se concentra em consulta e filtragem.

CodeSequence preserva o último número utilizado. A exclusão de CNC-002 não libera esse código para uma nova máquina. No MySQL, o código usa uma operação de inserção ou incremento e bloqueio de registro para lidar com a sequência dentro da transação.

### Registro automático pelo Opta

O Opta chama POST /api/devices/register com mac_address, ip_address e firmware_version. O MAC identifica o equipamento físico. O schema exige seis pares hexadecimais separados por dois-pontos, e o serviço normaliza as letras para maiúsculas.

Se o MAC ainda não existe, o backend cria uma CNC e um Device já associados. Os códigos seguem CNC-001 e OPTA-001; os nomes seguem CNC 01 e Arduino Opta WiFi 01. A resposta contém created=true, os dados do dispositivo, a identificação da CNC, server_time_unix e telemetry_session_id.

Se o MAC já existe, atualiza IP, versão e última comunicação, reutilizando a CNC e o dispositivo existentes. A resposta mantém o código HTTP 201 definido na rota, mas created=false indica que não houve um novo par. Essa repetição sem duplicação é chamada de comportamento idempotente.

O registro atualiza a comunicação do dispositivo, mas não produz uma medição. Por isso, um gateway recém-registrado e sem leitura pode estar online enquanto a CNC aparece como DADOS_DESATUALIZADOS.

### Cadastro e alteração de dispositivo

POST /api/devices cria um gateway para uma CNC já existente. O serviço rejeita CNC inexistente, MAC repetido e CNC que já tenha dispositivo. PUT permite alterar nome, firmware, IP e associação. O MAC não está entre os campos de DeviceUpdate.

A realocação para outra CNC é bloqueada quando o dispositivo já possui telemetria. Como as consultas de histórico passam pelo vínculo atual do dispositivo, mover esse vínculo sem migração faria as leituras parecerem pertencer a outra máquina. A restrição preserva essa associação histórica.

GET /api/devices/{id}/status informa a comunicação do gateway. Ela é calculada a partir de last_seen e do limite configurado, cujo padrão é 90 segundos. Esse resultado é distinto do estado operacional da CNC.

### Erros mais comuns

404 indica máquina ou dispositivo não encontrado. 409 indica conflito, como MAC duplicado ou realocação com histórico. 422 indica formato inválido ou associação não permitida. Na integração automática, uma colisão de cadastro é tratada com rollback e nova consulta pelo MAC.

Referências: Services/deviceservice.py, Services/cncservice.py e Schema/device.py.

---

# 6 Telemetria e determinação do estado

### O que uma leitura contém

Telemetria é o envio de informações do equipamento para acompanhamento remoto. POST /api/devices/{device_id}/telemetry recebe machine_active, obrigatório e booleano, além de campos opcionais. voltage_24v informa presença de alimentação quando existe medição dedicada. null significa que esse sinal não foi medido.

digital_signals guarda sinais lógicos, como ciclo, alarme e emergência. analog_signals guarda valores numéricos finitos, como corrente ou temperatura, se o firmware realmente os medir. extra_signals permite informações adicionais, como RSSI, tempo ligado, identificador de inicialização e dados da mesa.

timestamp representa o instante de coleta. Se for omitido, o servidor usa seu horário atual. received_at é o instante de recebimento no servidor. event_id identifica uma leitura para permitir reenvio sem duplicação. Campos desconhecidos no nível principal são rejeitados pelo contrato de telemetria.

### Prioridade das regras

A função derive_status verifica as condições abaixo em ordem. A primeira satisfeita determina o estado armazenado. Os nomes das chaves digitais são convertidos para minúsculas; algumas condições aceitam nomes em português e inglês.

| Ordem | Condição recebida | Estado |
| 1 | voltage_24v é explicitamente false | DESLIGADA |
| 2 | emergencia ou emergency ativo | EMERGENCIA |
| 3 | alarme ou alarm ativo | ALARME |
| 4 | manutencao ou maintenance ativo | MANUTENCAO |
| 5 | machine_active ou ciclo ou cycle ativo | OPERANDO |
| 6 | Nenhuma condição anterior | PARADA |

Assim, alarme e ciclo simultâneos resultam em ALARME. Ausência de medição de 24 V não resulta em DESLIGADA. Os valores analógicos não participam dessa classificação principal; as avaliações de limites no frontend são uma camada diferente.

### Gravação e prevenção de duplicidade

O serviço localiza e bloqueia o registro do dispositivo para processar a operação. Um event_id gera um UUID determinístico combinado com o dispositivo. Se a mesma leitura já existe, o servidor devolve o registro existente. Se o identificador é repetido com conteúdo diferente, responde 409.

Uma leitura nova é gravada e recebe uma ordem de ingestão. Essa ordem resolve empates quando duas coletas possuem o mesmo timestamp. O servidor aceita leituras atrasadas no histórico, mas uma coleta mais antiga não substitui o estado de uma coleta mais recente. status_since só muda quando o estado muda.

O recebimento novo atualiza last_seen. Uma repetição já reconhecida retorna antes dessa atualização. Timestamp mais de 60 segundos no futuro é rejeitado com 422. Datas são normalizadas em UTC, com precisão de segundos no processamento da coleta.

---

# 7 Histórico e indicadores de utilização

### Estado armazenado e estado apresentado

O estado da última leitura fica na CNC, mas a consulta de status também verifica a comunicação. Se o dispositivo não estiver online, a API apresenta SEM_COMUNICACAO. Se estiver online, porém sem telemetria válida recente, apresenta DADOS_DESATUALIZADOS.

O limite padrão é 90 segundos, configurável por DEVICE_OFFLINE_TIMEOUT_SECONDS, com mínimo aceito de 10. O estado sem comunicação é calculado durante a consulta; não depende de uma tarefa que fique alterando todas as máquinas no banco. last_known_status conserva o último estado operacional conhecido.

Exemplo: uma leitura coletada há cinco minutos pode chegar agora. O gateway demonstrou comunicação recente, mas o conteúdo descreve o passado. Separar timestamp de received_at permite mostrar dados desatualizados em vez de apresentar essa leitura como atual.

### Histórico paginado

GET /api/cncs/{id}/history consulta as leituras vinculadas à máquina. Aceita start, end, page e limit. O padrão é página 1 com 50 registros, e o máximo por página é 500. O período usa o horário de coleta, e início posterior ao fim é rejeitado.

A resposta contém items, total, page e limit. As leituras aparecem da mais recente para a mais antiga, com critérios adicionais para desempate. O frontend carrega atualmente as últimas 100 leituras de cada máquina para seu histórico e gráfico. Logo, o banco pode conter mais registros do que a tela está mostrando.

### Utilização baseada no tempo

GET /api/cncs/{id}/utilization consulta as últimas 24 horas, incluindo uma margem anterior equivalente ao timeout. Essa margem permite considerar uma leitura anterior ao início da janela que ainda era válida dentro dela.

Cada leitura representa seu estado até o primeiro destes limites: a leitura seguinte, o vencimento do timeout ou o instante atual. O algoritmo divide esse tempo em 24 intervalos de uma hora relativos ao momento da consulta. Não são necessariamente horas fechadas do relógio, como 14h00 a 15h00.

Um exemplo: OPERANDO às 10h00min00s e PARADA às 10h00min30s representam 30 segundos de operação. Se a segunda leitura não for sucedida por outra, ela só conta até o timeout. O restante do período fica sem observação, em vez de ser presumido como parada ou operação.

### Como o frontend calcula percentuais

O frontend soma os segundos dos estados das máquinas visíveis. Utilização é tempo OPERANDO dividido pelo tempo observado. Taxa de alerta é tempo ALARME mais EMERGENCIA dividido pelo tempo observado. Cobertura é tempo observado dividido pela capacidade temporal total da janela das máquinas consideradas.

Com 45 minutos operando e 15 em alarme, o tempo observado é uma hora: utilização de 75% e alerta de 25%. Esses números não indicam quantas peças boas foram produzidas. O sistema não calcula OEE completo, que exigiria outros dados. A taxa instantânea do painel, máquinas operando divididas pelo total de máquinas, é outra medida.

---

# 8 Autenticação e administração

### Cadastro e entrada

POST /api/auth/register recebe nome, e-mail e senha. O servidor normaliza o e-mail, rejeita duplicidade, gera o hash e cria o usuário com perfil CLIENTE. O cadastro público não concede acesso administrativo. Nome deve ter de 2 a 120 caracteres e senha de 8 a 128, conforme o schema.

POST /api/auth/login verifica e-mail, senha e conta ativa. No sucesso, devolve token e dados públicos do usuário. GET /api/auth/me exige o token, valida sua assinatura e expiração e verifica novamente se a conta existe e está ativa.

### Senhas e token

As senhas são armazenadas como PBKDF2-HMAC-SHA256, com salt aleatório de 16 bytes e 390 mil iterações. O salt faz senhas iguais produzirem representações diferentes. O login refaz a derivação e compara o resultado, sem precisar recuperar a senha original.

O token implementado possui duas partes: conteúdo codificado e assinatura HMAC-SHA256. Ele contém sub, com o ID do usuário, e exp, com a expiração. É um token próprio assinado, não o formato JWT padrão de três partes. A duração padrão é 480 minutos, ou oito horas, e a assinatura usa AUTH_SECRET.

O frontend guarda token e usuário em localStorage e envia Authorization: Bearer nas chamadas. Sair remove esses dados do navegador. Não existe rota de revogação por sessão ou renovação de token no código analisado.

### Área administrativa

Todas as rotas /api/admin exigem usuário ativo com perfil admin, ADMIN ou ADMIN_SCOMPTEC. A central cria contas, altera perfis, ativa ou desativa usuários, exclui contas permitidas, registra ocorrências e salva limites. Os perfis disponíveis para administração de contas são administrador, manutenção, operador e visualizador.

As ocorrências têm prioridade Crítica, Alta, Média ou Baixa e andamento Aberta, Em atendimento ou Resolvida. Para resolver, devem ter responsável e descrição do atendimento. O responsável precisa ser um usuário ativo quando atribuído. As alterações são gravadas junto de um registro de auditoria com autor e horário.

O administrador não pode excluir ou desativar a própria conta, nem retirar seu próprio perfil administrativo. Usuários com ocorrências vinculadas não podem ser excluídos; ocorrências abertas também impedem desativação antes da reatribuição. A conta gerenciada pelas variáveis ADMIN_EMAIL e ADMIN_PASSWORD possui proteção específica e é sincronizada na inicialização.

### Alcance atual das permissões

A proteção administrativa é efetiva no servidor. Entretanto, as rotas gerais de CNCs e dispositivos não exigem usuário autenticado no código atual. Registro automático e telemetria verificam X-Device-Key somente quando DEVICE_API_KEY está preenchida. Os perfis não implementam uma separação completa por empresa ou por operação em todo o sistema.

---

# 9 Catálogo das rotas da API

### Máquinas e dispositivos

Todas as rotas abaixo usam o prefixo /api. Nos caminhos, {id} representa o UUID interno da entidade. GET consulta, POST cria ou envia, PUT atualiza e DELETE exclui. Para os grupos deste quadro não há autenticação de usuário configurada; a exceção indicada é a chave de dispositivo.

| Método e caminho após /api | Função |
| GET /health | Testa a disponibilidade da API e do banco. |
| POST /cncs | Cria uma CNC com nome e descrição. |
| GET /cncs | Lista CNCs com estado calculado. |
| GET /cncs/{id} | Consulta uma CNC. |
| PUT /cncs/{id} | Atualiza nome e descrição. |
| DELETE /cncs/{id} | Exclui CNC e vínculos em cascata. |
| GET /cncs/{id}/status | Retorna estado, comunicação e últimos sinais. |
| GET /cncs/{id}/history | Consulta leituras por período e página. |
| GET /cncs/{id}/utilization | Retorna tempos por estado nas últimas 24 horas. |
| POST /devices/register | Provisiona ou atualiza o par Opta e CNC pelo MAC. |
| POST /devices | Cria dispositivo para CNC existente. |
| GET /devices | Lista os dispositivos. |
| GET /devices/{id} | Consulta o dispositivo. |
| PUT /devices/{id} | Atualiza dados e, se permitido, a associação. |
| DELETE /devices/{id} | Exclui dispositivo e suas leituras. |
| GET /devices/{id}/status | Consulta se o gateway está online. |
| POST /devices/{id}/telemetry | Valida e grava uma leitura. |

X-Device-Key é verificada em /devices/register e /devices/{id}/telemetry quando há chave definida no servidor. Uma chave incorreta produz 401. Deixá-la vazia desativa essa verificação nessas duas rotas.

### Conteúdo das respostas de status

A CNC retorna status, status_since, status_duration_seconds, last_seen e gateway_online, além de last_known_status, horário de coleta e recebimento e os grupos de sinais. Esses campos permitem apresentar duração, estado da conexão e última leitura sem fazer suposições sobre a condição física.

O dispositivo retorna identificação, MAC, CNC vinculada, online e last_seen. Não retorna um comando para a máquina. A documentação interativa padrão do FastAPI fica em /docs e o contrato gerado em /openapi.json; esses endereços não usam o prefixo /api.

---

## Rotas de acesso e administração

PATCH altera apenas os campos enviados. Nas rotas administrativas, além do token válido, o usuário deve ter perfil administrativo. As mutações administrativas retornam um novo retrato do estado administrativo após a gravação, permitindo atualizar a interface.

| Método e caminho após /api | Função e acesso |
| POST /auth/register | Cadastro público; devolve token e usuário. |
| POST /auth/login | Verifica credenciais; devolve token e usuário. |
| GET /auth/me | Retorna o usuário da sessão autenticada. |
| GET /admin/state | Consulta usuários, ocorrências, limites e auditoria. |
| POST /admin/users | Cria conta com o perfil escolhido. |
| PATCH /admin/users/{id} | Altera perfil e situação ativa da conta. |
| DELETE /admin/users/{id} | Exclui conta quando as regras permitem. |
| POST /admin/incidents | Registra ocorrência para uma CNC. |
| PATCH /admin/incidents/{id} | Altera andamento, responsável ou atendimento. |
| PUT /admin/rules | Salva os limites administrativos. |

### Respostas que o usuário pode encontrar

200 normalmente significa operação concluída ou consulta bem-sucedida. 201 é usado em criação de contas, máquinas, dispositivos, ocorrências e recebimento de telemetria. As exclusões de CNC e Device respondem 204, sem corpo. A exclusão administrativa de usuário devolve o estado atualizado.

401 indica ausência de autenticação válida ou chave de dispositivo incorreta. 403 indica que o perfil não permite entrar na área administrativa. 404 indica entidade inexistente. 409 representa conflito, como e-mail repetido, event_id reutilizado com dados diferentes ou exclusão impedida. 422 indica dados inválidos ou regra de validação não atendida. 503 é usado pelo teste de saúde quando o banco não responde.

### Exemplo de uso do contrato

Depois do registro automático, o firmware deve guardar device.id da resposta e usá-lo no endereço de telemetria. Ele não deve colocar OPTA-001 nesse lugar, porque o código amigável não é a chave esperada pela rota.

Uma leitura mínima pode conter apenas machine_active=true. Para representar a mesa com fidelidade, o firmware também envia os sinais digitais e o objeto extra_signals.mesa. O exemplo completo disponível em firmware/opta_mesa_monitor/mesa_sample.json mostra esse contrato.

Não há grupos de rotas para cadastro persistente de empresas, unidades e setores, recuperação de senha, notificações push, comandos físicos ou configuração pessoal. A presença de um botão ou texto na interface não cria automaticamente o serviço correspondente.

---

# 10 Estrutura e atualização do frontend

### Uma fonte compartilhada de monitoramento

MonitoringProvider envolve todas as rotas em App.jsx. Ele mantém a lista de máquinas, alertas, eventos, histórico, situação da API, última sincronização e escopo selecionado. As páginas acessam esse conjunto por useMonitoring e por hooks como useMachines e useAlerts.

Isso evita que cada tela mantenha uma cópia independente do estado da mesma máquina. Ao chegar um novo conjunto de dados, React renderiza novamente os componentes que dependem dele. useState armazena valores que mudam; useEffect inicia e encerra efeitos, como a atualização periódica; useMemo reaproveita cálculos conforme suas dependências.

### Como a API é consultada

api.js usa VITE_API_BASE_URL ou, na ausência dela, http://127.0.0.1:8000/api. A função request monta o endereço, acrescenta o token quando existe, envia JSON e interpreta o resultado. O timeout padrão de uma requisição é dez segundos. Erros de validação podem ser traduzidos para mensagens mais claras.

getMachines começa buscando /cncs e /devices em paralelo. Para cada CNC, busca status, as últimas 100 leituras e utilização de 24 horas. toFrontendMachine combina essas respostas em um objeto adequado aos componentes.

Nessa conversão, id vira o código legível da CNC e backendId guarda o UUID. Também são associados dispositivo, IP, MAC, firmware, RSSI, sinais, estado, horários e leituras. Campos analógicos ausentes viram null. Nomes alternativos como current e corrente são reconhecidos sem transformar ausência em zero.

### Consultas periódicas e recuperação

startPolling executa a primeira atualização imediatamente. Após concluir uma rodada, aguarda cinco segundos para iniciar a próxima. O intervalo total inclui o tempo gasto nas requisições. A mesma rotina não inicia uma nova rodada antes de terminar a anterior.

Quando a consulta funciona, o contexto substitui os dados, recalcula alertas e marca a sincronização. Quando falha, preserva medições anteriores, identifica as máquinas como DADOS_DESATUALIZADOS e define comunicação UNKNOWN. A lista de alertas ativos é limpa nessa falha; isso não significa que problemas físicos foram resolvidos. O aviso de conexão fornece o contexto necessário.

As tentativas continuam automaticamente. Ao desmontar o provedor, o agendamento é encerrado e a atualização tardia é ignorada. Esse mecanismo é polling: o frontend pergunta periodicamente se há dados novos. O arquivo websocket.js não implementa uma conexão real com o backend.

### Custo das consultas

Cada rodada faz duas consultas iniciais e três adicionais por máquina. Dez máquinas, por exemplo, geram 32 requisições. É uma estrutura simples de entender, mas o crescimento da frota aumenta o trabalho da API e do navegador. Consultas consolidadas seriam uma evolução possível, não um recurso atual.

---

# 11 Telas de acesso e monitoramento

### Abertura e entrada

A rota / mostra Splash; /inicio mostra Landing. Elas apresentam a identidade do produto e caminhos de acesso. /login contém e-mail, senha, opção de mostrar a senha, mensagens de erro e estado de carregamento. Após o login, administradores vão para /admin e os demais para /selecionar-empresa.

/registro apresenta nome, empresa, e-mail, senha e confirmação. Valida formato de e-mail, tamanho mínimo e coincidência das senhas. Apesar de existir um campo empresa, a chamada envia somente nome, e-mail e senha: não há criação ou associação persistente da empresa nessa operação.

/selecionar-empresa permite escolher visão global ou cliente. Os contextos de empresas vêm da demonstração; em modo real, a lista de empresas é vazia. A saudação dessa página ainda usa currentUser dos dados demonstrativos. Esse fluxo visual não implementa isolamento de dados entre organizações.

### Painel principal

/dashboard apresenta total de CNCs, quantas estão operando, paradas, em alarme, em emergência ou sem dados atuais. Os indicadores são calculados a partir das máquinas do contexto. Clicar em um estado navega para a lista com o filtro correspondente.

A taxa de atividade no topo é a proporção de máquinas operando naquele instante. O gráfico de alertas considera duração no histórico e tem outro significado. A seção Atenção Imediata destaca até cinco problemas; a grade inicial mostra até oito máquinas. A seção de últimas ocorrências apresenta até nove registros do contexto.

No modo real, esses registros recentes são amostras de telemetria transformadas em eventos de apresentação. Mesmo quando textos da tela falam em transições ou ocorrências, não se trata automaticamente de uma tabela persistente de mudanças de estado nem das ocorrências manuais da administração.

### Lista de máquinas

/maquinas mostra cartões e permite buscar por nome ou código. Os filtros incluem estado, somente problemas, unidade e setor. O filtro offline também inclui DADOS_DESATUALIZADOS. Ao filtrar paradas, a ordenação dá destaque às que começaram antes.

Os parâmetros são colocados no endereço, por exemplo /maquinas?status=ALARME. Isso permite que cartões e outros atalhos abram a lista já filtrada. Filtros por unidade e setor dependem dessas associações, que não são preenchidas pelo backend real atual.

### Central de alertas

/alertas filtra os problemas derivados dos estados das máquinas. A lista considera emergência, alarme, parada, falta de comunicação e dados desatualizados. Emergências recebem maior prioridade; a ordenação também considera alarmes críticos, comunicação e duração de paradas, com destaque para paradas de uma hora ou mais.

O alerta desaparece quando uma atualização deixa de classificar a máquina como problema. Não há endpoint de resolução de alerta de monitoramento. Resolver uma ocorrência administrativa é uma operação diferente, e não muda o sinal físico nem o estado operacional da CNC.

---

# 12 Detalhes da máquina e gráficos

### Página individual

/maquinas/:id encontra a máquina pelo código usado no frontend. Mostra identificação, estado, tempo nessa condição, última comunicação, sinais digitais e informações do gateway. Também apresenta as medições analógicas disponíveis e os registros associados à máquina.

Se a leitura contém extra_signals.mesa, o componente MesaSignals aparece e detalha a mesa seletora. Se a API ou o dispositivo perde atualização, avisos indicam que os sinais pertencem à última leitura conhecida. Duração e horário são formatados para leitura humana por funções em utils/time.js e useRelativeDuration.

### Valores medidos e referências visuais

Corrente, tensão, temperatura e potência são exibidas quando existem números válidos. Zero é uma leitura possível; null significa ausência. O firmware atual da mesa não mede essas quatro grandezas, de modo que elas ficam indisponíveis no uso real dessa integração.

Os avaliadores visuais comparam corrente com 22 A e temperatura com 65 °C como referências padrão. A função de tensão usa 210 a 230 V por padrão nos detalhes. Potência igual ou inferior a 0,05 kW com estado OPERANDO é sinalizada como incomum; valores acima de 135% da referência também recebem indicação.

api.js atribui powerAvg=4.2 e limites fixos ao objeto da máquina. Essa potência de referência não é uma média histórica calculada pelo backend. Médias recentes de corrente e temperatura não são preenchidas pela integração atual. As faixas servem à lógica visual implementada e não demonstram calibração do equipamento.

### Gráfico de telemetria

buildTelemetryBuffer remove duplicidades, descarta datas inválidas, ordena a coleta e mantém até 100 pontos. TelemetryChart oferece medidas analógicas, atividade e sinais digitais disponíveis. Escolhe uma série com dados quando possível.

Sinais digitais são representados por 0 e 1 e desenhados em degraus. Grandezas analógicas usam linhas entre os pontos. O eixo horizontal representa o horário da coleta; valores ausentes não são unidos automaticamente. O gráfico também avisa quando a conexão está desatualizada. Ele descreve amostras recebidas, sem garantir captura de cada mudança física entre elas.

### Gráfico de alertas do painel

UtilizationChart permite janelas de 8, 12 ou 24 horas a partir dos intervalos recebidos do backend. A curva mostra a porcentagem do tempo observado em ALARME ou EMERGENCIA. Operação, parada, manutenção e desligamento não aumentam diretamente essa curva. O período mais recente aparece junto de Agora, seguindo para o mais antigo.

### Indicadores diários

Os detalhes possuem espaço para tempos do dia e disponibilidade. Em modo real, exibem ausência de consolidação. OperatingTimeline só é mostrado no modo demonstrativo e monta segmentos ilustrativos a partir de totais simulados. Essa linha não deve ser descrita como reconstrução cronológica real nem como OEE validado.

---

# 13 Central administrativa e telas complementares

### Administração

/admin é envolvida por AdminAccess. Antes de mostrar a página, consulta /auth/me e confirma o perfil retornado pelo servidor. O usuário salvo no navegador serve para apresentação e navegação; não substitui a verificação de permissão no backend.

Admin.jsx carrega /admin/state e organiza quatro abas: visão operacional, usuários, ocorrências e limites de alerta. A visão operacional atual usa AdminActivity para exibir auditoria e pendências de atendimento. Ela permite buscar texto sem depender de acentos, filtrar responsável e data, atualizar e mostrar mais atividades em blocos de 20.

Na aba de usuários, é possível criar conta, mudar perfil, ativar, desativar e solicitar exclusão. Na aba de ocorrências, o administrador escolhe uma máquina real, título, prioridade, responsável e observação. Depois, acompanha o andamento e registra o atendimento. Os botões dependem da resposta do servidor para confirmar gravação.

A aba de limites salva corrente, temperatura e tensões mínima e máxima. Todos precisam ser positivos e a tensão mínima deve ser menor que a máxima. Os padrões administrativos são 22 A, 65 °C e 200 a 240 V. Esses valores são persistidos, mas ainda não são distribuídos de forma unificada aos cartões e ao monitoramento geral, que possuem referências próprias.

Há uma função signalProblems que compara sinais com limites, porém a tela atual de atividade administrativa apresenta auditoria e pendências. Salvar limites não altera derive_status, não cria automaticamente uma ocorrência e não envia parâmetros ao Opta.

Exportar relatório gera um arquivo JSON no navegador com ocorrências, limites, auditoria e horário da exportação. Não é um PDF e não inclui automaticamente todo o histórico de telemetria. A auditoria reúne alterações administrativas, não todas as consultas ou ações possíveis do sistema.

### Clientes e unidades

/clientes organiza a visão por clientes; /unidades permite navegar por unidades e setores. No modo real, o provedor retorna listas vazias para essas entidades. Não existem tabelas nem rotas próprias para sua gestão persistente. Os filtros e cartões dessas telas demonstram uma estrutura de navegação prevista.

### Dispositivos

/dispositivos monta uma lista a partir das máquinas com gateway associado. Exibe código do Opta, máquina vinculada, comunicação, RSSI e firmware. Um parâmetro dispositivo no endereço restringe a visualização. A contagem de instáveis existe na interface, mas a integração real atual produz ONLINE, OFFLINE ou UNKNOWN, sem cálculo próprio de instabilidade por latência.

### Configurações de conta

/configuracoes usa um usuário demonstrativo e permite editar valores em estado local. Salvar apenas exibe uma confirmação temporária; não há chamada à API. Portanto, a mensagem visual de sucesso no servidor não corresponde a persistência real. Preferências de notificação e som também não estão integradas como configuração de conta.

---

# 14 Componentes visuais e modo demonstrativo

### Estrutura reutilizável

DashboardLayout combina menu lateral, cabeçalho, caminho de navegação, avisos e a página atual. Sidebar e Header organizam o acesso às telas; Breadcrumb mostra o caminho. ContextSwitcher altera o escopo global, cliente e unidade. Essa seleção é estado da interface e não uma autorização do servidor.

MachineCard apresenta uma máquina resumida. StatusBadge padroniza nome, ícone e cor do estado. AlertCard destaca problemas e duração. OccurrenceCard mostra registros recentes. ClientCard resume clientes. StatCard é um componente de indicador; sua existência não implica uso em todas as telas.

LoadingState e EmptyState apresentam carregamento e ausência de resultados. ConnectionNotice indica o modo demonstrativo ou problemas de conexão. ToastCenter mostra avisos transitórios provenientes do contexto. Logo centraliza a marca. utils/status.js define apresentação e avaliações; utils/problems.js define problemas ativos e prioridade; utils/severity.js resume a gravidade de grupos.

### Modo TV

/tv usa uma apresentação própria para leitura à distância, com total de CNCs, operação, paradas, alarmes e emergências, além de cartões maiores. Mostra manutenção e máquinas sem dados atuais, última sincronização e situação da conexão. O relógio principal usa o fuso America/Sao_Paulo.

A tela permite entrar e sair de tela cheia quando o navegador oferece esse recurso. Também apresenta mensagens para carregamento, ausência de máquinas e falha de conexão. Usa os mesmos dados de MonitoringContext e não estabelece uma nova conexão independente com o Opta.

### Demonstração e dados reais

VITE_USE_MOCKS=true ativa o modo demonstrativo. O contexto começa com máquinas, clientes, unidades, eventos e alertas de mockData. Um temporizador altera gradualmente medições a cada quatro segundos. Eventos locais podem mudar estados, gerar avisos e tocar um som de emergência.

Com VITE_USE_MOCKS=false, a lista inicial fica vazia até a resposta da API. O sistema não preenche uma falha de rede com máquinas fictícias. Leituras anteriores podem permanecer visíveis com identificação de desatualização.

A demonstração não cobre uniformemente todos os recursos: os métodos administrativos continuam fazendo chamadas reais à API, e a verificação administrativa consulta /auth/me. Um login simulado não equivale a uma sessão administrativa válida.

### O que não constitui tempo real de comunicação

Animações, contadores de segundos e o rótulo TEMPO REAL não significam entrega instantânea de eventos. O frontend usa polling de cinco segundos após cada rodada; a simulação usa temporizadores locais. websocket.js somente mantém uma interface de listeners e um indicador local de conexão, sem abrir um WebSocket real.

No fluxo real de polling, os alertas são recalculados, mas a rotina de som e toasts de mudança de estado pertence ao fluxo de eventos demonstrativos. Não há serviço implementado de push, e-mail ou SMS para notificar operadores.

---

# 15 Integração com a mesa seletora

### Controle local e envio de informações

O firmware integrado da mesa mantém o controle em MesaControl.cpp e a rede em Telemetry.cpp. A tarefa de controle publica uma cópia dos sinais aproximadamente a cada 10 ms, usando tentativa de bloqueio sem esperar pela rede. A tarefa de comunicação lê essa cópia e envia dados aproximadamente a cada segundo, conforme o tempo das requisições.

Essa separação evita colocar chamadas HTTP dentro da função de controle. Ela não transforma a comunicação em garantia de tempo real físico. O programa continua funcionando localmente mesmo se a API estiver indisponível. O backend não envia comandos de acionamento.

### Entradas e saídas apresentadas

| Terminal | Significado no programa da mesa |
| I1 | Entrada bruta usada apenas para diagnóstico. |
| I2 e I3 e I4 | Altura média, pequena e grande; detecção com nível LOW. |
| I5 | Presença de metal; detecção com nível HIGH. |
| I6 e I7 | Ocupação das quedas 1 e 2; detecção com nível HIGH. |
| I8 | Não implementada nesse mapeamento. |
| O1 | Comando da esteira. |
| O2 e O3 | Comandos dos desviadores das quedas 1 e 2. |

Uma peça não metálica segue reto; metálica pequena é direcionada à queda 1; metálica média ou grande, à queda 2. A interface mostra altura e metal memorizados, estado da classificação, ocupação prolongada, entradas brutas e comandos de saída.

O1 pode estar comandada ligada enquanto a classificação aguarda uma peça. Nesse caso, machine_active=false e o estado pode ser PARADA. A palavra parada descreve o ciclo monitorado, não confirma que o motor da esteira esteja imóvel. O estado FALHA da classificação produz o sinal alarme; ele não representa detecção de emergência física.

### O que os dados não medem

O payload usa voltage_24v=null, analog_signals vazio e não inventa emergencia=false, pois esses sinais não estão medidos no mapeamento. O estado de saída representa o comando do programa, sem confirmação de movimento por sensor.

Os contadores total, reto, queda1, queda2 e falhas valem desde a inicialização. Total conta classificações iniciadas; os destinos contam conclusões por temporizador. Uma peça em andamento ou uma falha pode fazer os valores diferirem. Rampa cheia significa ocupação contínua por 1,7 segundo, não contagem exata de peças na rampa.

### Reconexão e perda de amostras

O firmware usa horário do servidor e tempo monotônico local para estimar a coleta e refaz a referência a cada 30 minutos. Mantém somente uma amostra pendente para reenvio, com o mesmo JSON e event_id. Pendências acima de 15 segundos são descartadas em favor de dados recentes. Não há fila persistente de todas as transições; eventos rápidos e intervalos sem rede podem ficar sem registro no banco.

---

# 16 Exemplos do fluxo completo

### Do primeiro cadastro à tela

1. O servidor inicia, cria tabelas ausentes e sincroniza o administrador configurado.
2. O Opta entra na rede e envia seu MAC, IP e versão para /api/devices/register.
3. O backend cria ou reencontra o par CNC e dispositivo e devolve identificadores e referência de horário.
4. O firmware coleta uma cópia do processo e envia telemetria para o UUID retornado.
5. O servidor valida a leitura, grava os sinais e determina o estado operacional.
6. O frontend consulta máquinas, dispositivos, status, histórico e utilização.
7. MonitoringContext organiza as respostas e os componentes mostram a CNC e os sinais da mesa.

### Uma peça metálica pequena

Imagine uma leitura semelhante ao arquivo mesa_sample.json: ciclo ativo, alarme falso, alimentação não medida e estado da mesa acionando_queda1. O backend responde OPERANDO porque há ciclo e nenhuma condição de prioridade maior.

MesaSignals mostra a altura pequena, metal memorizado e o comando de O2. Os gráficos digitais podem apresentar o sinal ciclo como ativo. Os cartões de corrente e temperatura continuam sem leitura porque analog_signals está vazio. Concluir o temporizador pode aumentar o contador queda1 numa leitura posterior.

### Um alarme durante o ciclo

Se o firmware enviar alarme=true, a classificação passa a ALARME mesmo que machine_active continue verdadeiro. A nova leitura é registrada. Se o estado anterior era diferente, status_since recebe o horário dessa coleta. Na próxima consulta bem-sucedida, o cartão muda e a máquina entra na lista de problemas ativos.

Uma leitura posterior sem alarme pode remover esse alerta automático. Isso não resolve uma ocorrência manual aberta pelo administrador. O registro de atendimento deve ser atualizado separadamente.

### Perda de resposta e reenvio

Suponha que o servidor grave a leitura, mas o Opta não receba a resposta. O firmware repete o mesmo event_id. O backend encontra a leitura existente e a devolve, evitando uma nova linha. Se o conteúdo tiver sido alterado com o mesmo identificador, responde conflito em vez de aceitar silenciosamente outra versão.

### Registro de atendimento

O administrador entra, abre /admin, escolhe a máquina e cria uma ocorrência. A API valida a CNC e o responsável, grava a ocorrência e a auditoria e devolve o estado administrativo atualizado. A interface mostra a confirmação somente após esse retorno.

Ao concluir, são necessários responsável e texto de atendimento. O andamento muda para Resolvida e a ação entra na auditoria. Nenhuma etapa envia um comando à esteira. As informações apoiam a gestão do atendimento e permanecem separadas do controle físico.

---

# 17 Configuração e verificação

### Configuração do backend

O arquivo SCOMPTEC- Back/.env.example apresenta as variáveis esperadas. DATABASE_URL escolhe banco, servidor e credenciais. CORS_ORIGINS lista as origens do frontend. SQL_ECHO controla a impressão de consultas SQL. DEVICE_OFFLINE_TIMEOUT_SECONDS define quando a comunicação deixa de ser recente.

AUTH_SECRET assina os tokens e AUTH_TOKEN_TTL_MINUTES define a duração da sessão. ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD configuram o administrador sincronizado. DEVICE_API_KEY define a chave esperada do Opta. A chave do dispositivo e os segredos de autenticação não pertencem ao frontend.

O backend carrega seu .env sem sobrescrever variáveis já definidas no ambiente. Isso permite configurar a mesma aplicação em ambientes diferentes. Para uma execução de desenvolvimento, o módulo correto é Main:app a partir da pasta do backend, por exemplo uvicorn Main:app --reload --host 0.0.0.0 --port 8000.

### Configuração do frontend e do Opta

O frontend usa VITE_API_BASE_URL com /api no final e VITE_USE_MOCKS=false para integração real. Variáveis VITE são incorporadas aos arquivos distribuídos, portanto devem conter configuração pública. O endereço 127.0.0.1 aponta para o próprio computador que executa a interface; em outro computador, deve apontar para o servidor acessível.

npm run dev inicia o Vite na porta 5173. npm run build gera dist. npm run preview permite servir o resultado. npm run electron:dev executa a interface na janela desktop em desenvolvimento e npm run electron:build gera o pacote configurado. O backend e o banco continuam separados.

No firmware, opta_secrets.example.h serve de modelo para rede, host, porta, prefixo e chave. O host do servidor precisa ser acessível pelo Opta; localhost na placa não é o computador. A implementação de transporte fornecida usa HTTP na rede local. Sem configuração de WiFi, a telemetria fica desativada e o controle local continua.

### Testes existentes

pytest.ini aponta para SCOMPTEC- Back/tests. test_device_provisioning.py cobre registro, repetição por MAC e sequência de códigos. test_opta_api.py cobre sinais, histórico, horários, repetição de leitura, dados antigos, falta de comunicação, utilização e contrato da mesa. test_admin.py cobre acesso administrativo, contas, ocorrências, limites e sincronização do administrador.

No frontend, telemetry.test.js cobre transformação das leituras, ausência de valores, prioridade de estados e atualização periódica. utilization.test.js cobre agregação temporal e janelas do gráfico. adminModel.test.js cobre sessão e interpretação de problemas. A pasta tests da raiz pertence ao modelo anterior com MongoDB e não é a pasta padrão selecionada por pytest.ini.

Esses testes verificam comportamento de software em seus ambientes definidos. Ensaios com banco da instalação, rede e equipamento físico avaliam outros aspectos, como captura dos sinais e temporização da mesa. A existência de testes não é, por si só, confirmação de uma instalação em funcionamento.

---

# 18 Limites atuais e glossário

### O que já tem implementação integrada

O sistema possui cadastro e consulta de CNCs e dispositivos, registro automático por MAC, recebimento persistente de telemetria, classificação de estado, distinção entre comunicação e atualidade da leitura, histórico paginado e cálculo de tempos por estado. A interface consulta esse núcleo e apresenta o painel da mesa.

Cadastro, login e identificação do usuário também usam o backend. A administração grava usuários, ocorrências, regras e auditoria, com restrição de perfil no servidor. A versão desktop reutiliza a mesma interface e a mesma API.

### Pontos ainda parciais

Empresas, unidades e setores são demonstrativos e não possuem gestão persistente. Configurações pessoais exibem confirmação local sem salvar no servidor. Recuperação de senha não tem serviço implementado. Indicadores diários e linha cronológica real ainda não são fornecidos à tela de detalhes.

Os limites administrativos são armazenados, mas não comandam de forma global as avaliações dos cartões nem a classificação do backend. A referência powerAvg=4.2 é fixa na adaptação dos dados. O estado de instabilidade do gateway não é calculado a partir de medições de latência na integração atual.

O histórico visual carrega 100 leituras por máquina; o banco pode conter mais. Eventos visuais de telemetria são amostras, não necessariamente transições. Não há WebSocket ativo, registro persistente de cada borda digital, envio externo de notificações ou cálculo completo de OEE. A proteção de rotas também não é uniforme entre administração e monitoramento.

### Glossário

| Termo | Significado neste trabalho |
| API e endpoint | Interface de comunicação e cada endereço de operação do servidor. |
| Payload e JSON | Conteúdo enviado na requisição e o formato usado para representá-lo. |
| Schema e modelo | Contrato de validação da API e representação das tabelas do banco. |
| Telemetria e gateway | Informação enviada do processo e dispositivo que a comunica. |
| UUID e MAC | Identificador interno da entidade e endereço do dispositivo na rede. |
| Polling | Consulta periódica feita pelo frontend para buscar atualizações. |
| Token e hash | Comprovante assinado de sessão e representação derivada da senha. |
| UTC e timestamp | Referência de fuso horário e instante associado à leitura. |
| RSSI e uptime | Intensidade do sinal WiFi e tempo desde a inicialização. |
| Mock e estado React | Dado demonstrativo e valor mantido pela interface durante a execução. |
| Idempotência | Repetir uma operação identificada sem duplicar seu resultado. |

Em síntese, o backend organiza e preserva os dados, o frontend apresenta o monitoramento e o Opta executa o controle local. Juntos, permitem acompanhar o processo e os atendimentos, dentro das medições e funções implementadas.

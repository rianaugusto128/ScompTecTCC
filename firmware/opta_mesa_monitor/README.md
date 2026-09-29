# Mesa seletora Opta + SCOMPTEC

Este firmware usa o programa enviado da **MESA SELETORA DE PEÇAS — OPTA V2** como base. A cópia original está em [`../reference/mesa_opta_v2_original.ino`](../reference/mesa_opta_v2_original.ino). A versão integrada é [`opta_mesa_monitor.ino`](opta_mesa_monitor.ino), acompanhada dos arquivos `.cpp` e `.h` desta pasta.

## Controle preservado

| Terminal | Pino | Função | Detecção |
|---|---|---|---|
| I1 | A0 | Entrada, somente diagnóstico | Nível bruto; não inicia ciclo |
| I2 | A1 | Altura média | LOW = feixe bloqueado |
| I3 | A2 | Altura pequena | LOW = feixe bloqueado |
| I4 | A3 | Altura grande | LOW = feixe bloqueado |
| I5 | A4 | Metal | HIGH = detectado |
| I6 | A5 | Ocupação da queda 1 | HIGH = ocupada |
| I7 | A6 | Ocupação da queda 2 | HIGH = ocupada |
| I8 | A7 | Não implementada | Não é lida |
| O1 | D0 | Esteira | Comando HIGH = ligar |
| O2 | D1 | Desviador da queda 1 | Comando HIGH = ligar |
| O3 | D2 | Desviador da queda 2 | Comando HIGH = ligar |

Não metálica segue reto; metálica pequena vai para a queda 1; metálica média/grande vai para a queda 2. Altura e metal continuam sendo memorizados independentemente.

Os valores do código original foram mantidos: debounce de altura 20 ms, liberação estável 40 ms, janela de metal 500 ms, queda 1 por **3000 ms**, queda 2 por **3500 ms**, reto por 2500 ms, timeout de altura 4000 ms e indicação de rampa cheia por 1700 ms. O comentário original falava genericamente em três segundos; a queda 2 efetivamente usa 3,5 segundos.

O1 continua ligando automaticamente na inicialização. `FALHA` continua desligando somente O2/O3 e retornando à espera após 1 segundo; O1 permanece comandada. I6/I7 não encerram ciclos nem bloqueiam destinos. Essas são características do programa recebido, preservadas nesta integração. O backend não envia comandos para ligar/desligar a mesa.

## Arquivos e tarefas

- `MesaControl.cpp`: lógica original, mais uma cópia dos sinais e estados para monitoramento.
- `Telemetry.cpp`: WiFi, registro, JSON, relógio de referência, envio e reconexão.
- `Telemetry.h`: estrutura da cópia de estado compartilhada entre as tarefas.
- `Config.h`: intervalos de comunicação; não contém calibração física.
- `opta_secrets.example.h`: modelo de configuração local.
- `mesa_sample.json`: exemplo do contrato usado também nos testes do backend/frontend.

O controle publica uma cópia a cada 10 ms. A cópia usa `trylock`: o controle não espera a tarefa de rede. A rede lê somente essa cópia e roda em uma thread Mbed de prioridade inferior, com 16 KiB de pilha. Nenhuma chamada WiFi/HTTP fica dentro de `atualizarControle()`; a rede não acessa os pinos.

O `loop()` tem uma pausa de 1 ms para permitir que o RTOS execute a tarefa de rede. Isso acrescenta tempo à varredura, embora preserve os temporizadores existentes. O efeito sobre a temporização física precisa ser medido na bancada, incluindo variação de rede e saída serial. Separação em threads não constitui garantia de tempo real. As mensagens serial continuam concentradas na tarefa de controle.

## Preparação na Arduino IDE

1. Instale a plataforma **Arduino Mbed OS Opta Boards**. Pacote usado na verificação: `arduino:mbed_opta` **4.6.0**; placa/FQBN `arduino:mbed_opta:opta`.
2. Instale **ArduinoJson 7.4.3** e **ArduinoHttpClient 0.6.1**. `WiFi` e Mbed vêm com a plataforma Opta. Não use bibliotecas de rede próprias da ESP32.
3. Abra `opta_mesa_monitor.ino`, mantendo todos os `.cpp` e `.h` na mesma pasta.
4. Copie `opta_secrets.example.h` para `opta_secrets.h` e preencha SSID, senha, IP/host do backend, porta, prefixo `/api` e chave do dispositivo. Esse arquivo está ignorado pelo Git. Não envie credenciais no chat.
5. Inicie o backend atualizado desta entrega e confirme `/api/health` com o MySQL disponível. Confira o endereço do backend no frontend e `VITE_USE_MOCKS=false`.
6. Compile e faça o ensaio de bancada antes de colocar a mesa em operação. Nenhum firmware foi gravado no equipamento nesta revisão.

Exemplo do arquivo local:

```cpp
#pragma once
#define OPTA_WIFI_SSID "NOME_DA_REDE"
#define OPTA_WIFI_PASSWORD "SENHA_DA_REDE"
#define OPTA_API_HOST "192.168.1.100"
#define OPTA_API_PORT 8000
#define OPTA_API_PREFIX "/api"
#define OPTA_DEVICE_KEY "MESMA_CHAVE_DEVICE_API_KEY_DO_BACKEND"
```

O host não deve conter `http://`, `/api` ou barra final. `localhost` no Opta não representa o computador. O transporte desta versão é **HTTP em rede local**; HTTPS precisa de cliente TLS e certificados configurados. Sem SSID configurado, a telemetria fica desativada e o controle original permanece ativo. A inicialização não fica esperando WiFi ou a porta serial.

Para compilar com CLI instalada:

```text
arduino-cli core install arduino:mbed_opta@4.6.0
arduino-cli lib install "ArduinoJson@7.4.3" "ArduinoHttpClient@0.6.1"
arduino-cli compile --fqbn arduino:mbed_opta:opta firmware/opta_mesa_monitor
```

Em Windows, a ferramenta GCC incluída no pacote pode falhar com caminhos extensos ou com acentos. Use uma pasta curta de trabalho e de pacotes se os cabeçalhos da ferramenta não forem encontrados. Isso não exige alterar os pinos do programa.

## O que chega ao servidor

Ao entrar na rede, o firmware registra o MAC WiFi em `/api/devices/register`. O backend devolve o UUID do dispositivo, `server_time_unix` e um `telemetry_session_id` novo. A sessão fornece um identificador de boot sem depender de `random()` não inicializado. O Opta mantém esse identificador nas reconexões do mesmo boot e acrescenta um contador para formar `event_id`. Reiniciar o dispositivo inicia outra sessão e zera os contadores locais de peças, como no programa original.

O relógio de coleta é estimado pelo horário UTC do servidor mais o tempo monotônico do Opta. É sincronizado no cadastro e a cada 30 minutos. A precisão é de segundos e inclui a latência da resposta do registro; não é sincronização para cronometria industrial. O servidor deve ter seu relógio correto. A atualização do backend é obrigatória: uma versão antiga sem os dois campos novos causa diagnóstico `-14`.

O envio ocorre aproximadamente a cada segundo, conforme tempo das requisições. O JSON contém:

- `machine_active`/`digital_signals.ciclo`: ciclo de classificação em andamento. A espera por peça é `PARADA`, mesmo com O1 comandada ligada. Não é sensor de movimento do motor.
- `digital_signals.alarme`: estado `FALHA` da classificação. Não equivale a emergência física.
- Sinais de altura normalizados, metal atual, ocupações e indicações de rampa cheia.
- `extra_signals.mesa`: estado, altura memorizada, metal memorizado, entradas brutas I1–I7, saídas **comandadas** O1–O3 e contadores de peças/falhas.
- `extra_signals.boot_id`, RSSI, uptime e quantidade de amostras pendentes explicitamente descartadas.
- `voltage_24v: null`: não há entrada dedicada para monitorar alimentação. O backend aceita essa ausência sem classificar a máquina como desligada.
- `analog_signals: {}`: o programa recebido não mede corrente, temperatura, potência ou tensão analógica. Esses valores não são simulados.

Não se publica `emergencia=false`: não existe sensor de emergência nesse mapeamento. A interface mostra a detecção lógica separada dos níveis HIGH/LOW. O painel da mesa aparece nos detalhes da CNC após a primeira leitura com `extra_signals.mesa`.

Os contadores `total`, `reto`, `queda1`, `queda2` e `falhas` representam o programa desde o boot. `total` incrementa ao iniciar a classificação; os destinos incrementam na conclusão de seus temporizadores. Uma peça em processo ou uma falha faz esses totais diferirem. A indicação de rampa cheia é ocupação contínua por 1,7 s; **não mede efetivamente três peças**. As saídas não têm confirmação por fim de curso. I8 permanece futura.

## Quedas de comunicação

Somente uma amostra pendente é retida para envio, além da cópia mais recente do controle. Timeout/erro temporário repete exatamente o mesmo JSON e `event_id`. O backend grava no máximo uma vez esse evento. A espera entre tentativas aumenta de 1 segundo até 30 segundos. Erro 404 refaz o cadastro; 401 requer corrigir a chave; 409/422 descartam a amostra inválida, e 422 também força atualização do relógio.

Uma amostra pendente com mais de 15 segundos é descartada em favor de uma recente. Não há fila persistente em flash nem registro de cada borda digital: transições rápidas e eventos durante indisponibilidade podem não chegar ao banco. Os contadores acumulados voltam a aparecer na reconexão, enquanto o dispositivo não reiniciar. `amostras_descartadas` conta descartes explícitos de pendências, não todas as mudanças intermediárias substituídas pela cópia mais recente.

O timestamp de coleta é mantido nos reenvios, evitando apresentar uma amostra antiga como atual. WiFi indisponível não comanda a parada da esteira nem dos desviadores; a lógica local continua seguindo o programa recebido. Se for necessária parada por falha de comunicação ou registro de cada transição, essa política precisa ser implementada e ensaiada especificamente.

## Diagnóstico e validação

Validação desta entrega: **23 testes de backend e 11 de frontend passaram**, build do frontend concluído e firmware compilado para `arduino:mbed_opta:opta` com o core 4.6.0. A compilação final incluiu a tarefa de rede habilitada com SSID fictício, sem gravação na placa: 296.612 bytes de programa (15%) e 66.888 bytes de variáveis globais (12%). Essa medição não inclui toda a memória dinâmica consumida em execução. Os pinos, constantes de tempo e sete funções principais de controle foram comparados com o original e permaneceram iguais.

O monitor serial a 115200 mostra o diagnóstico original e, a cada cinco segundos, o estado da rede, último código HTTP e descartes. Estados: `0` sem configuração; `1` tentando WiFi; `2` WiFi disponível/aguardando API; `3` último envio confirmado; `-1` falha ao iniciar a thread. Códigos negativos `-10` a `-15` indicam envio parcial, resposta fora do limite/sem Content-Length, timeout do corpo, JSON inválido, backend incompatível ou falha de criação do payload. `-16` indica MAC temporariamente indisponível; o cadastro será tentado novamente. Nenhuma credencial é impressa.

O fluxo de registro → gravação → consulta → histórico foi testado com o payload da mesa usando SQLite isolado e os modelos do backend. Os testes de interface verificam que ausência de medição de 24 V não vira `DESLIGADA`; o frontend foi compilado. Isso não substitui teste no MySQL configurado nem ensaio físico do Opta e da mesa. A comunicação deve ser homologada com os sensores reais, temporizadores e WiFi indisponível, observando os comandos de saída já existentes.

Referências de implementação: [core oficial Opta/Mbed](https://github.com/arduino/ArduinoCore-mbed), [biblioteca ArduinoHttpClient](https://github.com/arduino-libraries/ArduinoHttpClient) e [manual oficial do Opta](https://docs.arduino.cc/tutorials/opta/user-manual/).

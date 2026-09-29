> Atualização: o dispositivo adotado é o **Arduino Opta WiFi**. Consulte [o contrato de integração e a configuração atual](../../INTEGRACAO_OPTA.md). Referências a ESP32 abaixo são legadas e não orientam o firmware do Opta.

# Firmware inicial do ESP32

Este firmware conecta o ESP32 à mesma rede local do backend e o registra pelo
MAC. Ele não lê sensores nem envia telemetria. O JSON e a resposta do backend
são exibidos no Monitor Serial a 115200 baud.

## Preparação

1. Abra `esp32_cnc_monitor.ino` e preencha SSID, senha e `BACKEND_BASE_URL` no
   começo do arquivo com o IP LAN do computador que roda
   o backend, por exemplo `http://192.168.1.50:8000/api`.
2. No Windows, permita a porta 8000 no firewall e inicie o backend em todas as
   interfaces: `uvicorn Main:app --host 0.0.0.0 --port 8000` dentro de
   `SCOMPTEC- Back`.
3. Grave `esp32_cnc_monitor.ino` e abra o Monitor Serial em 115200 baud.

`localhost` não serve no `BACKEND_BASE_URL`: para o ESP32 ele aponta para o
próprio microcontrolador, não para o computador.

## Fluxo de rede

1. O ESP32 se conecta ao Wi-Fi e obtém IP via DHCP.
2. `POST /api/devices/register` envia MAC, IP e firmware. O backend gera os
   nomes progressivos da CNC e do ESP32.
3. O backend cria o par CNC/ESP32 no primeiro MAC, ou devolve o vínculo já
   existente em novas conexões.

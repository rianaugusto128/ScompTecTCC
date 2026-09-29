> Atualização: o dispositivo adotado é o **Arduino Opta WiFi**. Consulte [o contrato de integração e a configuração atual](../INTEGRACAO_OPTA.md). Referências a ESP32 abaixo são legadas e não orientam o firmware do Opta.

# SCOMPTEC Back

## Registro automático do ESP32

Quando o ESP32 entrar na rede, envie `POST /api/devices/register`:

```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "ip_address": "192.168.1.10",
  "firmware_version": "1.0.0"
}
```

No primeiro registro, a API cria uma CNC e um ESP32 com IDs UUID vinculados e
retorna `created: true`. Ao receber o mesmo MAC novamente, atualiza os dados do
ESP32 e retorna a mesma CNC com `created: false`.

O MAC é único e cada CNC possui somente um ESP32 associado. Os nomes são
gerados pelo backend de forma progressiva: `CNC 01`, `CNC 02`, `ESP32 01` e
`ESP32 02`.

## Banco existente

`create_tables()` cria os novos campos somente em instalações novas. Antes de
usar esta versão contra um banco MySQL já existente, faça uma migração: adicione
`devices.mac_address` (único e não nulo), `devices.ip_address`, a restrição única
em `devices.cnc_id` e a tabela `code_sequences`. Preencha MACs únicos para todos
os devices existentes antes de tornar a coluna obrigatória.

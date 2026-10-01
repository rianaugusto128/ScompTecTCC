> Atualização: o dispositivo adotado é o **Arduino Opta WiFi**. Consulte [o contrato de integração e a configuração atual](../INTEGRACAO_OPTA.md). Referências a ESP32 abaixo são legadas e não orientam o firmware do Opta.

# SCOMPTEC Back

API FastAPI da aplicação atual. O banco usado em desenvolvimento e produção é
MySQL via SQLAlchemy/PyMySQL; os arquivos `tests/` e `requirements.txt` da raiz
são legados e não devem ser usados para instalar este backend.

## Instalação e execução

Na raiz do projeto, crie/ative o ambiente virtual conforme o [README principal](../README.md)
e instale:

```bash
python -m pip install -r "SCOMPTEC- Back/requirements-dev.txt"
python -m uvicorn Main:app --app-dir "SCOMPTEC- Back" --reload --host 0.0.0.0 --port 8000
```

Configure `SCOMPTEC- Back/.env` a partir de `.env.example` antes de iniciar.
O MySQL e o banco `cnc_monitor` precisam existir; o startup cria tabelas
ausentes, mas não cria o banco nem migra esquemas existentes.

## Registro automático do Arduino Opta WiFi

Quando o Opta entrar na rede, envie `POST /api/devices/register`:

```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "ip_address": "192.168.1.10",
  "firmware_version": "1.0.0"
}
```

No primeiro registro, a API cria uma CNC e um dispositivo Opta com IDs UUID
vinculados e retorna `created: true`. Ao receber o mesmo MAC novamente, atualiza
os dados do dispositivo e retorna a mesma CNC com `created: false`.

O MAC é único e cada CNC possui somente um dispositivo associado. Os códigos
são gerados progressivamente pelo backend.

## Banco existente

`create_tables()` cria os novos campos somente em instalações novas. Antes de
usar esta versão contra um banco MySQL já existente, faça uma migração: adicione
`devices.mac_address` (único e não nulo), `devices.ip_address`, a restrição única
em `devices.cnc_id` e a tabela `code_sequences`. Preencha MACs únicos para todos
os devices existentes antes de tornar a coluna obrigatória.

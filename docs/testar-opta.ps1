param(
    [string]$BaseUrl = 'http://127.0.0.1:8000/api',
    [string]$MacAddress = '02:00:00:00:00:99',
    [string]$DeviceKey = $env:DEVICE_API_KEY
)

# Teste com gravacao: cria um dispositivo/CNC de teste e uma leitura por execucao.
# Nunca use o MAC do Opta em operacao para este ensaio. Nao faz exclusoes.
$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')
$headers = @{}
if ($DeviceKey) { $headers['X-Device-Key'] = $DeviceKey }

$health = Invoke-RestMethod -Uri "$base/health" -Headers $headers -TimeoutSec 15
if ($health.database -ne 'ok') { throw 'Banco de dados nao confirmou disponibilidade.' }

$registrationBody = @{
    mac_address = $MacAddress
    firmware_version = 'teste-equipe-http-1.0'
} | ConvertTo-Json
$registration = Invoke-RestMethod -Method Post -Uri "$base/devices/register" -Headers $headers -ContentType 'application/json' -Body $registrationBody -TimeoutSec 15
if (-not $registration.device.id -or -not $registration.cnc.id -or -not $registration.telemetry_session_id) {
    throw 'Resposta de cadastro incompleta; confira a versao do backend.'
}

$samplePath = Join-Path $PSScriptRoot '../firmware/opta_mesa_monitor/mesa_sample.json'
$sample = Get-Content -LiteralPath $samplePath -Raw -Encoding UTF8 | ConvertFrom-Json
# Evita usar a data historica fixa do exemplo. O servidor atribui o horario atual.
$sample.PSObject.Properties.Remove('timestamp')
$sample.event_id = $registration.telemetry_session_id + ':1'
$sample.extra_signals.boot_id = $registration.telemetry_session_id
$body = $sample | ConvertTo-Json -Depth 12 -Compress
$url = "$base/devices/$($registration.device.id)/telemetry"
$first = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 15
$retry = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 15
if ($first.id -ne $retry.id) { throw 'Falha: o reenvio nao retornou a mesma leitura.' }

$status = Invoke-RestMethod -Uri "$base/cncs/$($registration.cnc.id)/status" -Headers $headers -TimeoutSec 15
$history = Invoke-RestMethod -Uri "$base/cncs/$($registration.cnc.id)/history?limit=100" -Headers $headers -TimeoutSec 15
if ($status.status -ne 'OPERANDO') { throw "Estado inesperado: $($status.status)" }
if (@($history.items | Where-Object { $_.id -eq $first.id }).Count -ne 1) {
    throw 'A leitura nao apareceu exatamente uma vez na pagina de historico.'
}

[pscustomobject]@{
    Resultado = 'Cadastro, gravacao, reenvio e consulta confirmados'
    Dispositivo = $registration.device.code
    DeviceUUID = $registration.device.id
    CNC = $registration.cnc.code
    CncUUID = $registration.cnc.id
    Estado = $status.status
    LeituraUUID = $first.id
    TotalHistorico = $history.total
}

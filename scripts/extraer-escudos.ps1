# Saca los escudos en base64 del prototipo (polo-argentino.html) y los guarda
# como PNG en assets/crests/. Se corre una sola vez.
#
# Uso: copiá polo-argentino.html a la carpeta del proyecto y corré
#   .\scripts\extraer-escudos.ps1
# o indicá otra ruta:
#   .\scripts\extraer-escudos.ps1 -Prototipo "C:\ruta\polo-argentino.html"
param([string]$Prototipo = (Join-Path (Split-Path $PSScriptRoot -Parent) "polo-argentino.html"))

$ErrorActionPreference = "Stop"
if (-not (Test-Path $Prototipo)) {
  Write-Host "No encuentro $Prototipo. Copialo a la carpeta del proyecto o pasá la ruta con -Prototipo." -ForegroundColor Red
  exit 1
}
$destino = Join-Path (Split-Path $PSScriptRoot -Parent) "assets\crests"
New-Item -ItemType Directory -Force -Path $destino | Out-Null

# Nombre en el prototipo -> archivo (tiene que coincidir con "escudo" en data/teams.json)
$archivos = @{
  "Don Ercole" = "don-ercole.png"; "Hiper Polo Club" = "hiper-polo-club.png"; "La Aguada" = "la-aguada.png"
  "La Ensenada" = "la-ensenada.png"; "La Zeta" = "la-zeta.png"; "Las Monjitas" = "las-monjitas.png"
  "La Hache" = "la-hache.png"; "La Irenita" = "la-irenita.png"
}

$html = [IO.File]::ReadAllText((Resolve-Path $Prototipo), [Text.Encoding]::UTF8)
$patron = '"([^"]+)"\s*:\s*"data:image/png;base64,([A-Za-z0-9+/=]+)"'
$n = 0
foreach ($m in [regex]::Matches($html, $patron)) {
  $nombre = $m.Groups[1].Value
  if (-not $archivos.ContainsKey($nombre)) { Write-Host "Sin destino para '$nombre', lo salteo." -ForegroundColor Yellow; continue }
  $ruta = Join-Path $destino $archivos[$nombre]
  [IO.File]::WriteAllBytes($ruta, [Convert]::FromBase64String($m.Groups[2].Value))
  Write-Host ("OK  " + $archivos[$nombre])
  $n++
}
Write-Host "$n escudos guardados en assets\crests\" -ForegroundColor Green

# Revisa que los JSON de data/ estén bien escritos y que los partidos
# apunten a equipos y torneos que existen. Correlo antes de subir cambios:
#   .\scripts\validar-datos.ps1
$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent
$errores = @()

function Leer($nombre) {
  $ruta = Join-Path $raiz "data\$nombre"
  try { return [IO.File]::ReadAllText($ruta, [Text.Encoding]::UTF8) | ConvertFrom-Json }
  catch { $script:errores += "$nombre no es JSON válido: $($_.Exception.Message)"; return $null }
}

$teams = Leer "teams.json"; $partidos = Leer "matches.json"; $tour = Leer "tournaments.json"; $live = Leer "live.json"
if ($errores.Count -eq 0) {
  $ids = @($teams.equipos | ForEach-Object { $_.id })
  $torneos = @($tour.tripleCorona | ForEach-Object { $_.id })
  foreach ($e in $teams.equipos) {
    if ($e.escudo -and -not (Test-Path (Join-Path $raiz $e.escudo))) { Write-Host "Aviso: falta el escudo $($e.escudo) (se verán iniciales)" -ForegroundColor Yellow }
  }
  $vistos = @{}
  foreach ($p in $partidos.partidos) {
    if ($vistos.ContainsKey($p.id)) { $errores += "id repetido: $($p.id)" } else { $vistos[$p.id] = 1 }
    if ($ids -notcontains $p.local) { $errores += "$($p.id): equipo local '$($p.local)' no existe en teams.json" }
    if ($ids -notcontains $p.visitante) { $errores += "$($p.id): equipo visitante '$($p.visitante)' no existe en teams.json" }
    if ($torneos -notcontains $p.torneo) { $errores += "$($p.id): torneo '$($p.torneo)' no existe en tournaments.json" }
    if ($p.fecha -notmatch '^\d{4}-\d{2}-\d{2}$') { $errores += "$($p.id): la fecha debe ser AAAA-MM-DD" }
  }
  if ($live.partido) {
    foreach ($k in "local", "visitante") { if ($ids -notcontains $live.partido.$k) { $errores += "live.json: equipo '$($live.partido.$k)' no existe" } }
  }
}
# Traducciones (inglés y portugués): avisa qué textos de los datos todavía no tienen traducción.
# No es un error: lo que falte se muestra en español.
$trad = Leer "traducciones.json"
if ($errores.Count -eq 0 -and $trad) {
  $textos = @()
  foreach ($p in $partidos.partidos) { $textos += $p.fase; $textos += ($p.fase -split " · ")[0]; $textos += $p.nota }
  foreach ($e in $teams.equipos) { $textos += $e.nota }
  foreach ($t in $tour.tripleCorona) { $textos += $t.nombre; $textos += $t.resumen; foreach ($d in $t.destacados) { $textos += $d.texto } }
  if ($tour.temporada) {
    $textos += $tour.temporada.formato; $textos += $tour.temporada.fuenteTitulo
    foreach ($c in $tour.temporada.clasificados) { $textos += $c.nota }
    if ($tour.temporada.clasificatorio) { $textos += $tour.temporada.clasificatorio.descripcion }
  }
  foreach ($x in $tour.proximos) { $textos += $x.categoria }
  $textos = @($textos | Where-Object { $_ } | Select-Object -Unique)
  foreach ($idioma in "en", "pt") {
    $hay = @($trad.$idioma.PSObject.Properties | ForEach-Object { $_.Name })
    $faltan = @($textos | Where-Object { $hay -cnotcontains $_ })
    foreach ($f in $faltan) { Write-Host "Aviso: falta la traducción ($idioma) de: $f" -ForegroundColor Yellow }
  }
}
if ($errores.Count) { $errores | ForEach-Object { Write-Host "ERROR  $_" -ForegroundColor Red }; exit 1 }
Write-Host "Datos OK: $($partidos.partidos.Count) partidos, $($teams.equipos.Count) equipos." -ForegroundColor Green

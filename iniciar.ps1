# Polo AR · servidor local sin instalar nada (Windows PowerShell 5.1 o PowerShell 7).
# Uso, desde la carpeta del proyecto:   .\iniciar.ps1          (puerto 8080)
#                                         .\iniciar.ps1 -Puerto 5500
# También podés hacer doble clic en iniciar.bat.
# Para cortarlo: Ctrl + C o cerrar la ventana.
param([int]$Puerto = 8080)

$raiz = (Resolve-Path $PSScriptRoot).Path
$tipos = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"; ".png" = "image/png"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"
  ".webp" = "image/webp"; ".jpg" = "image/jpeg"; ".md" = "text/plain; charset=utf-8"
}

$url = "http://localhost:$Puerto/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try { $listener.Start() } catch {
  Write-Host "El puerto $Puerto ya está en uso." -ForegroundColor Yellow
  Write-Host "Si ya tenés el servidor abierto en otra ventana, usá esa: $url"
  Write-Host "Si no, probá con otro puerto: .\iniciar.ps1 -Puerto 5500"
  Start-Process $url
  return
}

Write-Host ""
Write-Host "  Polo AR corriendo en $url" -ForegroundColor Green
Write-Host "  No cierres esta ventana mientras uses la página. Para cortarlo: Ctrl + C." -ForegroundColor Green
Write-Host ""
Start-Process $url

try {
  while ($listener.IsListening) {
    # Espera el próximo pedido. Si falla (por ejemplo al cerrar), sale del ciclo.
    try { $ctx = $listener.GetContext() } catch { break }

    $res = $ctx.Response
    try {
      $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
      if ($ruta -eq "") { $ruta = "index.html" }
      $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
      if (Test-Path -LiteralPath $archivo -PathType Container) { $archivo = Join-Path $archivo "index.html" }

      if ($archivo.StartsWith($raiz) -and (Test-Path -LiteralPath $archivo -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($archivo)
        $ext = [IO.Path]::GetExtension($archivo).ToLower()
        $res.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { "application/octet-stream" }
        $res.Headers.Add("Cache-Control", "no-cache")
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host ("200  /" + $ruta)
      } else {
        # /api/live no existe en local: la página usa data/live.json automáticamente.
        $res.StatusCode = 404
        Write-Host ("404  /" + $ruta) -ForegroundColor DarkGray
      }
    } catch {
      # El navegador cortó la conexión (recarga rápida, pestaña cerrada) o el archivo estaba en uso.
      # Se ignora y el servidor sigue andando.
      try { $res.StatusCode = 500 } catch {}
    } finally {
      try { $res.Close() } catch {}
    }
  }
} finally {
  try { $listener.Stop(); $listener.Close() } catch {}
  Write-Host "Servidor detenido." -ForegroundColor Yellow
}

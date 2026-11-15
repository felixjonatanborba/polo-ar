# Polo AR

Web publicada en **https://polo-ar.com** (también https://polo-ar.pages.dev).

Portal de polo argentino: resultados, detalle de partidos, en vivo y repeticiones en Disney+ de la Triple Corona (Hurlingham, Tortugas y Abierto Argentino de Palermo).

Sitio estático: HTML, CSS y JavaScript sin frameworks ni dependencias. Los datos viven en `data/*.json` y se editan a mano.

## Estructura

```
polo-ar/
├─ index.html              página
├─ css/styles.css          diseño (modo claro y oscuro)
├─ js/app.js               arma la página a partir de los JSON
├─ data/
│  ├─ matches.json         partidos
│  ├─ teams.json           equipos, escudos y planteles
│  ├─ tournaments.json     Triple Corona y próximos torneos AAP
│  └─ live.json            partido en vivo (a mano)
├─ assets/crests/          escudos en PNG
├─ functions/api/live.js   ruta /api/live para Cloudflare Pages (enganche para datos en vivo)
├─ scripts/
│  ├─ extraer-escudos.ps1  saca los escudos del prototipo (una sola vez)
│  └─ validar-datos.ps1    revisa los JSON antes de publicar
├─ iniciar.ps1             servidor local para Windows, sin instalar nada
├─ _headers                cabeceras de caché para Cloudflare Pages
└─ PENDIENTES.md           datos sin confirmar y decisiones abiertas
```

## Correrlo en Windows

**La forma más fácil:** hacé doble clic en `iniciar.bat`. Se abre una ventana negra y el navegador en `http://localhost:8080`. No cierres la ventana negra mientras uses la página.

**Desde PowerShell:**

1. Abrí PowerShell en la carpeta del proyecto (en el Explorador: clic derecho en la carpeta → **Abrir en Terminal**).
2. La primera vez, habilitá los scripts locales para tu usuario:

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

3. Iniciá el servidor:

   ```powershell
   .\iniciar.ps1
   ```

   Se abre `http://localhost:8080` en el navegador. Para cortarlo: `Ctrl + C`. Si el puerto está ocupado: `.\iniciar.ps1 -Puerto 5500`.

Hace falta un servidor porque el navegador no deja leer los JSON si abrís `index.html` con doble clic. Si tenés Node instalado, `npx serve .` también sirve.

## Escudos (una sola vez)

Los escudos del prototipo estaban en base64. Para pasarlos a archivos:

1. Copiá `polo-argentino.html` (el prototipo) a la carpeta del proyecto.
2. Corré:

   ```powershell
   .\scripts\extraer-escudos.ps1
   ```

Quedan 8 PNG en `assets\crests\`. Mientras falte un escudo, la página muestra las iniciales del equipo. Para agregar uno nuevo, guardá el PNG (cuadrado, unos 96×96) en `assets\crests\` y poné la ruta en `"escudo"` del equipo en `data\teams.json`. Si el logo es oscuro, poné `"escudoFondoClaro": true`.

## Editar los datos

Cualquier editor sirve (Bloc de notas, VS Code, o el editor web de GitHub). Reglas:

- Textos entre comillas dobles, comas entre elementos, sin coma después del último.
- Fechas `AAAA-MM-DD`.
- Lo que no esté confirmado va en `null` y la página muestra “—”. No inventes datos.
- Los equipos se nombran por su `id` de `teams.json` (por ejemplo `la-hache`).

Antes de publicar, revisá que no haya errores:

```powershell
.\scripts\validar-datos.ps1
```

### Agregar un partido

Copiá este bloque al principio de la lista `"partidos"` de `data\matches.json` y completalo:

```json
{
  "id": "pal-2026-f2-hache-irenita",
  "torneo": "palermo",
  "fecha": "2026-11-21",
  "fechaAproximada": false,
  "fase": "Fecha 2 · Grupo A",
  "local": "la-hache",
  "visitante": "la-irenita",
  "golesLocal": 12,
  "golesVisitante": 10,
  "ganador": "local",
  "progresion": ["2-1", "4-3", "6-5", "8-6", "10-8", "12-10"],
  "goleadores": [{ "nombre": "H. Ulloa", "goles": 5, "equipo": "local" }],
  "nota": "",
  "repeticion": "https://www.disneyplus.com/..."
}
```

- `id`: cualquier texto único, sin espacios.
- `torneo`: `palermo`, `tortugas` o `hurlingham`.
- `progresion`: resultado acumulado (local-visitante) al final de cada chukker. Vacío (`[]`) si no lo tenés.
- `goleadores`: `equipo` es `local` o `visitante`; la página los separa por equipo.
- `ganador`: solo hace falta cuando el marcador no está confirmado (`golesLocal: null`).
- `repeticion`: link directo del partido en Disney+. Si es `null`, el botón **Ver repetición** lleva a la página del Abierto en Disney+.

El orden no importa: la página ordena por fecha y agrupa por día.

### Cargar el partido en vivo

En `data\live.json`, reemplazá `"partido": null` por:

```json
"partido": {
  "torneo": "palermo",
  "fase": "Fecha 2",
  "local": "la-hache",
  "visitante": "la-irenita",
  "golesLocal": 5,
  "golesVisitante": 4,
  "chukker": "4°",
  "progresion": ["2-1", "3-3", "5-4"],
  "nota": "",
  "transmision": "https://www.disneyplus.com/..."
}
```

y actualizá `"actualizado"`. Mientras haya partido, la página vuelve a leer el archivo cada 60 segundos. Al terminar, pasá el resultado a `matches.json` y volvé a poner `"partido": null`.

### Equipos y próximos torneos

- Planteles: `data\teams.json`, lista `jugadores` (`nombre` y `handicap`). El handicap total se calcula solo.
- Triple Corona (fechas, copa, final programada), sección "Temporada" (formato, clasificados y clasificatorio) y próximos torneos AAP: `data\tournaments.json`. `aapId` es el número del link `aapolo.com/torneos/detalle/<id>`.

## Anuncios (Google AdSense)

Los espacios ya están en la página (arriba, al costado y abajo) y quedan ocultos hasta activarlos.

1. Conseguí un **dominio propio** y conectalo en Cloudflare Pages (Custom domains). AdSense no aprueba subdominios como `polo-ar.pages.dev`.
2. Creá la cuenta en https://adsense.google.com y agregá el sitio con tu dominio.
3. Ya hecho: el código de AdSense (ca-pub-2663033045906008) está en el `<head>` de `index.html` y `privacidad.html`, y `ads.txt` está en la raíz.
4. Si algún día cambia el ID, actualizalo en esos tres archivos y en `data/anuncios.json`.
5. Cuando AdSense apruebe el sitio, creá tres bloques de anuncios ("Display", adaptables) y poné sus números en `"arriba"`, `"lateral"` y `"abajo"`.

La política de privacidad está en `privacidad.html` y enlazada en el pie de página.

## Si cambiás el diseño o el código

En polo-ar.com, Cloudflare hace que los navegadores guarden `css/styles.css` y `js/app.js` por 4 horas. Para que se vea un cambio enseguida, subí el número `?v=...` que aparece después de esos archivos en `index.html` y `privacidad.html` (por ejemplo, la fecha y hora). Los datos de `data/` no tienen este problema: se actualizan al instante.

Opcional: en Cloudflare → polo-ar.com → Caching → Configuration → **Browser Cache TTL** → "Respect Existing Headers" quita esa espera.

## Datos en vivo reales

Hoy no hay una fuente pública de marcadores en tiempo real: aapolo.com y live.aapolo.com (plataforma de streaming por suscripción) no publican una API, y Disney+ tampoco. Por eso el en vivo se carga a mano.

La página ya pide primero `/api/live` y, si no existe, usa `data/live.json`. Cuando haya una fuente autorizada, se programa en `functions/api/live.js` (Cloudflare Pages Function) devolviendo el mismo formato que `live.json`, sin tocar la página.

## Publicar

Ver la sección de publicación en `PUBLICAR.md`.

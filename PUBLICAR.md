# Publicar Polo AR

## Recomendación: Cloudflare Pages (gratis)

- El sitio es estático, y Cloudflare Pages lo sirve gratis con tráfico ilimitado.
- Ya tiene donde poner el backend: la carpeta `functions/` se publica sola como `/api/live`. El plan gratis permite 100.000 pedidos por día a funciones, de sobra para el en vivo.
- Se conecta a GitHub: cada cambio que guardes en el repositorio (también desde el editor web de GitHub) se publica solo en un minuto. El plan gratis tiene 500 publicaciones por mes.
- Dominio propio gratis (pagás solo el dominio). Sin dominio, queda en `https://polo-ar.pages.dev`.
- Permite uso comercial (Vercel Hobby, por ejemplo, no).

**Alternativa: GitHub Pages.** Es la más simple (no hace falta otra cuenta además de GitHub), pero no corre funciones: si nunca vas a tener datos en vivo reales, alcanza. Si los vas a tener, Cloudflare.

## Pasos desde Windows

### 1. Subir el proyecto a GitHub

1. Creá una cuenta en https://github.com (si no tenés).
2. Instalá Git en PowerShell:

   ```powershell
   winget install --id Git.Git -e
   ```

   Cerrá y volvé a abrir PowerShell.
3. En GitHub: **New repository** → nombre `polo-ar` → **Public** o **Private** → sin README → **Create repository**.
4. En PowerShell, dentro de la carpeta del proyecto (cambiá `TU_USUARIO`):

   ```powershell
   git init
   git add .
   git commit -m "Polo AR: primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/polo-ar.git
   git push -u origin main
   ```

   La primera vez se abre una ventana para iniciar sesión en GitHub.

### 2. Conectar Cloudflare Pages

1. Creá una cuenta en https://dash.cloudflare.com/sign-up (gratis, sin tarjeta).
2. En el panel: **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**. (Si te ofrece crear un Worker, buscá la opción de Pages.)
3. Autorizá GitHub y elegí el repositorio `polo-ar`.
4. Configuración:
   - Framework preset: **None**
   - Build command: vacío
   - Build output directory: vacío (o `/`)
5. **Save and Deploy**. En un minuto tenés el link `https://polo-ar.pages.dev` (o parecido si el nombre está tomado).

### 3. Actualizar datos

- **Desde la web:** en GitHub, abrí `data/matches.json` → ícono del lápiz → editá → **Commit changes**. Cloudflare publica solo.
- **Desde la PC:** editá los JSON, corré `.\scripts\validar-datos.ps1` y después:

  ```powershell
  git add data
  git commit -m "Resultado Fecha 2"
  git push
  ```

### 4. Dominio propio (opcional)

En el proyecto de Pages → **Custom domains** → **Set up a domain** y seguí los pasos.

## Si se suman datos en vivo reales

- Se programa la consulta a la fuente en `functions/api/live.js`, devolviendo el mismo formato que `data/live.json`. La página no cambia.
- Las claves de la fuente van en **Settings → Variables and Secrets** del proyecto de Pages, nunca en el repositorio.
- Si el tráfico crece mucho, conviene que la función guarde la última respuesta unos segundos (caché) para no pasar los 100.000 pedidos por día del plan gratis. El plan pago de Workers cuesta USD 5 por mes.
- Antes, hay que tener permiso de la fuente: hoy ni la AAP ni Disney+ publican una API.

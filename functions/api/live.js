// Cloudflare Pages Function: GET /api/live
//
// Hoy solo devuelve data/live.json (cargado a mano) sin caché.
// Es el punto de enganche para datos en vivo reales: cuando exista una
// fuente autorizada (feed de la AAP, proveedor de datos, etc.), se consulta
// acá y se devuelve con el mismo formato que data/live.json. La página no
// cambia. En local (iniciar.ps1) esta ruta no existe y la página usa el JSON.
export async function onRequestGet({ request, env }) {
  const base = new URL(request.url);
  const res = await env.ASSETS.fetch(new URL("/data/live.json", base));
  const datos = await res.json();

  // Ejemplo de fuente externa futura (no habilitar sin permiso de la fuente):
  // const r = await fetch(env.FUENTE_VIVO_URL, { headers: { Authorization: `Bearer ${env.FUENTE_VIVO_TOKEN}` } });
  // datos.partido = adaptar(await r.json());

  return new Response(JSON.stringify(datos), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

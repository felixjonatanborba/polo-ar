/* PoloAR · idiomas (español, inglés y portugués).
   - Los textos fijos de la página están en T, abajo: clave -> [es, en, pt].
   - Los textos de los datos (notas de partidos, fases, etc.) se cargan en español
     en data/*.json y sus traducciones van en data/traducciones.json. Si un texto
     no tiene traducción, se muestra en español.
   - El idioma elegido se guarda en el navegador. También se puede forzar con ?lang=en. */
window.PoloI18n = (function () {
  "use strict";

  var IDIOMAS = ["es", "en", "pt"];
  var LOCALES = { es: "es-AR", en: "en-US", pt: "pt-BR" };
  var NOMBRES = { es: "Español", en: "English", pt: "Português" };
  var CLAVE = "polo-idioma";
  var lang = "es";
  var datos = {};

  try { var g = localStorage.getItem(CLAVE); if (IDIOMAS.indexOf(g) >= 0) lang = g; } catch (e) {}
  try {
    var q = new URLSearchParams(location.search).get("lang");
    if (IDIOMAS.indexOf(q) >= 0) { lang = q; try { localStorage.setItem(CLAVE, q); } catch (e) {} }
  } catch (e) {}

  var T = {
    // encabezado y pie
    "nav.aria": ["Secciones", "Sections", "Seções"],
    "nav.resultados": ["Resultados", "Results", "Resultados"],
    "nav.vivo": ["En vivo", "Live", "Ao vivo"],
    "nav.equipos": ["Equipos", "Teams", "Equipes"],
    "nav.temporada": ["Temporada", "Season", "Temporada"],
    "nav.torneos": ["Torneos", "Tournaments", "Torneios"],
    "logo.aria": ["PoloAR, inicio", "PoloAR, home", "PoloAR, início"],
    "saltar.resultados": ["Saltar a los resultados", "Skip to results", "Pular para os resultados"],
    "saltar.contenido": ["Saltar al contenido", "Skip to content", "Pular para o conteúdo"],
    "idioma.aria": ["Idioma", "Language", "Idioma"],
    "tema": ["Tema", "Theme", "Tema"],
    "tema.claro": ["Cambiar a modo claro", "Switch to light mode", "Mudar para o modo claro"],
    "tema.oscuro": ["Cambiar a modo oscuro", "Switch to dark mode", "Mudar para o modo escuro"],
    "pie.datos": [
      "Datos de La Nación, AAP (aapolo.com), International Polo Academy (IPA) y Disney+, cargados a mano hasta el 15/11/2026. Un “—” es un dato que todavía no está confirmado. Las fechas con “aprox.” se deducen de la fecha de las notas.",
      "Data from La Nación, AAP (aapolo.com), International Polo Academy (IPA) and Disney+, entered by hand up to 15 Nov 2026. A “—” is a figure that has not been confirmed yet. Dates marked “approx.” are inferred from the date of the news reports.",
      "Dados de La Nación, AAP (aapolo.com), International Polo Academy (IPA) e Disney+, carregados manualmente até 15/11/2026. Um “—” é um dado que ainda não foi confirmado. As datas com “aprox.” são deduzidas da data das matérias."
    ],
    "pie.disney": [
      "Para ver los partidos en Disney+ hace falta suscripción. Este sitio no está asociado a la AAP ni a Disney.",
      "A subscription is required to watch the matches on Disney+. This site is not affiliated with the AAP or Disney.",
      "Para ver as partidas no Disney+ é preciso ter assinatura. Este site não é associado à AAP nem à Disney."
    ],
    "pie.privacidad": ["Política de privacidad", "Privacy policy (in Spanish)", "Política de privacidade (em espanhol)"],
    "titulo.inicio": [
      "Polo AR · Resultados, en vivo y repeticiones de la Triple Corona",
      "Polo AR · Triple Crown results, live matches and replays",
      "Polo AR · Resultados, ao vivo e replays da Tríplice Coroa"
    ],
    "desc.inicio": [
      "Resultados, detalle de partidos, en vivo y repeticiones de la Triple Corona del polo argentino: Hurlingham, Tortugas y el Abierto Argentino de Palermo.",
      "Results, match details, live matches and replays of the Argentine polo Triple Crown: Hurlingham, Tortugas and the Argentine Open at Palermo.",
      "Resultados, detalhes das partidas, ao vivo e replays da Tríplice Coroa do polo argentino: Hurlingham, Tortugas e o Aberto Argentino de Palermo."
    ],
    "desc.equipos": [
      "Equipos de la Triple Corona 2026 del polo argentino: planteles, handicap, resultados y rendimiento por torneo.",
      "Teams of the 2026 Argentine polo Triple Crown: rosters, handicap, results and performance by tournament.",
      "Equipes da Tríplice Coroa 2026 do polo argentino: elencos, handicap, resultados e desempenho por torneio."
    ],
    "cargando": ["Cargando…", "Loading…", "Carregando…"],
    "cargando.resultados": ["Cargando resultados…", "Loading results…", "Carregando resultados…"],
    "cargando.equipos": ["Cargando equipos…", "Loading teams…", "Carregando equipes…"],
    "publicidad": ["Publicidad", "Advertisement", "Publicidade"],
    "otra.pestana": [" (se abre en otra pestaña)", " (opens in a new tab)", " (abre em outra aba)"],

    // inicio: títulos de secciones
    "triple": ["Triple Corona 2026", "Triple Crown 2026", "Tríplice Coroa 2026"],
    "sec.resultados": ["Resultados", "Results", "Resultados"],
    "sec.vivo": ["En vivo", "Live", "Ao vivo"],
    "sec.equipos": ["Equipos 2026", "Teams 2026", "Equipes 2026"],
    "sec.proximos": ["Próximos torneos AAP", "Upcoming AAP tournaments", "Próximos torneios AAP"],
    "filtro.aria": ["Filtrar por torneo", "Filter by tournament", "Filtrar por torneio"],
    "filtro.todos": ["Todos", "All", "Todos"],

    // resultados y detalle
    "sin.partidos": ["No hay partidos cargados para este torneo.", "No matches have been entered for this tournament.", "Não há partidas carregadas para este torneio."],
    "aprox": ["aprox.", "approx.", "aprox."],
    "aprox.titulo": ["Fecha deducida de la fecha de las notas", "Date inferred from the date of the news reports", "Data deduzida da data das matérias"],
    "ver.detalle": ["Ver detalle", "Show details", "Ver detalhes"],
    "sr.sin.marcador": ["sin marcador confirmado", "score not confirmed", "placar não confirmado"],
    "sr.gano": ["Ganó {e}", "{e} won", "Vitória de {e}"],
    "hcp.goles": ["goles de handicap", "handicap goals", "gols de handicap"],
    "sin.plantel": ["Plantel sin cargar", "Roster not available", "Elenco não carregado"],
    "en.aap": [" (en la AAP figura como {n})", " (listed by the AAP as {n})", " (na AAP consta como {n})"],
    "chukker.marcador": ["Marcador por chukker", "Score by chukker", "Placar por chukker"],
    "parcial": ["Resultado parcial acumulado", "Running score", "Placar parcial acumulado"],
    "supl": ["Supl.", "Extra", "Supl."],
    "goleadores": ["Goleadores", "Scorers", "Artilheiros"],
    "notas": ["Notas", "Notes", "Notas"],
    "resumen": ["Resumen", "Highlights", "Melhores momentos"],
    "ver.resumen": ["▶ Ver resumen", "▶ Watch highlights", "▶ Ver melhores momentos"],
    "yt.otra": [" (YouTube, se abre en otra pestaña)", " (YouTube, opens in a new tab)", " (YouTube, abre em outra aba)"],
    "ver.repeticion": ["▶ Ver repetición", "▶ Watch replay", "▶ Ver replay"],
    "pagina.abierto": ["(página del Abierto en Disney+)", "(Argentine Open page on Disney+)", "(página do Aberto no Disney+)"],

    // estadísticas del partido
    "est": ["Estadísticas", "Statistics", "Estatísticas"],
    "est.tiros": ["Tiros al arco", "Shots on goal", "Chutes a gol"],
    "est.penales": ["Penales", "Penalties", "Pênaltis"],
    "est.corners": ["Corners", "Corners", "Corners"],
    "est.faltas": ["Faltas cometidas", "Fouls committed", "Faltas cometidas"],
    "est.throwins": ["Throw-ins ganados", "Throw-ins won", "Throw-ins ganhos"],
    "est.tarjetas": ["Tarjetas", "Cards", "Cartões"],
    "est.fuente": ["Convertidos/intentos. Datos provistos por {f}.", "Scored/attempts. Data provided by {f}.", "Convertidos/tentativas. Dados fornecidos por {f}."],
    "est.jugadores": ["Estadísticas por jugador", "Player statistics", "Estatísticas por jogador"],
    "pj.g": ["G", "G", "G"],
    "pj.tiros": ["Tiros", "Shots", "Chutes"],
    "pj.penales": ["Pen.", "Pen.", "Pên."],
    "pj.pases": ["Pases", "Passes", "Passes"],
    "pj.asistencias": ["Asist.", "Ast.", "Assist."],
    "pj.faltas": ["Faltas", "Fouls", "Faltas"],
    "pj.recuperos": ["Rec.", "Rec.", "Rec."],
    "pj.perdidas": ["Pérd.", "Lost", "Perd."],
    "pj.throwins": ["TI", "TI", "TI"],
    "pj.leyenda": [
      "G: goles · Tiros, Pen. y Pases: acertados/intentos · Asist.: asistencias de gol · Faltas: cometidas · Rec.: recuperos · Pérd.: pérdidas · TI: throw-ins ganados · (s.): suplente",
      "G: goals · Shots, Pen. and Passes: successful/attempts · Ast.: goal assists · Fouls: committed · Rec.: recoveries · Lost: turnovers · TI: throw-ins won · (s.): substitute",
      "G: gols · Chutes, Pên. e Passes: certos/tentativas · Assist.: assistências para gol · Faltas: cometidas · Rec.: recuperações · Perd.: perdas · TI: throw-ins ganhos · (s.): reserva"
    ],

    // triple corona y temporada
    "campeon": ["campeón", "champion", "campeão"],
    "subcampeon": ["subcampeón", "runner-up", "vice-campeão"],
    "foto.ilustrativa": ["Foto ilustrativa · ", "Illustrative photo · ", "Foto ilustrativa · "],
    "foto": ["Foto: ", "Photo: ", "Foto: "],
    "en.juego": ["En juego", "In progress", "Em disputa"],
    "temp.partidos": ["{n} partidos del {a} al {b}", "{n} matches from {a} to {b}", "{n} partidas de {a} a {b}"],
    "temp.mas": [" ({n} más que en 2025).", " ({n} more than in 2025).", " ({n} a mais que em 2025)."],
    "calendario": ["Calendario", "Calendar", "Calendário"],
    "col.torneo": ["Torneo", "Tournament", "Torneio"],
    "col.desde": ["Desde", "Starts", "Início"],
    "col.final": ["Final programada", "Scheduled final", "Final programada"],
    "clasificados": ["Clasificados", "Qualified teams", "Classificados"],
    "col.equipo": ["Equipo", "Team", "Equipe"],
    "clasificatorio": ["Clasificatorio", "Qualifier", "Classificatório"],
    "fechas": [" Fechas: ", " Dates: ", " Datas: "],
    "fuente": ["Fuente: ", "Source: ", "Fonte: "],
    "sin.plantel.aria": ["sin plantel", "no roster", "sem elenco"],
    "ver.fichas": ["Ver fichas de equipos →", "See team profiles →", "Ver fichas das equipes →"],

    // en vivo
    "vivo.error": ["No se pudo cargar el bloque en vivo.", "The live block could not be loaded.", "Não foi possível carregar o bloco ao vivo."],
    "vivo.nada": [
      "Ahora no hay un partido en vivo cargado. Los marcadores se actualizan a mano: mirá los partidos en directo y sus repeticiones en Disney+.",
      "There is no live match at the moment. Scores are updated by hand: watch the matches live and their replays on Disney+.",
      "Não há partida ao vivo no momento. Os placares são atualizados manualmente: assista às partidas ao vivo e aos replays no Disney+."
    ],
    "vivo.disney": ["▶ Ver en Disney+", "▶ Watch on Disney+", "▶ Ver no Disney+"],
    "vivo.youtube": ["▶ Resúmenes en YouTube", "▶ Highlights on YouTube", "▶ Melhores momentos no YouTube"],
    "vivo.whatsapp": ["Canal AAP en WhatsApp", "AAP WhatsApp channel", "Canal da AAP no WhatsApp"],
    "vivo.actualizado": ["Actualizado: {h} (hora argentina)", "Updated: {h} (Argentina time)", "Atualizado: {h} (horário da Argentina)"],

    // errores de carga
    "error.archivo": [
      "Abriste el archivo con doble clic. Para que carguen los datos, iniciá el servidor local: en PowerShell, dentro de la carpeta, corré <code>.\\iniciar.ps1</code>.",
      "You opened the file directly. To load the data, start the local server: in PowerShell, inside the folder, run <code>.\\iniciar.ps1</code>.",
      "Você abriu o arquivo diretamente. Para carregar os dados, inicie o servidor local: no PowerShell, dentro da pasta, execute <code>.\\iniciar.ps1</code>."
    ],
    "error.datos": ["No se pudieron cargar los datos ({e}).", "The data could not be loaded ({e}).", "Não foi possível carregar os dados ({e})."],

    // pantalla de equipos
    "eq.titulo": ["Equipos · PoloAR", "Teams · PoloAR", "Equipes · PoloAR"],
    "eq.intro": [
      "Los equipos de la Triple Corona, ordenados por handicap. Tocá uno para ver su ficha.",
      "The Triple Crown teams, sorted by handicap. Tap one to see its profile.",
      "As equipes da Tríplice Coroa, ordenadas por handicap. Toque em uma para ver a ficha."
    ],
    "eq.gp": ["G-P", "W-L", "V-D"],
    "eq.g": ["G", "W", "V"],
    "eq.p": ["P", "L", "D"],
    "eq.gano": ["Ganó", "Won", "Venceu"],
    "eq.perdio": ["Perdió", "Lost", "Perdeu"],
    "eq.ultimos.aria": ["Últimos partidos", "Latest matches", "Últimas partidas"],
    "eq.ultimos": ["Últimos: ", "Latest: ", "Últimas: "],
    "eq.sin.partidos": ["Sin partidos cargados", "No matches entered", "Sem partidas carregadas"],
    "eq.no.encontre": ["No encontré ese equipo.", "That team was not found.", "Essa equipe não foi encontrada."],
    "eq.ver.todos": ["Ver todos los equipos", "See all teams", "Ver todas as equipes"],
    "eq.volver": ["← Todos los equipos", "← All teams", "← Todas as equipes"],
    "eq.en.aap": ["En la AAP: ", "AAP name: ", "Na AAP: "],
    "eq.handicap": ["Handicap", "Handicap", "Handicap"],
    "eq.por.handicap": ["Por handicap", "By handicap", "Por handicap"],
    "eq.ganados": ["Ganados-Perdidos", "Won-Lost", "Vitórias-Derrotas"],
    "eq.dif": ["Dif. de gol", "Goal diff.", "Saldo de gols"],
    "eq.plantel": ["Plantel", "Roster", "Elenco"],
    "eq.hcp": ["handicap", "handicap", "handicap"],
    "eq.rendimiento": ["Rendimiento por torneo", "Performance by tournament", "Desempenho por torneio"],
    "eq.resultado": ["Resultado", "Result", "Resultado"],
    "eq.pj": ["PJ", "P", "J"],
    "eq.goles": ["Goles", "Goals", "Gols"],
    "eq.campeon": ["Campeón", "Champion", "Campeão"],
    "eq.subcampeon": ["Subcampeón", "Runner-up", "Vice-campeão"],
    "eq.no.jugo": ["No jugó", "Did not play", "Não jogou"],
    "eq.sin.resultados": ["Todavía no hay partidos cargados de este equipo.", "No matches have been entered for this team yet.", "Ainda não há partidas carregadas desta equipe."],
    "eq.resumen": ["▶ Resumen", "▶ Highlights", "▶ Melhores momentos"],
    "eq.error.archivo": ["Abrí la web con iniciar.bat para que carguen los datos.", "Open the site with iniciar.bat so the data can load.", "Abra o site com iniciar.bat para carregar os dados."]
  };

  function idx() { return IDIOMAS.indexOf(lang); }

  // Texto fijo de la interfaz. vars reemplaza {clave} dentro del texto.
  function t(clave, vars) {
    var fila = T[clave];
    var s = fila ? (fila[idx()] != null ? fila[idx()] : fila[0]) : clave;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }

  // Texto que viene de los datos (en español): devuelve su traducción si existe.
  function d(s) {
    if (lang === "es" || s == null) return s;
    return Object.prototype.hasOwnProperty.call(datos, s) ? datos[s] : s;
  }

  function locale() { return LOCALES[lang]; }

  // Carga las traducciones de los datos. En español no hace falta.
  function listo() {
    if (lang === "es") return Promise.resolve();
    return fetch("data/traducciones.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { datos = (j && j[lang]) || {}; })
      .catch(function () { datos = {}; });
  }

  function cambiar(nuevo) {
    if (IDIOMAS.indexOf(nuevo) < 0 || nuevo === lang) return;
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) {}
    // Se saca ?lang= de la dirección para que no pise la elección.
    var u = new URL(location.href);
    u.searchParams.delete("lang");
    if (u.href === location.href) location.reload(); else location.replace(u.href);
  }

  // Traduce los textos fijos del HTML y arma el selector de idioma.
  function aplicar() {
    document.documentElement.lang = LOCALES[lang];
    document.querySelectorAll("[data-i18n]").forEach(function (e) { e.textContent = t(e.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (e) { e.setAttribute("aria-label", t(e.getAttribute("data-i18n-aria"))); });
    document.querySelectorAll("[data-i18n-content]").forEach(function (e) { e.setAttribute("content", t(e.getAttribute("data-i18n-content"))); });
    var tit = document.documentElement.getAttribute("data-i18n-title");
    if (tit) document.title = t(tit);

    var caja = document.getElementById("idioma");
    if (caja && !caja.firstChild) {
      caja.setAttribute("aria-label", t("idioma.aria"));
      IDIOMAS.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = c.toUpperCase();
        b.title = NOMBRES[c];
        b.lang = c;
        b.setAttribute("aria-pressed", String(c === lang));
        b.addEventListener("click", function () { cambiar(c); });
        caja.appendChild(b);
      });
    }
  }

  aplicar();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicar);

  return { lang: lang, t: t, d: d, locale: locale, listo: listo, cambiar: cambiar, aplicar: aplicar };
})();

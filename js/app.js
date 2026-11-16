/* Polo AR · lógica de la página.
   Lee los datos de data/*.json y arma cada sección. No hace falta tocar
   este archivo para cargar resultados: se editan los JSON. */
(function () {
  "use strict";

  var DATOS = "data/";
  var VIVO_API = "api/live";          // función serverless (Cloudflare Pages). Si no existe, se usa data/live.json
  var VIVO_CADA_MS = 60000;           // cada cuánto se refresca el bloque "En vivo" si hay partido

  var equipos = {};                   // id -> equipo
  var partidos = [];
  var torneos = { tripleCorona: [], proximos: [] };
  var filtro = "todos";

  // Idiomas: t() traduce textos fijos y d() textos de los datos (ver js/i18n.js).
  var I = window.PoloI18n || { t: function (k) { return k; }, d: function (s) { return s; }, locale: function () { return "es-AR"; }, listo: function () { return Promise.resolve(); } };
  var t = I.t, d = I.d;

  // ---------- utilidades ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " respondió " + r.status);
      return r.json();
    });
  }
  function fecha(iso, opts) {
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(I.locale(), opts || { weekday: "long", day: "numeric", month: "long" });
  }
  function hora(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleString(I.locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
  }
  function eq(id) { return equipos[id] || { id: id, nombre: id, escudo: null, jugadores: [] }; }
  function nombreTorneo(id) {
    var t = torneos.tripleCorona.filter(function (x) { return x.id === id; })[0];
    return t ? d(t.nombre) : id;
  }
  function linkTorneoDisney(id) {
    var t = torneos.tripleCorona.filter(function (x) { return x.id === id; })[0];
    if (t && t.disney) return t.disney;
    var p = torneos.tripleCorona.filter(function (x) { return x.id === "palermo"; })[0];
    return p ? p.disney : "https://www.disneyplus.com/";
  }
  function total(e) { return e.jugadores.reduce(function (s, j) { return s + (+j.handicap || 0); }, 0); }
  function iniciales(n) {
    var w = n.replace(/-/g, " ").split(/\s+/).filter(Boolean);
    return ((w[0] || "?")[0] + ((w[1] || w[0] || "?")[w[1] ? 0 : 1] || "")).toUpperCase();
  }

  function escudo(id, chico) {
    var e = eq(id), c = "cr" + (chico ? " sm" : "") + (e.escudoFondoClaro ? " lt" : "");
    var ini = esc(iniciales(e.nombre));
    if (e.escudo) {
      // Si el PNG no está, se reemplaza por las iniciales.
      return '<span class="' + c + '" data-ini="' + ini + '"><img src="' + esc(e.escudo) +
        '" alt="" width="96" height="96" loading="lazy" decoding="async"></span>';
    }
    return '<span class="' + c + '" aria-hidden="true">' + ini + "</span>";
  }
  document.addEventListener("error", function (ev) {
    var img = ev.target;
    if (img.tagName === "IMG" && img.parentNode && img.parentNode.classList.contains("cr")) {
      var s = img.parentNode;
      s.setAttribute("aria-hidden", "true");
      s.classList.remove("lt");
      s.textContent = s.getAttribute("data-ini");
    }
  }, true);

  function marcador(m) {
    var hay = m.golesLocal != null && m.golesVisitante != null;
    var ga = hay ? m.golesLocal > m.golesVisitante : m.ganador === "local";
    var gb = hay ? m.golesVisitante > m.golesLocal : m.ganador === "visitante";
    return { hay: hay, ga: ga, gb: gb, txt: hay ? m.golesLocal + " – " + m.golesVisitante : "—" };
  }

  function fila(m, mk) {
    var a = eq(m.local), b = eq(m.visitante);
    var lectura = a.nombre + " " + (mk.hay ? m.golesLocal : t("sr.sin.marcador")) + ", " +
      b.nombre + " " + (mk.hay ? m.golesVisitante : "") +
      (mk.ga ? ". " + t("sr.gano", { e: a.nombre }) : mk.gb ? ". " + t("sr.gano", { e: b.nombre }) : "");
    return '<span class="sr-only">' + esc(lectura) + ".</span>" +
      '<div class="row" aria-hidden="true">' +
        '<div class="tm a' + (mk.ga ? " win" : "") + '">' + escudo(a.id) + '<span class="nm">' + esc(a.nombre) + "</span></div>" +
        '<div class="sc">' + mk.txt + "</div>" +
        '<div class="tm b' + (mk.gb ? " win" : "") + '"><span class="nm">' + esc(b.nombre) + "</span>" + escudo(b.id) + "</div>" +
      "</div>";
  }

  // ---------- detalle ----------
  function plantel(id) {
    var e = eq(id);
    var h = "<h4>" + esc(e.nombre) + (e.jugadores.length ? " · " + total(e) + " " + t("hcp.goles") : "") + "</h4>";
    if (!e.jugadores.length) return h + '<p class="muted">' + t("sin.plantel") + (e.nombreAAP ? esc(t("en.aap", { n: e.nombreAAP })) : "") + ".</p>";
    return h + "<ul>" + e.jugadores.map(function (j) {
      return "<li><span>" + esc(j.nombre) + "</span><b>" + esc(j.handicap) + "</b></li>";
    }).join("") + "</ul>";
  }
  function detalle(m) {
    var a = eq(m.local), b = eq(m.visitante);
    var h = '<div class="det"><div class="cols"><div>' + plantel(m.local) + "</div><div>" + plantel(m.visitante) + "</div></div>";
    h += estadisticasEquipos(m, a, b);
    h += "<h4>" + t("chukker.marcador") + "</h4>";
    if (m.progresion && m.progresion.length) {
      h += '<p class="muted">' + t("parcial") + " (" + esc(a.nombre) + " – " + esc(b.nombre) + ")</p>" +
        '<ol class="prog">' + m.progresion.map(chukker).join("") + "</ol>";
    } else {
      h += '<p class="muted">—</p>';
    }
    h += "<h4>" + t("goleadores") + "</h4>";
    h += goleadores(m, a, b);
    h += estadisticasJugadores(m, a, b);
    if (m.nota) h += "<h4>" + t("notas") + "</h4><p>" + esc(d(m.nota)) + "</p>";
    var yt = idYouTube(m.resumen);
    if (yt) h += "<h4>" + t("resumen") + '</h4><div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + yt +
      '" title="' + t("resumen") + ": " + esc(a.nombre) + " vs. " + esc(b.nombre) + '" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    return h + "</div>";
  }

  // Un chukker del marcador parcial. Del noveno en adelante es chukker suplementario.
  function chukker(x, i) {
    return "<li><span>" + (i > 7 ? t("supl") : (i + 1) + "°") + "</span>" + esc(x) + "</li>";
  }

  // ---------- estadísticas del partido (campo "estadisticas" de matches.json) ----------
  var EST_EQUIPO = ["tiros", "penales", "corners", "faltas", "throwins", "tarjetas"];
  var EST_JUGADOR = ["tiros", "penales", "pases", "asistencias", "faltas", "recuperos", "perdidas", "throwins"];
  function estadisticasEquipos(m, a, b) {
    var e = m.estadisticas && m.estadisticas.equipos;
    if (!e) return "";
    var filas = EST_EQUIPO.filter(function (k) { return e[k]; }).map(function (k) {
      return "<tr><td>" + esc(e[k][0]) + '</td><th scope="row">' + t("est." + k) + "</th><td>" + esc(e[k][1]) + "</td></tr>";
    }).join("");
    return "<h4>" + t("est") + '</h4><table class="est"><thead><tr><th scope="col">' + esc(a.nombre) + '</th><td></td><th scope="col">' + esc(b.nombre) +
      "</th></tr></thead><tbody>" + filas + "</tbody></table>" +
      (m.estadisticas.fuente ? '<p class="est-nota">' + esc(t("est.fuente", { f: m.estadisticas.fuente })) + "</p>" : "");
  }
  function estadisticasJugadores(m, a, b) {
    var j = m.estadisticas && m.estadisticas.jugadores;
    if (!j) return "";
    function tabla(e, filas) {
      if (!filas || !filas.length) return "";
      return '<div class="scrollx"><table class="pjs"><thead><tr><th scope="col">' + esc(e.nombre) + '</th><th scope="col">' + t("pj.g") + "</th>" +
        EST_JUGADOR.map(function (k) { return '<th scope="col">' + t("pj." + k) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        filas.map(function (p) {
          return '<tr><th scope="row">' + esc(p.nombre) + "</th><td><b>" + esc(p.goles) + "</b></td>" +
            EST_JUGADOR.map(function (k) { return "<td>" + esc(p[k]) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
    }
    return "<h4>" + t("est.jugadores") + "</h4>" + tabla(a, j.local) + tabla(b, j.visitante) + '<p class="est-nota">' + t("pj.leyenda") + "</p>";
  }

  function goleadores(m, a, b) {
    var lista = m.goleadores || [];
    if (!lista.length) return '<p class="muted">—</p>';
    function ul(xs) { return "<ul>" + xs.map(function (g) { return "<li><span>" + esc(d(g.nombre)) + "</span><b>" + esc(g.goles) + "</b></li>"; }).join("") + "</ul>"; }
    var hayEquipo = lista.some(function (g) { return g.equipo; });
    if (!hayEquipo) return ul(lista);
    var col = function (lado, e) {
      var xs = lista.filter(function (g) { return g.equipo === lado; });
      return "<div><p class=\"muted\">" + esc(e.nombre) + "</p>" + (xs.length ? ul(xs) : '<p class="muted">—</p>') + "</div>";
    };
    return '<div class="cols">' + col("local", a) + col("visitante", b) + "</div>";
  }

  function idYouTube(url) {
    var r = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/.exec(url || "");
    return r ? r[1] : null;
  }
  function botonResumen(m) {
    if (!m.resumen) return "";
    return '<a class="btn yt" href="' + esc(m.resumen) + '" target="_blank" rel="noopener">' + t("ver.resumen") + '<span class="sr-only">' + t("yt.otra") + "</span></a>";
  }

  function botonRepeticion(m) {
    var directo = !!m.repeticion;
    var url = m.repeticion || linkTorneoDisney(m.torneo);
    return '<a class="btn t" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      t("ver.repeticion") + (directo ? "" : " <small>" + t("pagina.abierto") + "</small>") +
      '<span class="sr-only">' + t("otra.pestana") + "</span></a>";
  }

  // ---------- resultados ----------
  function dibujarResultados() {
    var lista = partidos.filter(function (m) { return filtro === "todos" || m.torneo === filtro; })
      .slice().sort(function (x, y) { return x.fecha < y.fecha ? 1 : x.fecha > y.fecha ? -1 : 0; });
    if (!lista.length) { $("lista").innerHTML = '<p class="empty">' + t("sin.partidos") + "</p>"; return; }
    var ult = "", h = "";
    lista.forEach(function (m) {
      if (m.fecha !== ult) {
        ult = m.fecha;
        h += '<h3 class="day">' + esc(fecha(m.fecha)) + (m.fechaAproximada ? ' <span class="badge" title="' + esc(t("aprox.titulo")) + '">' + t("aprox") + "</span>" : "") + "</h3>";
      }
      var mk = marcador(m);
      h += '<article class="match" id="' + esc(m.id) + '"><details><summary>' + fila(m, mk) +
        '<div class="inf"><span>' + esc(nombreTorneo(m.torneo)) + " · " + esc(d(m.fase)) + "</span>" +
        '<span aria-hidden="true" class="chev">▾</span><span class="sr-only">' + t("ver.detalle") + "</span></div>" +
        "</summary>" + detalle(m) + "</details>" +
        '<div class="acts">' + botonRepeticion(m) + botonResumen(m) + "</div></article>";
    });
    $("lista").innerHTML = h;
  }

  function prepararFiltros() {
    var botones = document.querySelectorAll("#filtros button");
    function aplicar(f) {
      filtro = f;
      botones.forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-f") === f)); });
      dibujarResultados();
    }
    botones.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-f");
        aplicar(f);
        try { history.replaceState(null, "", f === "todos" ? location.pathname : "?torneo=" + f); } catch (e) {}
      });
    });
    var q = new URLSearchParams(location.search).get("torneo");
    aplicar(q && document.querySelector('#filtros [data-f="' + q + '"]') ? q : "todos");
  }

  // ---------- triple corona ----------
  function dibujarTriple() {
    $("tri").innerHTML = torneos.tripleCorona.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (t) {
      var on = t.estado === "en juego";
      var filas = "";
      if (t.campeon) filas += linea(t.campeon, I.t("campeon")) + linea(t.subcampeon, I.t("subcampeon"));
      (t.destacados || []).forEach(function (x) { filas += linea(x.equipo, d(x.texto)); });
      var ft = t.foto, estilo = "", cred = "";
      if (ft && ft.url) {
        estilo = ' style="--foto:url(&quot;' + esc(ft.url) + '&quot;)"';
        cred = '<div class="cred">' + (ft.ilustrativa ? I.t("foto.ilustrativa") : I.t("foto")) +
          '<a href="' + esc(ft.fuente) + '" target="_blank" rel="noopener">' + esc(ft.autor) + "</a> · " + esc(ft.licencia) + "</div>";
      }
      return '<article class="tc' + (on ? " on" : "") + (ft ? " foto" : "") + '"' + estilo + '><div class="n"><span>' + I.t("triple") + " · " + t.orden + "</span>" +
        (on ? '<span class="badge">' + I.t("en.juego") + "</span>" : "") + "</div>" +
        "<h3>" + esc(d(t.nombre)) + "</h3>" + filas + '<div class="s">' + esc(d(t.resumen)) + "</div>" + cred + "</article>";
    }).join("");
    function linea(id, txt) { return '<div class="l">' + escudo(id, true) + "<span>" + esc(eq(id).nombre) + " <small>" + esc(txt) + "</small></span></div>"; }
  }

  // ---------- temporada (formato, fechas y clasificados) ----------
  function dibujarTemporada() {
    var tp = torneos.temporada;
    if (!tp) { $("temporada").hidden = true; return; }
    var corta = { day: "numeric", month: "short" }, larga = { day: "numeric", month: "long" };
    function f(x) { return fecha(x, corta).replace(".", ""); }
    var h = '<div class="temp"><p>' + esc(d(tp.formato)) + "</p>" +
      "<p>" + esc(t("temp.partidos", { n: tp.partidos, a: fecha(tp.desde, larga), b: fecha(tp.hasta, larga) })) +
      (tp.partidosAnterior ? esc(t("temp.mas", { n: tp.partidos - tp.partidosAnterior })) : ".") + "</p>";

    h += "<h3>" + t("calendario") + '</h3><table class="tabla"><thead><tr><th scope="col">' + t("col.torneo") + '</th><th scope="col">' + t("col.desde") + '</th><th scope="col">' + t("col.final") + "</th></tr></thead><tbody>" +
      torneos.tripleCorona.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (c) {
        return "<tr><td>" + esc(d(c.nombre)) + (c.copa ? "<small>" + esc(c.copa) + "</small>" : "") + "</td><td>" +
          (c.inicio ? esc(f(c.inicio)) : "—") + "</td><td>" + (c.finalProgramada ? esc(f(c.finalProgramada)) : "—") + "</td></tr>";
      }).join("") + "</tbody></table>";

    h += "<h3>" + t("clasificados") + '</h3><table class="tabla"><thead><tr><th scope="col">' + t("col.equipo") + '</th><th scope="col" class="num">HCP</th></tr></thead><tbody>' +
      tp.clasificados.map(function (c) {
        var cr = c.equipo ? escudo(c.equipo, true) : '<span class="cr sm" aria-hidden="true">' + esc(iniciales(c.nombre)) + "</span>";
        return '<tr><td><span class="eqc">' + cr + "<span>" + esc(c.nombre) + (c.nota ? "<small>" + esc(d(c.nota)) + "</small>" : "") +
          '</span></span></td><td class="num">' + esc(c.handicap) + "</td></tr>";
      }).join("") + "</tbody></table>";

    var q = tp.clasificatorio;
    if (q) {
      h += "<h3>" + t("clasificatorio") + " · " + esc(q.nombre) + "</h3><p>" + esc(d(q.descripcion)) +
        (q.fechas && q.fechas.length ? t("fechas") + q.fechas.map(f).map(esc).join(", ") + "." : "") + "</p>" +
        '<ul class="chips">' + q.equipos.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>";
    }
    if (tp.fuente) h += '<p class="fuente">' + t("fuente") + '<a href="' + esc(tp.fuente) + '" target="_blank" rel="noopener">' + esc(d(tp.fuenteTitulo) || tp.fuente) + '<span class="sr-only">' + t("otra.pestana") + "</span></a></p>";
    $("info-temporada").innerHTML = h + "</div>";
  }

  // ---------- equipos ----------
  function dibujarEquipos() {
    var lista = Object.keys(equipos).map(function (k) { return equipos[k]; })
      .sort(function (a, b) { return total(b) - total(a) || a.nombre.localeCompare(b.nombre, "es"); });
    $("lista-equipos").innerHTML = lista.map(function (e) {
      return '<a class="team-link" href="equipos.html?id=' + encodeURIComponent(e.id) + '">' + escudo(e.id, true) + "<b>" + esc(e.nombre) + "</b>" +
        (e.jugadores.length ? "<em>" + total(e) + ' <small>HCP</small></em>' : '<em aria-label="' + esc(t("sin.plantel.aria")) + '">—</em>') + "</a>";
    }).join("") + '<a class="ver-todos" href="equipos.html">' + t("ver.fichas") + "</a>";
  }

  // ---------- próximos torneos ----------
  function dibujarCalendario() {
    $("calendario").innerHTML = torneos.proximos.map(function (c) {
      return '<li><span class="d">' + esc(fecha(c.fecha, { day: "numeric", month: "short" }).replace(".", "")) + "</span><span>" +
        '<a href="https://www.aapolo.com/torneos/detalle/' + encodeURIComponent(c.aapId) + '" target="_blank" rel="noopener">' + esc(c.nombre) +
        '<span class="sr-only">' + t("otra.pestana") + "</span></a><br><small>" + esc(d(c.categoria)) + "</small></span></li>";
    }).join("");
  }

  // ---------- en vivo ----------
  var timerVivo = null;
  function cargarVivo() {
    return getJSON(VIVO_API).catch(function () { return getJSON(DATOS + "live.json"); })
      .then(dibujarVivo)
      .catch(function () { $("vivo").innerHTML = '<p class="empty">' + t("vivo.error") + "</p>"; });
  }
  function dibujarVivo(v) {
    var links = v.links || {};
    var m = v.partido;
    var dot = document.querySelector("#vivo-titulo .dot");
    var otra = '<span class="sr-only">' + t("otra.pestana") + "</span>";
    var h = '<div class="lv">';
    if (m) {
      var mk = marcador(m);
      h += '<div class="live-match"><div class="row">' +
        '<div class="tm a">' + escudo(m.local, true) + '<span class="nm">' + esc(eq(m.local).nombre) + "</span></div>" +
        '<div class="sc">' + mk.txt + "</div>" +
        '<div class="tm b"><span class="nm">' + esc(eq(m.visitante).nombre) + "</span>" + escudo(m.visitante, true) + "</div></div>" +
        '<div class="meta"><span>' + esc(nombreTorneo(m.torneo)) + (m.fase ? " · " + esc(d(m.fase)) : "") + "</span><span>" +
        (m.chukker ? "Chukker " + esc(m.chukker) : "") + "</span></div>" +
        (m.progresion && m.progresion.length ? '<ol class="prog" style="margin-top:8px">' + m.progresion.map(chukker).join("") + "</ol>" : "") +
        (m.nota ? '<p style="margin:8px 0 0">' + esc(d(m.nota)) + "</p>" : "") +
        "</div>";
      if (dot) dot.classList.add("on");
    } else {
      h += "<p>" + t("vivo.nada") + "</p>";
      if (dot) dot.classList.remove("on");
    }
    h += '<div class="acts">' +
      '<a class="btn t" href="' + esc((m && m.transmision) || links.disney || linkTorneoDisney("palermo")) + '" target="_blank" rel="noopener">' + t("vivo.disney") + otra + "</a>" +
      (links.aap ? '<a class="btn" href="' + esc(links.aap) + '" target="_blank" rel="noopener">AAP Live' + otra + "</a>" : "") +
      (links.youtube ? '<a class="btn yt" href="' + esc(links.youtube) + '" target="_blank" rel="noopener">' + t("vivo.youtube") + otra + "</a>" : "") +
      (links.whatsapp ? '<a class="btn wa" href="' + esc(links.whatsapp) + '" target="_blank" rel="noopener">' + t("vivo.whatsapp") + otra + "</a>" : "") +
      "</div>";
    if (v.actualizado) h += '<p class="upd">' + esc(t("vivo.actualizado", { h: hora(v.actualizado) })) + "</p>";
    $("vivo").innerHTML = h + "</div>";

    clearTimeout(timerVivo);
    if (m) timerVivo = setTimeout(cargarVivo, VIVO_CADA_MS);
  }

  // ---------- tema ----------
  function prepararTema() {
    var r = document.documentElement, b = $("tema");
    function oscuro() {
      var t = r.getAttribute("data-theme");
      return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    }
    function etiqueta() { b.setAttribute("aria-label", oscuro() ? I.t("tema.claro") : I.t("tema.oscuro")); }
    b.addEventListener("click", function () {
      var nuevo = oscuro() ? "light" : "dark";
      r.setAttribute("data-theme", nuevo);
      try { localStorage.setItem("polo-tema", nuevo); } catch (e) {}
      etiqueta();
    });
    etiqueta();
  }

  // ---------- anuncios (Google AdSense) ----------
  // Se configuran en data/anuncios.json. Con "activo": false no se carga nada.
  function prepararAnuncios() {
    getJSON(DATOS + "anuncios.json").then(function (a) {
      if (!a || !a.activo || !/^ca-pub-\d{10,}$/.test(a.cliente || "") || /^ca-pub-0+$/.test(a.cliente)) return;
      if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
        var sc = document.createElement("script");
        sc.async = true; sc.crossOrigin = "anonymous";
        sc.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(a.cliente);
        document.head.appendChild(sc);
      }
      document.querySelectorAll(".ad[data-espacio]").forEach(function (box) {
        var slot = (a.espacios || {})[box.getAttribute("data-espacio")];
        if (!slot) return;
        box.innerHTML = '<span class="ad-label">' + t("publicidad") + '</span><ins class="adsbygoogle" style="display:block" data-ad-client="' +
          esc(a.cliente) + '" data-ad-slot="' + esc(slot) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
        box.hidden = false;
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      });
    }).catch(function () {});
  }

  // ---------- arranque ----------
  prepararTema();
  prepararAnuncios();
  Promise.all([getJSON(DATOS + "teams.json"), getJSON(DATOS + "matches.json"), getJSON(DATOS + "tournaments.json"), I.listo()])
    .then(function (r) {
      r[0].equipos.forEach(function (e) { equipos[e.id] = e; });
      partidos = r[1].partidos;
      torneos = r[2];
      dibujarTriple();
      prepararFiltros();
      dibujarTemporada();
      dibujarEquipos();
      dibujarCalendario();
      cargarVivo();
    })
    .catch(function (err) {
      var msg = location.protocol === "file:"
        ? t("error.archivo")
        : t("error.datos", { e: esc(err.message) });
      $("lista").innerHTML = '<p class="empty">' + msg + "</p>";
      $("tri").innerHTML = "";
      $("vivo").innerHTML = "";
    });
})();

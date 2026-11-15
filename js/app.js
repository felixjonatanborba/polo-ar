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
    return d.toLocaleDateString("es-AR", opts || { weekday: "long", day: "numeric", month: "long" });
  }
  function hora(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
  }
  function eq(id) { return equipos[id] || { id: id, nombre: id, escudo: null, jugadores: [] }; }
  function nombreTorneo(id) {
    var t = torneos.tripleCorona.filter(function (x) { return x.id === id; })[0];
    return t ? t.nombre : id;
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
    var lectura = a.nombre + " " + (mk.hay ? m.golesLocal : "sin marcador confirmado") + ", " +
      b.nombre + " " + (mk.hay ? m.golesVisitante : "") +
      (mk.ga ? ". Ganó " + a.nombre : mk.gb ? ". Ganó " + b.nombre : "");
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
    var h = "<h4>" + esc(e.nombre) + (e.jugadores.length ? " · " + total(e) + " goles de handicap" : "") + "</h4>";
    if (!e.jugadores.length) return h + '<p class="muted">Plantel sin cargar' + (e.nombreAAP ? " (en la AAP figura como " + esc(e.nombreAAP) + ")" : "") + ".</p>";
    return h + "<ul>" + e.jugadores.map(function (j) {
      return "<li><span>" + esc(j.nombre) + "</span><b>" + esc(j.handicap) + "</b></li>";
    }).join("") + "</ul>";
  }
  function detalle(m) {
    var a = eq(m.local), b = eq(m.visitante);
    var h = '<div class="det"><div class="cols"><div>' + plantel(m.local) + "</div><div>" + plantel(m.visitante) + "</div></div>";
    h += "<h4>Marcador por chukker</h4>";
    if (m.progresion && m.progresion.length) {
      h += '<p class="muted">Resultado parcial acumulado (' + esc(a.nombre) + " – " + esc(b.nombre) + ")</p>" +
        '<ol class="prog">' + m.progresion.map(function (x, i) {
          return "<li><span>" + (i + 1) + "°</span>" + esc(x) + "</li>";
        }).join("") + "</ol>";
    } else {
      h += '<p class="muted">—</p>';
    }
    h += "<h4>Goleadores</h4>";
    h += goleadores(m, a, b);
    if (m.nota) h += "<h4>Notas</h4><p>" + esc(m.nota) + "</p>";
    return h + "</div>";
  }

  function goleadores(m, a, b) {
    var lista = m.goleadores || [];
    if (!lista.length) return '<p class="muted">—</p>';
    function ul(xs) { return "<ul>" + xs.map(function (g) { return "<li><span>" + esc(g.nombre) + "</span><b>" + esc(g.goles) + "</b></li>"; }).join("") + "</ul>"; }
    var hayEquipo = lista.some(function (g) { return g.equipo; });
    if (!hayEquipo) return ul(lista);
    var col = function (lado, e) {
      var xs = lista.filter(function (g) { return g.equipo === lado; });
      return "<div><p class=\"muted\">" + esc(e.nombre) + "</p>" + (xs.length ? ul(xs) : '<p class="muted">—</p>') + "</div>";
    };
    return '<div class="cols">' + col("local", a) + col("visitante", b) + "</div>";
  }

  function botonRepeticion(m) {
    var directo = !!m.repeticion;
    var url = m.repeticion || linkTorneoDisney(m.torneo);
    return '<a class="btn t" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      "▶ Ver repetición" + (directo ? "" : " <small>(página del Abierto en Disney+)</small>") +
      '<span class="sr-only"> (se abre en otra pestaña)</span></a>';
  }

  // ---------- resultados ----------
  function dibujarResultados() {
    var lista = partidos.filter(function (m) { return filtro === "todos" || m.torneo === filtro; })
      .slice().sort(function (x, y) { return x.fecha < y.fecha ? 1 : x.fecha > y.fecha ? -1 : 0; });
    if (!lista.length) { $("lista").innerHTML = '<p class="empty">No hay partidos cargados para este torneo.</p>'; return; }
    var ult = "", h = "";
    lista.forEach(function (m) {
      if (m.fecha !== ult) {
        ult = m.fecha;
        h += '<h3 class="day">' + esc(fecha(m.fecha)) + (m.fechaAproximada ? ' <span class="badge" title="Fecha deducida de la fecha de las notas">aprox.</span>' : "") + "</h3>";
      }
      var mk = marcador(m);
      h += '<article class="match" id="' + esc(m.id) + '"><details><summary>' + fila(m, mk) +
        '<div class="inf"><span>' + esc(nombreTorneo(m.torneo)) + " · " + esc(m.fase) + "</span>" +
        '<span aria-hidden="true" class="chev">▾</span><span class="sr-only">Ver detalle</span></div>' +
        "</summary>" + detalle(m) + "</details>" +
        '<div class="acts">' + botonRepeticion(m) + "</div></article>";
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
      if (t.campeon) filas += linea(t.campeon, "campeón") + linea(t.subcampeon, "subcampeón");
      (t.destacados || []).forEach(function (d) { filas += linea(d.equipo, d.texto); });
      var ft = t.foto, estilo = "", cred = "";
      if (ft && ft.url) {
        estilo = ' style="--foto:url(&quot;' + esc(ft.url) + '&quot;)"';
        cred = '<div class="cred">' + (ft.ilustrativa ? "Foto ilustrativa · " : "Foto: ") +
          '<a href="' + esc(ft.fuente) + '" target="_blank" rel="noopener">' + esc(ft.autor) + "</a> · " + esc(ft.licencia) + "</div>";
      }
      return '<article class="tc' + (on ? " on" : "") + (ft ? " foto" : "") + '"' + estilo + '><div class="n"><span>Triple Corona 2026 · ' + t.orden + "</span>" +
        (on ? '<span class="badge">En juego</span>' : "") + "</div>" +
        "<h3>" + esc(t.nombre) + "</h3>" + filas + '<div class="s">' + esc(t.resumen) + "</div>" + cred + "</article>";
    }).join("");
    function linea(id, txt) { return '<div class="l">' + escudo(id, true) + "<span>" + esc(eq(id).nombre) + " <small>" + esc(txt) + "</small></span></div>"; }
  }

  // ---------- temporada (formato, fechas y clasificados) ----------
  function dibujarTemporada() {
    var t = torneos.temporada;
    if (!t) { $("temporada").hidden = true; return; }
    var corta = { day: "numeric", month: "short" };
    function f(x) { return fecha(x, corta).replace(".", ""); }
    var h = '<div class="temp"><p>' + esc(t.formato) + "</p>" +
      "<p>" + esc(t.partidos) + " partidos del " + esc(fecha(t.desde, { day: "numeric", month: "long" })) +
      " al " + esc(fecha(t.hasta, { day: "numeric", month: "long" })) +
      (t.partidosAnterior ? " (" + (t.partidos - t.partidosAnterior) + " más que en 2025)." : ".") + "</p>";

    h += '<h3>Calendario</h3><table class="tabla"><thead><tr><th scope="col">Torneo</th><th scope="col">Desde</th><th scope="col">Final programada</th></tr></thead><tbody>' +
      torneos.tripleCorona.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (c) {
        return "<tr><td>" + esc(c.nombre) + (c.copa ? "<small>" + esc(c.copa) + "</small>" : "") + "</td><td>" +
          (c.inicio ? esc(f(c.inicio)) : "—") + "</td><td>" + (c.finalProgramada ? esc(f(c.finalProgramada)) : "—") + "</td></tr>";
      }).join("") + "</tbody></table>";

    h += '<h3>Clasificados</h3><table class="tabla"><thead><tr><th scope="col">Equipo</th><th scope="col" class="num">HCP</th></tr></thead><tbody>' +
      t.clasificados.map(function (c) {
        var cr = c.equipo ? escudo(c.equipo, true) : '<span class="cr sm" aria-hidden="true">' + esc(iniciales(c.nombre)) + "</span>";
        return '<tr><td><span class="eqc">' + cr + "<span>" + esc(c.nombre) + (c.nota ? "<small>" + esc(c.nota) + "</small>" : "") +
          '</span></span></td><td class="num">' + esc(c.handicap) + "</td></tr>";
      }).join("") + "</tbody></table>";

    var q = t.clasificatorio;
    if (q) {
      h += "<h3>Clasificatorio · " + esc(q.nombre) + "</h3><p>" + esc(q.descripcion) +
        (q.fechas && q.fechas.length ? " Fechas: " + q.fechas.map(f).map(esc).join(", ") + "." : "") + "</p>" +
        '<ul class="chips">' + q.equipos.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>";
    }
    if (t.fuente) h += '<p class="fuente">Fuente: <a href="' + esc(t.fuente) + '" target="_blank" rel="noopener">' + esc(t.fuenteTitulo || t.fuente) + '<span class="sr-only"> (se abre en otra pestaña)</span></a></p>';
    $("info-temporada").innerHTML = h + "</div>";
  }

  // ---------- equipos ----------
  function dibujarEquipos() {
    var lista = Object.keys(equipos).map(function (k) { return equipos[k]; })
      .sort(function (a, b) { return total(b) - total(a) || a.nombre.localeCompare(b.nombre, "es"); });
    $("lista-equipos").innerHTML = lista.map(function (e) {
      return "<details><summary>" + escudo(e.id, true) + "<b>" + esc(e.nombre) + "</b>" +
        (e.jugadores.length ? "<em>" + total(e) + ' <small>HCP</small></em>' : '<em aria-label="sin plantel">—</em>') +
        '</summary><div class="det">' + plantel(e.id) + (e.nota ? '<p class="muted">' + esc(e.nota) + "</p>" : "") + "</div></details>";
    }).join("");
  }

  // ---------- próximos torneos ----------
  function dibujarCalendario() {
    $("calendario").innerHTML = torneos.proximos.map(function (c) {
      return '<li><span class="d">' + esc(fecha(c.fecha, { day: "numeric", month: "short" }).replace(".", "")) + "</span><span>" +
        '<a href="https://www.aapolo.com/torneos/detalle/' + encodeURIComponent(c.aapId) + '" target="_blank" rel="noopener">' + esc(c.nombre) +
        '<span class="sr-only"> (se abre en otra pestaña)</span></a><br><small>' + esc(c.categoria) + "</small></span></li>";
    }).join("");
  }

  // ---------- en vivo ----------
  var timerVivo = null;
  function cargarVivo() {
    return getJSON(VIVO_API).catch(function () { return getJSON(DATOS + "live.json"); })
      .then(dibujarVivo)
      .catch(function () { $("vivo").innerHTML = '<p class="empty">No se pudo cargar el bloque en vivo.</p>'; });
  }
  function dibujarVivo(v) {
    var links = v.links || {};
    var m = v.partido;
    var dot = document.querySelector("#vivo-titulo .dot");
    var h = '<div class="lv">';
    if (m) {
      var mk = marcador(m);
      h += '<div class="live-match"><div class="row">' +
        '<div class="tm a">' + escudo(m.local, true) + '<span class="nm">' + esc(eq(m.local).nombre) + "</span></div>" +
        '<div class="sc">' + mk.txt + "</div>" +
        '<div class="tm b"><span class="nm">' + esc(eq(m.visitante).nombre) + "</span>" + escudo(m.visitante, true) + "</div></div>" +
        '<div class="meta"><span>' + esc(nombreTorneo(m.torneo)) + (m.fase ? " · " + esc(m.fase) : "") + "</span><span>" +
        (m.chukker ? "Chukker " + esc(m.chukker) : "") + "</span></div>" +
        (m.progresion && m.progresion.length ? '<ol class="prog" style="margin-top:8px">' + m.progresion.map(function (x, i) { return "<li><span>" + (i + 1) + "°</span>" + esc(x) + "</li>"; }).join("") + "</ol>" : "") +
        (m.nota ? '<p style="margin:8px 0 0">' + esc(m.nota) + "</p>" : "") +
        "</div>";
      if (dot) dot.classList.add("on");
    } else {
      h += "<p>Ahora no hay un partido en vivo cargado. Los marcadores se actualizan a mano: mirá los partidos en directo y sus repeticiones en Disney+.</p>";
      if (dot) dot.classList.remove("on");
    }
    h += '<div class="acts">' +
      '<a class="btn t" href="' + esc((m && m.transmision) || links.disney || linkTorneoDisney("palermo")) + '" target="_blank" rel="noopener">▶ Ver en Disney+<span class="sr-only"> (se abre en otra pestaña)</span></a>' +
      (links.aap ? '<a class="btn" href="' + esc(links.aap) + '" target="_blank" rel="noopener">AAP Live<span class="sr-only"> (se abre en otra pestaña)</span></a>' : "") +
      "</div>";
    if (v.actualizado) h += '<p class="upd">Actualizado: ' + esc(hora(v.actualizado)) + " (hora argentina)</p>";
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
    function etiqueta() { b.setAttribute("aria-label", oscuro() ? "Cambiar a modo claro" : "Cambiar a modo oscuro"); }
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
        box.innerHTML = '<span class="ad-label">Publicidad</span><ins class="adsbygoogle" style="display:block" data-ad-client="' +
          esc(a.cliente) + '" data-ad-slot="' + esc(slot) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
        box.hidden = false;
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      });
    }).catch(function () {});
  }

  // ---------- arranque ----------
  prepararTema();
  prepararAnuncios();
  Promise.all([getJSON(DATOS + "teams.json"), getJSON(DATOS + "matches.json"), getJSON(DATOS + "tournaments.json")])
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
        ? "Abriste el archivo con doble clic. Para que carguen los datos, iniciá el servidor local: en PowerShell, dentro de la carpeta, corré <code>.\\iniciar.ps1</code>."
        : "No se pudieron cargar los datos (" + esc(err.message) + "). Revisá que los archivos de data/ sean JSON válido.";
      $("lista").innerHTML = '<p class="empty">' + msg + "</p>";
      $("tri").innerHTML = "";
      $("vivo").innerHTML = "";
    });
})();

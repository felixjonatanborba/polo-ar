/* PoloAR · pantalla de equipos (estilo HLTV).
   equipos.html           → grilla con todos los equipos
   equipos.html?id=<id>   → ficha del equipo
   Todo sale de data/teams.json, data/matches.json y data/tournaments.json. */
(function () {
  "use strict";

  var equipos = {}, partidos = [], torneos = { tripleCorona: [] };
  // Idiomas: t() traduce textos fijos y d() textos de los datos (ver js/i18n.js).
  var I = window.PoloI18n || { t: function (k) { return k; }, d: function (s) { return s; }, locale: function () { return "es-AR"; }, listo: function () { return Promise.resolve(); } };
  var t = I.t, d = I.d;

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
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(I.locale(), opts || { day: "numeric", month: "short" }).replace(".", "");
  }
  function eq(id) { return equipos[id] || { id: id, nombre: id, escudo: null, jugadores: [] }; }
  function total(e) { return e.jugadores.reduce(function (s, j) { return s + (+j.handicap || 0); }, 0); }
  function iniciales(n) {
    var w = n.replace(/-/g, " ").split(/\s+/).filter(Boolean);
    return ((w[0] || "?")[0] + ((w[1] || w[0] || "?")[w[1] ? 0 : 1] || "")).toUpperCase();
  }
  function escudo(id, clase) {
    var e = eq(id), c = "cr " + (clase || "") + (e.escudoFondoClaro ? " lt" : "");
    var ini = esc(iniciales(e.nombre));
    if (e.escudo) return '<span class="' + c + '" data-ini="' + ini + '"><img src="' + esc(e.escudo) + '" alt="" width="96" height="96" decoding="async"></span>';
    return '<span class="' + c + '" aria-hidden="true">' + ini + "</span>";
  }
  document.addEventListener("error", function (ev) {
    var img = ev.target;
    if (img.tagName === "IMG" && img.parentNode && img.parentNode.classList.contains("pl-avatar")) {
      var a = img.parentNode; a.classList.remove("con-foto"); a.textContent = a.getAttribute("data-ini"); return;
    }
    if (img.tagName === "IMG" && img.parentNode && img.parentNode.classList.contains("cr")) {
      var s = img.parentNode; s.classList.remove("lt"); s.textContent = s.getAttribute("data-ini");
    }
  }, true);
  function torneo(id) { return torneos.tripleCorona.filter(function (t) { return t.id === id; })[0] || { id: id, nombre: id, corto: id }; }

  // Partido visto desde un equipo: rival, goles propios/ajenos, ganó o no.
  function desde(m, id) {
    var local = m.local === id;
    var gf = local ? m.golesLocal : m.golesVisitante, gc = local ? m.golesVisitante : m.golesLocal;
    var hay = gf != null && gc != null;
    var gano = hay ? gf > gc : (m.ganador === (local ? "local" : "visitante"));
    return { m: m, rival: local ? m.visitante : m.local, gf: gf, gc: gc, hay: hay, gano: gano };
  }
  function partidosDe(id) {
    return partidos.filter(function (m) { return m.local === id || m.visitante === id; })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; })
      .map(function (m) { return desde(m, id); });
  }
  function resumen(lista) {
    var r = { pj: lista.length, pg: 0, pp: 0, gf: 0, gc: 0, conGoles: 0 };
    lista.forEach(function (x) {
      if (x.gano) r.pg++; else r.pp++;
      if (x.hay) { r.gf += x.gf; r.gc += x.gc; r.conGoles++; }
    });
    return r;
  }
  function forma(lista, n) {
    return '<span class="forma" aria-label="' + esc(t("eq.ultimos.aria")) + '">' + lista.slice(0, n).map(function (x) {
      return '<i class="' + (x.gano ? "g" : "p") + '" title="' + (x.gano ? t("eq.gano") : t("eq.perdio")) + " vs. " + esc(eq(x.rival).nombre) + '">' + (x.gano ? t("eq.g") : t("eq.p")) + "</i>";
    }).join("") + "</span>";
  }

  // ---------- grilla de equipos ----------
  function grilla() {
    document.title = t("eq.titulo");
    var lista = Object.keys(equipos).map(function (k) { return equipos[k]; })
      .sort(function (a, b) { return total(b) - total(a) || a.nombre.localeCompare(b.nombre, "es"); });
    var h = '<section class="eq-head-list"><h1>' + t("sec.equipos") + '</h1><p class="muted">' + t("eq.intro") + '</p></section><div class="eq-grid">';
    lista.forEach(function (e) {
      var ps = partidosDe(e.id), r = resumen(ps);
      h += '<a class="eq-card" href="equipos.html?id=' + encodeURIComponent(e.id) + '">' + escudo(e.id, "xl") +
        '<div class="eq-card-info"><h2>' + esc(e.nombre) + "</h2>" +
        '<div class="eq-card-meta"><span><b>' + (e.jugadores.length ? total(e) : "—") + "</b> HCP</span><span><b>" + r.pg + "-" + r.pp + "</b> " + t("eq.gp") + "</span></div>" +
        (ps.length ? forma(ps, 5) : '<span class="muted">' + t("eq.sin.partidos") + "</span>") + "</div></a>";
    });
    $("vista").innerHTML = h + "</div>";
  }

  // ---------- ficha de un equipo ----------
  function ficha(id) {
    var e = equipos[id];
    if (!e) { $("vista").innerHTML = '<p class="empty">' + t("eq.no.encontre") + ' <a href="equipos.html">' + t("eq.ver.todos") + "</a>.</p>"; return; }
    document.title = e.nombre + " · PoloAR";
    var ps = partidosDe(id), r = resumen(ps);
    var ranking = Object.keys(equipos).map(function (k) { return equipos[k]; })
      .sort(function (a, b) { return total(b) - total(a); }).map(function (x) { return x.id; }).indexOf(id) + 1;

    var h = '<a class="volver" href="equipos.html">' + t("eq.volver") + "</a>";

    // Encabezado
    h += '<section class="eq-hero">' + escudo(id, "xxl") + '<div class="eq-hero-txt">' +
      '<div class="eq-kicker">' + t("triple") + "</div><h1>" + esc(e.nombre) + "</h1>" +
      (e.nombreAAP && e.nombreAAP !== e.nombre ? '<div class="muted">' + t("eq.en.aap") + esc(e.nombreAAP) + "</div>" : "") +
      '<div class="eq-stats">' +
      stat(e.jugadores.length ? total(e) : "—", t("eq.handicap")) +
      stat("#" + ranking, t("eq.por.handicap")) +
      stat(r.pg + "-" + r.pp, t("eq.ganados")) +
      stat(r.conGoles ? (r.gf - r.gc > 0 ? "+" : "") + (r.gf - r.gc) : "—", t("eq.dif")) +
      "</div>" + (ps.length ? '<div class="eq-forma">' + t("eq.ultimos") + forma(ps, 5) + "</div>" : "") + "</div></section>";

    // Plantel
    h += '<section class="card"><h2 class="card-title">' + t("eq.plantel") + "</h2>";
    if (e.jugadores.length) {
      h += '<div class="pl-grid">' + e.jugadores.map(function (j) {
        var av = j.foto
          ? '<span class="pl-avatar con-foto" data-ini="' + esc(iniciales(j.nombre)) + '"><img src="' + esc(j.foto) + '" alt="" loading="lazy"></span>'
          : '<span class="pl-avatar" aria-hidden="true">' + esc(iniciales(j.nombre)) + "</span>";
        return '<div class="pl-card">' + av + '<div class="pl-nombre">' + esc(j.nombre) +
          '</div><div class="pl-hcp"><b>' + esc(j.handicap) + "</b> " + t("eq.hcp") + "</div></div>";
      }).join("") + "</div>";
    } else {
      h += '<p class="empty">' + t("sin.plantel") + ".</p>";
    }
    if (e.nota) h += '<p class="eq-nota">' + esc(d(e.nota)) + "</p>";
    h += "</section>";

    // Rendimiento por torneo
    h += '<section class="card"><h2 class="card-title">' + t("eq.rendimiento") + '</h2><table class="tabla eq-tabla"><thead><tr><th scope="col">' + t("col.torneo") + '</th><th scope="col">' + t("eq.resultado") + '</th><th scope="col" class="num">' + t("eq.pj") + '</th><th scope="col" class="num">' + t("eq.gp") + '</th><th scope="col" class="num opt">' + t("eq.goles") + '</th></tr></thead><tbody>';
    torneos.tripleCorona.slice().sort(function (a, b) { return a.orden - b.orden; }).forEach(function (t) {
      var lt = ps.filter(function (x) { return x.m.torneo === t.id; }), rt = resumen(lt);
      var res = t.campeon === id ? '<span class="pill oro">' + I.t("eq.campeon") + "</span>" :
        t.subcampeon === id ? '<span class="pill plata">' + I.t("eq.subcampeon") + "</span>" :
        !lt.length ? '<span class="muted">' + I.t("eq.no.jugo") + "</span>" :
        t.estado === "en juego" ? '<span class="pill vivo">' + I.t("en.juego") + "</span>" :
        '<span class="muted">' + esc(d(lt[0].m.fase.split(" · ")[0])) + "</span>";
      h += "<tr><td>" + esc(d(t.nombre)) + "</td><td>" + res + '</td><td class="num">' + rt.pj + '</td><td class="num">' + rt.pg + "-" + rt.pp +
        '</td><td class="num opt">' + (rt.conGoles ? rt.gf + "-" + rt.gc : "—") + "</td></tr>";
    });
    h += "</tbody></table></section>";

    // Resultados
    h += '<section class="card"><h2 class="card-title">' + I.t("sec.resultados") + "</h2>";
    if (!ps.length) h += '<p class="empty">' + I.t("eq.sin.resultados") + "</p>";
    else h += '<ul class="eq-res">' + ps.map(function (x) {
      var t = torneo(x.m.torneo);
      return '<li><a href="./?torneo=' + encodeURIComponent(x.m.torneo) + "#" + encodeURIComponent(x.m.id) + '">' +
        '<span class="res-f">' + esc(fecha(x.m.fecha)) + "</span>" +
        '<span class="pill ' + (x.gano ? "g" : "p") + '">' + (x.gano ? I.t("eq.g") : I.t("eq.p")) + "</span>" +
        '<span class="res-rival">' + escudo(x.rival, "sm") + '<span><span class="muted">vs.</span> ' + esc(eq(x.rival).nombre) +
        '<small>' + esc(t.corto || d(t.nombre)) + " · " + esc(d(x.m.fase)) + "</small></span></span>" +
        '<span class="res-sc">' + (x.hay ? x.gf + " – " + x.gc : "—") + "</span></a>" +
        (x.m.resumen ? '<a class="btn yt res-yt" href="' + esc(x.m.resumen) + '" target="_blank" rel="noopener">' + I.t("eq.resumen") + '<span class="sr-only"> (YouTube)</span></a>' : "") +
        "</li>";
    }).join("") + "</ul>";
    h += "</section>";

    $("vista").innerHTML = h;
  }
  function stat(v, l) { return '<div class="st"><b>' + esc(v) + "</b><span>" + esc(l) + "</span></div>"; }

  // ---------- tema ----------
  (function () {
    var r = document.documentElement, b = $("tema");
    if (!b) return;
    function oscuro() { var t = r.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
    function etiqueta() { b.setAttribute("aria-label", oscuro() ? I.t("tema.claro") : I.t("tema.oscuro")); }
    b.addEventListener("click", function () {
      var n = oscuro() ? "light" : "dark"; r.setAttribute("data-theme", n);
      try { localStorage.setItem("polo-tema", n); } catch (e) {}
      etiqueta();
    });
    etiqueta();
  })();

  Promise.all([getJSON("data/teams.json"), getJSON("data/matches.json"), getJSON("data/tournaments.json"), I.listo()]).then(function (r) {
    r[0].equipos.forEach(function (e) { equipos[e.id] = e; });
    partidos = r[1].partidos; torneos = r[2];
    var id = new URLSearchParams(location.search).get("id");
    if (id) ficha(id); else grilla();
    window.scrollTo(0, 0);
  }).catch(function (err) {
    $("vista").innerHTML = '<p class="empty">' + (location.protocol === "file:" ? t("eq.error.archivo") : t("error.datos", { e: esc(err.message) })) + "</p>";
  });
})();

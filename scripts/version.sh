#!/bin/sh
# Uso interno: cambia el número de versión de CSS y JS para que los navegadores bajen la versión nueva.
V=$(date +%Y%m%d%H%M)
sed -i -E "s#css/styles\.css(\?v=[0-9]+)?\"#css/styles.css?v=$V\"#; s#js/app\.js(\?v=[0-9]+)?\"#js/app.js?v=$V\"#" index.html privacidad.html

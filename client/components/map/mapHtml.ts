import type { LatLng } from "@shared/fleet";

// Map tiles. The default dark style comes from CARTO (OpenStreetMap data), free
// for low traffic. For production traffic use your own key, e.g. MapTiler/Stadia:
// EXPO_PUBLIC_MAP_TILE_URL=https://tiles.example.com/{z}/{x}/{y}.png?key=...
const TILE_URL =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ||
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  process.env.EXPO_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
export const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

/**
 * A self-contained Leaflet page. The app talks to it with messages:
 * it sends the whole map state (markers, route, camera) and gets back
 * "ready" and the map centre in pick mode.
 */
export function buildMapHtml(center: LatLng, zoom: number): string {
  const config = JSON.stringify({
    center: [center.lat, center.lng],
    zoom,
    tileUrl: TILE_URL,
    attribution: TILE_ATTRIBUTION,
  });

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${LEAFLET_CSS}" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0e0e10; }
  body { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; font-family: -apple-system, system-ui, sans-serif; }
  .leaflet-container { background: #0e0e10; }
  .leaflet-control-attribution { background: rgba(10,10,11,0.6) !important; color: #6c6c72 !important; font-size: 9px; }
  .leaflet-control-attribution a { color: #9a9aa0 !important; }
  .mk { position: relative; }
  .car { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transition: transform 0.4s linear; }
  .car svg { filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6)); }
  .pin-pickup { width: 18px; height: 18px; border-radius: 50%; background: #f5f5f7; box-shadow: 0 0 0 4px rgba(245,245,247,0.25), 0 2px 6px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
  .pin-pickup::after { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #0a0a0b; }
  .pin-destination { width: 16px; height: 16px; background: #f5f5f7; box-shadow: 0 0 0 4px rgba(245,245,247,0.25), 0 2px 6px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
  .pin-destination::after { content: ""; width: 6px; height: 6px; background: #0a0a0b; }
  .me { width: 16px; height: 16px; border-radius: 50%; background: #0a84ff; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(10,132,255,0.25); }
  #center-pin { position: absolute; left: 50%; top: 50%; z-index: 1000; pointer-events: none; display: none; transform: translate(-50%, -100%); }
  #center-pin .head { width: 26px; height: 26px; border-radius: 50%; background: #f5f5f7; border: 7px solid #0a0a0b; box-sizing: border-box; box-shadow: 0 3px 10px rgba(0,0,0,0.6); }
  #center-pin .stem { width: 3px; height: 16px; background: #f5f5f7; margin: 0 auto; border-radius: 0 0 2px 2px; }
  #center-dot { position: absolute; left: 50%; top: 50%; z-index: 999; width: 8px; height: 4px; border-radius: 50%; background: rgba(0,0,0,0.5); transform: translate(-50%, -50%); display: none; pointer-events: none; }
  #offline { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; text-align: center; color: #9a9aa0; font-size: 14px; padding: 24px; z-index: 2000; }
</style>
</head>
<body>
<div id="map"></div>
<div id="center-dot"></div>
<div id="center-pin"><div class="head"></div><div class="stem"></div></div>
<div id="offline">Nie udało się wczytać mapy.<br/>Sprawdź połączenie z internetem.</div>
<script>
  var CONFIG = ${config};
  function send(msg) {
    var data = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
    else if (window.parent !== window) window.parent.postMessage(JSON.stringify({ __rideMap: true, msg: msg }), "*");
  }
  window.onerror = function (m) { send({ type: "error", message: String(m) }); };
</script>
<script src="${LEAFLET_JS}" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function () {
  if (!window.L) {
    document.getElementById("offline").style.display = "flex";
    send({ type: "error", message: "leaflet-not-loaded" });
    return;
  }
  var map = L.map("map", { zoomControl: false, attributionControl: true }).setView(CONFIG.center, CONFIG.zoom);
  map.attributionControl.setPrefix(false);
  L.tileLayer(CONFIG.tileUrl, { maxZoom: 19, subdomains: "abcd", attribution: CONFIG.attribution, detectRetina: true }).addTo(map);

  var markers = {};
  var routeLayer = null;
  var routeCasing = null;
  var lastFitKey = null;
  var pickMode = false;
  var padding = { top: 0, bottom: 0, left: 0, right: 0 };

  function carSvg(highlight) {
    var body = highlight ? "#F5F5F7" : "#B8B8BE";
    var glass = "#1C1C1F";
    var size = highlight ? 30 : 24;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24">' +
      '<rect x="6" y="2" width="12" height="20" rx="4.5" fill="' + body + '"/>' +
      '<path d="M8 8.2 Q12 6.6 16 8.2 L15.2 11 Q12 10.2 8.8 11 Z" fill="' + glass + '"/>' +
      '<path d="M8.8 17 Q12 17.8 15.2 17 L15.8 19 Q12 20 8.2 19 Z" fill="' + glass + '"/>' +
      '<rect x="6.6" y="2.6" width="2.2" height="1.2" rx="0.6" fill="#FFF7D6"/>' +
      '<rect x="15.2" y="2.6" width="2.2" height="1.2" rx="0.6" fill="#FFF7D6"/>' +
      '<rect x="6.8" y="20.4" width="2" height="1" rx="0.5" fill="#E82127"/>' +
      '<rect x="15.2" y="20.4" width="2" height="1" rx="0.5" fill="#E82127"/>' +
      "</svg>";
  }

  function iconFor(m) {
    if (m.kind === "car") {
      var s = m.highlight ? 40 : 34;
      return L.divIcon({ className: "mk", iconSize: [s, s], iconAnchor: [s / 2, s / 2],
        html: '<div class="car" style="width:' + s + 'px;height:' + s + 'px;transform:rotate(' + (m.heading || 0) + 'deg)">' + carSvg(m.highlight) + "</div>" });
    }
    if (m.kind === "me") return L.divIcon({ className: "mk", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="me"></div>' });
    if (m.kind === "pickup") return L.divIcon({ className: "mk", iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="pin-pickup"></div>' });
    return L.divIcon({ className: "mk", iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="pin-destination"></div>' });
  }

  // Glide cars between positions instead of jumping
  function animateTo(entry, lat, lng) {
    var from = entry.marker.getLatLng();
    var start = performance.now();
    var duration = 900;
    if (entry.raf) cancelAnimationFrame(entry.raf);
    function frame(now) {
      var t = Math.min(1, (now - start) / duration);
      entry.marker.setLatLng([from.lat + (lat - from.lat) * t, from.lng + (lng - from.lng) * t]);
      if (t < 1) entry.raf = requestAnimationFrame(frame);
    }
    entry.raf = requestAnimationFrame(frame);
  }

  function setMarkers(list) {
    var seen = {};
    list.forEach(function (m) {
      var key = m.kind + ":" + m.id;
      seen[key] = true;
      var entry = markers[key];
      var sig = m.kind + (m.highlight ? "h" : "");
      if (!entry || entry.sig !== sig) {
        if (entry) map.removeLayer(entry.marker);
        var marker = L.marker([m.lat, m.lng], { icon: iconFor(m), interactive: false, keyboard: false,
          zIndexOffset: m.kind === "car" ? (m.highlight ? 1000 : 500) : 0 }).addTo(map);
        markers[key] = { marker: marker, sig: sig };
        return;
      }
      if (m.kind === "car") {
        animateTo(entry, m.lat, m.lng);
        var el = entry.marker.getElement();
        var car = el && el.querySelector(".car");
        if (car) car.style.transform = "rotate(" + (m.heading || 0) + "deg)";
      } else {
        entry.marker.setLatLng([m.lat, m.lng]);
      }
    });
    Object.keys(markers).forEach(function (key) {
      if (!seen[key]) { map.removeLayer(markers[key].marker); delete markers[key]; }
    });
  }

  function setRoute(route) {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    if (routeCasing) { map.removeLayer(routeCasing); routeCasing = null; }
    if (!route || route.length < 2) return;
    routeCasing = L.polyline(route, { color: "#0a0a0b", weight: 8, opacity: 0.8, interactive: false }).addTo(map);
    routeLayer = L.polyline(route, { color: "#f5f5f7", weight: 4, opacity: 0.95, interactive: false }).addTo(map);
  }

  function setPickMode(on) {
    pickMode = on;
    document.getElementById("center-pin").style.display = on ? "block" : "none";
    document.getElementById("center-dot").style.display = on ? "block" : "none";
    if (on) reportCenter();
  }

  // The visible area excludes the padded overlays, so the pin sits in its middle
  function visibleCenter() {
    var size = map.getSize();
    var x = (size.x + (padding.left || 0) - (padding.right || 0)) / 2;
    var y = (size.y + (padding.top || 0) - (padding.bottom || 0)) / 2;
    return map.containerPointToLatLng([x, y]);
  }

  function placePin() {
    var size = map.getSize();
    var x = (size.x + (padding.left || 0) - (padding.right || 0)) / 2;
    var y = (size.y + (padding.top || 0) - (padding.bottom || 0)) / 2;
    ["center-pin", "center-dot"].forEach(function (id) {
      var el = document.getElementById(id);
      el.style.left = x + "px";
      el.style.top = y + "px";
    });
  }

  function reportCenter() {
    var c = visibleCenter();
    send({ type: "center", lat: c.lat, lng: c.lng });
  }

  function fit(points) {
    var opts = {
      paddingTopLeft: [(padding.left || 0) + 48, (padding.top || 0) + 48],
      paddingBottomRight: [(padding.right || 0) + 48, (padding.bottom || 0) + 48],
      maxZoom: 16,
      animate: true,
    };
    if (points.length === 1) {
      var p = L.latLng(points[0].lat, points[0].lng);
      var zoom = Math.max(map.getZoom(), 15);
      // Offset the centre so the point lands in the middle of the visible area
      var target = map.project(p, zoom).subtract([((padding.left || 0) - (padding.right || 0)) / 2, ((padding.top || 0) - (padding.bottom || 0)) / 2]);
      map.setView(map.unproject(target, zoom), zoom, { animate: true });
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map(function (q) { return [q.lat, q.lng]; })), opts);
    }
  }

  window.__setMapState = function (state) {
    padding = state.padding || padding;
    placePin();
    setMarkers(state.markers || []);
    setRoute(state.route);
    if (state.pickMode !== pickMode) setPickMode(!!state.pickMode);
    if (state.fitKey && state.fitKey !== lastFitKey) {
      lastFitKey = state.fitKey;
      fit(state.fitPoints || []);
    }
  };

  map.on("moveend", function () { if (pickMode) reportCenter(); });
  map.on("resize", placePin);

  window.addEventListener("message", function (e) {
    var data = e.data;
    if (typeof data === "string") { try { data = JSON.parse(data); } catch (err) { return; } }
    if (data && data.__rideMapState) window.__setMapState(data.state);
  });
  document.addEventListener("message", function (e) {
    try { var data = JSON.parse(e.data); if (data.__rideMapState) window.__setMapState(data.state); } catch (err) {}
  });

  send({ type: "ready" });
})();
</script>
</body>
</html>`;
}

// Interactive course map: the organizer's map as a zoomable base, both loops drawn on top,
// tappable checkpoints, "where am I", and Google Maps hand-offs for getting to the start.
(function () {
  // Leaflet claims window.L, which the site already uses for its EN/TH helper; hand it back.
  const LF = window.L && window.L.noConflict ? window.L.noConflict() : null;
  const C = window.COURSE;
  const H = C.image.h, W = C.image.w;
  const COLORS = { '10K': '#1E6FE0', '5K': '#F5B800' };
  const PLACE = 'Benjasiri Park, Sukhumvit Rd, Bangkok';
  const toLL = ([x, y]) => [H - y, x];
  let map, active = '10K', me;
  const lines = {}, cps = {};

  const gm = {
    toStart: () => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(PLACE)}`,
    course: k => {
      const pts = C.routes[k].cps.map(c => c.ll.join(',')).join('|');
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(PLACE)}&destination=${encodeURIComponent(PLACE)}&waypoints=${encodeURIComponent(pts)}&travelmode=walking`;
    },
    point: ll => `https://www.google.com/maps/search/?api=1&query=${ll.join(',')}`
  };

  // Lat/lng -> image pixel, using the same Web Mercator fit that produced the `ll` values.
  function toPx(lat, lon) {
    const m = 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    return [C.fit.K * lon + C.fit.a, C.fit.b - C.fit.K * m];
  }
  function km(a, b) {
    const r = Math.PI / 180, h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  const sfIcon = () => LF.divIcon({ className: 'cpsfw', html: `<span class="cp-sf">${L('START · FINISH', 'ปล่อยตัว · เส้นชัย')}</span>`, iconSize: [130, 28], iconAnchor: [65, 34] });
  function cpIcon(k, n) {
    return LF.divIcon({ className: '', html: `<span class="cp cp${k}">${n}</span>`, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14] });
  }
  function popupHtml(k, n) {
    const r = (typeof ROUTES !== 'undefined' ? ROUTES[k] : []).find(x => x[2] === n);
    const c = C.routes[k].cps.find(x => x.n === n);
    const name = r ? `${esc(L(r[1], r[0]))}<small>${esc(L(r[0], r[1]))}</small>` : '';
    return `<div class="cpop"><span class="chip">${k} · ${n}</span><b>${name}</b>${c ? `<a href="${gm.point(c.ll)}" target="_blank" rel="noopener">${L('Open in Google Maps', 'เปิดใน Google Maps')}</a>` : ''}</div>`;
  }

  function init() {
    const el = document.getElementById('cmap');
    if (!el || !LF || !C) return;
    el.innerHTML = '';
    el.classList.add('live');
    const touch = matchMedia('(pointer: coarse)').matches;
    map = LF.map(el, { crs: LF.CRS.Simple, minZoom: -2, maxZoom: 1, zoomSnap: 0.25, zoomDelta: 0.5, scrollWheelZoom: false, dragging: !touch, attributionControl: true, maxBoundsViscosity: 0.8 });
    const bounds = [[0, 0], [H, W]];
    LF.imageOverlay(C.image.src, bounds, { className: 'cmap-img' }).addTo(map);
    map.setMaxBounds(LF.latLngBounds(bounds).pad(0.08));
    map.attributionControl.setPrefix(false).addAttribution('Map data © Google · course by the organizer');

    for (const k of ['5K', '10K']) {
      const pts = C.routes[k].line.map(toLL);
      const g = LF.layerGroup().addTo(map);
      LF.polyline(pts, { color: '#fff', weight: 9, opacity: 0.9, lineJoin: 'round', interactive: false }).addTo(g);
      const main = LF.polyline(pts, { color: COLORS[k], weight: 5, lineJoin: 'round' }).addTo(g);
      LF.polyline(pts, { color: '#fff', weight: 2, dashArray: '2 14', className: 'cmap-flow', interactive: false }).addTo(g);
      main.on('click', () => setActive(k));
      lines[k] = { g, main, bounds: main.getBounds() };
      cps[k] = {};
      for (const c of C.routes[k].cps) {
        cps[k][c.n] = LF.marker(toLL(c.px), { icon: cpIcon(k, c.n), keyboard: true, title: `${k} checkpoint ${c.n}` })
          .bindPopup(() => popupHtml(k, c.n), { closeButton: false }).addTo(g)
          .on('click', () => { setActive(k, false); highlight(k, c.n); });
      }
    }
    const sf = LF.marker(toLL(C.start.px), {
      icon: sfIcon(),
      zIndexOffset: 1000
    }).addTo(map).bindPopup(() => `<div class="cpop"><b>${L('Start and finish', 'จุดปล่อยตัวและเส้นชัย')}<small>${L('Benjasiri Park, Sukhumvit · BTS Phrom Phong', 'อุทยานเบญจสิริ สุขุมวิท · BTS พร้อมพงษ์')}</small></b><a href="${gm.toStart()}" target="_blank" rel="noopener">${L('Directions in Google Maps', 'นำทางด้วย Google Maps')}</a></div>`, { closeButton: false });
    cps.start = sf;

    map.fitBounds(lines['10K'].bounds, { padding: [20, 20] });
    map.on('focus click', () => map.scrollWheelZoom.enable());
    map.on('blur mouseout', () => map.scrollWheelZoom.disable());

    if (touch) { // one finger scrolls the page until the runner chooses to move the map; pinch always zooms
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cmap-unlock'; b.textContent = L('Tap to move the map', 'แตะเพื่อเลื่อนแผนที่');
      b.onclick = () => { map.dragging.enable(); b.remove(); };
      el.appendChild(b);
    }
    document.getElementById('cmapLocate').onclick = locate;
    document.getElementById('cmapReset').onclick = () => { map.closePopup(); map.flyToBounds(lines[active].bounds, { padding: [20, 20], duration: 0.6 }); };
    setActive(active, false);
  }

  function setLinks() {
    const nav = document.getElementById('cmapNav'), crs = document.getElementById('cmapCourse');
    if (nav) nav.href = gm.toStart();
    if (crs) { crs.href = gm.course(active); crs.querySelector('b').textContent = active === '10K' ? '10 KM' : '5 KM'; }
  }

  function setActive(k, fit = true) {
    const changed = k !== active;
    active = k;
    if (changed) window.onCourseRoute?.(k);
    setLinks();
    if (!map) return;
    for (const r of ['5K', '10K']) {
      const on = r === k;
      lines[r].g.eachLayer(l => {
        if (l.setStyle) l.setStyle({ opacity: on ? (l.options.color === '#fff' ? 0.9 : 1) : 0.18 });
        if (l.setOpacity) l.setOpacity(on ? 1 : 0.25);
      });
      if (on) lines[r].g.eachLayer(l => l.bringToFront && l.bringToFront());
    }
    if (fit) map.flyToBounds(lines[k].bounds, { padding: [20, 20], duration: 0.6 });
  }

  function highlight(k, n) {
    document.querySelectorAll('.route li[data-cp]').forEach(li => li.classList.toggle('on', li.closest('.route').dataset.k === k && li.dataset.cp === String(n)));
  }

  function focus(k, n) {
    if (!map) return;
    const m = n === 'S' || n === 'F' ? cps.start : cps[k][n];
    if (!m) return;
    setActive(k, false);
    highlight(k, n);
    map.flyTo(m.getLatLng(), 0, { duration: 0.6 });
    setTimeout(() => m.openPopup(), 650);
    const el = document.getElementById('cmap');
    if (el.getBoundingClientRect().top < 60 || el.getBoundingClientRect().bottom > innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function locate() {
    const btn = document.getElementById('cmapLocate');
    if (!navigator.geolocation) return toast(L('Location is not available on this device.', 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'));
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(pos => {
      btn.disabled = false;
      const { latitude: la, longitude: lo } = pos.coords;
      const [x, y] = toPx(la, lo);
      const dist = km([la, lo], C.start.ll);
      if (x < 0 || y < 0 || x > W || y > H) {
        toast(L(`You are about ${dist.toFixed(1)} km from the start, outside this map. Use "Navigate to start" for directions.`, `คุณอยู่ห่างจุดปล่อยตัวประมาณ ${dist.toFixed(1)} กม. นอกพื้นที่แผนที่ กด "นำทางไปจุดปล่อยตัว" เพื่อดูเส้นทาง`));
        return;
      }
      if (me) me.remove();
      me = LF.marker(toLL([x, y]), { icon: LF.divIcon({ className: '', html: '<span class="me-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000 })
        .addTo(map).bindPopup(L(`You are here · ${dist.toFixed(1)} km from the start`, `คุณอยู่ที่นี่ · ห่างจุดปล่อยตัว ${dist.toFixed(1)} กม.`), { closeButton: false }).openPopup();
      map.flyTo(me.getLatLng(), 0, { duration: 0.6 });
    }, () => { btn.disabled = false; toast(L('Allow location access to see where you are on the course.', 'กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อดูตำแหน่งของคุณบนเส้นทาง')); }, { enableHighAccuracy: true, timeout: 10000 });
  }

  window.CourseMap = { setActive, focus, refresh: () => { if (map) { map.closePopup(); cps.start.setIcon(sfIcon()); setActive(active, false); } setLinks(); } };
  document.addEventListener('DOMContentLoaded', () => { setLinks(); init(); });
})();

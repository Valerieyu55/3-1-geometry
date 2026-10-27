/* ============================================================
 * 3-1 數位智慧課本：自訂線條圖示（取代 emoji）
 * 用法：GI('cube') 回傳 SVG 字串；React 頁面用 <Gi n="cube" />
 * 風格：24×24、1.7px 圓角線條、主色跟隨文字顏色、青色重點線
 * ============================================================ */
(function () {
  var P = {
    // ── 幾何形體 ──
    cube: '<path d="M12 2.8l8.2 4.7v9L12 21.2l-8.2-4.7v-9z"/><path d="M3.8 7.5L12 12.2l8.2-4.7"/><path class="a" d="M12 12.2v9"/>',
    cylinder: '<ellipse cx="12" cy="5.5" rx="7" ry="2.6"/><path d="M5 5.5v13c0 1.45 3.13 2.6 7 2.6s7-1.15 7-2.6v-13"/><path class="d" d="M5 18.5c0-1.45 3.13-2.6 7-2.6s7 1.15 7 2.6"/>',
    cone: '<path d="M5 18.4L12 2.8l7 15.6"/><ellipse cx="12" cy="18.4" rx="7" ry="2.6"/><path class="a d" d="M12 2.8v15.6"/>',
    sphere: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="3.4"/><path class="a d" d="M12 3c-2.2 2.4-3.3 5.4-3.3 9s1.1 6.6 3.3 9"/>',
    prism: '<path d="M3 18l4.5-9 4.5 9z"/><path d="M7.5 9l9-3 4.5 9"/><path class="a" d="M12 18l9-3"/><path class="d" d="M3 18l9-3 4.5-9M12 15h9"/>',
    tetra: '<path d="M12 3L3.4 17.6 14.6 21z"/><path d="M12 3l8.6 13.2-6 4.8"/><path class="d a" d="M3.4 17.6l17.2-1.4"/>',
    pyramid: '<path d="M12 2.8L3 16.2l6 4.6 12-3.2z"/><path d="M12 2.8L9 20.8"/><path class="d" d="M3 16.2l12-3.2 6 4.6M12 2.8l3 10.2"/>',
    triangle: '<path d="M12 3.5l9 16H3z"/><circle class="a f" cx="12" cy="3.5" r="1.4"/><circle class="a f" cx="21" cy="19.5" r="1.4"/><circle class="a f" cx="3" cy="19.5" r="1.4"/>',
    vertex: '<path d="M12 12L4 6.5M12 12l8-5.5M12 12v9"/><circle class="a f" cx="12" cy="12" r="2.6"/><circle cx="4" cy="6.5" r="1.3"/><circle cx="20" cy="6.5" r="1.3"/><circle cx="12" cy="21" r="1.3"/>',
    gem: '<path d="M6.5 3.5h11l4 5.5L12 21 2.5 9z"/><path d="M2.5 9h19"/><path class="a" d="M9 3.5L12 9l3-5.5M12 9v12"/>',
    setsquare: '<path d="M4 20V4l16 16z"/><path class="a" d="M8 16v-4.4l4.4 4.4z"/><path d="M4 8h2M4 12h2M8 20v-2M12 20v-2"/>',
    ruler: '<path d="M3.2 16.8L16.8 3.2l4 4L7.2 20.8z"/><path class="a" d="M7.2 12.8l2 2M10.2 9.8l1.6 1.6M13.2 6.8l2 2"/>',

    // ── 概念與提示 ──
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.1h5V16c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/><path class="a" d="M12 7.2v3.6M10.2 9h3.6"/>',
    book: '<path d="M3 5.6c2.6-1.1 5.6-1 9 1v13.2c-3.4-2-6.4-2.1-9-1z"/><path d="M21 5.6c-2.6-1.1-5.6-1-9 1v13.2c3.4-2 6.4-2.1 9-1z"/><path class="a" d="M6 9.2c1.4-.3 2.9-.1 4 .5M6 12.4c1.4-.3 2.9-.1 4 .5"/>',
    key: '<circle cx="8" cy="15.5" r="4.2"/><path d="M11 12.5L20 3.5"/><path class="a" d="M16.8 6.7l2.6 2.6M14.6 8.9l1.8 1.8"/>',
    target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle class="a f" cx="12" cy="12" r="1.6"/>',
    pencil: '<path d="M4 20l1.2-4.6L16 4.6l3.4 3.4L8.6 18.8z"/><path class="a" d="M14 6.6l3.4 3.4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path class="a" d="M7.8 12.4l2.9 2.9 5.6-6"/>',
    cross: '<circle cx="12" cy="12" r="9"/><path class="a" d="M9 9l6 6M15 9l-6 6"/>',
    spark: '<path class="a" d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><path d="M5.3 5.3l2.6 2.6M16.1 16.1l2.6 2.6M5.3 18.7l2.6-2.6M16.1 7.9l2.6-2.6"/><circle cx="12" cy="12" r="2.6"/>',
    cap: '<path d="M2 9.2L12 4.4l10 4.8-10 4.8z"/><path d="M6 11.2v4.6c3.3 2.3 8.7 2.3 12 0v-4.6"/><path class="a" d="M22 9.2v5.8"/>',
    hash: '<path d="M4 9h16M4 15h16"/><path class="a" d="M10 3.5L8 20.5M16 3.5l-2 17"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path class="a" d="M5.6 5.6l12.8 12.8"/>',
    link: '<path d="M10 14a4 4 0 0 1 0-5.6l3-3a4 4 0 0 1 5.6 5.6l-1.6 1.6"/><path class="a" d="M14 10a4 4 0 0 1 0 5.6l-3 3a4 4 0 0 1-5.6-5.6l1.6-1.6"/>',
    pin: '<path class="a" d="M12 21.5v-6"/><path d="M8 3h8M9.2 3v5.2L6 12.4h12l-3.2-4.2V3"/>',
    thought: '<path d="M7.2 15.5a4.2 4.2 0 0 1-.6-8.3 5.2 5.2 0 0 1 10-1.1 4.3 4.3 0 0 1 1.2 8.4l-.4 1z"/><circle class="a" cx="6" cy="19" r="1.3"/><circle class="a" cx="3.4" cy="21.6" r=".7"/>',
    arrow: '<path d="M4 12h15"/><path class="a" d="M14 6l6 6-6 6"/>',
    swap: '<path d="M4 8h15M15 4l4 4-4 4"/><path class="a" d="M20 16H5M9 12l-4 4 4 4"/>',
    trophy: '<path d="M8 3.5h8V9a4 4 0 0 1-8 0z"/><path d="M8 5.5H5a3 3 0 0 0 3 4.4M16 5.5h3a3 3 0 0 1-3 4.4"/><path class="a" d="M12 13v4M8.5 21h7M9.6 17h4.8"/>',
    cart: '<path d="M2.5 4h2.2l2.6 11.2h10.4L20.5 8H6"/><circle class="a" cx="9" cy="19.5" r="1.4"/><circle class="a" cx="16.6" cy="19.5" r="1.4"/>',

    // ── 生活情境 ──
    overpass: '<path class="a" d="M8.5 21L10.8 3M15.5 21L13.2 3"/><path d="M2 8.5h20v4.5H2z"/><path d="M5 13v4M19 13v4"/>',
    stairs: '<path d="M3 21h4.2v-4h4v-4h4V9h4V5H21"/><path class="a" d="M4.2 14.2L18.8 2.8"/><path d="M7.2 11.8V17M15.2 5.6V9"/>',
    door: '<path d="M5 21V3h14v18M3 21h18"/><path class="a" d="M5 3l7.4 2.6v17.2L5 21"/><circle cx="10.6" cy="13" r=".9"/>',
    rail: '<path d="M8.6 3L5.2 21M15.4 3l3.4 18"/><path class="a" d="M7.8 7h8.4M7 11.6h10M6.2 16.2h11.6"/>',
    scissors: '<circle cx="6" cy="6.5" r="2.8"/><circle cx="6" cy="17.5" r="2.8"/><path d="M8.4 8L20 18.5M8.4 16L20 5.5"/><circle class="a f" cx="12.6" cy="12" r="1.1"/>',
    layers: '<path d="M12 3l9 4.6-9 4.6-9-4.6z"/><path class="a" d="M3 12.2l9 4.6 9-4.6"/><path d="M3 16.6l9 4.6 9-4.6"/>',
    lamp: '<path d="M3 4h18M7.5 4v3M16.5 4v3"/><rect x="4" y="7" width="16" height="3.4" rx="1.7"/><path class="a d" d="M8 13.6v3M12 13.6v3M16 13.6v3"/><path d="M3 21h18"/>',
    hoop: '<path d="M7 21.5V4.5M4 21.5h6"/><rect x="7" y="4.5" width="9.5" height="6.5" rx="1"/><path class="a" d="M11 11h6.5M12 11l1.1 4.4M16.5 11l-1.1 4.4M12.8 14.6h2.8"/>',
    openbook: '<path d="M12 6v15"/><path d="M12 6L3.5 9.2v11.4L12 21"/><path class="a" d="M12 6l8.5 3.2v11.4L12 21"/>',
    floors: '<path d="M3 7.6L12 4.4l9 3.2-9 3.2z"/><path class="a" d="M3 16.4l9-3.2 9 3.2-9 3.2z"/><path class="d" d="M3 7.6v8.8M21 7.6v8.8M12 10.8v8.8"/>',
    rocket: '<path d="M12 2.5c3 2.4 4.4 5.8 4.4 9.6L14.2 17H9.8l-2.2-4.9C7.6 8.3 9 4.9 12 2.5z"/><circle class="a" cx="12" cy="9" r="1.7"/><path d="M9.8 17l-1.8 3.6M14.2 17l1.8 3.6"/><path class="a d" d="M12 17.5v4.5"/>',
    pillar: '<path d="M5 3.5h14M5 20.5h14"/><path d="M7 3.5v17h10v-17"/><path class="a" d="M10.4 3.5v17"/>',
    slice: '<ellipse cx="12" cy="5.5" rx="6.4" ry="2.4"/><path d="M5.6 5.5v13c0 1.3 2.9 2.4 6.4 2.4s6.4-1.1 6.4-2.4v-13"/><path class="a" d="M12 1.5v21"/>'
  };

  window.GI = function (name, extraClass) {
    var body = P[name];
    if (!body) return '';
    return '<svg class="gi-svg ' + (extraClass || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  window.GI.names = Object.keys(P);

  var css = '.gi{display:inline-flex;align-items:center;justify-content:center;line-height:1;vertical-align:-0.16em}' +
    '.gi-svg{width:1.15em;height:1.15em;overflow:visible}' +
    '.gi-svg .a{stroke:#06b6d4}' +
    '.gi-svg .f{fill:#06b6d4;stroke:none}' +
    '.gi-svg .d{stroke-dasharray:2.2 2.2}' +
    '.gi-tile{display:inline-flex;align-items:center;justify-content:center;border-radius:14px;' +
    'background:linear-gradient(135deg,rgba(37,99,235,.10),rgba(6,182,212,.12));border:1px solid rgba(6,182,212,.28)}';
  var st = document.createElement('style'); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // 靜態 HTML：<span class="gi" data-gi="cube"></span> 會自動填入圖示
  function fill() {
    var els = document.querySelectorAll('[data-gi]');
    for (var i = 0; i < els.length; i++) if (!els[i].firstChild) els[i].innerHTML = window.GI(els[i].getAttribute('data-gi'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();

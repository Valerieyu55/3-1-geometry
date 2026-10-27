/* ============================================================
 * 3-1 數位智慧課本：學生學習紀錄 (tracker.js)
 * 學生資料會送到老師的 Google 試算表（Apps Script 網頁應用程式）
 * 設定方式：把部署後拿到的網址貼到下面 GAS_URL 的引號中
 * ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    GAS_URL: 'https://script.google.com/macros/s/AKfycbyJDlWJcuns2IYihRahSTgvGKel9wStG60oi7PC5FCa6U6y4QUOvJG7jven15r5b81k/exec',                       // ← 貼上 Apps Script 網頁應用程式網址（https://script.google.com/macros/s/.../exec）
    UNIT: '3-1 空間中的線、平面與形體',
    BATCH: 40
  };

  var LS_STU = 'g9_student';
  var LS_Q = 'g9_track_queue';
  var LS_LASTSCORE = 'g9_track_lastscore';
  var SS_SESSION = 'g9_track_session';

  /* ---------- 安全的 storage ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var memQueue = null; // storage 不可用時的備援
  function getQueue() { var q = lsGet(LS_Q, null); if (q === null) q = memQueue || []; return q; }
  function setQueue(q) { memQueue = q; lsSet(LS_Q, q); }

  function sessionId() {
    try {
      var s = sessionStorage.getItem(SS_SESSION);
      if (!s) { s = Date.now().toString(36) + Math.random().toString(36).slice(2, 7); sessionStorage.setItem(SS_SESSION, s); }
      return s;
    } catch (e) { return 'nosession'; }
  }

  var PAGE_NAMES = {
    'index.html': '主頁', '': '主頁', 'platonic.html': '正多面體偵探室', 'qa.html': '立體圖形大哉問',
    'proof-pyramid.html': '錐體 1/3 推導', 'proof-cavalieri.html': '卡瓦列里原理', 'volume-proofs.html': '體積公式的奧秘'
  };
  var file = (location.pathname.split('/').pop() || '').toLowerCase();
  var PAGE = PAGE_NAMES[file] || file;

  function student() { return lsGet(LS_STU, null); }

  function base() {
    var s = student() || {};
    return {
      ts: new Date().toISOString(),
      session: sessionId(),
      unit: CONFIG.UNIT,
      page: PAGE,
      cls: s.cls || '', seat: s.seat || '', name: s.name || ''
    };
  }

  /* ---------- 佇列與上傳 ---------- */
  var flushTimer = null, sending = false;

  function log(type, data) {
    if (!student()) return;
    var ev = base(); ev.type = type;
    data = data || {};
    for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) ev[k] = data[k];
    var q = getQueue(); q.push(ev);
    if (q.length > 800) q = q.slice(-800);
    setQueue(q);
    scheduleFlush();
    renderChip();
  }

  function scheduleFlush(delay) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, delay == null ? 1500 : delay);
  }

  function flush() {
    if (!CONFIG.GAS_URL || sending) { renderChip(); return; }
    var q = getQueue();
    if (!q.length) { renderChip(); return; }
    var batch = q.slice(0, CONFIG.BATCH);
    sending = true;
    fetch(CONFIG.GAS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ events: batch })
    }).then(function () {
      var cur = getQueue();
      setQueue(cur.slice(batch.length));
      sending = false; lastSync = Date.now(); renderChip();
      if (getQueue().length) scheduleFlush(300);
    }).catch(function () {
      sending = false; renderChip();
      scheduleFlush(15000); // 離線時稍後重試
    });
  }

  function beaconFlush() {
    if (!CONFIG.GAS_URL || !navigator.sendBeacon) return;
    var q = getQueue(); if (!q.length) return;
    var batch = q.slice(0, CONFIG.BATCH);
    try {
      var ok = navigator.sendBeacon(CONFIG.GAS_URL, new Blob([JSON.stringify({ events: batch })], { type: 'text/plain;charset=utf-8' }));
      if (ok) setQueue(q.slice(batch.length));
    } catch (e) {}
  }

  /* ---------- 停留時間 ---------- */
  var cur = null; // { module, start }
  function endDwell() {
    if (!cur) return;
    var sec = Math.round((Date.now() - cur.start) / 1000);
    if (sec >= 2) log('dwell', { module: cur.module, seconds: sec });
    cur.start = Date.now();
  }
  function view(module) {
    if (cur && cur.module === module) return;
    if (cur) endDwell();
    cur = { module: module, start: Date.now() };
    log('enter', { module: module });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { endDwell(); beaconFlush(); }
    else if (cur) cur.start = Date.now();
  });
  window.addEventListener('pagehide', function () { endDwell(); beaconFlush(); });
  window.addEventListener('online', function () { scheduleFlush(200); });

  /* ---------- 對外 API ---------- */
  var TRACK = {
    config: CONFIG,
    student: student,
    view: view,
    event: function (type, data) { log(type, data); },
    /** 作答：module 模組、item 題目、answer 學生答案、correct 是否正確 */
    answer: function (o) {
      log('answer', {
        module: o.module || '', item: o.item || '', answer: o.answer == null ? '' : String(o.answer),
        correctAnswer: o.correctAnswer == null ? '' : String(o.correctAnswer),
        correct: o.correct === true ? 'O' : (o.correct === false ? 'X' : ''),
        detail: o.detail ? JSON.stringify(o.detail) : ''
      });
    },
    /** 分數快照：分數有變才送 */
    score: function (breakdown, total) {
      var s = student(); if (!s) return;
      var key = s.cls + '|' + s.seat + '|' + s.name;
      var sig = JSON.stringify(breakdown) + '#' + total;
      var last = lsGet(LS_LASTSCORE, {});
      if (last[key] === sig) return;
      last[key] = sig; lsSet(LS_LASTSCORE, last);
      log('score', { total: total, detail: JSON.stringify(breakdown) });
    },
    /** 從本機讀取全站分數並送出快照（給子頁使用）*/
    scoreFromStorage: function () {
      var g = lsGet('g9_geometry_scores', {}) || {};
      TRACK.score(g, calcTotal(g));
    },
    calcTotal: calcTotal,
    flush: flush
  };
  function countTrue(o) { var n = 0; if (o) for (var k in o) if (o[k] === true) n++; return n; }
  function calcTotal(g) {
    return countTrue(g.qa) * 4 + countTrue(g.spatialLines) * 2 + countTrue(g.crossSection) * 5 + countTrue(g.euler) * 4 + (g.skew === true ? 2 : 0);
  }
  window.G9Track = TRACK;

  /* ---------- 介面：登入視窗與狀態膠囊 ---------- */
  var lastSync = 0;
  var css = '' +
    '.g9t-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;' +
    'background:rgba(6,14,32,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:"Space Grotesk","Noto Sans TC",sans-serif}' +
    '.g9t-card{position:relative;width:100%;max-width:400px;border-radius:20px;padding:28px 26px 22px;color:#0f1b2d;' +
    'background:linear-gradient(180deg,#f5faff,#ffffff);border:1px solid rgba(37,99,235,.18);box-shadow:0 30px 80px -20px rgba(6,182,212,.45),0 10px 30px -10px rgba(15,27,45,.4)}' +
    '.g9t-card:before{content:"";position:absolute;inset:10px;pointer-events:none;opacity:.7;background:' +
    'linear-gradient(#06b6d4,#06b6d4) top left/16px 2px no-repeat,linear-gradient(#06b6d4,#06b6d4) top left/2px 16px no-repeat,' +
    'linear-gradient(#2563eb,#2563eb) bottom right/16px 2px no-repeat,linear-gradient(#2563eb,#2563eb) bottom right/2px 16px no-repeat}' +
    '.g9t-tag{display:inline-block;font:700 10px/1 "JetBrains Mono",monospace;letter-spacing:.14em;color:#0891b2;background:#ecfeff;border:1px solid #a5f3fc;padding:5px 8px;border-radius:99px}' +
    '.g9t-h{font-size:22px;font-weight:900;margin:12px 0 4px}' +
    '.g9t-p{font-size:13px;color:#546b84;margin:0 0 18px;line-height:1.6}' +
    '.g9t-row{display:flex;gap:10px}' +
    '.g9t-f{flex:1;margin-bottom:12px}' +
    '.g9t-f label{display:block;font:700 11px "JetBrains Mono","Noto Sans TC",monospace;letter-spacing:.08em;color:#2563eb;margin-bottom:6px}' +
    '.g9t-f input{width:100%;box-sizing:border-box;border:1.5px solid rgba(37,99,235,.2);background:#fff;border-radius:12px;padding:11px 12px;font-size:16px;color:#0f1b2d;outline:none;transition:border-color .15s,box-shadow .15s}' +
    '.g9t-f input:focus{border-color:#06b6d4;box-shadow:0 0 0 4px rgba(6,182,212,.15)}' +
    '.g9t-btn{width:100%;border:0;border-radius:12px;padding:13px;font-size:15px;font-weight:900;color:#fff;cursor:pointer;margin-top:4px;' +
    'background:linear-gradient(135deg,#2563eb,#06b6d4);box-shadow:0 10px 24px -10px rgba(6,182,212,.9)}' +
    '.g9t-btn:hover{filter:brightness(1.08)}' +
    '.g9t-cancel{width:100%;margin-top:8px;border:1px solid rgba(37,99,235,.2);border-radius:12px;padding:12px;font-size:14px;font-weight:800;color:#475569;background:#fff;cursor:pointer}' +
    '.g9t-cancel:hover{background:#f1f5f9}' +
    '.g9t-err{color:#dc2626;font-size:12px;font-weight:700;min-height:16px;margin-top:8px}' +
    '.g9t-note{font-size:11px;color:#94a3b8;margin-top:10px;text-align:center}' +
    '.g9t-chip{position:fixed;right:14px;bottom:14px;z-index:9000;display:flex;align-items:center;gap:8px;padding:7px 12px 7px 7px;border-radius:99px;cursor:pointer;' +
    'background:rgba(255,255,255,.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(37,99,235,.18);' +
    'box-shadow:0 8px 24px -10px rgba(15,40,90,.4);font:700 12px "Space Grotesk","Noto Sans TC",sans-serif;color:#0f1b2d}' +
    '.g9t-av{width:26px;height:26px;border-radius:99px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px;background:linear-gradient(135deg,#2563eb,#06b6d4)}' +
    '.g9t-dot{width:8px;height:8px;border-radius:99px;display:inline-block}' +
    '.g9t-menu{position:fixed;right:14px;bottom:58px;z-index:9001;background:#fff;border:1px solid rgba(37,99,235,.18);border-radius:14px;padding:6px;box-shadow:0 14px 34px -12px rgba(15,40,90,.45);font:600 13px "Noto Sans TC",sans-serif;min-width:180px}' +
    '.g9t-menu div{padding:9px 12px;border-radius:9px;color:#334155}' +
    '.g9t-menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:9px 12px;border-radius:9px;cursor:pointer;font:inherit;color:#1d4ed8}' +
    '.g9t-menu button:hover{background:#eff6ff}';

  function injectCSS() {
    if (document.getElementById('g9t-css')) return;
    var st = document.createElement('style'); st.id = 'g9t-css'; st.textContent = css;
    document.head.appendChild(st);
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function showLogin(isSwitch) {
    injectCSS();
    var old = document.querySelector('.g9t-overlay'); if (old) old.remove();
    var s = student() || {};
    var ov = document.createElement('div'); ov.className = 'g9t-overlay';
    ov.innerHTML =
      '<form class="g9t-card" autocomplete="off">' +
      '<span class="g9t-tag">STUDENT LOGIN</span>' +
      '<div class="g9t-h">' + (isSwitch ? '更換學生' : '開始學習前，先登記') + '</div>' +
      '<p class="g9t-p">你的作答與分數會自動記錄給老師，<br>請填寫正確的班級、座號與姓名。</p>' +
      '<div class="g9t-row">' +
      '<div class="g9t-f"><label>班級 CLASS</label><input name="cls" inputmode="numeric" placeholder="例：905" value="' + esc(isSwitch ? '' : (s.cls || '')) + '"></div>' +
      '<div class="g9t-f"><label>座號 NO.</label><input name="seat" inputmode="numeric" placeholder="例：12" value="' + esc(isSwitch ? '' : (s.seat || '')) + '"></div>' +
      '</div>' +
      '<div class="g9t-f"><label>姓名 NAME</label><input name="name" placeholder="例：王小明" value="' + esc(isSwitch ? '' : (s.name || '')) + '"></div>' +
      '<button class="g9t-btn" type="submit">' + (isSwitch ? '確認更換' : '開始學習') + ' →</button>' +
      (isSwitch && student() ? '<button class="g9t-cancel" type="button">取消，繼續使用 ' + esc((student() || {}).name || '') + '</button>' : '') +
      '<div class="g9t-err"></div>' +
      '<div class="g9t-note">共用平板時，下課前請點右下角姓名 → 更換學生</div>' +
      '</form>';
    document.body.appendChild(ov);
    var form = ov.querySelector('form');
    // 更換學生時可以取消：按鈕、Esc 鍵、點視窗外面
    var canCancel = isSwitch && !!student();
    function cancel() { ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape' && canCancel) cancel(); }
    if (canCancel) {
      ov.querySelector('.g9t-cancel').addEventListener('click', cancel);
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) cancel(); });
      document.addEventListener('keydown', onKey);
    }
    setTimeout(function () { var i = form.querySelector('input[name=cls]'); if (i) i.focus(); }, 50);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cls = form.cls.value.trim(), seat = form.seat.value.trim(), name = form.name.value.trim();
      var err = form.querySelector('.g9t-err');
      if (!/^\d{3,4}$/.test(cls)) { err.textContent = '班級請填 3～4 位數字，例如 905'; return; }
      if (!/^\d{1,2}$/.test(seat)) { err.textContent = '座號請填 1～2 位數字'; return; }
      if (name.length < 2) { err.textContent = '請填寫姓名'; return; }
      if (cur) endDwell();
      var prev = student();
      var nextStu = { cls: cls, seat: String(parseInt(seat, 10)), name: name };
      // 換成不同學生時，清掉這台裝置上前一位學生的分數
      if (prev && (prev.cls !== nextStu.cls || prev.seat !== nextStu.seat || prev.name !== nextStu.name)) {
        lsDel('g9_geometry_scores');
        try { window.dispatchEvent(new Event('score_updated')); } catch (e3) {}
      }
      lsSet(LS_STU, nextStu);
      lsDel(LS_LASTSCORE);
      ov.remove();
      document.removeEventListener('keydown', onKey);
      log('login', { module: PAGE, detail: navigator.userAgent.slice(0, 120) });
      TRACK.scoreFromStorage();
      if (cur) { var m = cur.module; cur = null; view(m); } else { view(PAGE); }
      try { window.dispatchEvent(new Event('g9_student_changed')); } catch (e2) {}
      renderChip();
    });
  }

  function renderChip() {
    if (!document.body) return;
    injectCSS();
    var s = student();
    var chip = document.querySelector('.g9t-chip');
    if (!s) { if (chip) chip.remove(); return; }
    if (!chip) {
      chip = document.createElement('div'); chip.className = 'g9t-chip'; chip.title = '學習紀錄';
      chip.addEventListener('click', toggleMenu);
      document.body.appendChild(chip);
    }
    var n = getQueue().length, color, label;
    if (!CONFIG.GAS_URL) { color = '#94a3b8'; label = '僅存本機'; }
    else if (n === 0) { color = '#10b981'; label = '已同步'; }
    else { color = '#f59e0b'; label = '待上傳 ' + n; }
    chip.innerHTML = '<span class="g9t-av">' + esc(s.name.slice(-1)) + '</span>' +
      '<span>' + esc(s.cls) + '-' + esc(s.seat) + ' ' + esc(s.name) + '</span>' +
      '<span class="g9t-dot" style="background:' + color + '" title="' + label + '"></span>';
  }

  function toggleMenu() {
    var m = document.querySelector('.g9t-menu');
    if (m) { m.remove(); return; }
    var s = student() || {};
    var n = getQueue().length;
    m = document.createElement('div'); m.className = 'g9t-menu';
    m.innerHTML = '<div>' + esc(s.cls) + ' 班 ' + esc(s.seat) + ' 號 ' + esc(s.name) + '<br><small style="color:#94a3b8">' +
      (!CONFIG.GAS_URL ? '尚未設定雲端網址，資料只存在本機' : (n ? '還有 ' + n + ' 筆待上傳' : '所有紀錄都已上傳')) + '</small></div>' +
      (CONFIG.GAS_URL && n ? '<button data-a="sync">立即上傳</button>' : '') +
      '<button data-a="switch">更換學生</button>';
    m.addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-a');
      if (a === 'sync') { flush(); m.remove(); }
      if (a === 'switch') { m.remove(); endDwell(); beaconFlush(); showLogin(true); }
    });
    document.body.appendChild(m);
    setTimeout(function () {
      document.addEventListener('click', function off(e) {
        if (!m.contains(e.target) && !e.target.closest('.g9t-chip')) { m.remove(); document.removeEventListener('click', off); }
      });
    }, 0);
  }

  function boot() {
    injectCSS();
    if (!student()) showLogin(false);
    else { renderChip(); view(PAGE); scheduleFlush(800); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

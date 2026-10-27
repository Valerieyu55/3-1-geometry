/**
 * 3-1 數位智慧課本：學生學習紀錄接收器（Google Apps Script）
 * 把這整份程式碼貼到 Google 試算表的「擴充功能 → Apps Script」，
 * 再「部署 → 新增部署作業 → 網頁應用程式」，存取權選「所有人」。
 */

var TZ = 'Asia/Taipei';
// 試算表 ID 由 setup() 自動建立並存在「指令碼屬性」SHEET_ID
function book() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('請先執行 setup()');
  return SpreadsheetApp.openById(id);
}

var SHEETS = {
  answers: { name: '作答紀錄', header: ['時間', '班級', '座號', '姓名', '頁面', '模組', '題目', '學生答案', '正確答案', '對錯', '補充'] },
  euler:   { name: '正多面體偵探室', header: ['時間', '班級', '座號', '姓名', '正多面體', '猜 V', '猜 E', '猜 F', '正確 V', '正確 E', '正確 F', '結果'] },
  scores:  { name: '成績總表', header: ['班級', '座號', '姓名', '總分', '大哉問(28)', '空間關係(20)', '截面挑戰(30)', '正多面體(20)', '歪斜線(2)', '最後更新'] },
  journey: { name: '學習歷程', header: ['時間', '班級', '座號', '姓名', '頁面', '動作', '模組', '停留秒數', '連線代碼'] },
  summary: { name: '學生統計', header: ['班級', '座號', '姓名', '作答題數', '答對題數', '答對率', '總學習分鐘', '最常停留模組', '最後活動'] }
};

var ACTION_NAMES = { enter: '進入', dwell: '停留', login: '登入', reset_progress: '重置進度', hint: '看提示', page: '開啟頁面' };

/* ---------- 接收資料 ---------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var events = body.events || [];
    var rows = { answers: [], euler: [], journey: [] };
    var latestScore = {};

    events.forEach(function (ev) {
      var t = fmt(ev.ts);
      var who = [ev.cls, ev.seat, ev.name];
      if (ev.type === 'answer') {
        rows.answers.push([t].concat(who, [ev.page, ev.module, ev.item, ev.answer, ev.correctAnswer, ev.correct, ev.detail]));
        if (String(ev.module).indexOf('正多面體') >= 0 && ev.detail) {
          try {
            var d = JSON.parse(ev.detail);
            rows.euler.push([t].concat(who, [ev.item, d.V, d.E, d.F, d.cV, d.cE, d.cF, d.result]));
          } catch (err) {}
        }
      } else if (ev.type === 'score') {
        latestScore[ev.cls + '|' + ev.seat + '|' + ev.name] = ev; // 同一批只取最新
      } else {
        rows.journey.push([t].concat(who, [ev.page, ACTION_NAMES[ev.type] || ev.type, ev.module || '', ev.seconds || '', ev.session || '']));
      }
    });

    appendRows('answers', rows.answers);
    appendRows('euler', rows.euler);
    appendRows('journey', rows.journey);
    Object.keys(latestScore).forEach(function (k) { upsertScore(latestScore[k]); });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, n: events.length })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/* 用瀏覽器打開網址時顯示，方便確認部署成功 */
function doGet() {
  return ContentService.createTextOutput('✅ 3-1 學習紀錄接收器運作中');
}

/* ---------- 工具 ---------- */
function fmt(ts) {
  var d = ts ? new Date(ts) : new Date();
  return Utilities.formatDate(d, TZ, 'yyyy/MM/dd HH:mm:ss');
}

function sheet(key) {
  var ss = book();
  var cfg = SHEETS[key];
  var sh = ss.getSheetByName(cfg.name);
  if (!sh) {
    sh = ss.insertSheet(cfg.name);
    sh.getRange(1, 1, 1, cfg.header.length).setValues([cfg.header])
      .setFontWeight('bold').setBackground('#0f2a5c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function appendRows(key, rows) {
  if (!rows.length) return;
  var sh = sheet(key);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function countTrue(o) {
  if (!o) return 0;
  return Object.keys(o).filter(function (k) { return o[k] === true; }).length;
}

function upsertScore(ev) {
  var b = {};
  try { b = JSON.parse(ev.detail || '{}'); } catch (err) {}
  var qa = countTrue(b.qa) * 4, sp = countTrue(b.spatialLines) * 2, cs = countTrue(b.crossSection) * 5,
      eu = countTrue(b.euler) * 4, sk = b.skew === true ? 2 : 0;
  var row = [ev.cls, ev.seat, ev.name, Number(ev.total) || (qa + sp + cs + eu + sk), qa, sp, cs, eu, sk, fmt(ev.ts)];

  var sh = sheet('scores');
  var last = sh.getLastRow();
  if (last > 1) {
    var keys = sh.getRange(2, 1, last - 1, 3).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(ev.cls) && String(keys[i][1]) === String(ev.seat) && String(keys[i][2]) === String(ev.name)) {
        sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sh.appendRow(row);
}

/* ---------- 第一次設定：執行一次 setup ----------
 * 1. 試算表開啟時加上「📊 學習紀錄」選單
 * 2. 每小時自動更新「學生統計」
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHEET_ID')) props.setProperty('SHEET_ID', SpreadsheetApp.create('3-1 學習紀錄').getId());
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('addMenu').forSpreadsheet(props.getProperty('SHEET_ID')).onOpen().create();
  ScriptApp.newTrigger('buildSummary').timeBased().everyHours(1).create();
  Object.keys(SHEETS).forEach(sheet);
  var first = book().getSheets()[0];
  if (/^(工作表1|Sheet1)$/.test(first.getName()) && first.getLastRow() === 0) book().deleteSheet(first);
  Logger.log('試算表網址：' + book().getUrl());
}

/* ---------- 老師用：試算表上方選單 ---------- */
function addMenu() {
  SpreadsheetApp.getUi().createMenu('📊 學習紀錄')
    .addItem('更新「學生統計」', 'buildSummary')
    .addItem('成績總表依班級座號排序', 'sortScores')
    .addToUi();
}

function sortScores() {
  var sh = sheet('scores');
  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, SHEETS.scores.header.length).sort([{ column: 1 }, { column: 2 }]);
}

function buildSummary() {
  var stats = {};
  function key(r) { return r[1] + '|' + r[2] + '|' + r[3]; }
  function get(r) {
    var k = key(r);
    if (!stats[k]) stats[k] = { cls: r[1], seat: r[2], name: r[3], n: 0, ok: 0, sec: 0, mods: {}, last: '' };
    return stats[k];
  }

  var a = sheet('answers'), j = sheet('journey');
  if (a.getLastRow() > 1) a.getRange(2, 1, a.getLastRow() - 1, SHEETS.answers.header.length).getValues().forEach(function (r) {
    var s = get(r); s.n++; if (r[9] === 'O') s.ok++; if (String(r[0]) > s.last) s.last = String(r[0]);
  });
  if (j.getLastRow() > 1) j.getRange(2, 1, j.getLastRow() - 1, SHEETS.journey.header.length).getValues().forEach(function (r) {
    var s = get(r);
    if (r[5] === '停留') { var sec = Number(r[7]) || 0; s.sec += sec; s.mods[r[6]] = (s.mods[r[6]] || 0) + sec; }
    if (String(r[0]) > s.last) s.last = String(r[0]);
  });

  var out = Object.keys(stats).map(function (k) {
    var s = stats[k], top = '', max = 0;
    Object.keys(s.mods).forEach(function (m) { if (s.mods[m] > max) { max = s.mods[m]; top = m; } });
    return [s.cls, s.seat, s.name, s.n, s.ok, s.n ? Math.round(s.ok / s.n * 100) + '%' : '-', Math.round(s.sec / 6) / 10, top, s.last];
  }).sort(function (x, y) { return (x[0] - y[0]) || (x[1] - y[1]); });

  var sh = sheet('summary');
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, SHEETS.summary.header.length).clearContent();
  if (out.length) sh.getRange(2, 1, out.length, out[0].length).setValues(out);
  try { book().toast('已更新 ' + out.length + ' 位學生的統計', '學習紀錄', 4); } catch (e) {}
}

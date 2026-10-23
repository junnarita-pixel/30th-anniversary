/* =====================================================================
   写真の拡大表示（シート No.117「HP内の写真をすべて別画面で拡大表示」）
   ---------------------------------------------------------------------
   ・ページ内の写真を押すと、画面いっぱいに拡大して表示する
   ・同じページの写真は「前へ／次へ」で順に見られる（矢印キー・スワイプ可）
   ・拡大表示の中で、二本指のピンチ／ダブルタップ（PCはダブルクリック）で
     さらに拡大でき、拡大中はドラッグで動かせる
   ・閉じる：×ボタン、写真の外側を押す、Esc キー
   ・対象外：TOP の背景写真、リンクの中の写真（押すと別ページへ移動するもの）
     ただし Information のチラシ（.info-ph の写真）は拡大の対象にする
   ・iPhone の Safari は、押せる見た目（cursor:pointer）か要素自身の click
     がないとタップを click として扱わないため、写真ごとに click を付ける
   ===================================================================== */
(function () {
  'use strict';
  var SKIP = 'img[data-rot="hero"], img[data-rot-fade], .aff-px, nav img, footer img, .lb img';

  function eligible(img) {
    if (!img || img.tagName !== 'IMG' || img.matches(SKIP)) return false;
    if (img.closest('.info-ph')) return true;          // Information のチラシは拡大する
    if (img.closest('a')) return false;                 // それ以外のリンク内の写真は移動を優先
    return true;
  }
  function all() { return Array.prototype.filter.call(document.images, eligible); }

  var css = ''
    + 'img.lb-able{cursor:pointer;cursor:zoom-in;touch-action:manipulation}'
    + 'img.lb-able:focus-visible{outline:3px solid #D4B061;outline-offset:3px}'
    + '.lb{position:fixed;inset:0;z-index:1000;background:rgba(14,10,8,.94);display:flex;align-items:center;justify-content:center;'
    +   'padding:max(56px,env(safe-area-inset-top,0px)) max(56px,env(safe-area-inset-right,0px)) max(64px,env(safe-area-inset-bottom,0px)) max(56px,env(safe-area-inset-left,0px));'
    +   'touch-action:none;-webkit-user-select:none;user-select:none}'
    + '.lb[hidden]{display:none}'
    + '.lb-fig{margin:0;display:flex;flex-direction:column;align-items:center;gap:14px;max-width:100%;max-height:100%}'
    + '.lb-stage{max-width:100%;max-height:calc(100vh - 170px);max-height:calc(100dvh - 170px);overflow:hidden;display:flex;align-items:center;justify-content:center}'
    + '.lb-img{display:block;max-width:100%;max-height:calc(100vh - 170px);max-height:calc(100dvh - 170px);object-fit:contain;box-shadow:0 10px 40px rgba(0,0,0,.5);background:#1C1410;'
    +   'transform-origin:center center;will-change:transform;cursor:zoom-in}'
    + '.lb.is-zoomed .lb-img{cursor:grab}'
    + '.lb.is-zoomed .lb-cap,.lb.is-zoomed .lb-count{opacity:0}'
    + '.lb-cap{color:rgba(251,249,245,.85);font-size:14px;line-height:1.6;text-align:center;max-width:46em;transition:opacity .2s}'
    + '.lb-count{position:absolute;left:0;right:0;bottom:max(18px,env(safe-area-inset-bottom,0px));text-align:center;color:rgba(212,176,97,.85);font-size:12px;letter-spacing:.2em;transition:opacity .2s}'
    + '.lb-hint{position:absolute;left:0;right:0;bottom:max(38px,calc(env(safe-area-inset-bottom,0px) + 20px));text-align:center;color:rgba(251,249,245,.55);font-size:11px;letter-spacing:.08em;pointer-events:none;transition:opacity .3s}'
    + '.lb-hint[hidden]{display:none}'
    + '.lb button{position:absolute;background:none;border:0;color:#FBF9F5;cursor:pointer;line-height:1;padding:10px;font-family:inherit}'
    + '.lb button:focus-visible{outline:2px solid #D4B061;outline-offset:2px}'
    + '.lb-close{top:max(10px,env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px));font-size:34px;z-index:2}'
    + '.lb-prev,.lb-next{top:50%;transform:translateY(-50%);font-size:46px;opacity:.8;z-index:2}'
    + '.lb-prev:hover,.lb-next:hover,.lb-close:hover{opacity:1;color:#D4B061}'
    + '.lb-prev{left:max(6px,env(safe-area-inset-left,0px))}'
    + '.lb-next{right:max(6px,env(safe-area-inset-right,0px))}'
    + '.lb-prev[hidden],.lb-next[hidden]{display:none}'
    + '@media(max-width:640px){.lb{padding-left:12px;padding-right:12px}.lb-prev,.lb-next{font-size:36px;top:auto;bottom:max(6px,env(safe-area-inset-bottom,0px));transform:none}'
    +   '.lb-stage,.lb-img{max-height:calc(100vh - 150px);max-height:calc(100dvh - 150px)}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div');
  box.className = 'lb'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '写真の拡大表示');
  box.innerHTML = '<button type="button" class="lb-close" aria-label="閉じる">×</button>'
    + '<button type="button" class="lb-prev" aria-label="前の写真">‹</button>'
    + '<figure class="lb-fig"><div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div><figcaption class="lb-cap"></figcaption></figure>'
    + '<button type="button" class="lb-next" aria-label="次の写真">›</button>'
    + '<div class="lb-count" aria-live="polite"></div>'
    + '<div class="lb-hint" hidden>ピンチ／ダブルタップでさらに拡大</div>';
  document.body.appendChild(box);
  var big = box.querySelector('.lb-img'), cap = box.querySelector('.lb-cap'), cnt = box.querySelector('.lb-count');
  var stage = box.querySelector('.lb-stage'), hint = box.querySelector('.lb-hint');
  var prevB = box.querySelector('.lb-prev'), nextB = box.querySelector('.lb-next');
  var list = [], idx = 0, opener = null, overflowWas = '';
  var isTouch = matchMedia('(pointer: coarse)').matches;

  /* ---- 拡大表示の中のズーム（ピンチ・ダブルタップ・ドラッグ） ---- */
  var z = { s: 1, x: 0, y: 0 };
  function applyZoom() {
    big.style.transform = z.s === 1 ? '' : 'translate(' + z.x + 'px,' + z.y + 'px) scale(' + z.s + ')';
    box.classList.toggle('is-zoomed', z.s > 1);
  }
  function clampPan() {
    var r = stage.getBoundingClientRect(), w = big.clientWidth * z.s, h = big.clientHeight * z.s;
    var mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
    z.x = Math.min(mx, Math.max(-mx, z.x)); z.y = Math.min(my, Math.max(-my, z.y));
  }
  function resetZoom() { z = { s: 1, x: 0, y: 0 }; applyZoom(); }
  function zoomAt(scale, cx, cy) {                       // 画面上の点 (cx,cy) を中心に倍率を変える
    var r = big.getBoundingClientRect();
    var ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
    var k = scale / z.s;
    z.x = ox - (ox - z.x) * k; z.y = oy - (oy - z.y) * k; z.s = scale;
    clampPan(); applyZoom();
  }
  var pts = {}, pinch0 = null, drag0 = null, moved = false, lastTap = 0;
  stage.addEventListener('pointerdown', function (e) {
    if (e.target !== big) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]];
      pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), s: z.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      drag0 = null;
    } else if (ids.length === 1) {
      drag0 = { x: e.clientX, y: e.clientY, px: z.x, py: z.y }; moved = false;
    }
    e.preventDefault();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (ids.length === 2 && pinch0) {
      var a = pts[ids[0]], b = pts[ids[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(Math.min(4, Math.max(1, pinch0.s * d / pinch0.d)), pinch0.cx, pinch0.cy);
      moved = true;
    } else if (ids.length === 1 && drag0) {
      var dx = e.clientX - drag0.x, dy = e.clientY - drag0.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (z.s > 1) { z.x = drag0.px + dx; z.y = drag0.py + dy; clampPan(); applyZoom(); }
    }
    e.preventDefault();
  });
  function pointerEnd(e) {
    if (!pts[e.pointerId]) return;
    var wasDrag = drag0, ids;
    delete pts[e.pointerId]; ids = Object.keys(pts);
    if (ids.length < 2) pinch0 = null;
    if (ids.length === 0) {
      drag0 = null;
      if (!moved && e.type === 'pointerup') {
        var now = Date.now();
        if (now - lastTap < 320) {                       // ダブルタップ：2.5倍 ⇄ 等倍
          if (z.s > 1) resetZoom(); else zoomAt(2.5, e.clientX, e.clientY);
          lastTap = 0;
        } else lastTap = now;
      } else if (moved && z.s === 1 && wasDrag && e.pointerType === 'touch') {
        var dx = e.clientX - wasDrag.x;                   // 等倍のときの横スワイプで前後へ
        if (Math.abs(dx) > 50 && list.length > 1) show(idx + (dx < 0 ? 1 : -1));
      }
    }
  }
  stage.addEventListener('pointerup', pointerEnd);
  stage.addEventListener('pointercancel', pointerEnd);
  stage.addEventListener('dblclick', function (e) { e.preventDefault(); });   // ダブルクリックは pointerup 側で処理
  stage.addEventListener('wheel', function (e) {                             // PC：ホイールで拡大縮小
    e.preventDefault();
    zoomAt(Math.min(4, Math.max(1, z.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15))), e.clientX, e.clientY);
  }, { passive: false });

  function show(i) {
    idx = (i + list.length) % list.length;
    var im = list[idx];
    resetZoom();
    big.src = im.currentSrc || im.src;
    big.alt = im.alt || '';
    cap.textContent = im.alt || '';
    cap.hidden = !im.alt;
    var many = list.length > 1;
    prevB.hidden = nextB.hidden = !many;
    cnt.textContent = many ? (idx + 1) + ' / ' + list.length : '';
  }
  function open(img) {
    list = all(); idx = Math.max(0, list.indexOf(img)); opener = img;
    show(idx);
    box.hidden = false;
    overflowWas = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    if (isTouch) { hint.hidden = false; setTimeout(function () { hint.hidden = true; }, 2600); }
    box.querySelector('.lb-close').focus();
  }
  function close() {
    box.hidden = true; resetZoom();
    document.documentElement.style.overflow = overflowWas;
    big.removeAttribute('src');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }

  function onClick(e) {
    var img = e.currentTarget;
    if (!eligible(img)) return;
    e.preventDefault(); e.stopPropagation();
    open(img);
  }
  // 写真ごとに click を付ける（iPhone の Safari でタップが click になるように）。
  // 後から追加される写真にも効くよう、MutationObserver で付け直す
  function mark() {
    all().forEach(function (img) {
      if (img.classList.contains('lb-able')) return;
      img.classList.add('lb-able');
      img.addEventListener('click', onClick);
      if (!img.closest('a')) {
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', (img.alt ? img.alt + '（' : '') + '写真を拡大' + (img.alt ? '）' : ''));
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (box.hidden) {
      if ((e.key === 'Enter' || e.key === ' ') && eligible(document.activeElement)) { e.preventDefault(); open(document.activeElement); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); if (z.s > 1) resetZoom(); else close(); }
    else if (e.key === 'ArrowRight' && list.length > 1) show(idx + 1);
    else if (e.key === 'ArrowLeft' && list.length > 1) show(idx - 1);
    else if (e.key === 'Tab') {                          // フォーカスを拡大表示の中にとどめる
      var f = Array.prototype.filter.call(box.querySelectorAll('button'), function (b) { return !b.hidden; });
      var i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.classList.contains('lb-fig') || e.target.classList.contains('lb-stage')) close();
    else if (e.target.closest('.lb-close')) close();
    else if (e.target.closest('.lb-prev')) show(idx - 1);
    else if (e.target.closest('.lb-next')) show(idx + 1);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
  window.addEventListener('load', mark);
  new MutationObserver(mark).observe(document.body, { childList: true, subtree: true });
})();

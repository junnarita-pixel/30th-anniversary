/* =====================================================================
   写真の拡大表示（シート No.117「HP内の写真をすべて別画面で拡大表示」）
   ---------------------------------------------------------------------
   ・ページ内の写真を押すと、画面いっぱいに拡大して表示する
   ・同じページの写真は「前へ／次へ」で順に見られる（矢印キー・スワイプ可）
   ・閉じる：×ボタン、写真の外側を押す、Esc キー
   ・対象外：TOP の背景写真、リンクの中の写真（押すと別ページへ移動するもの）
     ただし Information のチラシ（.info-ph の写真）は拡大の対象にする
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
    + 'img.lb-able{cursor:zoom-in}'
    + 'img.lb-able:focus-visible{outline:3px solid #D4B061;outline-offset:3px}'
    + '.lb{position:fixed;inset:0;z-index:1000;background:rgba(14,10,8,.94);display:flex;align-items:center;justify-content:center;'
    +   'padding:max(56px,env(safe-area-inset-top,0px)) max(56px,env(safe-area-inset-right,0px)) max(64px,env(safe-area-inset-bottom,0px)) max(56px,env(safe-area-inset-left,0px))}'
    + '.lb[hidden]{display:none}'
    + '.lb-fig{margin:0;display:flex;flex-direction:column;align-items:center;gap:14px;max-width:100%;max-height:100%}'
    + '.lb-img{display:block;max-width:100%;max-height:calc(100vh - 170px);object-fit:contain;box-shadow:0 10px 40px rgba(0,0,0,.5);background:#1C1410}'
    + '.lb-cap{color:rgba(251,249,245,.85);font-size:14px;line-height:1.6;text-align:center;max-width:46em}'
    + '.lb-count{position:absolute;left:0;right:0;bottom:max(18px,env(safe-area-inset-bottom,0px));text-align:center;color:rgba(212,176,97,.85);font-size:12px;letter-spacing:.2em}'
    + '.lb button{position:absolute;background:none;border:0;color:#FBF9F5;cursor:pointer;line-height:1;padding:10px;font-family:inherit}'
    + '.lb button:focus-visible{outline:2px solid #D4B061;outline-offset:2px}'
    + '.lb-close{top:max(10px,env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px));font-size:34px}'
    + '.lb-prev,.lb-next{top:50%;transform:translateY(-50%);font-size:46px;opacity:.8}'
    + '.lb-prev:hover,.lb-next:hover,.lb-close:hover{opacity:1;color:#D4B061}'
    + '.lb-prev{left:max(6px,env(safe-area-inset-left,0px))}'
    + '.lb-next{right:max(6px,env(safe-area-inset-right,0px))}'
    + '.lb-prev[hidden],.lb-next[hidden]{display:none}'
    + '@media(max-width:640px){.lb{padding-left:12px;padding-right:12px}.lb-prev,.lb-next{font-size:36px;top:auto;bottom:max(6px,env(safe-area-inset-bottom,0px));transform:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div');
  box.className = 'lb'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '写真の拡大表示');
  box.innerHTML = '<button type="button" class="lb-close" aria-label="閉じる">×</button>'
    + '<button type="button" class="lb-prev" aria-label="前の写真">‹</button>'
    + '<figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-cap"></figcaption></figure>'
    + '<button type="button" class="lb-next" aria-label="次の写真">›</button>'
    + '<div class="lb-count" aria-live="polite"></div>';
  document.body.appendChild(box);
  var big = box.querySelector('.lb-img'), cap = box.querySelector('.lb-cap'), cnt = box.querySelector('.lb-count');
  var prevB = box.querySelector('.lb-prev'), nextB = box.querySelector('.lb-next');
  var list = [], idx = 0, opener = null, overflowWas = '';

  function show(i) {
    idx = (i + list.length) % list.length;
    var im = list[idx];
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
    box.querySelector('.lb-close').focus();
  }
  function close() {
    box.hidden = true;
    document.documentElement.style.overflow = overflowWas;
    big.removeAttribute('src');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }

  // 写真を押したら開く（後から追加される写真にも効くよう、まとめて受け取る）
  document.addEventListener('click', function (e) {
    var img = e.target && e.target.closest ? e.target.closest('img') : null;
    if (!eligible(img)) return;
    e.preventDefault(); e.stopPropagation();
    open(img);
  }, true);

  // キーボードでも開けるように
  function mark() {
    all().forEach(function (img) {
      if (img.classList.contains('lb-able')) return;
      img.classList.add('lb-able');
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
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' && list.length > 1) show(idx + 1);
    else if (e.key === 'ArrowLeft' && list.length > 1) show(idx - 1);
    else if (e.key === 'Tab') {                          // フォーカスを拡大表示の中にとどめる
      var f = Array.prototype.filter.call(box.querySelectorAll('button'), function (b) { return !b.hidden; });
      var i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  box.addEventListener('click', function (e) {
    if (e.target === box) close();
    else if (e.target.closest('.lb-close')) close();
    else if (e.target.closest('.lb-prev')) show(idx - 1);
    else if (e.target.closest('.lb-next')) show(idx + 1);
  });
  // スマホ：左右にスワイプで前後へ
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null || list.length < 2) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
  window.addEventListener('load', mark);
  new MutationObserver(mark).observe(document.body, { childList: true, subtree: true });
})();

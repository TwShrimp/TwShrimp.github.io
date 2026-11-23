/* Site behaviour for both pages.
   1 helpers · 2 language & theme · 3 scroll loop (header, progress, tilt, layers, rail)
   4 reveal · 5 rail · 6 ⌘K palette · 7 work-log chart · 8 flip cards · 9 click to reveal
   10 privacy viewer · 11 find-a-time demo · 12 architecture layers · 13 wordmark · 14 spotlight */
(function () {
  'use strict';

  // ---------- 1. Helpers ----------
  window.__v2 = true; // tells the head script the motion layer is alive
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    remove: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  function pick(v, ok, d) { return ok.indexOf(v) > -1 ? v : d; }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function pad(i) { return (i < 10 ? '0' : '') + i; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var q = new URLSearchParams(location.search);
  var motion = root.classList.contains('motion');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  var CHEV = '<span class="chev" aria-hidden="true"><svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.8 5 6.6l3-2.8"/></svg></span>';

  // ---------- 2. Language & theme ----------
  // Order: a ?lang= link, then the visitor's own choice, then the device language (set up in the head script)
  var deviceLang = window.__deviceLang || function () { return 'en'; };
  var urlLang = pick((q.get('lang') || '').toLowerCase(), ['ko', 'en'], null);
  function savedLang() { return pick(store.get('tw-lang'), ['ko', 'en'], null); }
  var lang = urlLang || savedLang() || deviceLang();
  var langHooks = [];
  function L(ko, en) { return lang === 'ko' ? ko : en; }
  function applyLang() {
    root.lang = lang;
    $$('[data-lang-btn]').forEach(function (b) {
      b.innerHTML = lang === 'ko'
        ? '<span lang="en">EN</span><span class="sep" aria-hidden="true">/</span><b lang="ko">한</b>'
        : '<b lang="en">EN</b><span class="sep" aria-hidden="true">/</span><span lang="ko">한</span>';
      b.setAttribute('aria-label', lang === 'ko' ? 'Switch to English (언어: 한국어)' : '한국어로 보기 (Language: English)');
    });
    $$('[data-theme-btn]').forEach(function (b) { b.setAttribute('aria-label', L('다크 모드', 'Dark mode')); });
    $$('nav[data-nav]').forEach(function (n) { n.setAttribute('aria-label', L('사이트', 'Site')); });
    // Regions labelled by a heading that exists once per language point at the visible one
    $$('[data-lb]').forEach(function (el) { var ids = el.getAttribute('data-lb').split('|'); el.setAttribute('aria-labelledby', lang === 'ko' ? ids[0] : ids[1] || ids[0]); });
    var t = $('meta[name="title-' + lang + '"]');
    if (t) document.title = t.content;
    langHooks.forEach(function (f) { f(); });
  }
  // Picking the device's own language clears the saved choice, so the site follows the device again
  function toggleLang() {
    lang = lang === 'ko' ? 'en' : 'ko';
    if (lang === deviceLang()) store.remove('tw-lang'); else store.set('tw-lang', lang);
    applyLang();
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-lang-btn]')) toggleLang(); });
  window.addEventListener('languagechange', function () {
    if (urlLang || savedLang() || deviceLang() === lang) return;
    lang = deviceLang();
    applyLang();
  });

  var saved = pick(q.get('theme'), ['light', 'dark'], pick(store.get('tw-theme'), ['light', 'dark'], null));
  if (saved) root.dataset.theme = saved;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function isDark() { return (root.dataset.theme || (mq.matches ? 'dark' : 'light')) === 'dark'; }
  function labelTheme() { $$('[data-theme-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(isDark())); }); }
  // Same rule as language: picking what the device already uses goes back to following it
  function toggleTheme() {
    var next = isDark() ? 'light' : 'dark';
    if (next === (mq.matches ? 'dark' : 'light')) { delete root.dataset.theme; store.remove('tw-theme'); }
    else { root.dataset.theme = next; store.set('tw-theme', next); }
    labelTheme();
  }
  if (mq.addEventListener) mq.addEventListener('change', labelTheme);
  document.addEventListener('click', function (e) { if (e.target.closest('[data-theme-btn]')) toggleTheme(); });

  // Platform-specific shortcut label (⌘K on Apple devices, Ctrl K elsewhere)
  $$('[data-kbd]').forEach(function (k) { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });

  // ---------- 3. Scroll loop ----------
  var head = $('.site-head');
  var prog = null;
  if (head) {
    prog = document.createElement('span');
    prog.className = 'progress';
    prog.setAttribute('aria-hidden', 'true');
    head.appendChild(prog);
  }
  var tilts = $$('[data-tilt]');
  var scenes = $$('[data-arch] .arch-scene');
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight, y = window.scrollY;
    if (head) head.classList.toggle('scrolled', y > 4);
    if (prog) {
      var max = document.documentElement.scrollHeight - vh;
      prog.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';
    }
    if (motion) {
      // Panels lie back in 3D while they enter, then stand up (--e: 1 → 0).
      tilts.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        el.style.setProperty('--e', smooth(clamp((r.top - vh * 0.28) / (vh * 0.72), 0, 1)).toFixed(3));
      });
      // Architecture layers spread apart as the band comes up (--g: 0 → 1).
      scenes.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        el.style.setProperty('--g', smooth(clamp((vh - r.top) / (vh * 0.8), 0, 1)).toFixed(3));
      });
    }
    spy(vh);
  }
  function tick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);

  // ---------- 4. Reveal ----------
  $$('[data-stagger]').forEach(function (p) {
    Array.prototype.forEach.call(p.children, function (c, i) { c.style.setProperty('--i', i); });
  });
  $$('[data-draw] > li').forEach(function (li, i) { li.style.setProperty('--i', i); });
  var revealEls = $$('[data-reveal], [data-stagger], [data-grow], [data-draw]');
  function settle(el) {
    var n = el.hasAttribute('data-stagger') ? el.children.length : 1;
    setTimeout(function () { el.classList.add('settled'); }, 1100 + n * 70);
  }
  if (motion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        settle(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    // Whatever is already on screen starts right away instead of waiting for the first observer pass.
    setTimeout(function () {
      revealEls.forEach(function (el) {
        if (el.classList.contains('in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) { el.classList.add('in'); settle(el); io.unobserve(el); }
      });
    }, 40);
  } else {
    revealEls.forEach(function (el) { el.classList.add('in', 'settled'); });
  }
  // Printing / Save as PDF: show everything, including sections never scrolled into view
  window.addEventListener('beforeprint', function () {
    root.classList.remove('motion');
    revealEls.forEach(function (el) { el.classList.add('in', 'settled'); });
  });
  window.addEventListener('afterprint', function () { if (motion) root.classList.add('motion'); });

  // ---------- 5. Section rail + scroll spy ----------
  var secs = $$('[data-toc]').filter(function (s) { return s.id; });
  var railLinks = [];
  if (secs.length > 1) {
    var rail = document.createElement('nav');
    rail.className = 'rail';
    rail.innerHTML = '<ol>' + secs.map(function (s, i) {
      var lb = s.getAttribute('data-toc').split('|');
      return '<li><a href="#' + s.id + '"><span class="rl"><span class="n">' + pad(i) + '</span>'
        + '<span data-l="ko" lang="ko">' + esc(lb[0]) + '</span><span data-l="en" lang="en">' + esc(lb[1] || lb[0]) + '</span></span>'
        + '<span class="tk" aria-hidden="true"></span></a></li>';
    }).join('') + '</ol>';
    document.body.appendChild(rail);
    railLinks = $$('a', rail);
    langHooks.push(function () { rail.setAttribute('aria-label', L('이 페이지', 'On this page')); });
  }
  var activeSec = -1;
  function spy(vh) {
    if (!railLinks.length) return;
    var idx = 0;
    for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top <= vh * 0.42) idx = i;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = secs.length - 1;
    if (idx === activeSec) return;
    activeSec = idx;
    railLinks.forEach(function (a, j) { if (j === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }

  // ---------- 6. ⌘K command palette ----------
  var ICON = {
    sec: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6.5 2.5 5 13.5M11 2.5 9.5 13.5M2.5 6h11M2 10.5h11"/></svg>',
    page: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 1.8h5.2L12.5 5v9.2H4z"/><path d="M9 1.8V5h3.5"/></svg>',
    link: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5H3.5v9h9V10M9 2.5h4.5V7M13.5 2.5 7.5 8.5"/></svg>',
    theme: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11A5.5 5.5 0 0 0 8 2.5z" fill="currentColor"/></svg>',
    lang: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5.8"/><path d="M2.2 8h11.6M8 2.2c1.7 1.6 2.5 3.5 2.5 5.8S9.7 12.2 8 13.8C6.3 12.2 5.5 10.3 5.5 8S6.3 3.8 8 2.2z"/></svg>',
  };
  var dlg = null, cmdInput = null, cmdList = null, filtered = [], active = 0;
  function here() { return location.pathname.split('/').pop() || 'index.html'; }
  function cmdItems() {
    var out = secs.map(function (s, i) {
      var lb = s.getAttribute('data-toc').split('|');
      return { g: 'sec', ko: lb[0], en: lb[1] || lb[0], n: pad(i), href: '#' + s.id };
    });
    [
      { g: 'page', ko: '홈', en: 'Home', href: 'index.html', file: 'index.html', kw: 'home index intro 소개' },
      { g: 'page', ko: 'Ovrina 만든 과정', en: 'Ovrina — how I built it', href: 'ovrina.html', file: 'ovrina.html', kw: 'ovrina case study 케이스' },
      { g: 'page', ko: 'NightCourier', en: 'NightCourier', href: document.getElementById('nightcourier') ? '#nightcourier' : 'index.html#nightcourier', kw: 'game unity 게임 나이트쿠리어' },
    ].forEach(function (p) { if (p.file !== here()) out.push(p); });
    return out.concat([
      { g: 'link', ko: 'App Store에서 Ovrina 열기', en: 'Ovrina on the App Store', href: 'https://apps.apple.com/ca/app/ovrina/id6819962270', ext: true, kw: 'ios iphone apple 앱스토어 아이폰' },
      { g: 'link', ko: 'Google Play에서 Ovrina 열기', en: 'Ovrina on Google Play', href: 'https://play.google.com/store/apps/details?id=app.ovrina', ext: true, kw: 'android 안드로이드 플레이스토어' },
      { g: 'link', ko: '웹에서 Ovrina 열기 · ovrina.app', en: 'Open ovrina.app', href: 'https://ovrina.app', ext: true, kw: 'web 웹' },
      { g: 'link', ko: 'GitHub · @TwShrimp', en: 'GitHub · @TwShrimp', href: 'https://github.com/TwShrimp', ext: true, kw: 'github code source 깃허브 코드' },
      { g: 'link', ko: 'Instagram · @ovrina.app', en: 'Instagram · @ovrina.app', href: 'https://www.instagram.com/ovrina.app/', ext: true, kw: 'instagram 인스타그램' },
      { g: 'set', icon: 'theme', ko: isDark() ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기', en: isDark() ? 'Switch to light mode' : 'Switch to dark mode', run: toggleTheme, kw: 'theme dark light 테마 다크 라이트 모드' },
      { g: 'set', icon: 'lang', ko: 'English로 보기', en: '한국어로 보기', run: toggleLang, kw: 'language english korean 언어 영어 한국어' },
    ]);
  }
  function buildCmd() {
    dlg = document.createElement('dialog');
    dlg.className = 'cmdk';
    dlg.innerHTML = '<div class="cmdk-box">'
      + '<div class="cmdk-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>'
      + '<input type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"><kbd aria-hidden="true">esc</kbd></div>'
      + '<div class="cmdk-list" id="cmdk-list" role="listbox"></div><p class="cmdk-empty" role="status"></p>'
      + '<div class="cmdk-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> <span data-t="move"></span></span><span><kbd>↵</kbd> <span data-t="open"></span></span><span><kbd>esc</kbd> <span data-t="close"></span></span></div>'
      + '</div>';
    document.body.appendChild(dlg);
    cmdInput = $('input', dlg);
    cmdList = $('.cmdk-list', dlg);
    cmdInput.addEventListener('input', function () { active = 0; drawCmd(); });
    cmdInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveCmd(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveCmd(-1); }
      else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (filtered[active]) chooseCmd(filtered[active]); }
    });
    cmdList.addEventListener('pointermove', function (e) {
      var o = e.target.closest('[role="option"]');
      if (o && +o.dataset.i !== active) { active = +o.dataset.i; markCmd(false); }
    });
    cmdList.addEventListener('click', function (e) {
      var o = e.target.closest('[role="option"]');
      if (o) chooseCmd(filtered[+o.dataset.i]);
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeCmd(); });
  }
  function labelCmd() {
    dlg.setAttribute('aria-label', L('빠른 이동', 'Quick jump'));
    cmdInput.setAttribute('aria-label', L('이동할 곳이나 실행할 것 검색', 'Search for a place or an action'));
    cmdInput.placeholder = L('어디로 갈까요? 섹션 · 링크 · 설정', 'Where to? Sections, links, settings');
    cmdList.setAttribute('aria-label', L('결과', 'Results'));
    $('[data-t="move"]', dlg).textContent = L('이동', 'move');
    $('[data-t="open"]', dlg).textContent = L('열기', 'open');
    $('[data-t="close"]', dlg).textContent = L('닫기', 'close');
  }
  function drawCmd() {
    var words = cmdInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    filtered = cmdItems().filter(function (it) {
      var hay = (it.ko + ' ' + it.en + ' ' + (it.kw || '') + ' ' + (it.n || '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    });
    if (active >= filtered.length) active = Math.max(0, filtered.length - 1);
    var groups = { sec: L('이 페이지', 'On this page'), page: L('페이지', 'Pages'), link: L('링크', 'Links'), set: L('설정', 'Settings') };
    var html = '', g = null;
    filtered.forEach(function (it, i) {
      if (it.g !== g) {
        if (g !== null) html += '</div>';
        g = it.g;
        html += '<div role="group" aria-labelledby="cmdk-g-' + g + '"><div class="cmdk-g" id="cmdk-g-' + g + '">' + groups[g] + '</div>';
      }
      html += '<div class="cmdk-o" role="option" id="cmdk-o' + i + '" data-i="' + i + '" aria-selected="false">'
        + '<span class="ic" aria-hidden="true">' + ICON[it.icon || it.g] + '</span>'
        + '<span class="cmdk-l">' + esc(it[lang]) + '</span>'
        + (it.n ? '<span class="cmdk-n">' + it.n + '</span>' : '')
        + (it.ext ? '<span class="cmdk-x" aria-hidden="true">↗</span>' : '')
        + '</div>';
    });
    if (g !== null) html += '</div>';
    cmdList.innerHTML = html;
    cmdList.hidden = !filtered.length;
    $('.cmdk-empty', dlg).textContent = filtered.length ? '' : L('맞는 항목이 없습니다', 'Nothing matches');
    cmdInput.setAttribute('aria-expanded', String(filtered.length > 0));
    markCmd(true);
  }
  function markCmd(scroll) {
    var any = false;
    $$('[role="option"]', cmdList).forEach(function (o) {
      var on = +o.dataset.i === active;
      o.setAttribute('aria-selected', String(on));
      if (on) { any = true; cmdInput.setAttribute('aria-activedescendant', o.id); if (scroll) o.scrollIntoView({ block: 'nearest' }); }
    });
    if (!any) cmdInput.removeAttribute('aria-activedescendant');
  }
  function moveCmd(d) { if (!filtered.length) return; active = (active + d + filtered.length) % filtered.length; markCmd(true); }
  function chooseCmd(it) {
    closeCmd();
    if (it.run) { it.run(); return; }
    if (it.ext) { window.open(it.href, '_blank', 'noopener'); return; }
    if (it.href.charAt(0) === '#') {
      var t = document.getElementById(it.href.slice(1));
      if (!t) return;
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
      t.focus({ preventScroll: true });
      history.replaceState(null, '', it.href);
      return;
    }
    location.href = it.href;
  }
  function openCmd() {
    if (!dlg) buildCmd();
    if (dlg.open) return;
    labelCmd();
    cmdInput.value = '';
    active = 0;
    drawCmd();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    cmdInput.focus();
  }
  function closeCmd() { if (dlg && dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); } }
  function isTyping(t) { return t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName)); }
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    // Modifier shortcut only: a bare single-key shortcut would fight screen-reader and speech-input keys (WCAG 2.1.4).
    if ((e.metaKey || e.ctrlKey) && !e.altKey && k === 'k' && !(isTyping(e.target) && !(dlg && dlg.open))) { e.preventDefault(); if (dlg && dlg.open) closeCmd(); else openCmd(); return; }
    if (e.key === 'Escape') $$('[data-bars].scrub').forEach(hideDay);
  });
  $$('[data-cmd-btn]').forEach(function (b) { b.addEventListener('click', openCmd); });
  langHooks.push(function () {
    $$('[data-cmd-btn]').forEach(function (b) { b.setAttribute('aria-label', L('빠른 이동', 'Quick jump') + ' (' + (isMac ? '⌘K' : 'Ctrl+K') + ')'); });
  });

  // ---------- 7. Work-log chart ----------
  var D = window.SITE_DATA;
  var WD = { ko: ['일', '월', '화', '수', '목', '금', '토'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  var MON = { ko: function (m) { return (m + 1) + '월'; }, en: function (m) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]; } };
  function parse(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function fmt(d) { return d.toISOString().slice(0, 10); }
  function md(s) { return s.slice(5); }
  function level(n) { return n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3; }
  function byDate(list) { var m = {}; (list || []).forEach(function (x) { (m[x.date] = m[x.date] || []).push(x); }); return m; }
  function days() {
    var out = [], d = parse(D.start), end = parse(D.asOf);
    while (d <= end) { out.push(new Date(d)); d.setUTCDate(d.getUTCDate() + 1); }
    return out;
  }
  function commitsText(c) { return c ? L('커밋 ' + c + '개', c + (c === 1 ? ' commit' : ' commits')) : L('커밋 없음', 'no commits'); }
  function dayText(d) { return d.k + ' (' + d.wd + '), ' + commitsText(d.c) + (d.notes.length ? ' · ' + d.notes.join(' · ') : ''); }

  function renderChart() {
    if (!D || !D.commits) return;
    var all = days(), n = all.length, worked = 0, total = 0;
    all.forEach(function (d) { var c = D.commits[fmt(d)] || 0; if (c) worked++; total += c; });
    var idx = {}; all.forEach(function (d, i) { idx[fmt(d)] = i; });
    var rel = byDate(D.releases), bld = byDate(D.builds), off = byDate(D.offcode);
    function x(i) { return ((i + 0.5) / n * 100).toFixed(3) + '%'; }

    $$('[data-worked]').forEach(function (el) { el.textContent = worked; });
    $$('[data-total]').forEach(function (el) { el.textContent = n; });

    $$('[data-bars]').forEach(function (host) {
      var full = host.hasAttribute('data-full');
      host._info = all.map(function (d) {
        var k = fmt(d), notes = [];
        (rel[k] || []).forEach(function (r) { notes.push(r[lang]); });
        (bld[k] || []).forEach(function (b) { notes.push(L('빌드 ', 'build ') + b.label); });
        (off[k] || []).forEach(function (o) { notes.push(o[lang]); });
        return { k: k, wd: WD[lang][d.getUTCDay()], c: D.commits[k] || 0, notes: notes };
      });
      host._launch = idx['2026-11-05'] != null ? idx['2026-11-05'] : 0;
      host.setAttribute('role', 'slider');
      host.setAttribute('tabindex', '0');
      host.setAttribute('aria-valuemin', '1');
      host.setAttribute('aria-valuemax', String(n));
      host.setAttribute('aria-label', L(
        '작업 기록 그래프. ' + D.start + '부터 ' + D.asOf + '까지 ' + n + '일 중 ' + worked + '일에 커밋이 있습니다. 화살표 키로 날짜를 옮길 수 있습니다.',
        'Work log chart. Commits on ' + worked + ' of ' + n + ' days from ' + D.start + ' to ' + D.asOf + '. Use the arrow keys to move between days.'));

      var html = '<div class="bars-plot" style="--n:' + n + '">';
      host._info.forEach(function (d, i) { html += '<span class="bar" data-lv="' + level(d.c) + '" style="--i:' + i + '"></span>'; });
      html += '</div>';
      var marks = [{ date: D.start, status: 'start', ko: '첫 커밋', en: 'First commit' }].concat(D.releases);
      html += '<div class="marks" aria-hidden="true">' + marks.map(function (m) {
        var i = idx[m.date]; if (i == null) return '';
        var align = i < n * 0.12 ? ' start' : (i > n * 0.88 ? ' end' : '');
        var st = m.status === 'planned' ? ' planned' : (m.status === 'done' ? ' done' : '');
        // Later marks can carry a short label so they don't collide with "Launch" on narrow charts.
        var name = m.short
          ? '<span class="lg">' + esc(m[lang]) + '</span><span class="st">' + esc(m.short) + '</span>'
          : esc(m[lang]);
        return '<span class="mark' + align + st + '" style="--x:' + x(i) + '"><span class="ml"><b>' + name + '</b><span>' + md(m.date) + '</span></span></span>';
      }).join('') + '</div>';
      html += '<div class="axis" aria-hidden="true">';
      all.forEach(function (d, i) {
        if (i === 0 || d.getUTCDate() === 1) html += '<span style="--x:' + (i / n * 100).toFixed(3) + '%">' + MON[lang](d.getUTCMonth()) + '</span>';
      });
      html += '</div>';
      if (full) {
        html += '<div class="lanes" aria-hidden="true">'
          + '<div class="lane"><span class="lane-name">' + L('빌드 번호', 'Build numbers') + '</span><div class="lane-track">'
          + (D.builds || []).map(function (b) {
            return '<span class="tick" style="--x:' + x(idx[b.date]) + '"><span class="tkl">' + esc(b.label.replace('1.0.0', '').replace('1.1.0', '1.1 ')) + '</span></span>';
          }).join('')
          + '</div></div>'
          + '<div class="lane"><span class="lane-name">' + L('코드 밖의 일', 'Outside the code') + '</span><div class="lane-track">'
          + (D.offcode || []).map(function (o) { return '<span class="tick off" style="--x:' + x(idx[o.date]) + '"></span>'; }).join('')
          + '</div></div></div>';
      }
      html += '<span class="cursor" aria-hidden="true"></span><div class="readout" aria-hidden="true"></div>';
      host.innerHTML = html;
      host._on = null;
      var vi = host._cur >= 0 ? host._cur : host._launch;
      host.setAttribute('aria-valuenow', String(vi + 1));
      host.setAttribute('aria-valuetext', dayText(host._info[vi]));
      if (host.classList.contains('scrub') && host._cur >= 0) showDay(host, host._cur);
      bindChart(host);
    });

    $$('[data-week-table]').forEach(function (tb) {
      var rows = [], cur = null;
      all.forEach(function (d) {
        var dow = (d.getUTCDay() + 6) % 7;
        if (!cur || dow === 0) { cur = { start: fmt(d), worked: 0, commits: 0, notes: [] }; rows.push(cur); }
        var k = fmt(d), c = D.commits[k] || 0;
        if (c) cur.worked++;
        cur.commits += c;
        (rel[k] || []).concat(off[k] || []).forEach(function (o) { cur.notes.push(md(k) + ' ' + o[lang]); });
        (bld[k] || []).forEach(function (b) { cur.notes.push(md(k) + L(' 빌드 ', ' build ') + b.label); });
      });
      tb.innerHTML = rows.map(function (r) {
        return '<tr><td>' + r.start + '</td><td>' + r.worked + '</td><td>' + r.commits + '</td><td>' + (esc(r.notes.join(' · ')) || '—') + '</td></tr>';
      }).join('') + '<tr><td><b>' + L('합계', 'Total') + '</b></td><td><b>' + worked + '</b></td><td><b>' + total + '</b></td><td></td></tr>';
    });
  }
  langHooks.push(renderChart);

  function showDay(host, i) {
    var info = host._info; if (!info) return;
    i = clamp(i, 0, info.length - 1);
    host._cur = i;
    var bars = host.querySelectorAll('.bar');
    if (host._on != null && bars[host._on]) bars[host._on].classList.remove('on');
    if (bars[i]) bars[i].classList.add('on');
    host._on = i;
    host.classList.add('scrub');
    var d = info[i], rd = $('.readout', host), cur = $('.cursor', host);
    rd.innerHTML = '<b>' + md(d.k) + '<span>' + d.wd + '</span></b><span class="c">' + commitsText(d.c) + '</span>'
      + d.notes.map(function (t) { return '<span class="nt">' + esc(t) + '</span>'; }).join('');
    var W = host.clientWidth, cx = (i + 0.5) / info.length * W, w = rd.offsetWidth;
    rd.style.transform = 'translateX(' + clamp(cx - w / 2, 0, Math.max(0, W - w)).toFixed(1) + 'px)';
    cur.style.left = cx.toFixed(1) + 'px';
    host.setAttribute('aria-valuenow', String(i + 1));
    host.setAttribute('aria-valuetext', dayText(d));
  }
  function hideDay(host) {
    host.classList.remove('scrub');
    var bars = host.querySelectorAll('.bar');
    if (host._on != null && bars[host._on]) bars[host._on].classList.remove('on');
    host._on = null;
  }
  function bindChart(host) {
    if (host._bound) return;
    host._bound = true;
    function at(e) {
      var p = $('.bars-plot', host).getBoundingClientRect();
      return clamp(Math.floor((e.clientX - p.left) / p.width * host._info.length), 0, host._info.length - 1);
    }
    host.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || host._touch) showDay(host, at(e)); });
    host.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { host._touch = true; showDay(host, at(e)); } });
    host.addEventListener('pointerup', function () { host._touch = false; });
    host.addEventListener('pointercancel', function () { host._touch = false; });
    host.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && document.activeElement !== host) hideDay(host); });
    host.addEventListener('focus', function () { if (!host.classList.contains('scrub')) showDay(host, host._cur >= 0 ? host._cur : host._launch); });
    host.addEventListener('blur', function () { hideDay(host); });
    host.addEventListener('keydown', function (e) {
      var n = host._info.length, i = host._cur >= 0 ? host._cur : host._launch;
      var step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 7, PageDown: -7 }[e.key];
      if (step) { e.preventDefault(); showDay(host, i + step); }
      else if (e.key === 'Home') { e.preventDefault(); showDay(host, 0); }
      else if (e.key === 'End') { e.preventDefault(); showDay(host, n - 1); }
      else if (e.key === 'Escape') hideDay(host);
    });
  }
  // The readout is placed in pixels, so re-place it when the chart reflows
  window.addEventListener('resize', function () { $$('[data-bars].scrub').forEach(function (h) { if (h._cur >= 0) showDay(h, h._cur); }); });
  // Touch: tap outside the chart to dismiss its readout
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    $$('[data-bars].scrub').forEach(function (h) { if (!h.contains(e.target) && !e.target.closest('[data-day]')) hideDay(h); });
  });
  // Dated items elsewhere (build pills, timeline rows) point at their day on the chart
  function chartFor() { return $('[data-bars][data-full]') || $('[data-bars]'); }
  $$('[data-day]').forEach(function (el) {
    function on() {
      var host = chartFor(); if (!host || !host._info) return;
      for (var i = 0; i < host._info.length; i++) if (host._info[i].k === el.dataset.day) { showDay(host, i); return; }
    }
    function off() { var host = chartFor(); if (host && document.activeElement !== host) hideDay(host); }
    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);
    el.addEventListener('focusin', on);
    el.addEventListener('focusout', off);
  });

  // ---------- 8. Flip cards ----------
  $$('.flip').forEach(function (card) {
    var btn = $('.flip-btn', card), front = $('.front', card), back = $('.back', card);
    function set(on) {
      card.classList.toggle('flipped', on);
      btn.setAttribute('aria-expanded', String(on));
      front.inert = on;
      back.inert = !on;
      label();
    }
    function label() { btn.setAttribute('aria-label', card.classList.contains('flipped') ? L('숫자로 돌아가기', 'Back to the number') : L('어떻게 셌는지 보기', 'How this was counted')); }
    card.addEventListener('click', function (e) { if (!e.target.closest('a')) set(!card.classList.contains('flipped')); });
    langHooks.push(label);
    set(false);
  });

  // ---------- 9. Click to reveal ----------
  $$('[data-more]').forEach(function (btn) {
    var box = document.getElementById(btn.getAttribute('aria-controls'));
    var scope = btn.closest('[data-more-scope]') || btn.parentElement;
    if (!box) return;
    if (!$('.chev', btn)) btn.insertAdjacentHTML('beforeend', CHEV);
    function set(on) { btn.setAttribute('aria-expanded', String(on)); scope.classList.toggle('open', on); box.inert = !on; }
    set(btn.getAttribute('aria-expanded') === 'true');
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  });

  // ---------- 10. Privacy viewer ----------
  var PV = [
    { t0: '09:30', t1: '11:00', ko: '자료구조 수업', en: 'Data Structures', pub: false },
    { t0: '12:30', t1: '14:00', ko: '치과', en: 'Dentist', pub: false },
    { t0: '15:00', t1: '16:30', ko: '스터디', en: 'Study group', pub: true },
  ];
  $$('[data-privacy]').forEach(function (st) {
    var tabs = $$('[role="tab"]', st), ind = $('.pv-ind', st), panel = $('[role="tabpanel"]', st), out = $('[data-pv-out]', st);
    function moveInd() {
      var t = tabs.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0];
      if (!t || !ind) return;
      ind.style.width = t.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + t.offsetLeft + 'px)';
    }
    function drawOut() {
      var v = st.dataset.v, rows = v === 'hidden' ? [] : PV;
      var sql = v === 'me'
        ? '<span class="fn">select</span> starts_at, ends_at, title <span class="fn">from</span> events'
        : '<span class="fn">select</span> * <span class="fn">from</span> busy_blocks(…)';
      var who = { me: L('나 = 주인, RLS 통과', 'me = owner, passes RLS'), friend: L('민지 = 친구', 'Minji = a friend'), hidden: L('지우 = 내가 바쁜 시간을 숨긴 친구', 'Jiwoo = a friend I hide my busy times from') }[v];
      out.innerHTML = '<div class="q">' + sql + '</div><div class="q">-- ' + who + '</div>'
        + '<div class="tw"><table><thead><tr><th>starts_at</th><th>ends_at</th><th>title</th></tr></thead><tbody>'
        + (rows.length ? rows.map(function (e, i) {
          var showTitle = v === 'me' || e.pub;
          return '<tr style="--r:' + i + '"><td>' + e.t0 + '</td><td>' + e.t1 + '</td>' + (showTitle ? '<td>"' + esc(e[lang]) + '"</td>' : '<td class="null">null</td>') + '</tr>';
        }).join('') : '<tr class="none"><td colspan="3">' + L('(행 없음)', '(no rows)') + '</td></tr>')
        + '</tbody></table></div><div class="rows">' + rows.length + (rows.length === 1 ? ' row' : ' rows') + '</div>';
    }
    function set(v, focus) {
      st.dataset.v = v;
      tabs.forEach(function (b) {
        var on = b.dataset.viewer === v;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        if (on) { panel.setAttribute('aria-labelledby', b.id); if (focus) b.focus(); }
      });
      moveInd();
      drawOut();
    }
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { set(b.dataset.viewer); });
      b.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (e.key === 'Home') d = -i; else if (e.key === 'End') d = tabs.length - 1 - i;
        if (d == null) return;
        e.preventDefault();
        set(tabs[(i + d + tabs.length) % tabs.length].dataset.viewer, true);
      });
    });
    window.addEventListener('resize', moveInd);
    langHooks.push(function () {
      var list = $('[role="tablist"]', st);
      if (list) list.setAttribute('aria-label', L('보는 사람', 'Viewer'));
      requestAnimationFrame(moveInd);
      drawOut();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);
    set(st.dataset.v || 'me');
  });

  // ---------- 11. Find-a-time demo (sample data, illustrative) ----------
  var FT = {
    from: 9, to: 22,
    people: [
      { id: 'me', ko: '나', en: 'Me', ini: { ko: '나', en: 'Me' }, c: 'var(--text);color:var(--bg)', me: true,
        // Same Tuesday as the privacy viewer below
        busy: [[9.5, 11, '자료구조 수업', 'Data Structures'], [12.5, 14, '치과', 'Dentist'], [15, 16.5, '스터디', 'Study group']] },
      { id: 'mj', ko: '민지', en: 'Minji', ini: 'M', c: '#2f5bea', busy: [[10, 12], [14, 15], [17.5, 18.5]],
        say: { ko: '좋아요!', en: 'Sounds good!' } },
      { id: 'cw', ko: '채원', en: 'Chaewon', ini: 'C', c: '#16a3cc', busy: [[9, 11], [13, 15], [20.5, 21.5]],
        say: { ko: '조금 늦을 수도 있어요', en: 'Might be a bit late' } },
      { id: 'dy', ko: '도윤', en: 'Doyun', ini: 'D', c: '#7a5af5', busy: [[11, 12.5], [15, 16], [18, 19]] },
    ],
  };
  function hm(h) { var H = Math.floor(h), m = Math.round((h - H) * 60); return pad(H) + ':' + pad(m); }
  function clock(h) {
    var H = Math.floor(h), m = Math.round((h - H) * 60), h12 = ((H + 11) % 12) + 1;
    return { t: h12 + ':' + pad(m), pm: H >= 12 };
  }
  function range12(a, b) {
    var x = clock(a), y = clock(b);
    if (lang === 'ko') return (x.pm ? '오후 ' : '오전 ') + x.t + ' – ' + (x.pm === y.pm ? '' : (y.pm ? '오후 ' : '오전 ')) + y.t;
    return x.t + (x.pm === y.pm ? '' : (x.pm ? ' PM' : ' AM')) + ' – ' + y.t + (y.pm ? ' PM' : ' AM');
  }
  function freeWindows(sel) {
    var busy = [];
    FT.people.forEach(function (p) { if (sel[p.id]) p.busy.forEach(function (b) { busy.push([b[0], b[1]]); }); });
    busy.sort(function (a, b) { return a[0] - b[0]; });
    var out = [], t = FT.from;
    busy.forEach(function (b) { if (b[0] > t) out.push([t, Math.min(b[0], FT.to)]); t = Math.max(t, b[1]); });
    if (t < FT.to) out.push([t, FT.to]);
    return out.filter(function (w) { return w[1] - w[0] >= 0.5; });
  }
  function bestOf(ws) {
    var ok = ws.filter(function (w) { return w[1] - w[0] >= 1; });
    var eve = ok.filter(function (w) { return w[0] >= 17; })[0];
    if (eve) return eve;
    return ok.sort(function (a, b) { return (b[1] - b[0]) - (a[1] - a[0]); })[0] || ws[0] || null;
  }
  $$('[data-findtime]').forEach(function (ft) {
    var sel = { me: true, mj: true, cw: true, dy: true }, pickW = null, rsvp = 'yes';
    var peopleEl = $('.ft-people', ft), grid = $('.ft-grid', ft), count = $('.ft-count', ft), best = $('.ft-best', ft),
      go = $('.ft-go', ft), inv = $('.ft-invite .invite', ft), steps = $$('.ft-step', ft), live = $('[data-ft-live]', ft);
    function ini(p) { return typeof p.ini === 'string' ? p.ini : p.ini[lang]; }
    function setStep(s) {
      if (s === 3 && (!friends().length || !plan())) s = 2; // nothing to invite yet
      ft.dataset.step = String(s);
      steps.forEach(function (b) { if (+b.dataset.step === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      $('.ft-invite', ft).inert = s !== 3;
      // While the invite covers the card, the controls underneath leave the tab order
      $$('.ft-people, .ft-grid, .ft-foot', ft).forEach(function (n) { n.inert = s === 3; });
      if (s === 3) drawInvite();
      return s;
    }
    function friends() { return FT.people.filter(function (p) { return !p.me && sel[p.id]; }); }
    function plan() {
      var ws = freeWindows(sel), w = pickW || bestOf(ws);
      return w ? [w[0], Math.min(w[0] + 1, w[1])] : null;
    }
    function drawPeople() {
      peopleEl.innerHTML = FT.people.map(function (p) {
        return '<button type="button" class="ft-p" data-p="' + p.id + '" aria-pressed="' + !!sel[p.id] + '"' + (p.me ? ' disabled' : '') + '>'
          + '<i class="av" style="--c:' + p.c + '" aria-hidden="true">' + esc(ini(p)) + '</i><span>' + esc(p[lang]) + '</span></button>';
      }).join('');
      peopleEl.setAttribute('aria-label', L('함께할 사람', 'Who’s coming'));
    }
    function drawGrid() {
      var ws = freeWindows(sel), b = bestOf(ws), html = '<div class="ft-hours" aria-hidden="true">';
      for (var h = FT.from; h <= FT.to; h += 2) html += '<span style="--y:' + ((h - FT.from) / (FT.to - FT.from) * 100).toFixed(2) + '%">' + h + '</span>';
      html += '</div>';
      FT.people.forEach(function (p) {
        html += '<div class="ft-col' + (sel[p.id] ? '' : ' off') + '" aria-hidden="true">' + p.busy.map(function (x) {
          return '<span class="ft-b ' + (p.me ? 'mine' : 'busy') + '" style="--t0:' + x[0] + ';--t1:' + x[1] + '">' + esc(p.me ? (lang === 'ko' ? x[2] : x[3]) : L('바쁨', 'Busy')) + '</span>';
        }).join('') + '</div>';
      });
      var hasFriend = friends().length > 0;
      if (hasFriend) ws.forEach(function (w) {
        var isBest = b && w[0] === b[0] && w[1] === b[1], len = w[1] - w[0];
        html += '<button type="button" class="ft-free' + (isBest ? ' best' : '') + (len < 1 ? ' sm' : '') + '" data-w="' + w[0] + '-' + w[1] + '" style="--t0:' + w[0] + ';--t1:' + w[1] + '"'
          + ' aria-label="' + esc(hm(w[0]) + '–' + hm(w[1]) + ' ' + L('모두 비어 있음, 이 시간으로 약속 만들기', 'everyone free, make a plan here')) + '">'
          + '<span class="lb">' + hm(w[0]) + '–' + hm(w[1]) + '</span>' + (isBest && len >= 1 ? '<span class="tg">' + L('추천', 'Pick') + '</span>' : '') + '</button>';
      });
      grid.innerHTML = html;
      var p = plan();
      count.textContent = hasFriend ? L('모두 비는 시간 ' + ws.length + '곳', ws.length + (ws.length === 1 ? ' open window' : ' open windows')) : L('친구를 골라 주세요', 'Pick a friend');
      best.innerHTML = !hasFriend ? L('함께할 친구를 한 명 이상 골라 주세요.', 'Pick at least one friend.')
        : p ? L('추천 ', 'Suggested ') + '<b>' + hm(p[0]) + '–' + hm(p[1]) + '</b>'
        : L('모두 비는 시간이 없습니다. 한 명을 빼 보세요.', 'No time works for everyone. Try removing someone.');
      go.disabled = !hasFriend || !p;
      go.textContent = L('약속 만들기', 'Make the plan');
      live.textContent = count.textContent + '. ' + best.textContent;
      if (ft.dataset.step === '3') { if (go.disabled) setStep(2); else drawInvite(); }
    }
    function drawInvite() {
      var p = plan(); if (!p) return;
      var fr = friends();
      var title = p[0] >= 17 ? L('스터디 끝나고 저녁', 'Dinner after study group') : L('같이 카페', 'Coffee together');
      inv.innerHTML = '<div class="t">' + title + '</div>'
        + '<div class="w">' + L('화', 'Tue') + ' · ' + range12(p[0], p[1]) + '</div>'
        + '<div class="to">' + fr.map(function (f) { return '<i class="av" style="--c:' + f.c + '" aria-hidden="true">' + esc(ini(f)) + '</i>'; }).join('')
        + '<span>' + esc(fr.map(function (f) { return f[lang]; }).join(', ')) + L(' 초대함', ' invited') + '</span></div>'
        + '<div class="rsvp" role="group" aria-label="' + L('참석 여부', 'RSVP') + '"><button type="button" data-r="yes" aria-pressed="' + (rsvp === 'yes') + '">' + L('갈게요', 'Going') + '</button>'
        + '<button type="button" data-r="no" aria-pressed="' + (rsvp === 'no') + '">' + L('못 가요', 'Can’t') + '</button></div>'
        + '<div class="cm">' + fr.filter(function (f) { return f.say; }).map(function (f) {
          return '<div><i class="av" style="--c:' + f.c + '" aria-hidden="true">' + esc(ini(f)) + '</i><span>' + esc(f.say[lang]) + '</span></div>';
        }).join('') + '</div>';
      $('.ft-back', ft).textContent = L('← 다른 시간 고르기', '← Pick another time');
    }
    ft.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('.ft-p')) && !t.disabled) { sel[t.dataset.p] = !sel[t.dataset.p]; pickW = null; drawPeople(); drawGrid(); var again = $('[data-p="' + t.dataset.p + '"]', peopleEl); if (again) again.focus(); return; }
      if ((t = e.target.closest('.ft-free'))) { pickW = t.dataset.w.split('-').map(Number); if (setStep(3) === 3) $('.ft-back', ft).focus(); return; }
      if ((t = e.target.closest('.ft-go'))) { pickW = null; if (setStep(3) === 3) $('.ft-back', ft).focus(); return; }
      if ((t = e.target.closest('.ft-back'))) { pickW = null; setStep(2); drawGrid(); go.focus(); return; }
      if ((t = e.target.closest('[data-r]'))) { rsvp = t.dataset.r; drawInvite(); var r = $('[data-r="' + rsvp + '"]', inv); if (r) r.focus(); return; }
      if ((t = e.target.closest('.ft-step'))) { setStep(+t.dataset.step); }
    });
    // Keyboard users who press Enter on a step button land inside the opened invite
    steps.forEach(function (b) {
      b.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && +b.dataset.step === 3) { e.preventDefault(); if (setStep(3) === 3) $('.ft-back', ft).focus(); }
      });
    });
    langHooks.push(function () { drawPeople(); drawGrid(); if (ft.dataset.step === '3') drawInvite(); });
    setStep(+(ft.dataset.step || 1));
  });

  // ---------- 12. Architecture layers ----------
  $$('[data-arch]').forEach(function (a) {
    var btns = $$('[data-layer-btn]', a), plates = $$('.plate', a);
    function set(i) {
      plates.forEach(function (p, j) { p.classList.toggle('on', j === i); });
      btns.forEach(function (b, j) {
        var on = j === i, box = document.getElementById(b.getAttribute('aria-controls'));
        b.setAttribute('aria-expanded', String(on));
        b.parentElement.classList.toggle('open', on);
        if (box) box.inert = !on;
      });
    }
    btns.forEach(function (b, j) {
      if (!$('.chev', b)) b.insertAdjacentHTML('beforeend', CHEV);
      b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') === 'true' ? -1 : j); });
    });
    plates.forEach(function (p, j) { p.addEventListener('click', function () { set(j); }); });
    set(0);
  });
  // ---------- 12b. Ovrina wordmark: the planet slips out of the ring's gap onto the i ----------
  // The mark is split in two (ring = O, planet = the dot on the i). On first view the planet
  // starts where it sits in the app icon — in the ring's gap — and travels to its place.
  $$('[data-split]').forEach(function (box) {
    var ring = $('.ovw-o', box), p = $('.ovw-p', box);
    if (!motion || !ring || !p || !('IntersectionObserver' in window)) return;
    function aim() {
      var cur = p.getBoundingClientRect(), r = ring.getBoundingClientRect();
      var dx0 = parseFloat(p.style.getPropertyValue('--dx')) || 0, dy0 = parseFloat(p.style.getPropertyValue('--dy')) || 0;
      var hx = cur.left + cur.width / 2 - dx0, hy = cur.top + cur.height / 2 - dy0; // home: over the i
      var gx = r.left + r.width * 0.7149, gy = r.top + r.height * 0.1626;           // the gap at -57.5°
      p.style.setProperty('--dx', (gx - hx).toFixed(1) + 'px');
      p.style.setProperty('--dy', (gy - hy).toFixed(1) + 'px');
    }
    box.classList.add('split-ready');
    aim();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!box.classList.contains('split-go')) aim(); });
    window.addEventListener('resize', function () { if (!box.classList.contains('split-go')) aim(); });
    // Don't spend the one-time move on invisible letters (the face is font-display: block)
    var face = document.fonts && document.fonts.load ? document.fonts.load('800 1em "Ovrina Nunito"') : Promise.resolve();
    var watch = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      watch.disconnect();
      Promise.race([face, new Promise(function (r) { setTimeout(r, 3000); })]).then(function () {
        if (document.fonts && document.fonts.check && !document.fonts.check('800 1em "Ovrina Nunito"')) {
          box.classList.add('split-go', 'split-done'); // font still missing: just put the planet in place
          return;
        }
        setTimeout(function () {
          aim();
          box.classList.add('split-go');
          setTimeout(function () { box.classList.add('split-done'); }, 1150);
        }, 650);
      });
    }, { threshold: 0.5 });
    watch.observe(box);
  });

  // ---------- 13. Footer wordmark: letters thin out near the cursor ----------
  if (fine && motion) $$('.wordmark-xl').forEach(function (w) {
    var txt = w.textContent;
    w.innerHTML = txt.split('').map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
    var spans = $$('span', w), foot = w.closest('footer') || w, centers = [], raf = 0, px = null, py = null;
    function measure() { centers = spans.map(function (s) { var r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); }
    function apply() {
      raf = 0;
      spans.forEach(function (s, i) {
        var wgt = 700;
        if (px != null && centers[i]) {
          var dx = centers[i][0] - px, dy = centers[i][1] - py;
          if (Math.abs(dy) < 280) wgt = 700 - 480 * Math.exp(-(dx * dx) / (2 * 120 * 120)) * (1 - Math.abs(dy) / 280);
        }
        s.style.fontWeight = String(Math.round(wgt));
      });
    }
    foot.addEventListener('pointerenter', function () { spans.forEach(function (s) { s.style.fontWeight = ''; }); measure(); });
    foot.addEventListener('pointermove', function (e) {
      if (!centers.length) measure();
      px = e.clientX; py = e.clientY + 0; if (!raf) raf = requestAnimationFrame(apply);
    });
    foot.addEventListener('pointerleave', function () { px = null; if (!raf) raf = requestAnimationFrame(apply); });
    window.addEventListener('scroll', function () { centers = []; }, { passive: true });
    window.addEventListener('resize', function () { centers = []; });
  });

  // ---------- 14. Cursor spotlight on cards ----------
  if (fine) {
    $$('.card:not(.card-log), .decision, .problem').forEach(function (c) { c.classList.add('spot'); });
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.spot');
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    }, { passive: true });
  }

  // ---------- Start ----------
  applyLang();
  labelTheme();
  frame();
  if (q.get('y')) window.scrollTo({ top: +q.get('y') || 0, behavior: 'instant' });
  try {
    console.log('%cTwShrimp%c  ' + L('코드가 궁금하시면 연락 주세요 → github.com/TwShrimp', 'Curious about the code? Say hi → github.com/TwShrimp'),
      'font:700 18px/1.4 system-ui;color:#2f5bea', 'font:13px/1.4 system-ui;color:#6b6b72');
  } catch (e) {}
})();

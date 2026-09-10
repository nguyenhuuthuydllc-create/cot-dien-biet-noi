(function () {
  'use strict';
  function youtubeId(value) {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:') return null;
      const host = u.hostname.replace(/^www\./, '');
      let id;
      if (host === 'youtu.be') id = u.pathname.slice(1);
      else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
        id = u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(u.pathname)?.[1];
      }
      return /^[\w-]{11}$/.test(id || '') ? id : null;
    } catch (_) { return null; }
  }
  function safeSource(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const s = value.trim();
    if (/^https:\/\//i.test(s)) {
      try { const u = new URL(s); return u.username || u.password ? null : u.href; } catch (_) { return null; }
    }
    // Relative media files remain usable when the package is opened locally.
    if (/^(?:\.\/)?media\/[a-zA-Z0-9_./-]+$/.test(s) && !s.split('/').includes('..')) return s;
    return null;
  }
  window.EVNMediaUtils = { youtubeId, safeSource };
  const root = document.querySelector('[data-evn-media]');
  if (!root) return;
  const list = root.querySelector('.evn-media-list');
  const empty = root.querySelector('.evn-media-empty');
  const entries = (window.EVN_MEDIA || {})[root.dataset.evnMedia];
  let active = null;
  function stopActive() {
    if (!active) return;
    if (active.tagName === 'IFRAME') active.src = 'about:blank';
    else active.pause();
    active = null;
  }
  document.addEventListener('play', event => {
    if (active !== event.target) stopActive();
    active = event.target;
  }, true);
  window.addEventListener('pagehide', stopActive);
  (Array.isArray(entries) ? entries : []).forEach(item => {
    if (!item || typeof item.title !== 'string' || !item.title.trim()) return;
    const id = item.kind === 'youtube' ? youtubeId(item.src) : null;
    const src = ['video', 'audio'].includes(item.kind) ? safeSource(item.src) : null;
    if (!id && !src) return;
    const card = document.createElement('article'); card.className = 'evn-media-item';
    const title = document.createElement('h3'); title.textContent = item.title;
    card.append(title);
    const play = document.createElement('button'); play.type = 'button';
    play.textContent = item.kind === 'audio' ? '🔊 Nghe bài tuyên truyền' : '▶ Xem video';
    card.append(play);
    let player = null;
    play.addEventListener('click', () => {
      stopActive();
      if (!player) {
        player = document.createElement(id ? 'iframe' : item.kind);
        if (id) {
          player.title = item.title;
          player.allow = 'encrypted-media; fullscreen; picture-in-picture';
          player.allowFullscreen = true;
          player.referrerPolicy = 'strict-origin-when-cross-origin';
        } else {
          player.controls = true;
          player.preload = 'none';
          player.setAttribute('aria-label', item.title);
          if (item.kind === 'video') player.playsInline = true;
          player.addEventListener('error', () => {
            if (card.querySelector('.evn-media-error')) return;
            const msg = document.createElement('p'); msg.className = 'evn-media-error';
            msg.setAttribute('role', 'status');
            msg.textContent = 'Chưa phát được nội dung. Vui lòng kiểm tra kết nối hoặc dùng liên kết bên dưới.';
            card.append(msg);
          });
        }
        play.after(player);
      }
      player.src = id ? 'https://www.youtube-nocookie.com/embed/' + id : src;
      active = player;
      if (!id) {
        play.hidden = true;
        const p = player.play(); if (p) p.catch(() => {});
      } else {
        play.textContent = 'Mở lại video';
      }
    });
    const direct = document.createElement('a');
    direct.href = id ? 'https://www.youtube.com/watch?v=' + id : src;
    direct.target = '_blank'; direct.rel = 'noopener noreferrer';
    direct.textContent = id ? 'Mở trên YouTube ↗' : 'Mở tệp riêng ↗';
    card.append(direct); list.append(card);
  });
  if (list.children.length) empty.hidden = true;
})();

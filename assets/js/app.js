(() => {
  'use strict';

  const PROFILE = {
    firstName: 'David Augusto',
    lastName: 'Keller Haddad',
    fullName: 'David Augusto Keller Haddad',
    title: 'Senior Software Engineer',
    note: 'Backend & Software Architecture | PHP/Laravel | Node.js | Go | SaaS',
    email: 'davidakhaddad@gmail.com',
    phone: '+5519992878520',
    linkedin: 'https://www.linkedin.com/in/david-augusto-keller-haddad/',
  };

  // URL canônica do cartão (sem query/hash) — usada no QR, NFC, share e vCard
  const PAGE_URL = location.origin + location.pathname.replace(/index\.html$/, '');

  const $ = (sel) => document.querySelector(sel);

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, ms = 2800) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), ms);
  }

  /* ---------- Efeito terminal ---------- */
  function typeLoop() {
    const el = $('#typed');
    const phrases = ['whoami', 'go run ./api', 'php artisan serve', 'npm run build', 'git push origin main'];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = phrases[0];
      return;
    }
    let p = 0, i = 0, deleting = false;
    (function tick() {
      const word = phrases[p];
      i += deleting ? -1 : 1;
      el.textContent = word.slice(0, i);
      let delay = deleting ? 40 : 85;
      if (!deleting && i === word.length) { deleting = true; delay = 1800; }
      else if (deleting && i === 0) { deleting = false; p = (p + 1) % phrases.length; delay = 400; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- vCard ---------- */
  function downloadVCard() {
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${PROFILE.lastName};${PROFILE.firstName};;;`,
      `FN:${PROFILE.fullName}`,
      `TITLE:${PROFILE.title}`,
      `EMAIL;TYPE=INTERNET,PREF:${PROFILE.email}`,
      `TEL;TYPE=CELL,VOICE:${PROFILE.phone}`,
      `URL;TYPE=LinkedIn:${PROFILE.linkedin}`,
      `URL:${PAGE_URL}`,
      `NOTE:${PROFILE.note.replace(/[,;]/g, '\\$&')}`,
      'END:VCARD',
    ].join('\r\n');

    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'david-haddad.vcf' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Contato gerado — abra o arquivo para salvar');
  }

  /* ---------- Compartilhar ---------- */
  async function share() {
    const data = { title: PROFILE.fullName, text: `${PROFILE.fullName} · ${PROFILE.title}`, url: PAGE_URL };
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível compartilhar'); }
      return;
    }
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      toast('Link copiado para a área de transferência');
    } catch {
      toast(PAGE_URL, 5000);
    }
  }

  /* ---------- QR Code ---------- */
  function openQr() {
    const box = $('#qr');
    if (!box.hasChildNodes()) {
      if (typeof window.qrcode !== 'function') {
        toast('QR Code indisponível offline');
        return;
      }
      const qr = window.qrcode(0, 'M');
      qr.addData(PAGE_URL);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
      $('#qr-url').textContent = PAGE_URL;
    }
    $('#qr-modal').showModal();
  }

  /* ---------- NFC (Web NFC — Chrome Android) ---------- */
  function setupNfc() {
    if (!('NDEFReader' in window)) return;
    const btn = $('#btn-nfc');
    btn.hidden = false;

    btn.addEventListener('click', async () => {
      const ctrl = new AbortController();
      btn.classList.add('is-busy');
      toast('Aproxime a tag NFC do celular…', 15000);
      const timeout = setTimeout(() => ctrl.abort(), 15000);
      try {
        const ndef = new NDEFReader();
        await ndef.write({ records: [{ recordType: 'url', data: PAGE_URL }] }, { signal: ctrl.signal });
        toast('Tag NFC gravada com sucesso ✓');
      } catch (e) {
        const msg = e.name === 'AbortError' ? 'Tempo esgotado — tente novamente'
          : e.name === 'NotAllowedError' ? 'Permissão de NFC negada'
          : 'Falha ao gravar a tag NFC';
        toast(msg);
      } finally {
        clearTimeout(timeout);
        btn.classList.remove('is-busy');
      }
    });
  }

  /* ---------- PWA ---------- */
  function setupPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }

    let deferred;
    const btn = $('#btn-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      btn.hidden = false;
    });
    btn.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      btn.hidden = true;
    });
    window.addEventListener('appinstalled', () => {
      btn.hidden = true;
      toast('App instalado ✓');
    });
  }

  /* ---------- Efeito tilt (desktop) ---------- */
  function setupTilt() {
    const card = $('#card');
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  }

  $('#year').textContent = new Date().getFullYear();
  $('#btn-vcard').addEventListener('click', downloadVCard);
  $('#btn-share').addEventListener('click', share);
  $('#btn-qr').addEventListener('click', openQr);
  $('#qr-modal').addEventListener('click', (e) => { if (e.target.id === 'qr-modal') e.target.close(); });

  typeLoop();
  setupNfc();
  setupPwa();
  setupTilt();
})();

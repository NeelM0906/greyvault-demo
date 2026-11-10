(() => {
  const GV = window.GV;
  const doc = document.documentElement;
  const ROOT = doc.dataset.root || '';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js');

  const store = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    write(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
  };
  const waLink = text => `https://wa.me/${GV.whatsapp}?text=${encodeURIComponent(text)}`;

  $$('[data-copyright-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  const menuBtn = $('.menu-toggle');
  const nav = $('#primary-nav');
  menuBtn?.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav?.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.focus();
    }
  });

  const SAVED_KEY = 'gv:saved';
  const saved = new Set(store.read(SAVED_KEY, []).filter(id => GV.watches[id]));
  function renderSaved() {
    $$('[data-save]').forEach(btn => {
      const on = saved.has(btn.dataset.save);
      btn.setAttribute('aria-pressed', String(on));
      const label = $('[data-save-label]', btn);
      if (label) label.textContent = on ? 'Saved to watchlist' : 'Save to watchlist';
    });
    $$('[data-saved-count]').forEach(el => {
      el.textContent = saved.size;
      el.hidden = saved.size === 0;
    });
    const grid = $('[data-saved-grid]');
    if (grid) {
      $$('[data-card]', grid).forEach(c => c.classList.toggle('is-saved', saved.has(c.dataset.id)));
      $('[data-saved-empty]').hidden = saved.size > 0;
      $('[data-saved-actions]').hidden = saved.size === 0;
      const list = [...saved].map(id => `${GV.watches[id].name} ref. ${GV.watches[id].ref}`).join('; ');
      const wa = $('[data-wa-saved]');
      if (wa) wa.href = waLink(`Hello ${GV.brand}, I'm interested in these watches: ${list}.`);
    }
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-save]');
    if (!btn) return;
    const id = btn.dataset.save;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    store.write(SAVED_KEY, [...saved]);
    renderSaved();
  });
  renderSaved();

  const dialog = $('#inquiry-dialog');
  let lastFocus = null;
  function openInquiry({ id = '', intent = 'question', message = '' } = {}) {
    if (!dialog) return;
    const form = $('form', dialog);
    resetForm(form);
    $('[data-form-body]', dialog).hidden = false;
    $('[data-success]', dialog).hidden = true;
    const w = GV.watches[id];
    form.watchId.value = w ? id : '';
    $('[data-inq-watch]', dialog).hidden = !w;
    $('#inq-title', dialog).textContent = w ? 'Ask about this watch' : `Contact ${GV.brand}`;
    if (w) {
      $('[data-inq-img]', dialog).src = ROOT + w.img;
      $('[data-inq-name]', dialog).textContent = w.name;
      $('[data-inq-ref]', dialog).textContent = `Ref. ${w.ref} · ${w.year} · ${w.priceLabel}`;
    }
    const radio = $(`input[name="intent"][value="${intent}"]`, form);
    if (radio) radio.checked = true;
    $('.intent', form).hidden = !w;
    form.message.value = message;
    syncOffer(form);
    $('[data-inq-wa]', dialog).href = w
      ? waLink(`Hello ${GV.brand}, I'm interested in the ${w.name.replace(/"/g, '')}, ref. ${w.ref} (${w.year}), listing ${id}. Is it available?`)
      : waLink(`Hello ${GV.brand}, I have a question.`);
    lastFocus = document.activeElement;
    dialog.showModal();
    doc.classList.add('is-modal-open');
    form.name.focus();
  }
  function syncOffer(form) {
    const field = $('[data-offer-field]', form);
    if (field) field.hidden = form.intent?.value !== 'offer';
  }
  dialog?.addEventListener('change', e => e.target.name === 'intent' && syncOffer(e.target.form));
  dialog?.addEventListener('close', () => {
    doc.classList.remove('is-modal-open');
    lastFocus?.focus?.();
  });
  dialog?.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-inquire]');
    if (trigger) {
      openInquiry({ id: trigger.dataset.inquire, intent: trigger.dataset.intent });
      return;
    }
    if (e.target.closest('[data-inquire-saved]')) {
      const list = [...saved].map(id => `${GV.watches[id].name}, ref. ${GV.watches[id].ref}`).join('\n');
      openInquiry({ message: `I'm interested in:\n${list}` });
    }
  });

  const MAX_PHOTOS = 6;
  const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
  const closedDays = new Set(GV.hours.filter(h => !h.open && /closed/i.test(h.note || '')).map(h => h.day));
  const dayName = d => d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

  const rules = {
    email: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address.',
    phone: v => !v || v.replace(/\D/g, '').length >= 7 || 'Enter a valid phone number.',
    year: v => !v || (/^(19|20)\d{2}$/.test(v) && +v <= new Date().getFullYear()) || 'Enter a four-digit year.',
    offer: (v, form) => form.intent?.value !== 'offer' || /^\$?\s*[\d,]+$/.test(v.trim()) || 'Enter your offer in dollars.',
    date: v => {
      if (!v) return true;
      const d = new Date(`${v}T00:00:00Z`);
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      if (d < today) return 'Choose a future date.';
      if (closedDays.has(dayName(d))) return `We are closed on ${dayName(d)}s. Choose another day.`;
      return true;
    },
    photos: (_, form) => {
      const files = [...(form.photos?.files || [])];
      if (files.length > MAX_PHOTOS) return `Up to ${MAX_PHOTOS} photos, please.`;
      if (files.some(f => f.size > MAX_PHOTO_BYTES)) return 'Each photo must be under 10 MB.';
      return true;
    },
  };

  function setError(form, name, msg) {
    const input = form.elements[name];
    const err = $(`[data-err-for="${name}"]`, form);
    if (input && input.setAttribute) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) {
        err.id ||= `err-${form.dataset.form}-${name}`;
        input.setAttribute('aria-describedby', err.id);
      }
    }
    if (err) err.textContent = msg || '';
  }
  function resetForm(form) {
    form.reset();
    delete form.dataset.state;
    $$('[aria-invalid]', form).forEach(el => el.removeAttribute('aria-invalid'));
    $$('.err', form).forEach(el => (el.textContent = ''));
    const preview = $('[data-photo-preview]', form);
    if (preview) preview.innerHTML = '';
  }
  function validate(form) {
    const errors = [];
    for (const el of form.elements) {
      if (!el.name || el.type === 'hidden' || el.type === 'radio' || el.type === 'checkbox' || el.closest('[hidden]')) continue;
      let msg = '';
      const v = el.type === 'file' ? '' : el.value.trim();
      if (el.required && !v) msg = el.tagName === 'SELECT' ? 'Please choose one.' : 'Required.';
      const rule = rules[el.name] || rules[el.type];
      if (!msg && rule) {
        const r = rule(v, form);
        if (r !== true) msg = r;
      }
      setError(form, el.name, msg);
      if (msg) errors.push(el);
    }
    if (form.dataset.form === 'inquiry' && !form.email.value.trim() && !form.phone.value.trim()) {
      setError(form, 'email', 'Add an email or a phone number so we can reply.');
      errors.push(form.email);
    }
    return errors.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  }

  const SUCCESS = {
    inquiry: d => {
      const w = GV.watches[d.watchId];
      const intent = { hold: `We will hold the ${w?.name || 'watch'} for ${GV.holdHours} hours once we confirm with you.`, viewing: 'We will confirm a time to see it at the booth.', offer: 'We will reply to your offer within one business day.' }[d.intent];
      return ['Inquiry received', `${intent || 'A member of the team will reply shortly.'} We usually answer within two business hours by ${d.preferred.toLowerCase()}.`];
    },
    sell: () => ['Thank you. We have your watch details.', 'Our buying team will reply within one business day with an outright offer and a trade value.'],
    appointment: d => ['Appointment requested', `We will confirm ${d.date} at ${d.time} by email shortly. Bring a photo ID to the lobby desk.`],
    alert: d => [d.kind === 'price' ? 'Price alert set' : 'Request received', d.kind === 'price' ? 'One email if the price changes or the watch sells. Nothing else.' : 'We will message you when a match arrives, before it is listed.'],
  };

  async function send(type, payload) {
    const { endpoint, storageKey } = GV.forms;
    if (endpoint) {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Form endpoint returned ${res.status}`);
      return;
    }
    const all = store.read(storageKey, []);
    all.push(payload);
    if (!store.write(storageKey, all)) throw new Error('Could not save locally');
  }

  document.addEventListener('submit', async e => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const errors = validate(form);
    if (errors.length) {
      errors[0].focus();
      return;
    }
    const type = form.dataset.form;
    const data = {};
    for (const [k, v] of new FormData(form)) {
      if (v instanceof File) {
        if (v.name) (data[k] ||= []).push(v.name);
      } else data[k] = v;
    }
    const ref = `GV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const payload = { ...data, type, ref, createdAt: new Date().toISOString(), page: location.pathname };
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    try {
      await send(type, payload);
    } catch (err) {
      btn.disabled = false;
      alertBox(form, 'Sorry, that did not send. Please try again, or message us on WhatsApp.');
      return;
    }
    btn.disabled = false;
    const [title, body] = SUCCESS[type](data);
    const success = $('[data-success]', form) || $('[data-success]', form.closest('dialog'));
    success.innerHTML = `<h3></h3><p></p><p class="ref-code">Reference ${ref}</p>${type === 'inquiry' ? '<button class="btn btn-ghost" type="button" data-close>Close</button>' : ''}`;
    success.querySelector('h3').textContent = title;
    success.querySelector('p').textContent = body;
    if (form.closest('dialog')) $('[data-form-body]', form.closest('dialog')).hidden = true;
    else form.dataset.state = 'sent';
    success.hidden = false;
    success.focus();
  });
  function alertBox(form, msg) {
    let el = $('.form-alert', form);
    if (!el) {
      el = document.createElement('p');
      el.className = 'err form-alert';
      el.setAttribute('role', 'alert');
      $('button[type="submit"]', form).after(el);
    }
    el.textContent = msg;
  }
  document.addEventListener('change', e => {
    const input = e.target.closest('[data-photos]');
    if (!input) return;
    const preview = $('[data-photo-preview]', input.form);
    preview.innerHTML = '';
    [...input.files].slice(0, MAX_PHOTOS).forEach(f => {
      const img = new Image();
      img.alt = `Preview of ${f.name}`;
      img.src = URL.createObjectURL(f);
      preview.append(img);
    });
    const r = rules.photos('', input.form);
    setError(input.form, 'photos', r === true ? '' : r);
  });

  const filtersForm = $('[data-filters]');
  if (filtersForm) {
    const grid = $('[data-grid]');
    const cards = $$('[data-card]', grid);
    const search = $('[data-filter-input="q"]');
    const sort = $('[data-filter-input="sort"]');
    const family = filtersForm.family;
    const LIST_KEYS = ['brand', 'cond', 'set', 'avail'];
    const readState = () => ({
      q: search.value.trim().toLowerCase(),
      sort: sort.value,
      family: family.value,
      min: +filtersForm.min.value || 0,
      max: +filtersForm.max.value || 0,
      ...Object.fromEntries(LIST_KEYS.map(k => [k, $$(`input[name="${k}"]:checked`, filtersForm).map(i => i.value)])),
    });
    function writeControls(p) {
      search.value = p.get('q') || '';
      sort.value = [...sort.options].some(o => o.value === p.get('sort')) ? p.get('sort') : 'featured';
      family.value = p.get('family') || '';
      filtersForm.min.value = p.get('min') || '';
      filtersForm.max.value = p.get('max') || '';
      LIST_KEYS.forEach(k => {
        const vals = p.getAll(k);
        $$(`input[name="${k}"]`, filtersForm).forEach(i => (i.checked = vals.includes(i.value)));
      });
    }
    const priceOf = c => (c.dataset.price ? +c.dataset.price : null);
    const sorters = {
      featured: (a, b) => (a.dataset.avail === 'sold') - (b.dataset.avail === 'sold') || b.dataset.featured - a.dataset.featured || b.dataset.added.localeCompare(a.dataset.added),
      newest: (a, b) => b.dataset.added.localeCompare(a.dataset.added),
      'price-asc': (a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity),
      'price-desc': (a, b) => (priceOf(b) ?? -Infinity) - (priceOf(a) ?? -Infinity),
      'year-desc': (a, b) => b.dataset.year - a.dataset.year,
      'year-asc': (a, b) => a.dataset.year - b.dataset.year,
    };
    function apply({ push = true } = {}) {
      const s = readState();
      $$('option[data-brand]', family).forEach(o => (o.disabled = s.brand.length > 0 && !s.brand.includes(o.dataset.brand)));
      if (family.selectedOptions[0]?.disabled) family.value = s.family = '';
      const priceActive = s.min || s.max;
      let hiddenPOR = 0;
      const match = c => {
        const d = c.dataset;
        if (s.q && !s.q.split(/\s+/).every(t => d.search.includes(t))) return false;
        if (s.brand.length && !s.brand.includes(d.brand)) return false;
        if (s.family && d.family !== s.family) return false;
        if (s.cond.length && !s.cond.includes(d.cond)) return false;
        if (s.set.length && !s.set.includes(d.set)) return false;
        if (s.avail.length && !s.avail.includes(d.avail)) return false;
        if (priceActive) {
          const p = priceOf(c);
          if (p == null) { hiddenPOR++; return false; }
          if (s.min && p < s.min) return false;
          if (s.max && p > s.max) return false;
        }
        return true;
      };
      const shown = cards.filter(c => !(c.hidden = !match(c)));
      cards.sort(sorters[s.sort]).forEach(c => grid.append(c));
      $('[data-result-count]').textContent = `${shown.length} ${shown.length === 1 ? 'watch' : 'watches'}`;
      $('[data-empty]').hidden = shown.length > 0;
      const por = $('[data-por-note]');
      por.hidden = !hiddenPOR;
      por.textContent = hiddenPOR ? `${hiddenPOR} price-on-request ${hiddenPOR === 1 ? 'piece is' : 'pieces are'} hidden by the price filter.` : '';
      const active = LIST_KEYS.reduce((n, k) => n + s[k].length, 0) + !!s.family + !!s.min + !!s.max;
      $('[data-active-count]').textContent = active ? `(${active})` : '';
      if (push) {
        const p = new URLSearchParams();
        if (s.q) p.set('q', search.value.trim());
        if (s.sort !== 'featured') p.set('sort', s.sort);
        if (s.family) p.set('family', s.family);
        if (s.min) p.set('min', s.min);
        if (s.max) p.set('max', s.max);
        LIST_KEYS.forEach(k => s[k].forEach(v => p.append(k, v)));
        history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}${location.hash}`);
      }
    }
    writeControls(params);
    apply({ push: false });
    let t;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 120); });
    sort.addEventListener('change', () => apply());
    filtersForm.addEventListener('change', () => apply());
    filtersForm.addEventListener('reset', () => setTimeout(() => { search.value = ''; apply(); }));
    $('[data-clear]')?.addEventListener('click', () => filtersForm.reset());
    const toggle = $('.filter-toggle');
    toggle?.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      $('#filters').classList.toggle('is-open', open);
    });
    const source = params.get('source');
    const sourceInput = $('[data-source-model]');
    if (source && sourceInput) sourceInput.value = source;
  }

  const gallery = $('[data-gallery]');
  if (gallery) {
    const main = $('[data-zoom-wrap]', gallery);
    const img = $('[data-g-img]', gallery);
    const zoomBtn = $('[data-zoom]', gallery);
    const setZoom = on => {
      main.classList.toggle('is-zoomed', on);
      zoomBtn.setAttribute('aria-pressed', String(on));
      if (!on) main.style.removeProperty('--zx'), main.style.removeProperty('--zy');
    };
    zoomBtn.addEventListener('click', () => setZoom(!main.classList.contains('is-zoomed')));
    img.addEventListener('click', e => {
      const on = !main.classList.contains('is-zoomed');
      if (on) moveLens(e);
      setZoom(on);
    });
    const moveLens = e => {
      const r = main.getBoundingClientRect();
      main.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`);
      main.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    main.addEventListener('pointermove', e => main.classList.contains('is-zoomed') && moveLens(e));
    main.addEventListener('keydown', e => e.key === 'Escape' && setZoom(false));
    $$('[data-view]', gallery).forEach(btn => btn.addEventListener('click', () => {
      setZoom(false);
      $$('[data-view]', gallery).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      const swap = () => { img.src = btn.dataset.view; img.alt = btn.dataset.alt; img.style.opacity = 1; };
      if (reduceMotion) return swap();
      img.style.opacity = 0;
      setTimeout(swap, 180);
    }));
  }

  const sticky = $('[data-sticky]');
  const mainCta = $('[data-main-cta]');
  if (sticky && mainCta) {
    let frame = 0;
    const sync = () => {
      frame = 0;
      const show = mainCta.getBoundingClientRect().bottom < 0;
      if (show === sticky.classList.contains('is-on')) return;
      sticky.classList.toggle('is-on', show);
      sticky.toggleAttribute('inert', !show);
      sticky.setAttribute('aria-hidden', String(!show));
    };
    addEventListener('scroll', () => { frame ||= requestAnimationFrame(sync); }, { passive: true });
    addEventListener('resize', sync);
    sync();
  }

  const toward = params.get('toward');
  const towardBox = $('[data-toward]');
  if (towardBox && toward && GV.watches[toward]) {
    const w = GV.watches[toward];
    towardBox.hidden = false;
    $('[data-toward-name]').textContent = `${w.name}, ref. ${w.ref}`;
    towardBox.querySelector('input').value = toward;
    const trade = $('input[name="intent"][value="trade"]', towardBox.form);
    if (trade) trade.checked = true;
  }

  const dateInput = $('[data-appt-date]');
  if (dateInput) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dateInput.min = d.toISOString().slice(0, 10);
  }

  const nyDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/New_York' }).format(new Date());
  $$('[data-hours] tr').forEach(tr => tr.classList.toggle('today', tr.dataset.day === nyDay));

  const reveals = $$('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('is-in'));
})();

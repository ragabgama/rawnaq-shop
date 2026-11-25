(function () {
  var S = window.SHOP, $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); };
  var wa = function (t) { return 'https://wa.me/' + S.whatsapp + '?text=' + encodeURIComponent(t); };
  var store = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  /* بيكسل فيسبوك (لما نحط رقمه في config.js) */
  if (S.fbPixel) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', S.fbPixel); fbq('track', 'PageView');
  }
  var track = function (ev, d, id) { try { if (window.fbq) fbq('track', ev, d || {}, id ? { eventID: id } : undefined); } catch (e) {} };

  /* مصدر الزيارة */
  var src = (function () {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return 'drop/direct'; }
    var s = q.get('utm_source') || (q.get('fbclid') ? 'facebook' : ''), c = q.get('utm_campaign') || '';
    if (s) store.set('dr_src', 'drop/' + s + (c ? '/' + c : ''));
    return store.get('dr_src') || 'drop/direct';
  })();

  [].forEach.call(document.querySelectorAll('[data-wa]'), function (a) { a.href = wa(a.dataset.wa || 'أهلًا، عندي سؤال'); });
  var yr = $('yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ===== المنتجات: بتيجي من لوحة التحكم، ولو حصلت مشكلة بنستخدم النسخة اللي في config.js ===== */
  var MAIN = 'https://ragabgama.github.io/rawnaq/', DROP = 'دروب شيبينج';
  var DB = 'https://firestore.googleapis.com/v1/projects/' + S.firebase.projectId + '/databases/(default)/documents';
  var val = function (v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
    if ('mapValue' in v) { var o = {}, f = v.mapValue.fields || {}; for (var k in f) o[k] = val(f[k]); return o; }
    return null;
  };
  var imgUrl = function (s) { s = String(s || ''); if (s.indexOf('m:') === 0) return MAIN + 'img/m-' + s.slice(2) + '.jpg'; if (/^https:\/\//.test(s)) return s; if (/^img\//.test(s)) return MAIN + s; return s; };
  var cfgPage = function (slug) { var c = slug && S.products[slug]; return c && c.page ? c.page : 'p.html?p=' + encodeURIComponent(slug); };
  function toP(d) {
    var vs = (d.variants || []).filter(function (v) { return v && Number(v.price) > 0; });
    if (!vs.length || !d.slug) return null;
    var multi = vs.length > 1 || !!(vs[0].name || '').trim();
    var lines = String(d.description || '').split(/\r?\n/);
    return {
      id: d.id, slug: d.slug, on: d.shopOn === true, order: Number(d.order) || 0, name: d.name || '', short: d.short || '', tag: d.tag || '',
      price: Math.min.apply(null, vs.map(function (v) { return Number(v.price); })),
      was: !multi && Number(vs[0].was) > Number(vs[0].price) ? Number(vs[0].was) : 0,
      variants: multi ? vs.map(function (v) { return { name: (v.name || '').trim(), price: Number(v.price), note: Number(v.was) > Number(v.price) ? 'توفّر ' + fmt(v.was - v.price) + ' ج' : '' }; }) : null,
      defVar: multi ? Math.min(Math.max(0, Number(d.defVar) || 0), vs.length - 1) : 0,
      images: (d.images || []).map(imgUrl).filter(Boolean), video: d.video || '',
      points: lines.filter(function (l) { return /^\s*-\s+/.test(l); }).map(function (l) { return l.replace(/^\s*-\s+/, '').trim(); }).filter(Boolean),
      text: lines.filter(function (l) { return l.trim() && !/^\s*(-|#)/.test(l); }).join(' ').trim(),
      page: cfgPage(d.slug)
    };
  }
  function fromCfg(slug) { var c = S.products[slug]; if (!c) return null; var o = {}; for (var k in c) o[k] = c[k]; o.slug = slug; o.on = true; return o; }
  function query(where) {
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(DB + ':runQuery?key=' + S.firebase.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'products' }], where: { fieldFilter: { field: { fieldPath: where[0] }, op: 'EQUAL', value: { stringValue: where[1] } } }, limit: 40 } }) })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (rows) {
        return rows.filter(function (x) { return x.document; }).map(function (x) {
          var d = {}, f = x.document.fields || {}; for (var k in f) d[k] = val(f[k]);
          d.id = x.document.name.split('/').pop(); return d;
        }).filter(function (d) { return d.category === DROP; }).map(toP).filter(Boolean);
      });
  }
  // لو صورة من لوحة التحكم لسه مااتنسختش على الموقع، نجيبها من قاعدة البيانات على طول
  document.addEventListener('error', function (e) {
    var el = e.target, m = el && el.tagName === 'IMG' && !el.dataset.fb && /\/img\/m-([A-Za-z0-9_-]+)\.jpg/.exec(el.src || '');
    if (!m) return; el.dataset.fb = '1';
    fetch(DB + '/media/' + m[1] + '?key=' + S.firebase.apiKey).then(function (r) { return r.json(); }).then(function (d) { var u = val((d.fields || {}).data); if (u) el.src = u; }).catch(function () {});
  }, true);

  /* ===== الصفحة الرئيسية ===== */
  function renderGrid(list) {
    $('grid').innerHTML = list.map(function (p) {
      return '<a class="card" href="' + p.page + (location.search ? (p.page.indexOf('?') >= 0 ? '&' : '?') + location.search.slice(1) : '') + '"><div class="im"><img src="' + p.images[0] + '" alt="' + esc(p.name) + '" loading="lazy">' + (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '') + '</div>' +
        '<div class="b"><h3>' + esc(p.name) + '</h3><p>' + esc(p.short) + '</p><div class="price">' + (p.variants ? 'من ' : '') + fmt(p.price) + ' ج <small>+ الشحن · الدفع عند الاستلام</small></div></div></a>';
    }).join('') || '<div class="box">مفيش منتجات متاحة دلوقتي. <a data-wa="أهلًا" href="' + wa('أهلًا') + '">كلمنا واتساب</a></div>';
  }

  /* ===== صفحة المنتج ===== */
  function initProduct(P) {
    document.title = P.name + ' | ' + S.name;
    $('pname').textContent = P.name; $('pshort').textContent = P.short;
    var vi = P.variants ? (P.defVar || 0) : -1;
    var V = function () { return vi >= 0 ? P.variants[vi] : null; };
    var price = function () { return V() ? V().price : P.price; };
    if (P.variants) $('pprice').innerHTML = P.variants.map(function (v) { return '<span style="display:inline-block;margin-inline-end:14px">' + esc(v.name) + ' <b>' + fmt(v.price) + ' ج</b></span>'; }).join(''); else $('pprice').textContent = fmt(P.price) + ' ج';
    if (P.was) $('pprice').innerHTML += ' <s style="color:var(--muted);font-size:18px;font-weight:600">' + fmt(P.was) + ' ج</s>';
    if (P.market) { $('pmkt').hidden = false; $('pmkt').innerHTML = 'نفس الكمبروسر بيتباع في السوق بـ ' + fmt(P.market) + ' ج، <b>وعندنا بـ ' + fmt(P.price) + ' ج</b>'; }
    $('pts').innerHTML = (P.points || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    if (P.text) $('pts').insertAdjacentHTML('afterend', '<p class="short">' + esc(P.text) + '</p>');
    var vn0 = document.querySelector('.vidnote'); if (vn0 && !P.video) vn0.hidden = true;
    // لو المنتج له أكتر من عرض والصفحة مافيهاش مكان للعروض، نعمله مكان بدل الكمية
    if (P.variants && !$('vars') && $('qm')) {
      var qf = $('qm').closest('.f');
      qf.insertAdjacentHTML('beforebegin', '<div class="f"><label>اختار العرض</label><div class="vars" id="vars"></div></div>');
      qf.remove();
    }
    if (!P.variants && $('vars') && $('vars').closest('.f')) $('vars').closest('.f').hidden = true;
    if (P.variants && $('qm') && $('qm').closest('.f')) $('qm').closest('.f').hidden = true;
    // الجاليري: الفيديو الأول وبعده الصور
    var media = (P.video ? [{ v: P.video }] : []).concat(P.images.map(function (i) { return { i: i }; }));
    function show(k) {
      var m = media[k];
      var yt = m.v && /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/.exec(m.v);
      $('main').innerHTML = yt ? '<iframe src="https://www.youtube.com/embed/' + yt[1] + '?playsinline=1" style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media" allowfullscreen></iframe>' : m.v ? '<video src="' + m.v + '" poster="' + P.images[0] + '" controls playsinline muted autoplay loop preload="metadata"></video>' : '<img src="' + m.i + '" alt="' + esc(P.name) + '">';
      [].forEach.call($('thumbs').children, function (b, j) { b.classList.toggle('on', j === k); });
    }
    $('thumbs').innerHTML = media.map(function (m, k) { return '<button type="button" data-k="' + k + '" aria-label="' + (m.v ? 'فيديو' : 'صورة ' + k) + '"><img src="' + (m.v ? P.images[0] : m.i) + '" alt="">' + (m.v ? '<span class="play">▶</span>' : '') + '</button>'; }).join('');
    $('thumbs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(Number(b.dataset.k)); });
    show(0);
    track('ViewContent', { content_ids: [P.id], content_type: 'product', value: price(), currency: 'EGP' });
    if (P.variants && $('vars')) {
      $('vars').innerHTML = P.variants.map(function (v, k) { return '<button type="button" class="var" data-k="' + k + '"><b>' + esc(v.name) + '</b><span>' + fmt(v.price) + ' ج</span>' + (v.note ? '<em>' + esc(v.note) + '</em>' : '') + '</button>'; }).join('');
      $('vars').addEventListener('click', function (e) { var b = e.target.closest('.var'); if (b) { vi = Number(b.dataset.k); sum(); } });
    }

    // الفورم
    var gov = $('gov'), qty = 1;
    S.govs.forEach(function (g) { var o = document.createElement('option'); o.value = o.textContent = g; gov.appendChild(o); });
    var ship = function () { return gov.value ? (S.shipping[gov.value] || 100) : 0; };
    function sum() {
      if ($('qv')) $('qv').textContent = qty;
      if ($('vars')) [].forEach.call($('vars').children, function (b, j) { b.classList.toggle('on', j === vi); b.setAttribute('aria-pressed', j === vi); });
      $('sSub').textContent = (V() ? V().name + ' · ' : '') + fmt(price() * qty) + ' ج';
      $('sShip').textContent = gov.value ? fmt(ship()) + ' ج' : 'اختار المحافظة';
      $('sTot').textContent = fmt(price() * qty + ship()) + ' ج';
      $('go').textContent = 'اطلب دلوقتي · ' + fmt(price() * qty + ship()) + ' ج';
      $('sPrice').textContent = fmt(price() * qty) + ' ج';
    }
    if ($('qm')) {
      $('qm').onclick = function () { qty = Math.max(1, qty - 1); sum(); };
      $('qp').onclick = function () { qty = Math.min(3, qty + 1); sum(); };
    }
    gov.addEventListener('change', sum); sum();
    var started = false;
    $('order').addEventListener('focusin', function () { if (!started) { started = true; track('InitiateCheckout', { content_ids: [P.id], value: price(), currency: 'EGP' }); } });
    $('stickyBtn').onclick = function () { $('order').scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { $('name').focus(); }, 400); };

    function normPhone(v) {
      v = String(v || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/\D/g, '');
      if (v.indexOf('0020') === 0) v = v.slice(4); else if (v.indexOf('20') === 0 && v.length === 12) v = v.slice(2);
      if (v.length === 10 && v[0] === '1') v = '0' + v;
      return v;
    }
    var bad = function (id, b) { $('f-' + id).classList.toggle('bad', b); return !b; };
    ['name', 'phone', 'gov', 'address'].forEach(function (id) { $(id).addEventListener('input', function () { $('f-' + id).classList.remove('bad'); }); });
    var cairoDay = function () {
      try { var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return p.year + p.month + p.day; }
      catch (e) { var c = new Date(Date.now() + 2 * 3600000); return c.getUTCFullYear() + ('0' + (c.getUTCMonth() + 1)).slice(-2) + ('0' + c.getUTCDate()).slice(-2); }
    };
    var enc = function (v) {
      if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
      if (v && typeof v === 'object') { var f = {}; for (var k in v) f[k] = enc(v[k]); return { mapValue: { fields: f } }; }
      if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
      if (typeof v === 'boolean') return { booleanValue: v };
      return { stringValue: String(v == null ? '' : v) };
    };
    var busy = false;
    $('order').addEventListener('submit', function (e) {
      e.preventDefault(); if (busy) return;
      var msg = $('msg'); msg.style.display = 'none';
      var name = $('name').value.trim().replace(/\s+/g, ' '), phone = normPhone($('phone').value), address = $('address').value.trim();
      var ok = [bad('name', !(name.length >= 5 && name.split(' ').length >= 2)), bad('phone', !/^01[0125]\d{8}$/.test(phone)), bad('gov', !gov.value), bad('address', address.length < 10)];
      if (ok.indexOf(false) >= 0) { var f = document.querySelector('.f.bad input, .f.bad select, .f.bad textarea'); if (f) f.focus(); return; }
      if (this.website.value) return;
      busy = true; var btn = $('go'); btn.disabled = true; btn.textContent = 'بنسجّل طلبك…';
      var sh = ship(), pr = price(), vn = V() ? V().name : '', sub = pr * qty, tot = sub + sh;
      var id = 'RD' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10);
      var fields = { id: id, items: [{ pid: P.id, name: P.name, variant: vn, choice: '', qty: qty, price: pr, custom: '', uploads: [] }], subtotal: sub, discount: 0, shipping: sh, total: tot,
        name: name.slice(0, 80), phone: phone, gov: gov.value, address: address.slice(0, 250), custNote: $('note').value.trim().slice(0, 200), pay: 'cod', src: src.slice(0, 60), status: 'جديد', notes: '', taagerNo: '' };
      var ef = {}; for (var k in fields) ef[k] = enc(fields[k]);
      var order = { id: id, product: P.name + (vn ? ' (' + vn + ')' : ''), page: P.page, qty: qty, price: pr, shipping: sh, total: tot, name: name, phone: phone, gov: gov.value, address: address };
      var base = 'projects/' + S.firebase.projectId + '/databases/(default)/documents', day = cairoDay();
      function done(state) { order.state = state; store.set('dr_order', order); location.href = 'thanks.html'; }
      (function attempt(n) {
        var body = { writes: [{ update: { name: base + '/orders/' + phone + '_' + day + '_' + n, fields: ef }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] }] };
        fetch('https://firestore.googleapis.com/v1/' + base + ':commit?key=' + S.firebase.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) {
            if (r.ok) return done('ok');
            if (r.status === 409 && n < 5) return attempt(n + 1);
            if (r.status === 409) { msg.textContent = 'وصلنا طلبات كتير من الرقم ده النهارده. كلّمنا على واتساب نكمّل معاك.'; msg.style.display = 'block'; busy = false; btn.disabled = false; sum(); return; }
            done('offline');
          }).catch(function () { done('offline'); });
      })(1);
    });
  }

  function unavailable() {
    var pp = document.querySelector('.pp'); if (!pp) return;
    pp.innerHTML = '<div class="box" style="grid-column:1/-1;text-align:center;padding:30px 16px"><h1 style="font-size:22px;margin:0 0 8px">المنتج ده مش متاح دلوقتي</h1><p style="color:var(--muted);margin:0 0 14px">ممكن تشوف باقي منتجاتنا، أو تكلمنا واتساب.</p><a class="btn" href="./' + location.search + '">شوف المنتجات</a></div>';
    var st = document.querySelector('.sticky'); if (st) st.remove();
  }
  var qs; try { qs = new URLSearchParams(location.search); } catch (e) { qs = { get: function () { return ''; } }; }
  var key = document.body.dataset.p || qs.get('p') || '';
  if ($('order') && key) {
    query(['slug', key]).then(function (list) {
      var P = list[0];
      if (P && P.on) initProduct(P); else unavailable();
    }).catch(function () { var P = fromCfg(key); if (P) initProduct(P); else unavailable(); });
  } else if ($('order')) unavailable();
  if ($('grid')) {
    query(['category', DROP]).then(function (list) {
      renderGrid(list.filter(function (p) { return p.on; }).sort(function (a, b) { return a.order - b.order; }));
    }).catch(function () { renderGrid(Object.keys(S.products).map(fromCfg)); });
  }

  /* ===== صفحة الشكر ===== */
  if ($('thx')) {
    var o = store.get('dr_order');
    if (!o) { $('thx').innerHTML = '<div class="box">مفيش طلب جديد. <a href="./">ارجع للمتجر</a></div>'; return; }
    $('hi').textContent = 'شكرًا يا ' + o.name.split(' ')[0] + '، طلبك وصلنا ✓';
    $('thx').innerHTML = '<div class="box">' +
      '<div class="row"><span>رقم الطلب</span><b dir="ltr">' + esc(o.id) + '</b></div>' +
      '<div class="row"><span>' + esc(o.product) + '</span><b>× ' + o.qty + '</b></div>' +
      '<div class="row"><span>الشحن</span><b>' + fmt(o.shipping) + ' ج</b></div>' +
      '<div class="row"><span>الإجمالي (تدفعه عند الاستلام)</span><b>' + fmt(o.total) + ' ج</b></div>' +
      '<div class="row"><span>الموبايل</span><b dir="ltr">' + esc(o.phone) + '</b></div>' +
      '<div class="row"><span>العنوان</span><b>' + esc(o.gov + '، ' + o.address) + '</b></div></div>';
    var txt = 'طلب جديد ' + o.id + '\n' + o.product + ' × ' + o.qty + '\nالإجمالي: ' + fmt(o.total) + ' ج (عند الاستلام)\nالاسم: ' + o.name + '\nالموبايل: ' + o.phone + '\nالعنوان: ' + o.gov + '، ' + o.address;
    $('waSend').href = wa(txt);
    if (o.state !== 'ok') { $('offline').hidden = false; $('waOff').href = wa(txt); }
    var fired = store.get('dr_fired') || [];
    if (o.state === 'ok' && fired.indexOf(o.id) < 0) { track('Purchase', { value: o.total, currency: 'EGP', num_items: o.qty, content_type: 'product' }, o.id); fired.push(o.id); store.set('dr_fired', fired.slice(-20)); }
  }
})();

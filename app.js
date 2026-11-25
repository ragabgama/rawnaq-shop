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

  /* ===== الصفحة الرئيسية ===== */
  if ($('grid')) {
    $('grid').innerHTML = Object.keys(S.products).map(function (k) {
      var p = S.products[k];
      return '<a class="card" href="' + p.page + location.search + '"><div class="im"><img src="' + p.images[0] + '" alt="' + esc(p.name) + '" loading="lazy">' + (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '') + '</div>' +
        '<div class="b"><h3>' + esc(p.name) + '</h3><p>' + esc(p.short) + '</p><div class="price">' + (p.variants ? 'من ' : '') + fmt(p.price) + ' ج <small>+ الشحن · الدفع عند الاستلام</small></div></div></a>';
    }).join('');
  }

  /* ===== صفحة المنتج ===== */
  var key = document.body.dataset.p, P = key && S.products[key];
  if (P) {
    document.title = P.name + ' | ' + S.name;
    $('pname').textContent = P.name; $('pshort').textContent = P.short;
    var vi = P.variants ? (P.defVar || 0) : -1;
    var V = function () { return vi >= 0 ? P.variants[vi] : null; };
    var price = function () { return V() ? V().price : P.price; };
    if (P.variants) $('pprice').innerHTML = P.variants.map(function (v) { return '<span style="display:inline-block;margin-inline-end:14px">' + esc(v.name) + ' <b>' + fmt(v.price) + ' ج</b></span>'; }).join(''); else $('pprice').textContent = fmt(P.price) + ' ج';
    if (P.market) { $('pmkt').hidden = false; $('pmkt').innerHTML = 'نفس الكمبروسر بيتباع في السوق بـ ' + fmt(P.market) + ' ج، <b>وعندنا بـ ' + fmt(P.price) + ' ج</b>'; }
    $('pts').innerHTML = P.points.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    // الجاليري: الفيديو الأول وبعده الصور
    var media = (P.video ? [{ v: P.video }] : []).concat(P.images.map(function (i) { return { i: i }; }));
    function show(k) {
      var m = media[k];
      $('main').innerHTML = m.v ? '<video src="' + m.v + '" poster="' + P.images[0] + '" controls playsinline muted autoplay loop preload="metadata"></video>' : '<img src="' + m.i + '" alt="' + esc(P.name) + '">';
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

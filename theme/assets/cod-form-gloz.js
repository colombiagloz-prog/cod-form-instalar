/* ============================================================================
   Botón Contra Entrega GLOZ — popup (modal) de pago contra entrega.
   Reemplazo de Releasit COD Form & Upsells. Sin dependencias, sin build.

   El Liquid vuelca section.blocks + producto + settings + pixels en un
   <script type="application/json">. Este archivo LEE eso y arma el popup en el
   ORDEN de los bloques. COD -> POST {api}/order. Pago anticipado -> /cart/add.js
   + checkout nativo. Dispara Pixel de Meta y TikTok (con dedup por event_id).
   ============================================================================ */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") n.textContent = attrs[k];
        else if (k === "class") n.className = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k === "dataset") { Object.keys(attrs[k]).forEach(function (dk) { n.dataset[dk] = attrs[k][dk]; }); }
        else if (attrs[k] === false || attrs[k] === undefined || attrs[k] === null) { /* skip */ }
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var ICON_PATHS = {
    cart: ["M3 3h2l.4 2M7 13h10l3-8H6.4", "M7 13L5.4 5", "M16 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z", "M9 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"],
    bag: ["M6 7h12l-1 14H7L6 7z", "M9 7a3 3 0 0 1 6 0"],
    card: ["M2 8.5h20", "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M6 15h4"],
    tag: ["M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8z", "M7.5 7.5h.01"],
    gift: ["M20 12v9H4v-9", "M2 7h20v5H2z", "M12 22V7", "M12 7S9.5 3 7.5 4.5 8 7 12 7z", "M12 7s2.5-4 4.5-2.5S16 7 12 7z"],
    bolt: ["M13 2L3 14h8l-1 8 10-12h-8l1-8z"],
    star: ["M12 2l3 6.5 7 .9-5 4.8 1.3 6.9L12 17.8 5.4 21.1 6.7 14.2 1.7 9.4l7-.9L12 2z"],
    shield: ["M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z", "M9 12l2 2 4-4"],
    truck: ["M3 4h11v11H3z", "M14 9h4l3 3v3h-7z", "M6.5 20a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z", "M17.5 20a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z"],
    lock: ["M6 10V7a6 6 0 1 1 12 0v3", "M5 10h14v11H5z"],
    clock: ["M12 7v5l3 2", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"],
    fire: ["M12 2s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2 1-3 1-5z"],
    close: ["M18 6L6 18", "M6 6l12 12"],
    check: ["M20 6L9 17l-5-5"],
    cash: ["M2 6h20v12H2z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 9.5h.01", "M18 14.5h.01"],
    whatsapp: ["M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"],
  };
  function svg(name, size) {
    var s = document.createElementNS(SVG_NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", size || 18); s.setAttribute("height", size || 18);
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2"); s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    (ICON_PATHS[name] || ICON_PATHS.cart).forEach(function (d) {
      var p = document.createElementNS(SVG_NS, "path"); p.setAttribute("d", d); s.appendChild(p);
    });
    return s;
  }
  function iconEl(name, size) {
    if (!name || name === "none") return null;
    return svg(name, size);
  }

  function money(n, currency) {
    try {
      return new Intl.NumberFormat("es-CO", { style: "currency", currency: currency || "COP", maximumFractionDigits: 0 }).format(Math.round(n));
    } catch (e) { return "$" + Math.round(n).toLocaleString("es-CO"); }
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8; return v.toString(16);
    });
  }
  function hexToRgba(hex, pct) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var num = parseInt(h, 16);
    if (isNaN(num)) return "rgba(15,23,20," + (pct != null ? pct / 100 : 0.55) + ")";
    var r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    var a = pct != null ? Math.max(0, Math.min(100, pct)) / 100 : 0.55;
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  function reducedMotion() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function getCookie(name) { var m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)"); return m ? m.pop() : undefined; }

  // ── Tipos de descuento (ofertas y upsells) ─────────────────────────────────
  // 3 tipos (ver worker/src/shopify.ts computeLine, misma fórmula):
  //  - "percent"      → % de descuento (0-90).
  //  - "fixed_amount" → MONTO a restar del precio real (total = base - valor).
  //  - "fixed_price"  → PRECIO FINAL fijo (total = valor, sin superar la base).
  // Compat: el valor viejo "fixed" (antes de este cambio) equivalía a
  // "fixed_price" — se sigue interpretando así en tiempo de ejecución, sin
  // reescribir nada de lo ya guardado en el tema.
  function normalizeDiscountType(t) {
    if (t === "fixed") return "fixed_price";
    if (t === "fixed_amount" || t === "fixed_price" || t === "percent") return t;
    return "percent";
  }
  // Calcula el TOTAL de una línea a partir del tipo/valor de descuento
  // configurado y el precio BASE (precio unitario * unidades). El precio
  // REAL con el que se factura la orden SIEMPRE lo recalcula el servidor —
  // esto es solo para lo que se MUESTRA en el popup.
  function computeDiscount(rawType, rawValue, base) {
    var type = normalizeDiscountType(rawType);
    var value = parseFloat(rawValue);
    if (!isFinite(value) || value < 0) value = 0;
    var total;
    if (type === "fixed_amount") {
      total = Math.max(0, base - value);
    } else if (type === "fixed_price") {
      total = Math.min(value, base);
    } else {
      value = Math.max(0, Math.min(90, value));
      total = base * (1 - value / 100);
    }
    return { type: type, value: value, total: total };
  }

  // Orden de prioridad para la variante "en vivo" cuando el popup NO tiene una
  // variante explícita seleccionada (this.currentVariantId es null):
  //   1) window.glozSelectedVariant — HOOK para que el selector de variantes
  //      de la PÁGINA (fuera del popup) le diga al formulario cuál es la
  //      variante elegida. La página solo tiene que hacer, al cambiar su
  //      selector: `window.glozSelectedVariant = "<id de la variante>"`.
  //      Este archivo la lee tanto para abrir el popup ya preseleccionado
  //      (ver GlozCod.prototype.openWith) como al enviar el pedido.
  //   2) el [name="id"] del <form> nativo de producto (como antes).
  //   3) `fallback` — la variante por defecto que vino del Liquid (cfg).
  function getLiveVariantId(fallback) {
    if (window.glozSelectedVariant) return String(window.glozSelectedVariant);
    var input = document.querySelector('form[action*="/cart/add"] [name="id"], form[action$="/cart/add"] [name="id"]');
    if (input && input.value) return input.value;
    return fallback;
  }

  var geoCache = {};
  function loadGeo(apiUrl) {
    if (!geoCache[apiUrl]) {
      geoCache[apiUrl] = fetch(apiUrl + "/geo").then(function (r) { return r.json(); })
        .then(function (res) { return (res && res.ok && res.geo) || {}; }).catch(function () { return {}; });
    }
    return geoCache[apiUrl];
  }

  // ── Pixels (Meta + TikTok), cargados una sola vez por página ──────────────
  var pixelsBooted = false;
  function bootPixels(px) {
    if (pixelsBooted || !px) return;
    pixelsBooted = true;
    if (px.metaEnabled && px.metaPixelId && !window.fbq) {
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      try { window.fbq("init", px.metaPixelId); } catch (e) {}
    }
    if (px.tiktokEnabled && px.tiktokPixelId) {
      (function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = (w[t] = w[t] || []);
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "load"];
        ttq.setAndDefer = function (obj, m) { obj[m] = function () { obj.push([m].concat(Array.prototype.slice.call(arguments, 0))); }; };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.load = function (id) { var u = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[id] = []; ttq._i[id]._u = u; ttq._t = ttq._t || {}; ttq._t[id] = +new Date(); var s = d.createElement("script"); s.async = !0; s.src = u + "?sdkid=" + id + "&lib=" + t; var e = d.getElementsByTagName("script")[0]; e.parentNode.insertBefore(s, e); };
        try { ttq.load(px.tiktokPixelId); ttq.page(); } catch (e) {}
      })(window, document, "ttq");
    }
  }
  function fbTrack(name, data, eventId) { if (window.fbq) try { window.fbq("track", name, data || {}, eventId ? { eventID: eventId } : undefined); } catch (e) {} }
  function ttTrack(name, data) { if (window.ttq && window.ttq.track) try { window.ttq.track(name, data || {}); } catch (e) {} }

  // ────────────────────────────────────────────────────────────────────────
  function GlozCod(root, cfg) {
    this.root = root; this.cfg = cfg; this.built = false; this.geo = null;
    this.inputs = {}; this.upsellState = {}; this.offers = []; this.offerRefs = []; this.selectedOffer = null;
    this.lastFocused = null; this.initiateFired = false; this._timers = [];
    this.dynamicButtons = [];
    // Si el cliente elige una variante en el popup (bloque "field_variant"),
    // esa elección manda sobre la variante "en vivo" de la página.
    this.currentVariantId = null;
    // Campo de variante (bloque field_variant): "simple" = un solo selector
    // (comportamiento clásico); "compact" = filas de "variante + cantidad"
    // cuando la oferta elegida tiene 2+ unidades. Ver refreshVariantSelectors()
    // y renderVariantField().
    this.variantWrap = null; this.variantRows = []; this._variantMode = null; this._justAddedIdx = -1;
    this.variantErrEl = null; this.variantStatusEl = null;
    this.keydownHandler = this.onKeydown.bind(this);
  }

  // Variante a usar en el pedido/pago: la elegida dentro del popup si el
  // producto tiene varias, o si no, la variante "en vivo" de la página.
  GlozCod.prototype.getVariantId = function () {
    if (this.currentVariantId) return this.currentVariantId;
    return getLiveVariantId(this.cfg.product.variantId);
  };
  GlozCod.prototype.contentIds = function () { return [String(this.getVariantId())]; };
  GlozCod.prototype.fireInitiate = function () {
    if (this.initiateFired) return; this.initiateFired = true;
    var val = this.selectedOffer ? this.selectedOffer.total : this.cfg.product.price;
    fbTrack("InitiateCheckout", { currency: this.cfg.currency, value: val, content_ids: this.contentIds(), content_type: "product" });
    ttTrack("InitiateCheckout", { currency: this.cfg.currency, value: val });
    this.pingStat("initiated");
  };

  GlozCod.prototype.applyTheme = function (node) {
    var th = this.cfg.theme || {};
    // Temas listos (claro / oscuro). Si el preset es uno de esos, sus colores
    // ganan y se ignoran los colores manuales (incluidos los de los bloques).
    var PAL = {
      oscuro: { popupBg: "#141F1A", textColor: "#EAF2EC", mutedTextColor: "#9AB0A5", borderColor: "#2A3A33", accentColor: "#54C295", offerSelectedBg: "#182C23", offerSelectedBorder: "#54C295", badgeBg: "#E0701F", badgeText: "#20140A", ctaBg: "#54C295", ctaText: "#06120C", prepaidColor: "#54C295", errorColor: "#F87171", overlayColor: "#000000" },
      claro: { popupBg: "#FFFFFF", textColor: "#17211D", mutedTextColor: "#5B6560", borderColor: "#E6E3DA", accentColor: "#2E6E5A", offerSelectedBg: "#EAF3EF", offerSelectedBorder: "#2E6E5A", badgeBg: "#E8912D", badgeText: "#1A1400", ctaBg: "#14342B", ctaText: "#FFFFFF", prepaidColor: "#2E6E5A", errorColor: "#DC2626", overlayColor: "#0F1714" },
    };
    this._themePreset = (th.preset === "oscuro" || th.preset === "claro") ? th.preset : null;
    var c = this._themePreset ? PAL[this._themePreset] : th;
    var vars = {
      "--gloz-popup-bg": c.popupBg, "--gloz-text": c.textColor, "--gloz-muted": c.mutedTextColor,
      "--gloz-border": c.borderColor, "--gloz-accent": c.accentColor,
      "--gloz-offer-bg": c.offerSelectedBg, "--gloz-offer-border": c.offerSelectedBorder,
      "--gloz-badge-bg": c.badgeBg, "--gloz-badge-text": c.badgeText,
      "--gloz-cta-bg": c.ctaBg, "--gloz-cta-text": c.ctaText, "--gloz-prepaid": c.prepaidColor,
      "--gloz-error": c.errorColor, "--gloz-overlay": hexToRgba(c.overlayColor, th.overlayOpacity),
      "--gloz-overlay-blur": (th.overlayBlur != null ? th.overlayBlur : 4) + "px",
      "--gloz-radius": (th.cornerRadius != null ? th.cornerRadius : 20) + "px",
      "--gloz-font-scale": th.fontScale || 1, "--gloz-space-scale": th.spaceScale || 1,
      "--gloz-label-size": (th.labelFontSize ? th.labelFontSize + "px" : "0.9rem"),
      "--gloz-label-color": th.labelColor,
      "--gloz-heading-weight": th.headingWeight || 800,
      "--gloz-anim-ms": (this.animsEnabled() ? (th.animationMs || 220) : 0) + "ms",
      "--gloz-field-radius": (th.fieldRadius != null ? th.fieldRadius : 14) + "px",
      "--gloz-field-shadow": (th.fieldShadow != null ? th.fieldShadow : 0) + "px",
      "--gloz-success-size": (th.successSize != null ? th.successSize : 30) + "px",
      "--gloz-notice-size": (th.noticeSize != null ? th.noticeSize : 15) + "px",
    };
    Object.keys(vars).forEach(function (k) { if (vars[k] !== undefined && vars[k] !== null && vars[k] !== "") node.style.setProperty(k, vars[k]); });
    if (th.inheritThemeFont === false) node.classList.add("gloz-own-font");
    if (this.hoverFxEnabled() === false) node.classList.add("gloz-no-hoverfx");
  };
  GlozCod.prototype.animsEnabled = function () { return this.cfg.theme && this.cfg.theme.enableAnimations !== false && !reducedMotion(); };
  GlozCod.prototype.hoverFxEnabled = function () { return !(this.cfg.theme && this.cfg.theme.enableHoverFx === false); };
  // Reporte de estadística ligero al worker (opens / initiated). Silencioso.
  GlozCod.prototype.pingStat = function (e) {
    try { fetch(this.cfg.apiUrl + "/stat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ e: e }), keepalive: true }).catch(function () {}); } catch (x) {}
  };

  GlozCod.prototype.build = function () {
    var self = this, th = this.cfg.theme || {};
    this.overlay = el("div", { class: "gloz-modal-overlay gloz-anim-" + (th.entranceStyle || "slide-up") });
    this.modal = el("div", { class: "gloz-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "gloz-mtitle-" + this.cfg.sectionId });
    this.applyTheme(this.modal);

    var showHeader = !!th.showHeader;
    var showThumb = true;
    var titleBlock = this.cfg.blocks.filter(function (b) { return b.type === "title"; })[0];
    if (titleBlock && titleBlock.settings.show_product_thumb === false) showThumb = false;

    var head = el("div", { class: "gloz-mhead" + (showHeader ? "" : " gloz-mhead--minimal") });
    if (showHeader) {
      if (showThumb) {
        if (this.cfg.product.image) head.appendChild(el("img", { src: this.cfg.product.image, alt: "" }));
        head.appendChild(el("div", { class: "gloz-mtitle" }, [
          el("h3", { id: "gloz-mtitle-" + this.cfg.sectionId, text: this.cfg.product.title }),
          el("p", { text: this.priceLine() }),
        ]));
      } else { head.appendChild(el("div", { class: "gloz-mtitle" })); }
    } else {
      this.modal.classList.add("gloz-noheader");
    }
    var closeBtn = el("button", { type: "button", class: "gloz-mclose", "aria-label": this.t("closeLabel", "Cerrar") }, [svg("close", 16)]);
    closeBtn.addEventListener("click", function () { self.close(); });
    head.appendChild(closeBtn);
    this.modal.appendChild(head);

    var body = el("div", { class: "gloz-mbody" });
    this.cfg.blocks.forEach(function (block) {
      // Un bloque mal formado (p. ej. un upsell fuera del canal sin variant_id,
      // o un fallo inesperado) NUNCA debe impedir que el popup abra: se
      // omite ese bloque y se sigue con el resto.
      var node;
      try { node = self.renderBlock(block); } catch (e) { node = null; }
      if (node) body.appendChild(node);
    });
    this.modal.appendChild(body);

    // Captura de abandono (/lead): cada vez que el cliente escribe/elige algo,
    // si el teléfono ya es válido, se guarda lo que lleva (debounced).
    body.addEventListener("input", function () { self.queueLead(); });
    body.addEventListener("change", function () { self.queueLead(); });

    // El selector de variante puede depender de la oferta seleccionada (units);
    // se resuelve al final del build para no importar en qué orden el
    // merchant puso los bloques "Ofertas" y "Campo: Variante".
    this.refreshVariantSelectors();

    // Los botones con texto dinámico ({order_total}/{order_subtotal}) se arman
    // en el orden de los bloques; si algún botón quedó antes que las ofertas,
    // este refresco final garantiza que muestre el valor correcto desde el inicio.
    this.updateDynamicButtonTexts();

    this.overlay.appendChild(this.modal);
    this.overlay.addEventListener("mousedown", function (e) { if (e.target === self.overlay) self.close(); });
    document.body.appendChild(this.overlay);
    this.built = true;
  };

  GlozCod.prototype.t = function (key, fb) { var v = this.cfg.texts && this.cfg.texts[key]; return v && String(v).trim() !== "" ? v : fb; };
  GlozCod.prototype.priceLine = function () { return money(this.cfg.product.price, this.cfg.currency); };
  GlozCod.prototype.renderBlock = function (block) { var fn = this["render_" + block.type]; return typeof fn === "function" ? fn.call(this, block) : null; };

  GlozCod.prototype.render_title = function (block) {
    var s = block.settings;
    var wrap = el("div", { class: "gloz-block gloz-align-" + (s.align || "left") });
    if (s.heading) {
      var h = el("h2", { class: "gloz-title", text: s.heading });
      if (s.title_size) h.style.fontSize = s.title_size + "px";
      if (s.title_color) h.style.color = s.title_color;
      wrap.appendChild(h);
    }
    if (s.subheading) {
      var p = el("p", { class: "gloz-subtitle", text: s.subheading });
      if (s.subtitle_size) p.style.fontSize = s.subtitle_size + "px";
      if (s.subtitle_color) p.style.color = s.subtitle_color;
      wrap.appendChild(p);
    }
    return wrap.childNodes.length ? wrap : null;
  };

  // Encabezado del popup como BLOQUE agregable: foto + nombre + precio del
  // producto, ubicable donde el merchant quiera (ya no fijo arriba).
  GlozCod.prototype.render_product_header = function (block) {
    var s = block.settings;
    var wrap = el("div", { class: "gloz-block gloz-mhead-block gloz-align-" + (s.align || "left") });
    if (s.show_image !== false && this.cfg.product.image) {
      wrap.appendChild(el("img", { class: "gloz-mhead-img", src: this.cfg.product.image, alt: "" }));
    }
    var info = el("div", { class: "gloz-mtitle" });
    var h = el("h3", { text: s.title_override || this.cfg.product.title });
    if (s.title_size) h.style.fontSize = s.title_size + "px";
    if (s.title_color) h.style.color = s.title_color;
    info.appendChild(h);
    if (s.show_price !== false) info.appendChild(el("p", { class: "gloz-mhead-price", text: this.priceLine() }));
    wrap.appendChild(info);
    return wrap;
  };

  // ── Ofertas — tarjetas "Opción C": cinta (ribbon) superior a todo el ancho +
  // radio/nombre/nota/precio-por-unidad a la izquierda, total/tachado a la
  // derecha. Selección animada al TOCAR (no depende de hover). ──────────────
  GlozCod.prototype.render_offers = function (block) {
    var self = this, s = block.settings, price = this.cfg.product.price;
    var wrap = el("div", { class: "gloz-block" });
    if (s.offers_title_enabled !== false && s.offers_title) {
      var lbl = el("p", { class: "gloz-sec-label", text: s.offers_title });
      if (s.offers_title_size) lbl.style.fontSize = s.offers_title_size + "px";
      if (s.offers_title_color) lbl.style.color = s.offers_title_color;
      wrap.appendChild(lbl);
    }
    var group = el("div", { class: "gloz-offers", role: "radiogroup", "aria-label": s.offers_title || "Ofertas" });

    var tiers = [1, 2, 3, 4].map(function (i) {
      var type = normalizeDiscountType(s["offer" + i + "_discount_type"]);
      var rawValue = type === "percent" ? s["offer" + i + "_discount"] : s["offer" + i + "_fixed_price"];
      return {
        key: "offer" + i, // id estable para preseleccionar desde la API pública (ver openWith/findOfferRef)
        enabled: s["offer" + i + "_enabled"],
        units: Math.max(1, parseInt(s["offer" + i + "_units"], 10) || 1),
        label: s["offer" + i + "_label"] || (i + " unidad(es)"),
        type: type,
        rawValue: rawValue,
        badge: s["offer" + i + "_badge"], isDefault: !!s["offer" + i + "_default"],
        note: s["offer" + i + "_note"], image: s["offer" + i + "_image_url"],
      };
    }).filter(function (t) { return t.enabled; });
    if (!tiers.length) return null;
    var defaultTier = tiers.filter(function (t) { return t.isDefault; })[0] || tiers[0];
    var badgeStyle = s.badge_style || "ribbon";
    var showPerUnit = s.show_per_unit !== false;
    var showCompareAt = s.show_compare_at !== false;

    this.offers = [];
    this.offerRefs = [];
    tiers.forEach(function (tier) {
      var base = price * tier.units;
      var computed = computeDiscount(tier.type, tier.rawValue, base);
      var total = computed.total, dType = computed.type, dValue = computed.value;
      var pct = base > 0 ? Math.round((1 - total / base) * 100) : 0;
      var perUnit = tier.units > 0 ? total / tier.units : total;
      var offerData = { units: tier.units, discountType: dType, discountValue: dValue, total: total, base: base };

      // Columna izquierda: nombre + refuerzo (insignia) + precio por unidad
      var nameEl = el("div", { class: "gloz-offer-name", text: tier.label });
      if (s.offer_name_size) nameEl.style.fontSize = s.offer_name_size + "px";
      if (s.offer_name_color) nameEl.style.color = s.offer_name_color;
      var nameCol = el("div", { class: "gloz-offer-namecol" }, [nameEl]);
      if (tier.note) {
        var noteEl = el("div", { class: "gloz-offer-note", text: tier.note });
        if (s.note_bg) noteEl.style.background = s.note_bg;
        if (s.note_color) noteEl.style.color = s.note_color;
        if (s.note_size) noteEl.style.fontSize = s.note_size + "px";
        nameCol.appendChild(noteEl);
      }
      var unitEl = null;
      if (showPerUnit) {
        unitEl = el("div", { class: "gloz-offer-unit", text: money(perUnit, self.cfg.currency) + " c/u" });
        if (s.offer_per_unit_size) unitEl.style.fontSize = s.offer_per_unit_size + "px";
        if (s.offer_per_unit_color) unitEl.style.color = s.offer_per_unit_color;
        nameCol.appendChild(unitEl);
      }

      // Columna derecha: total grande + tachado
      var totalEl = el("span", { class: "gloz-offer-total", text: money(total, self.cfg.currency) });
      if (s.offer_price_size) totalEl.style.fontSize = s.offer_price_size + "px";
      if (s.offer_price_color) totalEl.style.color = s.offer_price_color;
      var priceCol = el("div", { class: "gloz-offer-pricecol" }, [totalEl]);
      var cmpEl = null;
      if (showCompareAt) {
        cmpEl = el("span", { class: "gloz-offer-cmp", text: money(base, self.cfg.currency) });
        if (pct <= 0) cmpEl.style.display = "none";
        priceCol.appendChild(cmpEl);
      }

      var inner = [el("span", { class: "gloz-radio" })];
      if (tier.image) inner.push(el("img", { class: "gloz-offer-img", src: tier.image, alt: "", loading: "lazy" }));
      inner.push(el("div", { class: "gloz-offer-main" }, [nameCol, priceCol]));

      var btn = el("button", { type: "button", class: "gloz-offer", role: "radio", "aria-checked": tier === defaultTier ? "true" : "false" }, inner);

      var card = el("div", { class: "gloz-offer-card gloz-badge-style--" + badgeStyle + (s.offer_anim_enabled === false ? " gloz-offer-card--noanim" : "") }, []);
      if (s.offer_bg) card.style.setProperty("--gloz-offer-card-bg", s.offer_bg);
      if (s.offer_border_color) card.style.borderColor = s.offer_border_color;
      if (s.offer_radius != null) card.style.borderRadius = s.offer_radius + "px";
      if (tier.badge) {
        var ribbonKids = badgeStyle === "starburst" ? [svg("star", 12), el("span", { text: tier.badge })] : [el("span", { text: tier.badge })];
        var ribbonAnim = s.badge_anim && s.badge_anim !== "none" && self.animsEnabled() ? " gloz-ribbon-anim-" + s.badge_anim : "";
        var ribbon = el("div", { class: "gloz-offer-ribbon" + ribbonAnim }, ribbonKids);
        if (s.badge_text_color) ribbon.style.color = s.badge_text_color;
        if (s.badge_text_size) ribbon.style.fontSize = s.badge_text_size + "px";
        card.appendChild(ribbon);
        card.classList.add("has-ribbon");
      }
      card.appendChild(btn);
      if (tier === defaultTier) { card.classList.add("is-sel"); self.selectedOffer = offerData; }

      btn.addEventListener("click", function () {
        group.querySelectorAll(".gloz-offer-card").forEach(function (c) {
          c.classList.remove("is-sel");
          var b = c.querySelector(".gloz-offer"); if (b) b.setAttribute("aria-checked", "false");
        });
        card.classList.add("is-sel"); btn.setAttribute("aria-checked", "true");
        self.selectedOffer = offerData; self.fireInitiate();
        // Cambiar de oferta puede cambiar el número de unidades → el campo de
        // variante debe re-dibujarse (1 selector "por unidad" por unidad, o
        // volver a uno solo si la nueva oferta es de 1 unidad).
        self.refreshVariantSelectors();
        self.updateDynamicButtonTexts();
      });
      self.offers.push(offerData); group.appendChild(card);
      self.offerRefs.push({ tier: tier, offerData: offerData, totalEl: totalEl, cmpEl: cmpEl, unitEl: unitEl, btn: btn, card: card });
    });
    wrap.appendChild(group);
    return wrap;
  };

  // Recalcula precios/totales de TODAS las ofertas cuando cambia el precio
  // base (p. ej. el cliente elige otra variante en "field_variant"). Muta los
  // mismos objetos que ya están en this.offers/this.selectedOffer, así no hay
  // que reconstruir el DOM ni perder la selección actual.
  GlozCod.prototype.recomputeOffers = function (newPrice) {
    this.cfg.product.price = newPrice;
    var self = this;
    (this.offerRefs || []).forEach(function (ref) {
      var tier = ref.tier, base = newPrice * tier.units;
      var computed = computeDiscount(tier.type, tier.rawValue, base);
      var total = computed.total;
      ref.offerData.discountType = computed.type; ref.offerData.discountValue = computed.value;
      var pct = base > 0 ? Math.round((1 - total / base) * 100) : 0;
      var perUnit = tier.units > 0 ? total / tier.units : total;
      ref.offerData.total = total; ref.offerData.base = base;
      ref.totalEl.textContent = money(total, self.cfg.currency);
      if (ref.cmpEl) { ref.cmpEl.textContent = money(base, self.cfg.currency); ref.cmpEl.style.display = pct > 0 ? "" : "none"; }
      if (ref.unitEl) ref.unitEl.textContent = money(perUnit, self.cfg.currency) + " c/u";
    });
    this.updateDynamicButtonTexts();
  };

  GlozCod.prototype.makeField = function (key, s, opts) {
    opts = opts || {};
    var self = this;
    var id = "gloz-" + key + "-" + this.cfg.sectionId;
    var labelKids = [document.createTextNode((s.label || key) + " ")];
    if (s.required) labelKids.push(el("span", { class: "req", text: "*" }));
    var errNode = el("div", { class: "gloz-emsg", id: id + "-err", "aria-live": "polite" });
    var input;
    if (opts.multiline) {
      input = el("textarea", { class: "gloz-input", id: id, name: key, rows: "2", placeholder: s.placeholder || "", "aria-required": s.required ? "true" : "false" });
    } else {
      input = el("input", { class: "gloz-input", id: id, name: key, type: opts.type || "text", inputmode: opts.inputmode, autocomplete: opts.autocomplete || "off", placeholder: s.placeholder || "", "aria-required": s.required ? "true" : "false" });
    }
    input.addEventListener("input", function () { input.classList.remove("err"); errNode.textContent = ""; });
    input.addEventListener("focus", function () { self.fireInitiate(); }, { once: true });
    this.inputs[key] = { input: input, err: errNode, required: !!s.required, kind: opts.kind || "text" };
    return el("div", { class: "gloz-field" }, [ el("label", { class: "gloz-label", for: id }, labelKids), input, errNode ]);
  };
  GlozCod.prototype.render_field_name = function (b) { return el("div", { class: "gloz-block" }, [this.makeField("name", b.settings, { autocomplete: "name" })]); };
  GlozCod.prototype.render_field_lastname = function (b) { return el("div", { class: "gloz-block" }, [this.makeField("lastname", b.settings, { autocomplete: "family-name" })]); };
  GlozCod.prototype.render_field_phone = function (b) { return el("div", { class: "gloz-block" }, [this.makeField("phone", b.settings, { type: "tel", inputmode: "numeric", autocomplete: "tel", kind: "phone" })]); };
  GlozCod.prototype.render_field_address = function (b) { return el("div", { class: "gloz-block" }, [this.makeField("address", b.settings, { autocomplete: "street-address" })]); };
  GlozCod.prototype.render_field_email = function (b) { return el("div", { class: "gloz-block" }, [this.makeField("email", b.settings, { type: "email", autocomplete: "email", kind: "email" })]); };
  GlozCod.prototype.render_field_extra = function (b) { return el("div", { class: "gloz-block" }, [this.makeField("extra", b.settings, { multiline: true })]); };

  GlozCod.prototype.render_field_location = function (block) {
    var self = this, s = block.settings;
    var wrap = el("div", { class: "gloz-block" });
    var row = el("div", { class: "gloz-row2" });
    var depId = "gloz-department-" + this.cfg.sectionId, cityId = "gloz-city-" + this.cfg.sectionId;
    var depErr = el("div", { class: "gloz-emsg", "aria-live": "polite" }), cityErr = el("div", { class: "gloz-emsg", "aria-live": "polite" });
    var depSelect = el("select", { class: "gloz-select", id: depId, name: "department", "aria-required": "true" });
    depSelect.appendChild(el("option", { value: "", text: s.placeholder_department || "Selecciona tu departamento" }));
    var citySelect = el("select", { class: "gloz-select", id: cityId, name: "city", "aria-required": "true", disabled: "" });
    citySelect.appendChild(el("option", { value: "", text: "Elige primero el departamento" }));
    depSelect.addEventListener("change", function () { depSelect.classList.remove("err"); depErr.textContent = ""; self.fireInitiate(); self.fillCities(citySelect, depSelect.value, s.placeholder_city); });
    citySelect.addEventListener("change", function () { citySelect.classList.remove("err"); cityErr.textContent = ""; });
    row.appendChild(el("div", { class: "gloz-field" }, [ el("label", { class: "gloz-label", for: depId }, [document.createTextNode((s.label_department || "Departamento") + " "), el("span", { class: "req", text: "*" })]), depSelect, depErr ]));
    row.appendChild(el("div", { class: "gloz-field" }, [ el("label", { class: "gloz-label", for: cityId }, [document.createTextNode((s.label_city || "Ciudad") + " "), el("span", { class: "req", text: "*" })]), citySelect, cityErr ]));
    wrap.appendChild(row);
    this.inputs.department = { input: depSelect, err: depErr, required: true, kind: "text" };
    this.inputs.city = { input: citySelect, err: cityErr, required: true, kind: "text" };
    loadGeo(this.cfg.apiUrl).then(function (geo) { self.geo = geo; Object.keys(geo).sort().forEach(function (dep) { depSelect.appendChild(el("option", { value: dep, text: dep })); }); });
    return wrap;
  };
  GlozCod.prototype.fillCities = function (select, department, placeholder) {
    select.innerHTML = "";
    var cities = (this.geo && this.geo[department]) || [];
    if (!department || !cities.length) { select.appendChild(el("option", { value: "", text: "Elige primero el departamento" })); select.disabled = true; return; }
    select.appendChild(el("option", { value: "", text: placeholder || "Selecciona tu ciudad" }));
    cities.forEach(function (c) { select.appendChild(el("option", { value: c, text: c })); });
    select.disabled = false;
  };

  // Campo de variante: solo se muestra si el producto tiene MÁS de una
  // variante. Se arma "vacío" aquí (un contenedor) y `refreshVariantSelectors`
  // decide el modo (simple / compacto) y llama a `renderVariantField` para
  // dibujarlo — según la oferta elegida y el ajuste "per_unit".
  GlozCod.prototype.render_field_variant = function (block) {
    var variants = (this.cfg.product.variants || []).filter(function (v) { return v && v.id != null; });
    if (variants.length < 2) return null;
    this.variantBlockSettings = block.settings;
    this.variantVariants = variants;
    var wrap = el("div", { class: "gloz-block gloz-variant-group" });
    this.variantWrap = wrap;
    return wrap;
  };

  // Decide el MODO del campo de variante y arma/ajusta `this.variantRows`
  // (el estado: una fila por variante elegida, con su cantidad). Se llama al
  // terminar de construir el popup y cada vez que el cliente cambia de
  // oferta (puede cambiar el número de unidades N). Reacciona sin importar
  // el orden de los bloques porque `build()` la invoca al final, cuando
  // `this.selectedOffer` ya está resuelto.
  //
  //  - "simple"  → 1 unidad, o la oferta es de 1 unidad, o "per_unit" está
  //    apagado: un único selector de siempre (aplica a todas las unidades).
  //  - "compact" → oferta de 2+ unidades y "per_unit" activo: filas de
  //    "variante + cantidad". Por defecto UNA fila con la 1ª variante y
  //    cantidad = N (todas las unidades del mismo color). Si el cliente ya
  //    había repartido en varias filas y cambia de oferta, se REAJUSTA
  //    (reflowVariantRows): si N sube, la 1ª fila absorbe el resto; si N
  //    baja, se recorta desde la última fila hacia atrás.
  GlozCod.prototype.refreshVariantSelectors = function () {
    if (!this.variantWrap) return;
    var s = this.variantBlockSettings || {};
    var variants = this.variantVariants || [];
    var units = (this.selectedOffer && this.selectedOffer.units) || 1;
    var perUnitOn = s.per_unit !== false;
    var wantCompact = units > 1 && perUnitOn;
    var newMode = wantCompact ? "compact" : "simple";

    if (newMode === "compact" && this._variantMode === "compact" && this.variantRows && this.variantRows.length) {
      this.variantRows = this.reflowVariantRows(this.variantRows, units, variants);
    } else {
      var defaultVariantId;
      if (this.variantRows && this.variantRows.length && this.variantRows[0].variantId) {
        defaultVariantId = this.variantRows[0].variantId;
      } else {
        var liveId = String(this.cfg.product.variantId);
        defaultVariantId = variants.some(function (v) { return String(v.id) === liveId; })
          ? liveId
          : (variants.length ? String(variants[0].id) : liveId);
      }
      this.variantRows = [{ variantId: defaultVariantId, qty: units }];
    }
    this._variantMode = newMode;
    this.renderVariantField();
  };

  // Reparte la cantidad total cuando cambia N (unidades de la oferta) y el
  // cliente ya tenía varias filas repartidas: si sube, la 1ª fila absorbe el
  // aumento; si baja, se quita cantidad desde la ÚLTIMA fila hacia atrás
  // (eliminando filas que queden en 0), sin tocar nunca la fila 0 del todo.
  GlozCod.prototype.reflowVariantRows = function (rows, newUnits, variants) {
    rows = rows.map(function (r) { return { variantId: r.variantId, qty: r.qty }; });
    var oldSum = rows.reduce(function (a, r) { return a + r.qty; }, 0);
    var diff = newUnits - oldSum;
    if (diff > 0) {
      rows[0].qty += diff;
    } else if (diff < 0) {
      var removeAmount = -diff;
      for (var i = rows.length - 1; i >= 1 && removeAmount > 0; i--) {
        var take = Math.min(rows[i].qty, removeAmount);
        rows[i].qty -= take;
        removeAmount -= take;
      }
      rows = rows.filter(function (r, idx) { return idx === 0 || r.qty > 0; });
      if (removeAmount > 0) rows[0].qty = Math.max(0, rows[0].qty - removeAmount);
    }
    if (variants && variants.length && rows.length > variants.length) rows = rows.slice(0, variants.length);
    return rows;
  };

  // Dibuja el campo de variante a partir de `this.variantRows`/`this._variantMode`.
  // Se llama desde refreshVariantSelectors() (cambio de oferta) y también
  // desde los propios controles del modo compacto (steppers, agregar/quitar
  // fila, cambiar de variante) — siempre redibuja el contenedor completo,
  // así el contador y los botones (+/-, agregar) quedan siempre consistentes.
  GlozCod.prototype.renderVariantField = function () {
    if (!this.variantWrap) return;
    var self = this, s = this.variantBlockSettings || {}, variants = this.variantVariants || [];
    var radiusMap = { rect: 8, round: 14, oval: 999 };
    this.variantWrap.innerHTML = "";
    this.variantErrEl = null;
    this.variantStatusEl = null;

    var styleSelect = function (select) {
      if (s.contour && radiusMap[s.contour] != null) select.style.borderRadius = radiusMap[s.contour] + "px";
      if (s.shadow) self.applyShadow(select, s.shadow);
      if (s.font_size) select.style.fontSize = s.font_size + "px";
      if (s.text_color) select.style.color = s.text_color;
    };
    var fillOptions = function (select, selectedId) {
      variants.forEach(function (v) {
        var opt = el("option", { value: String(v.id), text: v.title + (v.available === false ? " (agotado)" : "") });
        if (v.available === false) opt.disabled = true;
        select.appendChild(opt);
      });
      select.value = String(selectedId);
    };

    // ── Modo simple: un único selector de siempre (1 variante, 1 unidad, o
    // "per_unit" apagado) — aplica a TODAS las unidades del pedido. ──────────
    if (this._variantMode !== "compact") {
      var row0 = this.variantRows[0];
      var id0 = "gloz-variant-" + this.cfg.sectionId + "-0";
      var select0 = el("select", { class: "gloz-select", id: id0, name: "variant_0" });
      fillOptions(select0, row0.variantId);
      styleSelect(select0);
      select0.addEventListener("change", function () {
        row0.variantId = select0.value;
        self.currentVariantId = select0.value;
        self.recomputeVariantPricing();
        self.fireInitiate();
      });
      var label0 = el("label", { class: "gloz-label", for: id0, text: s.label || "Elige tu variante" });
      var field0 = el("div", { class: "gloz-field gloz-variant-field" }, [label0, select0]);
      this.variantWrap.appendChild(field0);
      this.currentVariantId = row0.variantId;
      return;
    }

    // ── Modo compacto: "cantidad por variante" (filas + steppers) ───────────
    var units = (this.selectedOffer && this.selectedOffer.units) || 1;
    var sum = this.variantRows.reduce(function (a, r) { return a + r.qty; }, 0);
    var remaining = units - sum;

    var head = el("div", { class: "gloz-vqty-head" });
    head.appendChild(el("span", { class: "gloz-vqty-title", text: (s.label && s.label.trim() ? s.label : "Elige tus") + " " + units + " unidades" }));
    var statusEl = el("span", {
      class: "gloz-vqty-status " + (remaining <= 0 ? "is-ok" : "is-pending"),
      text: remaining > 0 ? ("faltan " + remaining) : ("✓ " + units + "/" + units),
    });
    head.appendChild(statusEl);
    this.variantStatusEl = statusEl;
    this.variantWrap.appendChild(head);

    var rowsWrap = el("div", { class: "gloz-vqty-rows" });
    this.variantRows.forEach(function (row, idx) {
      var id = "gloz-variant-" + self.cfg.sectionId + "-" + idx;
      var select = el("select", { class: "gloz-select gloz-vqty-select", id: id, name: "variant_" + idx, "aria-label": "Variante, fila " + (idx + 1) });
      fillOptions(select, row.variantId);
      styleSelect(select);
      select.addEventListener("change", function () {
        row.variantId = select.value;
        self.currentVariantId = self.variantRows[0].variantId;
        self.recomputeVariantPricing();
        self.fireInitiate();
      });

      var minusBtn = el("button", { type: "button", class: "gloz-vqty-btn", "aria-label": "Quitar una unidad" }, [document.createTextNode("−")]);
      minusBtn.disabled = row.qty <= 0;
      minusBtn.addEventListener("click", function () {
        if (row.qty <= 0) return;
        row.qty -= 1;
        self.renderVariantField();
        self.recomputeVariantPricing();
        self.fireInitiate();
      });
      var qtyEl = el("span", { class: "gloz-vqty-num", text: String(row.qty) });
      var plusBtn = el("button", { type: "button", class: "gloz-vqty-btn", "aria-label": "Agregar una unidad" }, [document.createTextNode("+")]);
      plusBtn.disabled = remaining <= 0;
      plusBtn.addEventListener("click", function () {
        var currentSum = self.variantRows.reduce(function (a, r) { return a + r.qty; }, 0);
        if (units - currentSum <= 0) return;
        row.qty += 1;
        self.renderVariantField();
        self.recomputeVariantPricing();
        self.fireInitiate();
      });
      var stepper = el("div", { class: "gloz-vqty-stepper" }, [minusBtn, qtyEl, plusBtn]);

      var kids = [select, stepper];
      var rowEl;
      if (self.variantRows.length > 1) {
        var rmBtn = el("button", { type: "button", class: "gloz-vqty-remove", "aria-label": "Quitar esta variante" }, [svg("close", 12)]);
        rmBtn.addEventListener("click", function () {
          var doRemove = function () {
            var i2 = self.variantRows.indexOf(row);
            if (i2 !== -1) self.variantRows.splice(i2, 1);
            self.renderVariantField();
            self.recomputeVariantPricing();
            self.fireInitiate();
          };
          if (self.animsEnabled() && rowEl) { rowEl.classList.add("gloz-vqty-row--out"); setTimeout(doRemove, 160); }
          else doRemove();
        });
        kids.push(rmBtn);
      }
      rowEl = el("div", { class: "gloz-vqty-row" + (idx === self._justAddedIdx && self.animsEnabled() ? " gloz-variant-field--in" : "") }, kids);
      rowsWrap.appendChild(rowEl);
    });
    this._justAddedIdx = -1;
    this.variantWrap.appendChild(rowsWrap);

    var canAdd = this.variantRows.length < Math.min(variants.length, units);
    if (canAdd) {
      var addBtn = el("button", { type: "button", class: "gloz-vqty-add", text: "+ Agregar otro color" });
      addBtn.addEventListener("click", function () {
        var used = self.variantRows.map(function (r) { return String(r.variantId); });
        var next = variants.filter(function (v) { return used.indexOf(String(v.id)) === -1; })[0] || variants[0];
        self.variantRows.push({ variantId: String(next.id), qty: 0 });
        self._justAddedIdx = self.variantRows.length - 1;
        self.renderVariantField();
      });
      this.variantWrap.appendChild(addBtn);
    }

    var errEl = el("div", { class: "gloz-emsg gloz-vqty-err", "aria-live": "polite" });
    this.variantErrEl = errEl;
    this.variantWrap.appendChild(errEl);

    this.currentVariantId = this.variantRows[0] ? this.variantRows[0].variantId : this.currentVariantId;
  };

  // Recalcula el precio base (por unidad) a partir del PROMEDIO PONDERADO de
  // precios de las filas elegidas (precio de cada variante × su cantidad) —
  // cada variante trae su propio `price`. Filas en 0 no pesan. Este precio
  // "promedio por unidad" alimenta recomputeOffers(), que ya recalcula todas
  // las ofertas y los textos dinámicos ({order_total}). El PRECIO REAL y el
  // descuento final siempre los recalcula el servidor al crear el pedido.
  GlozCod.prototype.recomputeVariantPricing = function () {
    if (!this.variantVariants || !this.variantRows || !this.variantRows.length) return;
    var self = this;
    var sum = 0, n = 0;
    this.variantRows.forEach(function (row) {
      var v = self.variantVariants.filter(function (vv) { return String(vv.id) === String(row.variantId); })[0];
      var price = v ? v.price : self.cfg.product.price;
      sum += price * row.qty;
      n += row.qty;
    });
    var avg = n > 0 ? sum / n : this.cfg.product.price;
    this.recomputeOffers(avg);
  };

  // Aplica una variante "externa" (elegida en la página, FUERA del popup, vía
  // glozCOD.open({variantId}) / data-variant / window.glozSelectedVariant)
  // como la variante principal a usar en el pedido:
  //  - deja `this.currentVariantId` con esa variante (getVariantId() ya la
  //    prioriza sobre cualquier otra cosa).
  //  - si el popup tiene el bloque "Campo: Variante" (this.variantWrap), la
  //    refleja como elegida (fila 0, en modo simple o compacto) y recalcula el
  //    precio/ofertas con recomputeVariantPricing().
  //  - si NO hay campo de variante en el popup pero la variante existe en la
  //    lista del producto, igual recalcula el precio/ofertas con su precio.
  GlozCod.prototype.applyVariantSelection = function (variantId) {
    variantId = String(variantId);
    this.currentVariantId = variantId;
    if (this.variantWrap && this.variantVariants && this.variantVariants.length) {
      if (!this.variantRows || !this.variantRows.length) {
        this.variantRows = [{ variantId: variantId, qty: (this.selectedOffer && this.selectedOffer.units) || 1 }];
      } else {
        this.variantRows[0].variantId = variantId;
      }
      this.renderVariantField();
      this.recomputeVariantPricing();
      return;
    }
    var match = (this.cfg.product.variants || []).filter(function (v) { return String(v.id) === variantId; })[0];
    if (match) this.recomputeOffers(match.price);
  };

  // Valida que la suma de cantidades de las filas sea EXACTAMENTE N (la
  // oferta elegida). Solo aplica en modo "compact" — en modo "simple" no hay
  // nada que sumar (siempre es válido). Se usa antes de enviar el pedido
  // (COD o pago anticipado).
  GlozCod.prototype.validateVariantQty = function () {
    if (this._variantMode !== "compact") return { ok: true };
    var units = (this.selectedOffer && this.selectedOffer.units) || 1;
    var sum = (this.variantRows || []).reduce(function (a, r) { return a + r.qty; }, 0);
    if (sum === units) return { ok: true };
    var missing = units - sum;
    return {
      ok: false,
      message: missing > 0 ? ("Te falta elegir " + missing + " unidad(es).") : ("Tienes " + (-missing) + " unidad(es) de más."),
    };
  };

  // Muestra el error de reparto de variantes (suma != N): en el mensaje bajo
  // las filas, en el contador (en rojo) y enfocando el primer selector.
  GlozCod.prototype.showVariantError = function (msg) {
    if (this.variantErrEl) this.variantErrEl.textContent = msg;
    if (this.variantStatusEl) { this.variantStatusEl.classList.remove("is-ok", "is-pending"); this.variantStatusEl.classList.add("is-error"); }
    if (this.variantWrap) { var sel = this.variantWrap.querySelector("select"); if (sel) sel.focus(); }
  };

  // Arma las líneas del producto PRINCIPAL agrupadas por variante elegida
  // (ej. 1 roja + 1 azul = 2 líneas de qty 1; 2 rojas = 1 línea qty 2).
  // Filas en cantidad 0 se ignoran. Devuelve null cuando el campo de
  // variante está en modo "simple" (un solo selector) — ahí se usa el flujo
  // clásico (variantId único, ver getVariantId()).
  GlozCod.prototype.buildMainLines = function () {
    if (this._variantMode !== "compact" || !this.variantRows) return null;
    var counts = {}, order = [];
    this.variantRows.forEach(function (row) {
      if (!row.qty || row.qty <= 0) return;
      var key = String(row.variantId);
      if (!counts[key]) { counts[key] = 0; order.push(key); }
      counts[key] += row.qty;
    });
    if (!order.length) return null;
    return order.map(function (key) { return { variantId: key, quantity: counts[key] }; });
  };

  GlozCod.prototype.render_image = function (block) {
    var s = block.settings;
    var src = (s.image_url && s.image_url.trim()) || s.image_asset;
    if (!src) return null;
    var img = el("img", { class: "gloz-cimg", src: src, alt: s.alt || "", loading: "lazy" });
    if (s.radius != null) img.style.borderRadius = s.radius + "px";
    if (s.max_width) img.style.maxWidth = s.max_width + "px";
    return el("div", { class: "gloz-block gloz-align-center" }, [img]);
  };

  GlozCod.prototype.render_custom_text = function (block) {
    var s = block.settings;
    if (!s.heading && !s.body) return null;
    var wrap = el("div", { class: "gloz-block gloz-ctext gloz-align-" + (s.align || "left") });
    if (s.text_color) wrap.style.color = s.text_color;
    if (s.heading) wrap.appendChild(el("div", { class: "gloz-ctext-h", text: s.heading }));
    if (s.body) { var p = el("p", { class: "gloz-ctext-b", text: s.body }); if (s.size) p.style.fontSize = s.size + "px"; wrap.appendChild(p); }
    return wrap;
  };

  GlozCod.prototype.styleActionBtn = function (btn, s) {
    // En modo tema (claro/oscuro) los colores los pone la paleta (variables CSS),
    // no el color manual del bloque. En "personalizado" sí manda el del bloque.
    if (!this._themePreset) {
      if (s.bg) btn.style.background = s.bg;
      if (s.text_color) btn.style.color = s.text_color;
      if (s.border_width != null && s.border_width > 0) { btn.style.borderStyle = "solid"; btn.style.borderWidth = s.border_width + "px"; btn.style.borderColor = s.border_color || s.bg; }
    }
    if (s.radius != null) btn.style.borderRadius = s.radius + "px";
    if (s.font_size) btn.style.fontSize = s.font_size + "px";
    if (s.shadow != null) this.applyShadow(btn, s.shadow);
    if (s.anim_style && s.anim_style !== "none" && this.animsEnabled()) btn.classList.add("gloz-btnanim-" + s.anim_style);
  };

  // Sombra configurable (0-40px). Misma fórmula que usa el Liquid para el
  // botón de afuera, así se ven consistentes. 0 = sin sombra.
  GlozCod.prototype.applyShadow = function (btn, px) {
    var v = parseInt(px, 10) || 0;
    if (v <= 0) { btn.style.boxShadow = "none"; return; }
    var offset = Math.round(v * 0.36);
    btn.style.boxShadow = "0 " + offset + "px " + v + "px rgba(0,0,0,0.16)";
  };

  // ── Texto dinámico en botones: {order_total} / {order_subtotal} ───────────
  // Se calculan sobre la oferta seleccionada + upsells marcados, y se
  // re-renderizan en vivo cada vez que el cliente cambia de oferta o upsell.
  GlozCod.prototype.computeOrderTotals = function () {
    var total = this.selectedOffer ? this.selectedOffer.total : this.cfg.product.price;
    var subtotal = this.selectedOffer ? this.selectedOffer.base : this.cfg.product.price;
    var self = this;
    Object.keys(this.upsellState).forEach(function (id) {
      var u = self.upsellState[id];
      // Los upsells OCULTOS (visible_to_customer = false) van SIEMPRE, sin checkbox.
      if (u.forced || (u.checkbox && u.checkbox.checked)) { total += u.total; subtotal += u.base; }
    });
    return { total: total, subtotal: subtotal };
  };
  GlozCod.prototype.applyTemplate = function (str) {
    if (!str) return str;
    if (str.indexOf("{order_total}") === -1 && str.indexOf("{order_subtotal}") === -1) return str;
    var t = this.computeOrderTotals();
    return str.replace(/\{order_total\}/g, money(t.total, this.cfg.currency)).replace(/\{order_subtotal\}/g, money(t.subtotal, this.cfg.currency));
  };
  GlozCod.prototype.updateDynamicButtonTexts = function () {
    var self = this;
    this.dynamicButtons.forEach(function (d) {
      if (d.textEl) d.textEl.textContent = self.applyTemplate(d.textTpl);
      if (d.subEl) d.subEl.textContent = self.applyTemplate(d.subTpl);
    });
    this.updateSummary();
  };

  // Bloque "Resumen de compra" (opcional): producto × unidades, subtotal,
  // descuento y total. Se actualiza en vivo al cambiar oferta/upsell.
  // El downsell no se dibuja en el formulario: se guarda para ofrecerlo en la
  // pantalla de éxito (ver renderDownsell). Devuelve null para no ocupar espacio.
  GlozCod.prototype.render_downsell = function (block) { this.downsellBlock = block; return null; };

  GlozCod.prototype.render_summary = function (block) {
    var s = block.settings;
    this.summaryTitle = s.title || "Resumen de tu pedido";
    this.summaryEl = el("div", { class: "gloz-summary" });
    this.updateSummary();
    return el("div", { class: "gloz-block" }, [this.summaryEl]);
  };
  GlozCod.prototype.updateSummary = function () {
    if (!this.summaryEl) return;
    var t = this.computeOrderTotals();
    var units = (this.selectedOffer && this.selectedOffer.units) || 1;
    var discount = Math.max(0, t.subtotal - t.total);
    var cur = this.cfg.currency;
    var rows = "";
    rows += '<div class="gloz-sum-h">' + esc(this.summaryTitle) + "</div>";
    rows += '<div class="gloz-sum-row"><span>' + esc(this.cfg.product.title) + " × " + units + "</span><span>" + money(t.subtotal, cur) + "</span></div>";
    if (discount > 0) rows += '<div class="gloz-sum-row gloz-sum-disc"><span>Descuento</span><span>-' + money(discount, cur) + "</span></div>";
    rows += '<div class="gloz-sum-row gloz-sum-total"><span>Total a pagar</span><span>' + money(t.total, cur) + "</span></div>";
    this.summaryEl.innerHTML = rows;
  };

  // Arma la columna de texto (línea principal + subtítulo opcional) de un
  // botón de acción, resolviendo {order_total}/{order_subtotal} si aplica y
  // registrándolo para que se actualice en vivo con self.updateDynamicButtonTexts().
  GlozCod.prototype.buildActionBtnText = function (textTpl, subTpl) {
    var textEl = el("span", { class: "gloz-btn-maintext", text: this.applyTemplate(textTpl) || "" });
    var col = el("span", { class: "gloz-btn-textcol" }, [textEl]);
    var subEl = null;
    if (subTpl) { subEl = el("span", { class: "gloz-btn-subtext", text: this.applyTemplate(subTpl) }); col.appendChild(subEl); }
    if (/\{order_(total|subtotal)\}/.test((textTpl || "") + (subTpl || ""))) {
      this.dynamicButtons.push({ textEl: textEl, subEl: subEl, textTpl: textTpl, subTpl: subTpl });
    }
    return col;
  };

  GlozCod.prototype.render_cod_button = function (block) {
    var self = this, s = block.settings;
    this.notice = this.notice || el("div", { class: "gloz-notice", role: "alert", hidden: "" });
    var textCol = this.buildActionBtnText(s.text || "Pedir con pago contra entrega", s.subtitle);
    var btn = el("button", { class: "gloz-submit", type: "button" }, [ iconEl(s.icon || "cart", 18), textCol ]);
    this.styleActionBtn(btn, s);
    btn.addEventListener("click", function () { self.submitCod(btn); });
    this.codButton = btn;
    var kids = [this.notice, btn];
    if (s.helper_text) kids.push(el("p", { class: "gloz-helper", text: s.helper_text }));
    return el("div", { class: "gloz-block" }, kids);
  };

  GlozCod.prototype.render_prepaid_button = function (block) {
    var self = this, s = block.settings;
    var textCol = this.buildActionBtnText(s.text || "Prefiero pagar en línea ahora", s.subtitle);
    var btn = el("button", { class: "gloz-prepaid" + (s.fill_style === "solid" ? " gloz-prepaid--solid" : ""), type: "button" }, [ iconEl(s.icon || "card", 18), textCol ]);
    this.styleActionBtn(btn, s);
    btn.addEventListener("click", function () { self.goPrepaid(btn); });
    var kids = [btn];
    if (s.helper_text) kids.push(el("p", { class: "gloz-helper", text: s.helper_text }));
    return el("div", { class: "gloz-block" }, kids);
  };

  // Calcula {type, value, total} de un upsell a partir de sus settings
  // (discount_type/discount/fixed_price) y el precio BASE real de su variante.
  GlozCod.prototype.upsellPricing = function (s, base) {
    var rawValue = normalizeDiscountType(s.discount_type) === "percent" ? s.discount : s.fixed_price;
    return computeDiscount(s.discount_type, rawValue, base);
  };

  // Punto de entrada: decide qué variante usar (la del product picker, o la
  // manual "variant_id" para productos FUERA del canal "Tienda online" — ver
  // nota en el Liquid) y arma el nodo. Si no hay NINGUNA variante usable,
  // omite el upsell sin romper nada (return null).
  GlozCod.prototype.render_upsell = function (block) {
    var s = block.settings;
    var p = s.product || null; // objeto completo (title/price/image/available) si Liquid pudo leerlo
    var manualId = (s.variant_id || "").toString().trim();
    var variantId = (p && p.variantId != null) ? String(p.variantId) : (manualId || null);
    if (!variantId) return null; // ni product ni variant_id manual: se omite

    if (p && p.available === false) return null; // variante conocida pero agotada: se omite (como antes)

    var visibleToCustomer = s.visible_to_customer !== false;

    // Caso normal: Liquid SÍ pudo leer el producto (está en el canal).
    if (p) return this.buildUpsellNode(block, variantId, p, visibleToCustomer);

    // Fuera del canal: no hay info de display desde Liquid. Para OCULTOS se
    // registra YA (con total/base provisionales en 0 — el discountType/Value
    // configurado NO depende del precio, así que ya es correcto; el servidor
    // vuelve a calcular el precio real de todas formas al crear el pedido) y
    // se resuelve el precio real en 2° plano solo para que el texto
    // {order_total} de los botones se vea correcto.
    if (!visibleToCustomer) {
      var pricing0 = this.upsellPricing(s, 0);
      this.upsellState[block.id] = { checkbox: null, forced: true, variantId: variantId, discountType: pricing0.type, discountValue: pricing0.value, total: pricing0.total, base: 0 };
      this.resolveUpsellVariant(block, variantId, false, null);
      return null;
    }

    // VISIBLE pero sin datos para mostrar (fuera del canal): placeholder que
    // se reemplaza en cuanto resuelva /variant-info (backend, sí ve
    // productos fuera de canal). Si no resuelve, el placeholder se retira solo.
    var placeholder = el("div", { class: "gloz-block gloz-upsell-pending" });
    this.resolveUpsellVariant(block, variantId, true, placeholder);
    return placeholder;
  };

  // Resuelve (backend GET /variant-info) el título/precio/imagen reales de
  // una variante que Liquid no pudo leer (fuera del canal). OCULTOS: solo
  // corrige el total/base mostrados (discountType/Value ya eran correctos).
  // VISIBLES: construye el card definitivo y reemplaza el placeholder.
  GlozCod.prototype.resolveUpsellVariant = function (block, variantId, visibleToCustomer, placeholder) {
    var self = this;
    fetch(this.cfg.apiUrl + "/variant-info?id=" + encodeURIComponent(variantId))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.variant || res.variant.available === false) throw new Error("variante no disponible");
        var v = res.variant;
        var p = { variantId: String(v.variantId), title: v.title, price: Number(v.price) || 0, compareAtPrice: v.compareAtPrice || null, image: v.image || null, available: true };
        if (!visibleToCustomer) {
          var st = self.upsellState[block.id];
          if (st) {
            var pricing = self.upsellPricing(block.settings, p.price);
            st.total = pricing.total; st.base = p.price; // discountType/Value ya eran correctos desde el inicio
          }
          self.updateDynamicButtonTexts();
          return;
        }
        var node = self.buildUpsellNode(block, variantId, p, true);
        if (placeholder && placeholder.parentNode) {
          if (node) placeholder.parentNode.replaceChild(node, placeholder);
          else placeholder.parentNode.removeChild(placeholder);
        }
        self.updateDynamicButtonTexts();
      })
      .catch(function () {
        if (!visibleToCustomer) delete self.upsellState[block.id];
        if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      });
  };

  // Arma el nodo/card del upsell (o solo registra su estado, si es OCULTO) a
  // partir de datos de producto YA RESUELTOS (p: variantId/title/price/image).
  GlozCod.prototype.buildUpsellNode = function (block, variantId, p, visibleToCustomer) {
    var self = this, s = block.settings;
    var title = s.label_override && s.label_override.trim() !== "" ? s.label_override : p.title;
    var base = p.price;
    var pricing = this.upsellPricing(s, base);
    var total = pricing.total, dType = pricing.type, dValue = pricing.value;

    if (!visibleToCustomer) {
      // Upsell OCULTO: pensado para armar KITS. Se agrega SIEMPRE al pedido
      // (ver computeOrderTotals/selectedUpsells), sin mostrarse en el popup
      // ni depender de ningún checkbox (que aquí ni existe).
      this.upsellState[block.id] = { checkbox: null, forced: true, variantId: variantId, discountType: dType, discountValue: dValue, total: total, base: base };
      return null;
    }

    var checkbox = el("input", { type: "checkbox", class: "gloz-upsell-check", id: "gloz-up-" + block.id });
    checkbox.checked = !!s.default_checked;
    checkbox.addEventListener("change", function () { self.fireInitiate(); self.updateDynamicButtonTexts(); });
    var card = el("label", { class: "gloz-upsell", for: "gloz-up-" + block.id });
    if (s.border_color) card.style.borderColor = s.border_color;
    if (s.radius != null) card.style.borderRadius = s.radius + "px";
    var imgSrc = (s.image_url && s.image_url.trim()) || (s.show_image !== false ? p.image : null);
    if (s.show_image !== false && imgSrc) card.appendChild(el("img", { class: "gloz-upsell-img", src: imgSrc, alt: "", loading: "lazy" }));
    var mainKids = [el("div", { class: "gloz-upsell-name", text: title })];
    if (s.show_price !== false) {
      var pr = el("div", { class: "gloz-upsell-prices" }, [ el("span", { class: "gloz-upsell-price", text: money(total, self.cfg.currency) }) ]);
      if (total < base) pr.appendChild(el("span", { class: "gloz-upsell-cmp", text: money(base, self.cfg.currency) }));
      mainKids.push(pr);
    }
    card.appendChild(checkbox);
    card.appendChild(el("div", { class: "gloz-upsell-main" }, mainKids));
    card.appendChild(el("span", { class: "gloz-upsell-add" }));
    this.upsellState[block.id] = { checkbox: checkbox, forced: false, variantId: variantId, discountType: dType, discountValue: dValue, total: total, base: base };
    return el("div", { class: "gloz-block" }, [card]);
  };

  GlozCod.prototype.render_guarantee = function (block) {
    var s = block.settings; if (!s.text) return null;
    var textEl = el("span", { text: s.text });
    if (s.text_size) textEl.style.fontSize = s.text_size + "px";
    var g = el("div", { class: "gloz-guarantee gloz-guarantee--" + (s.style || "plain") + (s.animate !== false && this.animsEnabled() ? " is-animated" : "") }, [svg(s.icon || "shield", 18), textEl]);
    if (s.color) g.style.setProperty("--gg", s.color);
    return el("div", { class: "gloz-block" }, [g]);
  };

  GlozCod.prototype.render_trust_text = function (block) {
    var s = block.settings;
    var items = [];
    [1, 2, 3].forEach(function (i) { var txt = s["item" + i + "_text"]; if (txt) items.push({ icon: s["item" + i + "_icon"] || "check", text: txt }); });
    if (items.length) {
      var row = el("div", { class: "gloz-trust-items gloz-trust--" + (s.style || "cards") + (s.animate !== false && this.animsEnabled() ? " is-animated" : "") });
      if (s.color) row.style.setProperty("--gt", s.color);
      items.forEach(function (it, i) { var item = el("div", { class: "gloz-trust-item" }, [svg(it.icon, 18), el("span", { text: it.text })]); item.style.setProperty("--gt-i", String(i)); row.appendChild(item); });
      return el("div", { class: "gloz-block" }, [row]);
    }
    if (!s.text) return null;
    return el("div", { class: "gloz-block" }, [ el("p", { class: "gloz-trust gloz-align-" + (s.align || "center"), text: s.text }) ]);
  };

  GlozCod.prototype.render_scarcity = function (block) {
    var s = block.settings;
    if (s.mode !== "timer") return null;
    var minutes = Math.max(1, parseInt(s.timer_minutes, 10) || 15);
    var key = "gloz_scarcity_" + this.cfg.sectionId;
    var end = Number(sessionStorage.getItem(key)), now = Date.now();
    if (!end || end < now) { end = now + minutes * 60000; try { sessionStorage.setItem(key, String(end)); } catch (e) {} }
    var span = el("span", { class: "gloz-scarcity-time" });
    var inner = [];
    if (s.show_icon !== false) inner.push(svg("clock", 18));
    inner.push(span);
    var box = el("div", { class: "gloz-scarcity gloz-scarcity--" + (s.style || "modern") }, inner);
    if (s.bg_color) box.style.background = s.bg_color;
    if (s.text_color) box.style.color = s.text_color;
    if (s.accent_color) span.style.color = s.accent_color;
    var wrap = el("div", { class: "gloz-block" }, [box]);
    var template = s.text_template || "Esta oferta termina en {time}";
    function tick() {
      var left = Math.max(0, end - Date.now());
      var mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      span.textContent = template.replace("{time}", (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss);
      if (left <= 0) clearInterval(timer);
    }
    tick(); var timer = setInterval(tick, 1000); this._timers.push(timer);
    return wrap;
  };

  GlozCod.prototype.collectFields = function () {
    var out = { ok: true, fields: {} }, self = this;
    Object.keys(this.inputs).forEach(function (key) {
      var it = self.inputs[key], v = (it.input.value || "").trim();
      if (it.required && v === "") { it.input.classList.add("err"); it.err.textContent = "Este campo es obligatorio."; out.ok = false; }
      else if (it.kind === "phone" && v !== "" && v.replace(/\D/g, "").length < 10) { it.input.classList.add("err"); it.err.textContent = "Escribe un celular válido (10 dígitos)."; out.ok = false; }
      else if (it.kind === "email" && v !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { it.input.classList.add("err"); it.err.textContent = "Escribe un correo válido."; out.ok = false; }
      else if (v !== "") { out.fields[key] = v; }
    });
    return out;
  };

  GlozCod.prototype.selectedUpsells = function () {
    var self = this;
    return Object.keys(this.upsellState).map(function (id) { return self.upsellState[id]; })
      .filter(function (u) { return u.forced || (u.checkbox && u.checkbox.checked); })
      .map(function (u) { return { variantId: String(u.variantId), quantity: 1, discountType: u.discountType, discountValue: u.discountValue }; });
  };

  // Lee los valores ACTUALES de los campos (sin validar) para la captura /lead.
  GlozCod.prototype.collectPartial = function () {
    var out = {}, self = this;
    Object.keys(this.inputs).forEach(function (key) {
      var it = self.inputs[key];
      if (!it || !it.input) return;
      var v = (it.input.value || "").trim();
      if (v !== "") out[key] = v;
    });
    return out;
  };

  // Envía la captura de abandono (debounced) SOLO si el teléfono es válido.
  GlozCod.prototype.queueLead = function () {
    var self = this;
    if (this._leadTimer) clearTimeout(this._leadTimer);
    this._leadTimer = setTimeout(function () {
      var fields = self.collectPartial();
      var digits = (fields.phone || "").replace(/\D/g, "");
      if (digits.length < 10) return;
      var variantId = getLiveVariantId(self.cfg.product.variantId);
      var body = {
        fields: fields,
        variantId: String(variantId),
        quantity: self.selectedOffer ? self.selectedOffer.units : 1,
        productTitle: self.cfg.product.title,
        currency: self.cfg.currency,
      };
      try {
        fetch(self.cfg.apiUrl + "/lead", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), keepalive: true,
        }).catch(function () {});
      } catch (e) {}
    }, 1500);
  };

  GlozCod.prototype.submitCod = function (btn) {
    var self = this;
    if (this.notice) this.notice.hidden = true;
    var variantCheck = this.validateVariantQty();
    if (!variantCheck.ok) { this.showVariantError(variantCheck.message); return; }
    var data = this.collectFields();
    if (!data.ok) { var fb = this.modal.querySelector(".err"); if (fb) fb.focus(); return; }
    if (!this.selectedOffer) { this.showError("Elige una oferta."); return; }
    this._lastFields = data.fields; // se reutilizan si el cliente acepta el downsell

    var original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "";
    btn.appendChild(el("span", { class: "gloz-spinner" }));
    btn.appendChild(el("span", { text: this.cfg.texts.submitting || "Enviando tu pedido…" }));

    // Si el campo de variante está en modo "por unidad" (2+ selectores),
    // el grupo principal se arma como VARIAS líneas (una por variante elegida,
    // agrupando cantidades repetidas). Si no, se manda el flujo clásico de
    // siempre (una sola variante para todas las unidades).
    var mainLines = this.buildMainLines();
    var variantId = mainLines && mainLines.length ? mainLines[0].variantId : this.getVariantId();
    var eventId = uuid();
    this.purchaseEventId = eventId;
    var body = {
      variantId: String(variantId), quantity: this.selectedOffer.units,
      lines: mainLines || undefined,
      discountType: this.selectedOffer.discountType, discountValue: this.selectedOffer.discountValue,
      productTitle: this.cfg.product.title, currency: this.cfg.currency,
      upsells: this.selectedUpsells(), fields: data.fields,
      eventId: eventId, eventSourceUrl: location.href,
      fbp: getCookie("_fbp"), fbc: getCookie("_fbc"),
      hp: this.hpInput ? this.hpInput.value : "",
    };
    fetch(this.cfg.apiUrl + "/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (!res.body.ok) throw new Error(res.body.error || self.cfg.texts.errorGeneric);
        self.trackPurchase();
        self.showSuccess(res.body.order);
      })
      .catch(function (e) { btn.disabled = false; btn.innerHTML = original; self.showError(e.message || self.cfg.texts.errorGeneric); });
  };

  GlozCod.prototype.trackPurchase = function () {
    var val = this.selectedOffer ? this.selectedOffer.total : this.cfg.product.price;
    var units = this.selectedOffer ? this.selectedOffer.units : 1;
    fbTrack("Purchase", { currency: this.cfg.currency, value: val, content_ids: this.contentIds(), content_type: "product", num_items: units }, this.purchaseEventId);
    ttTrack("PlaceAnOrder", { currency: this.cfg.currency, value: val });
  };

  GlozCod.prototype.showError = function (msg) { if (this.notice) { this.notice.textContent = msg; this.notice.hidden = false; } };

  GlozCod.prototype.showSuccess = function (order) {
    var body = this.modal.querySelector(".gloz-mbody");
    body.innerHTML = "";
    var box = el("div", { class: "gloz-success" }, [
      el("div", { class: "gloz-success-ic" }, [svg("check", 30)]),
      el("h3", { text: this.cfg.texts.successTitle || "¡Pedido confirmado!" }),
      el("p", { text: this.cfg.texts.successBody || "" }),
    ]);
    if (order && order.name) box.appendChild(el("span", { class: "gloz-ord", text: "Pedido " + order.name }));
    var self = this;
    var closeBtn = el("button", { class: "gloz-prepaid gloz-prepaid--solid gloz-success-close", type: "button", text: this.cfg.texts.closeLabel || "Cerrar" });
    closeBtn.addEventListener("click", function () { self.close(); });
    box.appendChild(closeBtn); body.appendChild(box);
    // Oferta post-pedido (downsell): se inserta ANTES del botón "Cerrar".
    this.renderDownsell(box, closeBtn);
  };

  // El downsell NO se muestra en el formulario: se guarda en render_downsell y
  // se ofrece aquí, en la pantalla de éxito, reutilizando los datos del cliente
  // (this._lastFields) para crear un segundo pedido COD con un clic.
  GlozCod.prototype.renderDownsell = function (box, closeBtn) {
    var block = this.downsellBlock, self = this;
    if (!block || !block.settings) return;
    var s = block.settings;
    if (s.enable === false) return;
    var p = s.product || null;
    var manualId = (s.variant_id || "").toString().trim();
    var variantId = (p && p.variantId != null) ? String(p.variantId) : (manualId || null);
    if (!variantId) return;
    if (p && p.available === false) return;
    var mount = el("div", { class: "gloz-ds-mount" });
    box.insertBefore(mount, closeBtn);
    if (p) { this.mountDownsellCard(mount, closeBtn, block, variantId, p); return; }
    // Fuera del canal "Tienda online": resolver título/precio/imagen reales.
    fetch(this.cfg.apiUrl + "/variant-info?id=" + encodeURIComponent(variantId))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.variant || res.variant.available === false) throw new Error("no");
        var v = res.variant;
        self.mountDownsellCard(mount, closeBtn, block, variantId, { variantId: String(v.variantId), title: v.title, price: Number(v.price) || 0, image: v.image || null });
      })
      .catch(function () { if (mount.parentNode) mount.parentNode.removeChild(mount); });
  };

  GlozCod.prototype.mountDownsellCard = function (mount, closeBtn, block, variantId, p) {
    var self = this, s = block.settings;
    var base = p.price;
    var pricing = this.upsellPricing(s, base);
    var total = pricing.total, cur = this.cfg.currency;
    var name = (s.label_override && s.label_override.trim()) || p.title;
    var card = el("div", { class: "gloz-ds" });
    card.appendChild(el("div", { class: "gloz-ds-title", text: (s.title && s.title.trim()) || "🎁 Oferta especial solo por hoy" }));
    if (s.text) card.appendChild(el("p", { class: "gloz-ds-text", text: s.text }));
    var bodyRow = el("div", { class: "gloz-ds-body" });
    var imgSrc = (s.image_url && s.image_url.trim()) || (s.show_image !== false ? p.image : null);
    if (imgSrc) bodyRow.appendChild(el("img", { class: "gloz-ds-img", src: imgSrc, alt: "", loading: "lazy" }));
    var info = el("div", { class: "gloz-ds-info" }, [el("div", { class: "gloz-ds-name", text: name })]);
    var prices = el("div", { class: "gloz-ds-prices" }, [el("span", { class: "gloz-ds-price", text: money(total, cur) })]);
    if (total < base) prices.appendChild(el("span", { class: "gloz-ds-cmp", text: money(base, cur) }));
    info.appendChild(prices);
    bodyRow.appendChild(info);
    card.appendChild(bodyRow);
    var errEl = el("div", { class: "gloz-ds-err", hidden: "" });
    card.appendChild(errEl);
    var accept = el("button", { class: "gloz-submit gloz-ds-accept", type: "button" }, [iconEl("cart", 18), el("span", { text: s.button_text || "Sí, agregar a mi pedido" })]);
    var decline = el("button", { class: "gloz-ds-decline", type: "button", text: s.decline_text || "No, gracias" });
    accept.addEventListener("click", function () { self.acceptDownsell(accept, card, errEl, variantId, name, pricing); });
    decline.addEventListener("click", function () { if (mount.parentNode) mount.parentNode.removeChild(mount); });
    card.appendChild(accept);
    card.appendChild(decline);
    mount.appendChild(card);
  };

  GlozCod.prototype.acceptDownsell = function (btn, card, errEl, variantId, name, pricing) {
    var self = this;
    if (errEl) errEl.hidden = true;
    var original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "";
    btn.appendChild(el("span", { class: "gloz-spinner" }));
    btn.appendChild(el("span", { text: this.cfg.texts.submitting || "Enviando…" }));
    var body = {
      variantId: String(variantId), quantity: 1,
      discountType: pricing.type, discountValue: pricing.value,
      productTitle: name, currency: this.cfg.currency,
      fields: this._lastFields || {},
      eventId: uuid(), eventSourceUrl: location.href,
      fbp: getCookie("_fbp"), fbc: getCookie("_fbc"), downsell: true,
    };
    fetch(this.cfg.apiUrl + "/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error || self.cfg.texts.errorGeneric);
        card.innerHTML = "";
        card.appendChild(el("div", { class: "gloz-ds-done" }, [svg("check", 22), el("span", { text: "¡Listo! Lo agregamos a tu pedido." })]));
      })
      .catch(function (e) {
        btn.disabled = false; btn.innerHTML = original;
        if (errEl) { errEl.textContent = e.message || (self.cfg.texts.errorGeneric || "No se pudo agregar."); errEl.hidden = false; }
      });
  };

  GlozCod.prototype.goPrepaid = function (btn) {
    var self = this;
    if (!this.selectedOffer) { this.showError("Elige una oferta."); return; }
    var variantCheck = this.validateVariantQty();
    if (!variantCheck.ok) { this.showVariantError(variantCheck.message); return; }
    var items = [];
    var mainLines = this.buildMainLines();
    if (mainLines && mainLines.length) {
      mainLines.forEach(function (l) { items.push({ id: Number(String(l.variantId).replace(/\D/g, "")), quantity: l.quantity }); });
    } else {
      var variantId = this.getVariantId();
      items.push({ id: Number(String(variantId).replace(/\D/g, "")), quantity: this.selectedOffer.units });
    }
    this.selectedUpsells().forEach(function (u) { items.push({ id: Number(String(u.variantId).replace(/\D/g, "")), quantity: u.quantity }); });
    var original = btn.innerHTML; btn.disabled = true;
    self.fireInitiate();
    fetch("/cart/add.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items }) })
      .then(function (r) { if (!r.ok) throw new Error("cart"); return r.json(); })
      .then(function () { location.href = "/checkout"; })
      .catch(function () { btn.disabled = false; btn.innerHTML = original; self.showError("No pudimos preparar tu pago en línea. Intenta de nuevo."); });
  };

  GlozCod.prototype.open = function () {
    if (!this.built) this.build();
    bootPixels(this.cfg.pixels);
    this.lastFocused = document.activeElement;
    document.body.classList.add("gloz-noscroll");
    this.overlay.style.display = "flex";
    if (!this.hpInput) {
      this.hpInput = el("input", { type: "text", class: "gloz-hp", name: "company_extra", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
      this.modal.querySelector(".gloz-mbody").appendChild(this.hpInput);
    }
    var self = this;
    requestAnimationFrame(function () { self.overlay.classList.add("is-open"); });
    document.addEventListener("keydown", this.keydownHandler, true);
    // Pixel: ViewContent al abrir + estadística "opens"
    fbTrack("ViewContent", { currency: this.cfg.currency, value: this.cfg.product.price, content_ids: this.contentIds(), content_type: "product" });
    ttTrack("ViewContent", { currency: this.cfg.currency, value: this.cfg.product.price });
    this.pingStat("opens");
    var focusTarget = this.modal.querySelector(".gloz-input, .gloz-select, .gloz-offer") || this.modal.querySelector(".gloz-mclose");
    setTimeout(function () { if (focusTarget) focusTarget.focus(); }, this.animsEnabled() ? 220 : 0);
  };

  GlozCod.prototype.close = function () {
    var self = this;
    this.overlay.classList.remove("is-open");
    document.removeEventListener("keydown", this.keydownHandler, true);
    var ms = this.animsEnabled() ? parseInt(this.cfg.theme.animationMs, 10) || 220 : 0;
    setTimeout(function () { self.overlay.style.display = "none"; document.body.classList.remove("gloz-noscroll"); if (self.lastFocused && self.lastFocused.focus) self.lastFocused.focus(); }, ms);
  };

  // ── API pública (window.glozCOD) ───────────────────────────────────────────
  // Busca la oferta a preseleccionar entre las ya construidas (this.offerRefs,
  // llenado por render_offers): por `offerId` ("offer1".."offer4", el id
  // estable de cada tarjeta de oferta) o por `units` (cantidad de unidades de
  // la oferta). Si no matchea nada, devuelve null y no se toca la selección.
  GlozCod.prototype.findOfferRef = function (opts) {
    var list = this.offerRefs || [], i;
    if (opts.offerId != null) {
      var offerId = String(opts.offerId);
      for (i = 0; i < list.length; i++) { if (list[i].tier && list[i].tier.key === offerId) return list[i]; }
    }
    if (opts.units != null) {
      var units = Number(opts.units);
      for (i = 0; i < list.length; i++) { if (list[i].tier && list[i].tier.units === units) return list[i]; }
    }
    return null;
  };

  // Abre el popup preseleccionando una oferta y/o una variante:
  //   opts.units / opts.offerId → preselecciona una oferta ("offer1".."offer4"
  //     o por cantidad de unidades), igual que antes.
  //   opts.variantId → preselecciona esa variante como la principal (ver
  //     applyVariantSelection). Si no viene `opts.variantId` pero la PÁGINA
  //     dejó `window.glozSelectedVariant` (el hook para su propio selector de
  //     variantes), se usa esa — así el popup siempre abre con la misma
  //     variante que el cliente ya eligió afuera.
  // Si el popup no estaba construido, lo construye primero (así
  // this.offerRefs/this.variantWrap ya existen). Si no matchea ninguna oferta
  // o variante, sigue igual (sin cambiar la selección actual/por defecto).
  GlozCod.prototype.openWith = function (opts) {
    opts = opts || {};
    if (!this.built) this.build();
    var variantToUse = opts.variantId != null
      ? String(opts.variantId)
      : (window.glozSelectedVariant ? String(window.glozSelectedVariant) : null);
    if (variantToUse) this.applyVariantSelection(variantToUse);
    if (opts.units != null || opts.offerId != null) {
      var ref = this.findOfferRef(opts);
      if (ref && ref.btn) ref.btn.click();
    }
    this.open();
  };

  GlozCod.prototype.onKeydown = function (e) {
    if (e.key === "Escape") { this.close(); return; }
    if (e.key === "Tab") {
      var f = this.modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      var list = Array.prototype.slice.call(f).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  };

  // ── API pública para abrir el popup desde botones externos (barras sticky,
  // botones personalizados, etc. — reemplaza los que hoy abren Releasit) ─────
  // window.glozCOD.open(opts) abre la PRIMERA instancia de la página.
  //   - open()                    → abre normal (respeta la oferta por defecto)
  //   - open({ units: 2 })        → abre y preselecciona la oferta de 2 unidades
  //   - open({ offerId: "offer2" }) → abre y preselecciona esa oferta (id fijo
  //     "offer1".."offer4" según su posición en el bloque "Ofertas")
  //   - open({ variantId: "123456789" }) → abre con ESA variante como la
  //     principal (precio, ofertas, {order_total} y el campo de variante del
  //     popup —si existe— se recalculan/reflejan con ella). Si no se pasa
  //     `variantId`, se usa `window.glozSelectedVariant` si está definida
  //     (ver el hook documentado junto a getLiveVariantId más arriba).
  // Los opts se pueden combinar, ej: open({ variantId: "123", units: 2 }).
  // Si hay varias secciones/instancias en la misma página, usa
  // window.glozCOD.instances[n].open(opts) para abrir una en particular.
  var GLOZ_INSTANCES = [];
  window.glozCOD = window.glozCOD || {};
  window.glozCOD.instances = GLOZ_INSTANCES;
  window.glozCOD.open = function (opts) {
    var inst = GLOZ_INSTANCES[0];
    if (inst) inst.openWith(opts);
  };

  // Auto-enganche por atributo (sin escribir JS): cualquier elemento con
  // [data-gloz-open] en cualquier parte de la página abre el popup. Si el
  // elemento (o un ancestro suyo) trae data-units="N", data-offer="offerN" o
  // data-variant="<id>", se preselecciona esa oferta/variante. Delegado en
  // `document`, así funciona con botones/barras que se agreguen al DOM
  // después de cargar la página (sticky bars, ofertas, botones del tema, etc.).
  document.addEventListener("click", function (e) {
    var trigger = e.target && e.target.closest && e.target.closest("[data-gloz-open]");
    if (!trigger) return;
    var inst = GLOZ_INSTANCES[0];
    if (!inst) return;
    var opts = {};
    var unitsEl = trigger.closest("[data-units]");
    var offerEl = trigger.closest("[data-offer]");
    var variantEl = trigger.closest("[data-variant]");
    if (unitsEl) opts.units = Number(unitsEl.getAttribute("data-units"));
    if (offerEl) opts.offerId = offerEl.getAttribute("data-offer");
    if (variantEl) opts.variantId = variantEl.getAttribute("data-variant");
    inst.openWith(opts);
  });

  function boot() {
    document.querySelectorAll(".gloz-cod-block").forEach(function (root) {
      var dataScript = document.getElementById(root.id.replace("gloz-cod-", "gloz-cod-data-"));
      if (!dataScript) return;
      var cfg; try { cfg = JSON.parse(dataScript.textContent); } catch (e) { return; }
      // La instancia se crea SIEMPRE que exista el <script> de datos, aunque
      // la sección tenga "Mostrar el botón que abre el formulario" apagado
      // (show_trigger=false → no hay [data-gloz-cod-trigger] en el DOM). Así
      // window.glozCOD.open() / [data-gloz-open] funcionan igual, abriendo el
      // popup desde botones 100% externos a esta sección.
      var instance = new GlozCod(root, cfg);
      GLOZ_INSTANCES.push(instance);
      var trigger = root.querySelector("[data-gloz-cod-trigger]");
      if (trigger) {
        // Icono del botón trigger (data-gloz-icon en el <span>)
        var trigIconSpan = trigger.querySelector("[data-gloz-icon]");
        if (trigIconSpan) { var ic = svg(trigIconSpan.getAttribute("data-gloz-icon"), 20); trigIconSpan.appendChild(ic); }
        // Botón trigger por defecto de la sección: abre respetando también
        // window.glozSelectedVariant si la página lo dejó definido.
        trigger.addEventListener("click", function () { instance.openWith({}); });
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.GlozCod = GlozCod;
})();

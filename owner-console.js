/* Кабинет владельца появляется только после 200 от operator-only ручки.
   Никаких догадок по имени, assurance или скрытому DOM-атрибуту: 404 означает,
   что этого кабинета для человека не существует. */
(function () {
  "use strict";

  var api = null, subject = "", allowed = false, probing = null;
  var settings = null, active = "overview", refreshTimer = null;
  var userPage = 1, userTotal = 0, accountMount = null, entryButton = null;
  var T = (window.ЯЗЫК && window.ЯЗЫК.T) || function (s) { return s; };

  function node(id) { return document.getElementById(id); }
  function text(el, value) { if (el) el.textContent = value == null ? "" : String(value); }
  function clear(el) { if (el) while (el.firstChild) el.removeChild(el.firstChild); }
  function make(tag, cls, value) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = String(value);
    return el;
  }
  function n(value) { return Number(value || 0); }
  function fmt(value) { return new Intl.NumberFormat("ru-RU").format(n(value)); }
  function bytes(value) {
    var v = n(value), units = ["Б", "КБ", "МБ", "ГБ", "ТБ"], i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return (i ? v.toFixed(v >= 10 ? 0 : 1) : String(v)) + " " + units[i];
  }
  function date(value) {
    if (!value) return "—";
    var d = new Date(value);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("ru-RU", {
      day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit"
    });
  }
  function status(message, bad) {
    var el = node("ownerstatus");
    if (!el) return;
    el.className = "owner-console__status" + (bad ? " bad" : "");
    text(el, message || "");
  }
  function reason(error) {
    return (error && (error.сказ || error.message)) || T("неизвестная ошибка");
  }

  function addAccountAction(container) {
    accountMount = container || accountMount;
    /* Панель учётной записи собирается сначала вне DOM и только потом
       вставляется целиком. Добавлять кнопку в этот момент можно и нужно:
       проверка isConnected теряла её при каждом повторном открытии панели. */
    if (!allowed || !accountMount) return;
    var old = accountMount.querySelector(".owner-entry");
    if (old) { entryButton = old; return; }
    var button = make("button", "owner-entry", T("Управление ФиксАРом"));
    button.type = "button";
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      open();
    });
    accountMount.appendChild(button);
    entryButton = button;
  }

  async function connect(context) {
    if (!context || typeof context.api !== "function" || !context.principal) return;
    if (subject === context.principal && api === context.api && (allowed || probing)) {
      return probing;
    }
    subject = context.principal;
    api = context.api;
    allowed = false;
    settings = null;
    probing = (async function () {
      try {
        var response = await api("GET", "/ops/owner/settings");
        settings = response && response.settings;
        if (!settings) return;
        allowed = true;
        addAccountAction(accountMount || (node("mepanel") && node("mepanel").querySelector(".acts")));
      } catch (error) {
        // 404 — штатное «не владелец». Любую другую ошибку до первого
        // успешного ответа тоже не показываем: иначе посторонний узнает о
        // кабинете по его неполадке.
        allowed = false;
      } finally { probing = null; }
    })();
    return probing;
  }

  function open() {
    if (!allowed) return;
    var consoleEl = node("ownerconsole");
    if (!consoleEl) return;
    consoleEl.hidden = false;
    document.body.classList.add("owner-console-open");
    select(active, true);
    node("ownerclose").focus();
  }
  function close() {
    var consoleEl = node("ownerconsole");
    if (consoleEl) consoleEl.hidden = true;
    document.body.classList.remove("owner-console-open");
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
    if (entryButton && entryButton.isConnected) entryButton.focus();
  }

  function select(name, force) {
    active = name;
    document.querySelectorAll("[data-owner-tab]").forEach(function (button) {
      button.setAttribute("aria-selected", button.dataset.ownerTab === name ? "true" : "false");
    });
    document.querySelectorAll("[data-owner-panel]").forEach(function (panel) {
      panel.hidden = panel.dataset.ownerPanel !== name;
    });
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
    if (name === "overview") loadMetrics(force);
    if (name === "users") loadUsers(force);
    if (name === "acquisition") loadAcquisition(force);
    if (name === "settings") loadSettings(force);
    if (name === "broadcast") loadBroadcast(force);
    if (name === "audit") loadAudit(force);
  }

  function card(label, value, note) {
    var el = make("article", "owner-card");
    el.appendChild(make("span", "owner-card__label", label));
    el.appendChild(make("strong", "owner-card__value", value));
    el.appendChild(make("span", "owner-card__note", note));
    return el;
  }

  function renderMetrics(data) {
    var s = data.summary || {}, cards = node("ownercards");
    clear(cards);
    cards.appendChild(card(T("Пользователи"), fmt(s.users_total),
      T("новых ") + fmt(s.users_new) + T(" · активных ") + fmt(s.users_active)));
    cards.appendChild(card(T("Дела"), fmt(s.cases_total),
      T("активных ") + fmt(s.cases_active) + T(" · ждут ") + fmt(s.cases_waiting)));
    cards.appendChild(card(T("Обращения к моделям"), fmt(s.model_calls),
      fmt(s.model_tokens) + T(" токенов · наружу ") + fmt(s.remote_calls)));
    cards.appendChild(card(T("Работа агентов"), fmt(s.runs_succeeded),
      T("завершено · сейчас ") + fmt(s.runs_active) + T(" · сбоев ") + fmt(s.runs_failed)));
    cards.appendChild(card(T("Разговоры"), fmt(s.talks_total),
      T("реплик людей за период ") + fmt(s.talk_messages)));
    cards.appendChild(card(T("Артефакты"), fmt(s.documents_total),
      T("занимают ") + bytes(s.document_bytes)));
    cards.appendChild(card(T("Кредиты"), fmt(s.credits_spent),
      T("списано · начислено ") + fmt(s.credits_granted)));
    cards.appendChild(card(T("Требует внимания"), fmt(n(s.denied_calls) + n(s.reports_open) + n(s.unfunded_spends)),
      T("отказы ") + fmt(s.denied_calls) + T(" · сообщения ") + fmt(s.reports_open)));

    text(node("ownerperiod"), T("за ") + data.period_hours + T(" ч · обновлено ") + date(data.generated_at));
    renderTrend(data.series || []);
    renderModels(data.top_models || []);
    renderProduct(s);
  }

  function renderTrend(series) {
    var root = node("ownertrend"); clear(root);
    var max = Math.max.apply(Math, series.map(function (row) { return n(row.calls); }).concat([1]));
    series.forEach(function (row, index) {
      var day = make("div", "owner-trend__day");
      day.title = row.day + ": " + fmt(row.calls) + T(" обращений, ") +
                  fmt(row.users) + T(" новых пользователей, ") + fmt(row.cases) + T(" дел");
      var bar = make("div", "owner-trend__bar");
      /* Процент, а не пиксели: тот же граф не вылезает из уменьшенной высоты
         на телефоне и использует весь доступный холст на широком экране. */
      bar.style.height = Math.max(2, Math.round(100 * n(row.calls) / max)) + "%";
      day.appendChild(bar);
      day.appendChild(make("small", "", (index % 2 || series.length > 18) ? "" : row.day.slice(5)));
      root.appendChild(day);
    });
    if (!series.length) root.appendChild(make("div", "owner-empty", T("Нет данных за период.")));
  }

  function renderModels(rows) {
    var body = node("ownermodelrows"); clear(body);
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      [row.agent, row.model, row.egress === "remote" ? T("наружу") : T("локально")]
        .forEach(function (value) { tr.appendChild(make("td", "", value)); });
      tr.appendChild(make("td", "owner-num", fmt(row.calls)));
      tr.appendChild(make("td", "owner-num" + (row.denied ? " owner-bad" : ""), fmt(row.denied)));
      tr.appendChild(make("td", "owner-num", fmt(row.tokens)));
      body.appendChild(tr);
    });
    if (!rows.length) {
      var empty = document.createElement("tr"), td = make("td", "owner-empty", T("Обращений не было."));
      td.colSpan = 6; empty.appendChild(td); body.appendChild(empty);
    }
  }

  function renderProduct(s) {
    var body = node("ownerproductrows"); clear(body);
    [
      [T("Учётные записи"), fmt(s.users_verified) + T(" подтверждено"), fmt(s.users_browser_only) + T(" только в браузере")],
      [T("Дела"), fmt(s.cases_active) + T(" активных"), fmt(s.cases_waiting) + T(" ждут · ") + fmt(s.cases_closed) + T(" закрыто")],
      [T("Сообщения"), fmt(s.talk_messages) + T(" в общем чате"), fmt(s.thread_messages) + T(" в нитях")],
      [T("Исполнение"), fmt(s.runs_active) + T(" сейчас"), fmt(s.runs_succeeded) + T(" завершено · ") + fmt(s.runs_failed) + T(" с ошибкой")],
      [T("Учёт расхода"), fmt(s.credits_spent) + T(" кредитов"), fmt(s.unfunded_spends) + T(" непокрытых списаний")]
    ].forEach(function (row) {
      var tr = document.createElement("tr");
      row.forEach(function (value) { tr.appendChild(make("td", "", value)); });
      body.appendChild(tr);
    });
  }

  async function loadMetrics(force) {
    if (!allowed || !api) return;
    status(T("Читаю метрики…"));
    try {
      var hours = (settings && settings.metrics_window_hours) || 24;
      var data = await api("GET", "/ops/owner/metrics?hours=" + encodeURIComponent(hours));
      renderMetrics(data || {});
      status(T("Метрики не содержат текстов разговоров, документов и контактов."));
      var seconds = (settings && settings.auto_refresh_seconds) || 60;
      if (!node("ownerconsole").hidden && active === "overview") {
        refreshTimer = setTimeout(function () { loadMetrics(true); }, seconds * 1000);
      }
    } catch (error) { status(T("Метрики не прочитались: ") + reason(error), true); }
  }

  function userState(row) {
    if (row.retired) return [T("погашен"), "warn"];
    if (row.demo) return [T("демо"), "warn"];
    if (row.assurance >= 2) return [T("подтверждён"), "ok"];
    if ((row.channels || []).length) return [T("привязан"), ""];
    return [T("только браузер"), "warn"];
  }
  function userName(row) {
    var box = make("div", "");
    var strong = make("strong", "", row.display_name || T("Без имени"));
    box.appendChild(strong); box.appendChild(document.createElement("br"));
    box.appendChild(make("code", "", row.principal_id));
    return box;
  }
  function renderUsers(data) {
    var body = node("owneruserrows"); clear(body);
    userTotal = n(data.total);
    (data.users || []).forEach(function (row) {
      var tr = document.createElement("tr"), state = userState(row);
      var nameCell = document.createElement("td"); nameCell.appendChild(userName(row)); tr.appendChild(nameCell);
      var stateCell = document.createElement("td");
      stateCell.appendChild(make("span", "owner-chip " + state[1], state[0]));
      (row.channels || []).forEach(function (channel) {
        stateCell.appendChild(make("span", "owner-chip", channel));
      });
      tr.appendChild(stateCell);
      tr.appendChild(make("td", "", date(row.created_at)));
      tr.appendChild(make("td", "", date(row.last_seen_at)));
      tr.appendChild(make("td", "owner-num", fmt(row.open_cases) + " / " + fmt(row.cases)));
      tr.appendChild(make("td", "owner-num", fmt(row.documents)));
      tr.appendChild(make("td", "owner-num", fmt(row.credits_spent)));
      tr.appendChild(make("td", "owner-num", fmt(row.credit_balance)));
      body.appendChild(tr);
    });
    if (!(data.users || []).length) {
      var empty = document.createElement("tr"), td = make("td", "owner-empty", T("Никого не найдено."));
      td.colSpan = 8; empty.appendChild(td); body.appendChild(empty);
    }
    var limit = n(data.limit) || 25;
    text(node("ownerusersmeta"), T("найдено ") + fmt(userTotal) + T(" · контакты и токены не выдаются"));
    text(node("ownerpage"), T("страница ") + userPage + T(" из ") + Math.max(1, Math.ceil(userTotal / limit)));
    node("ownerprev").disabled = userPage <= 1;
    node("ownernext").disabled = userPage * limit >= userTotal;
  }
  async function loadUsers() {
    if (!allowed || !api) return;
    status(T("Читаю таблицу пользователей…"));
    var q = node("owneruserq").value.trim();
    var sort = node("ownerusersort").value;
    var retired = node("ownerretired").checked;
    var limit = (settings && settings.user_page_size) || 25;
    var path = "/ops/owner/users?page=" + userPage + "&limit=" + limit +
      "&sort=" + encodeURIComponent(sort) + "&include_retired=" + (retired ? "true" : "false") +
      "&q=" + encodeURIComponent(q);
    try {
      var data = await api("GET", path); renderUsers(data || {});
      status(T("Таблица обновлена. В журнале записан сам просмотр, но не строка поиска."));
    } catch (error) { status(T("Таблица не прочиталась: ") + reason(error), true); }
  }

  function fillBreakdown(bodyId, rows) {
    var body = node(bodyId); clear(body);
    (rows || []).forEach(function (row) {
      var tr = document.createElement("tr");
      tr.appendChild(make("td", "", row.bucket));
      tr.appendChild(make("td", "owner-num", fmt(row.n)));
      body.appendChild(tr);
    });
    if (!(rows || []).length) {
      var empty = document.createElement("tr"), td = make("td", "owner-empty", T("Нет данных за период."));
      td.colSpan = 2; empty.appendChild(td); body.appendChild(empty);
    }
  }
  function renderAcquisition(data) {
    var acq = data.acquisition || {}, s = data.summary || {};
    text(node("owneracqmeta"), T("новых за ") + data.period_hours + T(" ч: ") + fmt(s.users_new));
    fillBreakdown("owneracqsource", acq.by_source);
    fillBreakdown("owneracqlocale", acq.by_locale);
    fillBreakdown("owneracqjur", acq.by_jurisdiction);
  }
  async function loadAcquisition() {
    if (!allowed || !api) return;
    status(T("Читаю привлечение…"));
    try {
      var hours = (settings && settings.metrics_window_hours) || 24;
      var data = await api("GET", "/ops/owner/metrics?hours=" + encodeURIComponent(hours));
      renderAcquisition(data || {});
      status(T("Разбивка новых пользователей по каналу, локали и юрисдикции. Без контактов и содержимого."));
    } catch (error) { status(T("Привлечение не прочиталось: ") + reason(error), true); }
  }

  function setSettingsForm(value) {
    if (!value) return;
    node("ownersignups").checked = !!value.new_visitors_enabled;
    node("ownernotice").value = value.public_notice || "";
    node("ownerwindow").value = value.metrics_window_hours;
    node("ownerinterval").value = value.auto_refresh_seconds;
    node("ownerpagesize").value = value.user_page_size;
    text(node("ownersettingsmeta"), T("версия ") + value.version + T(" · изменено ") + date(value.updated_at));
  }
  function renderProviders(providers, health) {
    var root = node("ownerproviders"); clear(root);
    var list = [];
    var oauth = (providers && providers.oauth) || {};
    Object.keys(oauth).sort().forEach(function (name) { list.push([name, !!oauth[name]]); });
    [["email", providers && providers.email], ["phone", providers && providers.phone],
     ["telegram", providers && providers.telegram], ["MAX", providers && providers.max]]
      .forEach(function (row) { list.push([row[0], !!row[1]]); });
    list.push([T("публичная дверь"), health && health.status === "ok"]);
    list.forEach(function (row) {
      root.appendChild(make("span", "owner-provider" + (row[1] ? " on" : ""),
        row[0] + " · " + (row[1] ? T("готов") : T("не настроен"))));
    });
    var rollout = health && health.inbox_rollout;
    if (rollout) root.appendChild(make("span", "owner-provider", "Inbox · " +
      (rollout.mode || "?") + " · " + n(rollout.percent) + "%"));
  }
  async function loadSettings(force) {
    if (!allowed || !api) return;
    status(T("Читаю настройки…"));
    try {
      if (force || !settings) {
        var response = await api("GET", "/ops/owner/settings");
        settings = response && response.settings;
      }
      setSettingsForm(settings);
      var results = await Promise.allSettled([
        api("GET", "/auth/providers"), api("GET", "/health")
      ]);
      renderProviders(results[0].status === "fulfilled" ? results[0].value : {},
                      results[1].status === "fulfilled" ? results[1].value : {});
      status(T("Редактируются только значения, у которых здесь один настоящий владелец."));
    } catch (error) { status(T("Настройки не прочитались: ") + reason(error), true); }
  }
  async function saveSettings(event) {
    event.preventDefault();
    if (!settings) return;
    var enabled = node("ownersignups").checked;
    if (settings.new_visitors_enabled && !enabled && !window.confirm(T(
      "Закрыть вход новым посетителям? Уже вошедшие продолжат работать, но новый браузер не сможет начать."))) {
      node("ownersignups").checked = true; return;
    }
    var button = node("ownersave"); button.disabled = true;
    status(T("Сохраняю настройки…"));
    try {
      var response = await api("PUT", "/ops/owner/settings", {
        expected_version: settings.version,
        new_visitors_enabled: enabled,
        public_notice: node("ownernotice").value,
        metrics_window_hours: parseInt(node("ownerwindow").value, 10),
        auto_refresh_seconds: parseInt(node("ownerinterval").value, 10),
        user_page_size: parseInt(node("ownerpagesize").value, 10),
        confirmation: enabled ? "" : "close-new-visitors"
      });
      settings = response.settings; setSettingsForm(settings);
      status(T("Сохранено. Изменение и его автор записаны в журнал."));
    } catch (error) {
      status(T("Не сохранено: ") + reason(error), true);
      if (error && error.код === 409) loadSettings(true);
    } finally { button.disabled = false; }
  }

  function renderAudit(data) {
    var body = node("ownerauditrows"); clear(body);
    var names = { settings_read:T("открыты настройки"), settings_updated:T("изменены настройки"),
      metrics_read:T("открыты метрики"), users_read:T("открыта таблица пользователей"),
      audit_read:T("открыт журнал") };
    (data.events || []).forEach(function (row) {
      var tr = document.createElement("tr");
      tr.appendChild(make("td", "", date(row.at)));
      tr.appendChild(make("td", "", names[row.action] || row.action));
      tr.appendChild(make("td", "", row.actor));
      tr.appendChild(make("td", "owner-muted", JSON.stringify(row.details || {})));
      body.appendChild(tr);
    });
  }
  async function loadAudit() {
    if (!allowed || !api) return;
    status(T("Читаю журнал доступа…"));
    try {
      var data = await api("GET", "/ops/owner/audit?limit=150");
      renderAudit(data || {}); status(T("Каждое чтение кабинета и каждая правка оставляют запись."));
    } catch (error) { status(T("Журнал не прочитался: ") + reason(error), true); }
  }

  /* ── Ленты ────────────────────────────────────────────────────────────
     Одобрение относится к ТЕКСТУ, а не к строке списка: вместе с решением
     уезжает отпечаток того, что было на экране. Считаем его ЗДЕСЬ, по
     показанному тексту, а не берём готовым из ответа — иначе замок сторожил
     бы согласие службы с самой собой. Где crypto.subtle недоступен (http у
     местного просмотра), остаётся присланный отпечаток: он всё ещё пришпи-
     ливает ту версию черновика, которую человек открыл. */
  async function bodyFingerprint(post) {
    try {
      var bytes = new TextEncoder().encode(post.body || "");
      var digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.prototype.map.call(new Uint8Array(digest), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    } catch (error) { return post.body_sha256 || ""; }
  }

  function draftCard(post) {
    var el = make("article", "owner-draft");
    var head = make("div", "owner-draft__head");
    head.appendChild(make("strong", "", post.outlet_title || post.outlet_id));
    head.appendChild(make("span", "owner-muted",
      (post.author_kind === "agent" ? T("предложил ведущий") : T("ваш черновик"))
      + " · " + date(post.created_at)));
    el.appendChild(head);
    if (post.rationale) el.appendChild(make("p", "owner-draft__why", post.rationale));
    /* Текст целиком, а не первая строка: обрезанный черновик одобряют вслепую. */
    el.appendChild(make("p", "owner-draft__body", post.body));
    var acts = make("div", "owner-draft__acts");
    var publish = make("button", "owner-draft__go", T("Опубликовать"));
    publish.type = "button";
    publish.addEventListener("click", async function () {
      if (!window.confirm(T("Пост уйдёт в сообщество и виден всем. Опубликовать?"))) return;
      publish.disabled = true;
      try {
        var данные = await api("POST", "/ops/owner/broadcast/posts/" + post.id + "/publish",
          { expected_body_sha256: await bodyFingerprint(post) });
        status(T("Опубликовано: ") + ((данные && данные.post && данные.post.link) || ""));
        loadBroadcast(true);
      } catch (error) {
        publish.disabled = false;
        status(T("Не опубликовалось: ") + reason(error), true);
      }
    });
    var reject = make("button", "owner-draft__no", T("Отклонить"));
    reject.type = "button";
    reject.addEventListener("click", async function () {
      var note = window.prompt(T("Почему не публикуем? Это увидит ведущий."), "");
      if (note === null) return;
      reject.disabled = true;
      try {
        await api("POST", "/ops/owner/broadcast/posts/" + post.id + "/reject", { note:note });
        loadBroadcast(true);
      } catch (error) {
        reject.disabled = false;
        status(T("Не отклонилось: ") + reason(error), true);
      }
    });
    acts.appendChild(publish); acts.appendChild(reject);
    el.appendChild(acts);
    return el;
  }

  function renderBroadcast(outlets, drafts, published) {
    var mount = node("ownerdrafts"); clear(mount);
    text(node("ownerdraftcount"), drafts.length
      ? drafts.length + " " + T("ждут")
      : T("черновиков нет"));
    if (!drafts.length) mount.appendChild(make("p", "owner-muted",
      T("Ведущий ничего не предлагает. Пост можно написать самому — ниже.")));
    drafts.forEach(function (post) { mount.appendChild(draftCard(post)); });

    var rows = node("owneroutletrows"); clear(rows);
    var select = node("ownerpostoutlet"); clear(select);
    outlets.forEach(function (outlet) {
      var tr = document.createElement("tr");
      tr.appendChild(make("td", "", outlet.title));
      tr.appendChild(make("td", "", outlet.platform));
      tr.appendChild(make("td", outlet.ключ_на_месте ? "" : "owner-muted",
        outlet.ключ_на_месте ? T("на месте") : T("не задан")));
      tr.appendChild(make("td", "owner-muted", T("через одобрение")));
      tr.appendChild(make("td", outlet.disabled_at ? "owner-muted" : "",
        outlet.disabled_at ? T("отключена: ") + outlet.disabled_reason : T("работает")));
      rows.appendChild(tr);
      if (!outlet.disabled_at) {
        var option = make("option", "", outlet.title);
        option.value = outlet.id;
        select.appendChild(option);
      }
    });
    if (!outlets.length) {
      var tr = document.createElement("tr");
      var td = make("td", "owner-muted", T("Лент ещё нет."));
      td.colSpan = 5; tr.appendChild(td); rows.appendChild(tr);
    }

    var done = node("ownerpublishedrows"); clear(done);
    published.forEach(function (post) {
      var tr = document.createElement("tr");
      tr.appendChild(make("td", "", date(post.published_at || post.created_at)));
      tr.appendChild(make("td", "", post.outlet_title || ""));
      tr.appendChild(make("td", "owner-muted",
        post.body.length > 90 ? post.body.slice(0, 90) + "…" : post.body));
      var cell = make("td", "");
      if (post.link) {
        var link = make("a", "", T("смотреть"));
        link.href = post.link; link.target = "_blank"; link.rel = "noopener noreferrer";
        cell.appendChild(link);
      } else { text(cell, post.failure || "—"); }
      tr.appendChild(cell);
      done.appendChild(tr);
    });
  }

  async function loadBroadcast() {
    if (!allowed || !api) return;
    status(T("Читаю ленты…"));
    try {
      var outlets = await api("GET", "/ops/owner/broadcast/outlets?include_disabled=true");
      var drafts = await api("GET", "/ops/owner/broadcast/posts?state=draft&limit=50");
      var done = await api("GET", "/ops/owner/broadcast/posts?state=published&limit=30");
      renderBroadcast((outlets && outlets.outlets) || [],
                      (drafts && drafts.posts) || [],
                      (done && done.posts) || []);
      status(T("Ни один пост не уходит без вашего подтверждения."));
    } catch (error) { status(T("Ленты не прочитались: ") + reason(error), true); }
  }

  async function saveDraft(event) {
    event.preventDefault();
    var outlet = node("ownerpostoutlet").value, body = node("ownerpostbody").value.trim();
    if (!outlet) { status(T("Сначала заведите ленту."), true); return; }
    if (!body) { status(T("Пустой черновик."), true); return; }
    try {
      await api("POST", "/ops/owner/broadcast/posts", { outlet_id:outlet, body:body });
      node("ownerpostbody").value = "";
      status(T("Черновик сохранён. Опубликуется, когда вы подтвердите."));
      loadBroadcast(true);
    } catch (error) { status(T("Черновик не сохранился: ") + reason(error), true); }
  }

  function bind() {
    node("ownerclose").addEventListener("click", close);
    node("ownerrefresh").addEventListener("click", function () { select(active, true); });
    document.querySelectorAll("[data-owner-tab]").forEach(function (button) {
      button.addEventListener("click", function () { select(button.dataset.ownerTab, false); });
    });
    node("owneruserform").addEventListener("submit", function (event) {
      event.preventDefault(); userPage = 1; loadUsers(true);
    });
    node("ownerretired").addEventListener("change", function () { userPage = 1; loadUsers(true); });
    node("ownerusersort").addEventListener("change", function () { userPage = 1; loadUsers(true); });
    node("ownerprev").addEventListener("click", function () { if (userPage > 1) { userPage--; loadUsers(true); } });
    node("ownernext").addEventListener("click", function () { userPage++; loadUsers(true); });
    node("ownersettingsform").addEventListener("submit", saveSettings);
    node("ownerpostform").addEventListener("submit", saveDraft);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && node("ownerconsole") && !node("ownerconsole").hidden) {
        event.preventDefault(); close();
      }
    });
  }

  window.FixarOwnerConsole = { connect:connect, addAccountAction:addAccountAction };
  /* Если основной экран уже дошёл до входа, это событие даёт ему второй шанс
     передать контекст. Оно не несёт ни principal, ни токен, ни право: модуль
     всё равно откроется лишь после собственного 200 от owner-only ручки. */
  window.dispatchEvent(new Event("fixar-owner-console-ready"));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

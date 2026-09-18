(function () {
  "use strict";

  var STORAGE_KEY = "fixar.lang";
  var SUPPORTED = ["ru", "en"];
  var local = {
    "Поиск по разделам…": "Search sections…",
    "Пространство": "Space",
    "Сменить": "Switch",
    "Сменить пространство": "Switch space",
    "Личное": "Personal",
    "Семья": "Family",
    "Практика": "Practice",
    "Разработка": "Development",
    "Главная": "Home",
    "Семейный диалог": "Family conversation",
    "Главное сегодня": "Today",
    "Общие дела": "Shared cases",
    "Сроки и изменения": "Deadlines and changes",
    "Семейная сводка": "Family summary",
    "Семейные дела": "Family cases",
    "Участники": "Participants",
    "Школа": "School",
    "Дом": "Household",
    "Для жизни · Семья": "For life · Family",
    "Семейные планы": "Family plans",
    "Семейные документы": "Family documents",
    "Цели и планы": "Goals and plans",
    "Семейные агенты": "Family agents",
    "Настройки": "Settings",
    "Помощь": "Help",
    "Уведомления": "Notifications",
    "Профиль и выход": "Profile and sign out",
    "Войти →": "Sign in →",
    "Гость": "Guest",
    "Г": "G",
    "вход не выполнен": "not signed in",
    "Аккаунт": "Account",
    "Помощь и правила": "Help and policies",
    "Публичная часть": "Public site",
    "Первый запуск": "First launch",
    "Структура дела": "Case structure",
    "Юридические": "Legal",
    "Состояния экранов": "Screen states",
    "Открыть": "Open",
    "Открыть дела": "Open cases",
    "Ближайшие даты": "Upcoming dates",
    "Спросить Домашкина": "Ask Domashkin",
    "Семейный диалог →": "Family conversation →",
    "Общие дела →": "Shared cases →",
    "Сроки и изменения →": "Deadlines and changes →",
    "Помощники": "Assistants",
    "Каналы Фиксарика, границы чтения и опубликованные паки разработчиков собраны в одном месте. Детские данные Домашкина по-прежнему открываются только после серверной проверки прав.": "Fixarik channels, reading boundaries, and published developer packs are available in one place. Domashkin child data still opens only after server-side permission checks.",
    "Настроить Фиксарика": "Configure Fixarik",
    "Настроить Домашкина": "Configure Domashkin",
    "Расскажите своими словами…": "Describe it in your own words…",
    "Все": "All",
    "Мои": "Mine",
    "Требуют меня": "Need me",
    "Агенты работают": "Agents working",
    "Завершённые": "Completed",
    "Создать дело": "Create case",
    "Новое семейное дело": "New family case",
    "Новое дело кабинета": "New practice case",
    "Название": "Title",
    "Цель (необязательно)": "Goal (optional)",
    "Чего хотим достичь": "What outcome do you need?",
    "Создаю…": "Creating…",
    "Закрыть": "Close",
    "Выберите пространство": "Choose a space",
    "выбрано": "selected",
    "перейти в пространство": "open this space",
    "Обзор": "Overview",
    "Диалог": "Conversation",
    "План": "Plan",
    "Документы": "Documents",
    "Сроки": "Deadlines",
    "Агенты": "Agents",
    "Журнал": "Activity",
    "Отправить": "Send",
    "Агент": "Agent",
    "Агент думает…": "Agent is thinking…",
    "Свернуть": "Collapse",
    "Открыть": "Open",
    "Спросите о текущей странице или деле": "Ask about this page or case",
    "Я вижу текущий раздел и доступные здесь действия. Переходы сохраняются в вашей личной памяти на 90 дней.": "I can see this section and the actions available here. Navigation events stay in your private memory for 90 days.",
    "Ваш интерфейс": "Your interface",
    "Язык": "Language",
    "Русский": "Russian",
    "Оформление под вас": "Appearance that fits you",
    "Выберите свет, характер и оттенок. Изменения видны сразу и сохраняются только на этом устройстве.": "Choose brightness, mood, and hue. Changes appear instantly and are saved only on this device.",
    "ФиксАР рядом": "FixAR at your side",
    "Важное видно. Лишнее не мешает.": "See what matters. Hide the noise.",
    "Короткие заголовки, спокойный ритм и один понятный следующий шаг на каждом экране.": "Short headlines, a calm rhythm, and one clear next step on every screen.",
    "Главное действие": "Primary action",
    "Второй шаг": "Secondary action",
    "Свет": "Mode",
    "Как на устройстве": "Use device setting",
    "Светлая": "Light",
    "Тёмная": "Dark",
    "Палитра": "Palette",
    "Спокойная": "Calm",
    "Точный оттенок": "Fine-tune hue",
    "Меняется только акцент. Яркость текста и контраст интерфейса остаются безопасными.": "Only the accent changes. Text brightness and interface contrast stay accessible.",
    "Вернуть оформление FixAR": "Restore FixAR appearance",
    "Cookie и внешних счётчиков нет.": "No cookies or external trackers.",
    "FixAR хранит на этом устройстве ключ входа, язык и настройки интерфейса. В рекламные системы ничего не отправляется.": "FixAR stores the sign-in key, language, and interface settings on this device. Nothing is sent to advertising systems.",
    "Понятно": "Got it",
    "Управлять данными": "Manage data",
    "Данные и согласия": "Data and consent",
    "Открыть центр данных": "Open data center",
    "Помощники и каналы": "Assistants and channels",
    "Подключения Фиксарика, доступ к перепискам и паки разработчиков настраиваются отдельно.": "Fixarik connections, message access, and developer packs are configured separately.",
    "Настройки Фиксарика": "Fixarik settings",
    "Личный помощник": "Personal assistant",
    "Каналы": "Channels",
    "Проверяю подключения…": "Checking connections…",
    "Как сообщать о важном": "How to report what matters",
    "Настроить самого Фиксарика": "Configure Fixarik",
    "Вход и аккаунт": "Sign-in and account",
    "Паки и коннекторы разработчиков": "Developer packs and connectors",
    "Что найти": "Search for",
    "Вид": "Type",
    "Все расширения": "All extensions",
    "Коннекторы": "Connectors",
    "Паки": "Packs",
    "Решения": "Solutions",
    "Найти в каталоге": "Search marketplace",
    "Загружаю опубликованные расширения…": "Loading published extensions…",
    "подключён": "connected",
    "не подключён": "not connected",
    "Сначала войдите": "Sign in first",
    "Войти": "Sign in",
    "Первый запуск": "First launch",
    "Добро пожаловать в ФиксАР": "Welcome to FixAR",
    "Несколько шагов — и агенты начнут вести ваши дела.": "A few steps, and agents can start managing your cases.",
    "Назад": "Back",
    "Далее": "Continue",
    "Дела с ИИ-помощниками": "Cases with AI assistants",
    "Меньше рутины. Больше контроля.": "Less routine. More control.",
    "Начать работу": "Get started",
    "Каталог решений": "Solutions marketplace",
    "Один понятный путь": "One clear path",
    "Для жизни и работы": "For life and work",
    "Готовые помощники": "Ready-made assistants",
    "Начните с одного дела": "Start with one case",
    "Без сложной настройки": "No complex setup",
    "предпросмотр v2 · демо-данные": "v2 preview · demo data",
    "кредиты —": "credits —",
    "загрузка": "loading",
    "активно": "active",
    "в работе": "in progress",
    "завершено": "completed",
    "ожидает вас": "waiting for you",
    "под наблюдением": "monitored",
    "Сохранить": "Save",
    "Сохраняю…": "Saving…",
    "Добавить участника": "Add participant",
    "Ответственный": "Assignee",
    "Срок": "Due date",
    "Роль": "Role",
    "Доступ": "Access",
    "Разрешение агента": "Agent permission",
    "У Миши завтра контрольная и изменилось расписание. Показания счётчиков — до 25-го. Что сделать первым?": "Misha has a test tomorrow and his schedule changed. Meter readings are due by the 25th. What should we do first?",
    "Подтвердить домашку Миши": "Confirm Misha's homework",
    "сегодня 18:00": "today, 18:00",
    "Показания воды и света": "Water and electricity readings",
    "до 25 сен": "due Sep 25",
    "Ремонт в ванной": "Bathroom renovation",
    "Поездка на каникулы": "Holiday trip",
    "планируется": "planned",
    "Страховка квартиры": "Home insurance",
    "ждёт взрослого": "waiting for an adult",
    "Изменилось расписание Миши": "Misha's schedule changed",
    "завтра 09:00": "tomorrow, 09:00",
    "Передать показания": "Submit meter readings",
    "25 сен": "Sep 25",
    "Родительское собрание": "Parent meeting",
    "1 окт": "Oct 1",
    "взрослых · 1 ребёнок": "adults · 1 child",
    "общих дел": "shared cases",
    "просрочек": "overdue",
    "Подтвердить": "Confirm",
    "Отклонить": "Reject",
    "Готово": "Done"
  };

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    if (SUPPORTED.indexOf(saved) >= 0) return saved;
    var languages = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < languages.length; i += 1) {
      if (/^ru\b/i.test(String(languages[i]))) return "ru";
    }
    return /^en\b/i.test(String(languages[0] || "")) ? "en" : "ru";
  }

  var code = detect();
  document.documentElement.lang = code;

  function dictionary() {
    if (code !== "en") return null;
    return Object.assign({}, window.СЛОВАРЬ_EN || {}, local);
  }

  function translateText(value) {
    if (code !== "en" || !value) return value;
    var map = dictionary();
    if (Object.prototype.hasOwnProperty.call(map, value)) return map[value];
    var spaces = {"Личное":"Personal","Семья":"Family","Практика":"Practice","Разработка":"Development"};
    var match = value.match(/^Главная — (Личное|Семья|Практика|Разработка)$/);
    if (match) return "Home — " + spaces[match[1]];
    match = value.match(/^Ваше пространство «(Личное|Семья|Практика|Разработка)»: важное, дела и сроки под наблюдением агентов\.$/);
    if (match) return "Your " + spaces[match[1]].toLowerCase() + " space: important updates, cases, and deadlines monitored by agents.";
    match = value.match(/^Ваши дела · (Личное|Семья|Практика|Разработка) \((\d+)\)$/);
    if (match) return "Your cases · " + spaces[match[1]] + " (" + match[2] + ")";
    match = value.match(/^Главная — (.+)$/);
    if (match) return "Home — " + (spaces[match[1]] || match[1]);
    if (value.indexOf("✦ Агент") === 0) return value.replace("✦ Агент", "✦ Agent");
    return value;
  }

  function skipped(element) {
    return !element || element.closest("[data-no-i18n],.case-thread,.agent-answer,.bubble.user,.document-editor");
  }

  function translateElement(root) {
    if (code !== "en" || !root) return;
    var start = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
    if (start && skipped(start)) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (!parent || skipped(parent) || /^(SCRIPT|STYLE|TEXTAREA)$/i.test(parent.tagName)) continue;
      var match = node.nodeValue.match(/^(\s*)(.*?)(\s*)$/s);
      if (!match || !match[2]) continue;
      var translated = translateText(match[2]);
      if (translated !== match[2]) node.nodeValue = match[1] + translated + match[3];
    }
    var elements = [];
    if (root.nodeType === Node.ELEMENT_NODE) elements.push(root);
    if (root.querySelectorAll) elements = elements.concat(Array.from(root.querySelectorAll("[placeholder],[aria-label],[title]")));
    elements.forEach(function (element) {
      if (skipped(element)) return;
      ["placeholder", "aria-label", "title"].forEach(function (attribute) {
        var value = element.getAttribute(attribute);
        var translated = translateText(value);
        if (value && translated !== value) element.setAttribute(attribute, translated);
      });
    });
  }

  function choose(next) {
    if (SUPPORTED.indexOf(next) < 0 || next === code) return;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    location.reload();
  }

  function installSwitches() {
    document.querySelectorAll("[data-lang-switch]").forEach(function (button) {
      var next = code === "ru" ? "en" : "ru";
      button.textContent = next.toUpperCase();
      button.lang = next;
      button.title = code === "ru" ? "Switch to English" : "Переключить на русский";
      button.setAttribute("aria-label", button.title);
      button.onclick = function () { choose(next); };
    });
  }

  function ready() {
    installSwitches();
    translateElement(document.body);
    if (code === "en") {
      document.title = "FixAR — v2";
      var answer = document.getElementById("agentdockanswer");
      if (answer && answer.textContent.indexOf("Я вижу текущий раздел") === 0) {
        answer.textContent = local["Я вижу текущий раздел и доступные здесь действия. Переходы сохраняются в вашей личной памяти на 90 дней."];
      }
    }
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
          else if (node.nodeType === Node.TEXT_NODE && node.parentElement) translateElement(node.parentElement);
        });
      });
    }).observe(document.body, {childList:true, subtree:true});
  }

  window.FixarV2I18n = {
    code: code,
    english: code === "en",
    choose: choose,
    translate: translateElement,
    text: translateText
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();

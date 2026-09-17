const STORAGE_KEY = "fixar.day.prototype.v1";
const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const initial = { space: "family", lang: "ru", hue: 155, dismissed: false, cases: {}, documents: [] };
let state = structuredClone(initial);
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (saved && typeof saved === "object") {
    state = { ...initial, ...saved };
    if (!["family", "personal", "practice"].includes(state.space)) state.space = "family";
    if (!["ru", "en"].includes(state.lang)) state.lang = "ru";
    if (!Number.isFinite(state.hue) || state.hue < 100 || state.hue > 280) state.hue = 155;
    if (!state.cases || typeof state.cases !== "object" || Array.isArray(state.cases)) state.cases = {};
    if (!Array.isArray(state.documents)) state.documents = [];
  } else if (localStorage.getItem("fixar.lang") === "en") state.lang = "en";
} catch {}
let lastQuestion = "";
let expanded = true;
let modalTrigger = null;
const tx = (ru, en) => state.lang === "en" ? en : ru;
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const label = pair => esc(pair[state.lang === "en" ? 1 : 0]);
const paths = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  cases: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V3h8v3M3 12h18m-11 0v3h4v-3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 13h8m-8 4h5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v2"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9 20h6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  sliders: '<path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Zm6 10v-7h6v7"/>',
  scales: '<path d="M12 3v18M5 21h14M4 7h16M6 7l-4 7h8Zm12 0-4 7h8Z"/>',
  book: '<path d="M12 5C8 2 3 3 3 3v16s5-1 9 2m0-16c4-3 9-2 9-2v16s-5-1-9 2Zm0 0v16"/>',
  send: '<path d="m3 3 18 9-18 9 4-9Zm4 9h14"/>'
};
function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.compass}</svg>`;
}
const spaces = {
  family: { title: ["Семья", "Family"], subtitle: ["Всё важное для близких", "What matters to your loved ones"], icon: "home", hue: 155, agents: ["domashkin", "fixarik"] },
  personal: { title: ["Личное", "Personal"], subtitle: ["Больше времени для себя", "More time for yourself"], icon: "sun", hue: 195, agents: ["fixarik", "domashkin"] },
  practice: { title: ["Практика", "Practice"], subtitle: ["От вопроса к решению", "From a question to a solution"], icon: "cases", hue: 265, agents: ["lawyer", "fixarik"] }
};
const agents = {
  domashkin: {
    name: ["Домашкин", "Domashkin"], role: ["Школа без вечерней суеты", "Calmer school evenings"],
    title: ["Диалог с Домашкиным", "Conversation with Domashkin"],
    update: ["Три предмета на завтра. Начнём с самого сложного?", "Three subjects for tomorrow. Start with the tricky one?"],
    result: ["К завтрашним урокам", "Ready for tomorrow’s lessons"], prompt: ["Что подготовить на завтра?", "What should we prepare for tomorrow?"],
    items: [
      { name: ["Математика", "Maths"], brief: ["Дроби · два упражнения · около 20 минут", "Fractions · two exercises · about 20 minutes"], detail: ["Учебный пример: сравнить 3/4 и 5/8. Приведите дроби к знаменателю 8: 6/8 больше 5/8. Попросите ребёнка объяснить ответ на рисунке. Это демонстрация разбора, а не задание из дневника.", "Sample exercise: compare 3/4 and 5/8. Use a denominator of 8: 6/8 is greater than 5/8. Ask your child to explain using a drawing. This is a sample, not a diary assignment."] },
      { name: ["Русский язык", "Russian language"], brief: ["Безударные гласные · около 15 минут", "Unstressed vowels · about 15 minutes"], detail: ["Учебный пример: подобрать проверочное слово к слову «леса». Слово «лес» делает гласную ударной. Сначала ребёнок объясняет правило, затем проверяет написанное.", "Sample exercise: find a checking word for «леса». In «лес», the vowel is stressed. Have the child explain the rule before checking the spelling."] },
      { name: ["Литература", "Literature"], brief: ["Чтение и короткий пересказ · около 10 минут", "Reading and a short retelling · about 10 minutes"], detail: ["После небольшого рассказа задайте три вопроса: кто герой, что изменилось и почему? Пусть ребёнок перескажет текст своими словами. Здесь нет подключённого учебника.", "After a short story, ask: who is the main character, what changed, and why? Let the child retell it in their own words. No textbook is connected here."] }
    ]
  },
  fixarik: {
    name: ["Фиксарик", "Fixarik"], role: ["Порядок в ваших повседневных делах", "Everyday life, a little more organised"],
    title: ["Диалог с Фиксариком", "Conversation with Fixarik"],
    update: ["Встреча, письмо, небольшой план. Соберём день вместе.", "A meeting, a message, a small plan. Let’s organise your day."],
    result: ["План без лишней спешки", "A plan with room to breathe"], prompt: ["Помоги спланировать день", "Help me plan my day"],
    items: [
      { name: ["Подготовиться к встрече", "Prepare for a meeting"], brief: ["Собрать вопросы в один документ", "Collect questions in one document"], detail: ["Запишите цель встречи, три вопроса и решение, которое хотите получить. В примере подготовка занимает 10 минут.", "Write down the meeting goal, three questions, and the decision you need. Allow ten minutes in this example."] },
      { name: ["Ответить на важное", "Reply to what matters"], brief: ["Выделить время на переписку", "Set aside time for messages"], detail: ["В этой демонстрации сообщения вымышлены. Для настоящей работы потребуется отдельное подключение канала с разрешением на чтение.", "Messages in this demonstration are fictional. Real work requires connecting a channel and granting reading permission."] }
    ]
  },
  lawyer: {
    name: ["ИИ-юрист", "AI legal assistant"], role: ["Первый шаг в правовом вопросе", "A first step through a legal question"],
    title: ["Подготовка к консультации", "Preparing for a consultation"],
    update: ["Соберём факты и вопросы для консультации.", "Let’s collect the facts and questions for a consultation."],
    result: ["Что подготовить к разговору", "What to bring to the conversation"], prompt: ["Подготовь меня к консультации", "Help me prepare for a consultation"],
    items: [
      { name: ["Краткая история", "A short timeline"], brief: ["Даты, участники и желаемый результат", "Dates, people involved, and the desired outcome"], detail: ["Демонстрационный список: изложите события по порядку, отметьте важные даты и сформулируйте вопрос специалисту. Юридических выводов в примере нет.", "Sample checklist: put events in order, highlight important dates, and write down your question. This example contains no legal conclusions."] },
      { name: ["Документы к вопросу", "Relevant documents"], brief: ["Список того, что уже есть", "A list of what you already have"], detail: ["Составьте перечень документов для обсуждения со специалистом. В прототипе ничего загружать не нужно.", "List the documents to discuss with a professional. There is no need to upload anything in this prototype."] }
    ]
  }
};
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { announce(tx("Изменения останутся только до закрытия страницы.", "Changes will last only until this page closes.")); }
}
function caseState(agentId) {
  return state.cases[agentId] || { opened: false, saved: false, invited: false, assigned: false, notifications: false, completed: false };
}
function updateCase(agentId, changes) {
  state.cases[agentId] = { ...caseState(agentId), ...changes };
  persist();
}
function announce(message) { document.querySelector("#announcement").textContent = message; }
function button(text, action, glyph = "arrow", extra = "", id = "") {
  return `<button type="button" class="btn ${extra}" data-action="${action}"${id ? ` data-id="${id}"` : ""}>${text}${icon(glyph, 17)}</button>`;
}
function avatar(agentId) {
  const face = agentId === "lawyer" ? icon("scales", 29) : `<svg viewBox="0 0 48 48" width="38" height="38" fill="none" aria-hidden="true"><path d="${agentId === "domashkin" ? "M8 20 24 8l16 12v19H8Z" : "M24 5 30 15l11 3-7 10 1 13-11-5-11 5 1-13-7-10 11-3Z"}" fill="currentColor" opacity=".18"/><path d="M18 23v3m12-3v3m-10 6q4 4 8 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  return `<span class="avatar ${agentId}">${face}</span>`;
}
function statusChip(kind, text) { return `<span class="status ${kind}">${text}</span>`; }
function agentCard(agentId) {
  const agent = agents[agentId], progress = caseState(agentId);
  return `<article class="agent-card" data-component="assistant-card"><div class="agent-top">${avatar(agentId)}${statusChip(progress.completed ? "" : "attention", progress.completed ? tx("Готово в примере", "Sample completed") : tx("Есть следующий шаг", "A next step is ready"))}</div><h3>${label(agent.name)}</h3><p class="role">${label(agent.role)}</p><p class="update">${progress.completed ? tx("Задача завершена. Все материалы остались в деле.", "Task completed. Your materials stay in the case.") : label(agent.update)}</p><button class="text-button" data-action="open-case" data-id="${agentId}">${tx("Открыть дело", "Open case")}${icon("arrow", 17)}</button></article>`;
}
function nextStep(agentId, action, glyph, title, description, done = false) {
  return `<button class="next-step${done ? " complete" : ""}" data-component="next-step" data-action="${action}" data-id="${agentId}">${icon(done ? "check" : glyph)}<span><strong>${title}</strong><small>${description}</small></span>${icon("arrow", 16)}</button>`;
}
const navItems = [
  ["day", "sun", ["Мой день", "My day"]], ["cases", "cases", ["Мои дела", "My cases"]],
  ["discover", "compass", ["Попробовать", "Explore"]], ["documents", "file", ["Материалы", "Materials"]]
];
function route() {
  const raw = location.hash.slice(1) || "day";
  if (raw.startsWith("case/") && agents[raw.split("/")[1]]) return raw;
  return ["day", "cases", "discover", "documents", "components"].includes(raw) ? raw : "day";
}
function navigation() {
  const current = route();
  return navItems.map(([key, glyph, title]) => `<a class="nav-item${current === key || (key === "cases" && current.startsWith("case/")) ? " active" : ""}" href="#${key}"${current === key ? ' aria-current="page"' : ""}>${icon(glyph)}${label(title)}</a>`).join("");
}
function heading(eyebrow, title, subtitle = "") {
  return `<header class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div></header>`;
}
function composer(agentId = "") {
  return `<form class="composer" id="composer" data-agent="${agentId}"><label for="message">${tx("С чего начнём?", "Where shall we start?")}</label><textarea id="message" name="message" rows="2" maxlength="2000" required placeholder="${tx("Напишите, что хочется упростить…", "What would you like to make easier?")}"></textarea><div class="composer-footer"><small>${tx("Демо-диалог · покажем пример ответа, без обращения к ИИ", "Demo conversation · a sample response, no AI connection")}</small><button class="btn primary" type="submit">${tx("Отправить", "Send")}${icon("send", 17)}</button></div></form>`;
}
function onboarding() {
  if (state.dismissed) return "";
  const progress = caseState(spaces[state.space].agents[0]);
  const steps = [[true, tx("Выбрали пространство", "Choose a space")], [progress.opened, tx("Открыли первое дело", "Open your first case")], [progress.saved, tx("Сохранили полезное", "Save something useful")]];
  const count = steps.filter(([done]) => done).length;
  return `<section class="onboard" data-component="onboarding"><div class="onboard-top"><h3>${tx("Осваивайтесь в своём темпе", "Make yourself at home")}</h3><button class="dismiss" data-action="dismiss" aria-label="${tx("Скрыть подсказку", "Dismiss tip")}">${icon("close", 16)}</button></div><p>${tx("Пара шагов — и здесь станет привычно.", "A couple of steps to feel at home.")}</p><progress max="3" value="${count}" aria-label="${tx("Первые шаги", "First steps")}"></progress><div class="onboard-steps">${steps.map(([done, title]) => `<span class="${done ? "done" : ""}">${done ? "✓" : "○"} ${title}</span>`).join("")}</div></section>`;
}
function dayScreen() {
  const space = spaces[state.space], mainAgent = space.agents[0];
  const family = state.space === "family", practice = state.space === "practice";
  const heroTitle = family ? tx("Вечер можно освободить", "Make room for your evening") : practice ? tx("Начните с ясного вопроса", "Start with a clear question") : tx("Оставьте время для себя", "Leave some time for yourself");
  const heroBody = family ? tx("Собрали школьные дела в один понятный план. Остальное — время вместе.", "School tasks in one simple plan. The rest is time together.") : practice ? tx("Соберите факты и документы. Помощник подскажет, с чего начать подготовку.", "Collect your facts and documents. Your assistant shows where to start.") : tx("Важное — на виду. Помощник поможет разложить заботы на небольшие шаги.", "Keep what matters in sight. Turn everyday concerns into small steps.");
  return `<header class="page-heading"><div><div class="eyebrow">${tx("ВАШЕ ПРОСТРАНСТВО ДЛЯ ЖИЗНИ", "A LITTLE SPACE FOR YOUR LIFE")}</div><h1>${tx("Меньше забот.<br>Больше вашей жизни.", "Less to manage.<br>More life to live.")}</h1><p>${tx("Вы решаете, что важно. Мы помогаем с остальным.", "You choose what matters. We help with the rest.")}</p></div><span class="day-badge">${tx("Пример дня · четверг", "Sample day · Thursday")}</span></header><div class="dashboard"><div class="main-column"><section class="hero" data-component="day-highlight"><div><span class="eyebrow">${tx("ОДНА ХОРОШАЯ МЫСЛЬ НА СЕГОДНЯ", "ONE GOOD IDEA FOR TODAY")}</span><h2>${heroTitle}</h2><p>${heroBody}</p><button class="text-button" data-action="open-case" data-id="${mainAgent}">${tx("Посмотреть план", "See the plan")}${icon("arrow", 18)}</button></div><div class="orbit" aria-hidden="true"><div class="orbit-ring"></div><div class="orbit-card">${icon(space.icon, 23)}<strong>${family ? "16:00" : "10:00"}</strong><div class="orbit-lines"></div><div class="orbit-lines"></div></div><div class="orbit-star">✳</div></div></section>${composer()}<div class="quick-row">${space.agents.map(agentId => `<button class="quick" data-action="sample" data-id="${agentId}">${icon(agentId === "domashkin" ? "book" : "sun", 16)}${label(agents[agentId].prompt)}</button>`).join("")}</div><div class="section-heading"><h2>${tx("Ваши помощники", "In good company")}</h2><small>${tx("У каждого — своё дело", "A case for every assistant")}</small></div><div class="agent-grid">${space.agents.map(agentCard).join("")}</div><section class="discover-strip"><div><div class="eyebrow">${tx("ЕЩЁ ОДНА ВОЗМОЖНОСТЬ", "SOMETHING ELSE TO DISCOVER")}</div><h3>${tx("А что ещё можно поручить?", "What else can I get help with?")}</h3><p>${tx("Три небольших сценария, чтобы попробовать.", "Three small scenarios to try for yourself.")}</p></div><a class="btn" href="#discover">${tx("Посмотреть", "Explore")}${icon("arrow", 17)}</a></section></div><aside class="rail"><section class="rail-card"><h2>${tx("Ритм дня", "Your day, at a glance")}</h2><ol class="timeline"><li><time>09:00</time><div><strong>${tx("Спокойное начало", "An unhurried start")}</strong><small>${tx("Выбрать главное на день", "Choose today’s priority")}</small></div></li><li class="current"><time>16:00</time><div><strong>${family ? tx("Школьная сводка", "School summary") : tx("Вернуться к главному", "Check in on your priority")}</strong><small>${tx("Пример события", "Sample event")}</small></div></li><li><time>19:00</time><div><strong>${tx("Время для себя", "Time for yourself")}</strong><small>${tx("Хороший план оставляет место жизни", "A good plan leaves room for life")}</small></div></li></ol></section><section class="rail-card rail-note"><div class="eyebrow">${tx("ЛЕГЧЕ ВМЕСТЕ", "BETTER TOGETHER")}</div><h3 style="margin-top:12px">${tx("Не держать всё в голове", "You don’t have to remember it all")}</h3><p>${tx("Сохраните результат в деле — к нему легко вернуться и обсудить с близкими.", "Save the result in a case. Come back to it or discuss it with someone close.")}</p><a class="text-button" href="#documents">${tx("Мои материалы", "My materials")}${icon("arrow", 17)}</a></section>${onboarding()}</aside></div>`;
}
function caseScreen(agentId) {
  const agent = agents[agentId], progress = caseState(agentId);
  return `<a class="text-button" href="#day">← ${tx("Мой день", "My day")}</a><header class="page-heading"><div class="case-title">${avatar(agentId)}<div><h1>${label(agent.title)}</h1><p>${label(agent.role)}</p></div></div></header><div class="case-bar">${statusChip(progress.completed ? "" : "attention", progress.completed ? tx("Завершено в демо", "Completed in demo") : tx("Ждёт вашего решения", "Ready for your decision"))}<span class="muted">${tx("Учебное дело · вымышленные данные", "Sample case · fictional data")}</span></div><div class="case-layout"><div><article class="panel" data-component="result"><div class="result-head"><div><div class="eyebrow">${tx("ПРИМЕР РЕЗУЛЬТАТА", "SAMPLE RESULT")}</div><h2 style="margin-top:8px">${label(agent.result)}</h2></div><button class="text-button" data-action="collapse" aria-expanded="${expanded}" aria-controls="result-body">${expanded ? tx("Свернуть", "Collapse") : tx("Развернуть", "Expand")}</button></div><div id="result-body" class="result-body"${expanded ? "" : " hidden"}>${lastQuestion ? `<blockquote class="quote">${esc(lastQuestion)}</blockquote>` : ""}${agent.items.map((item, index) => `<section class="lesson"><span class="lesson-number">${index + 1}</span><div><h3>${label(item.name)}</h3><p>${label(item.brief)}</p><details><summary>${tx("Открыть разбор", "See details")}</summary><p>${label(item.detail)}</p></details></div></section>`).join("")}<p class="result-source">${tx("Источник: сценарий прототипа. Дневник, учебники и личные сообщения не подключены.", "Source: prototype scenario. No diary, textbooks, or personal messages are connected.")}</p></div></article>${progress.assigned ? `<div class="notice">${icon("check", 17)} ${tx("Ответственный", "Assigned to")}: ${esc(progress.assignee)} · ${esc(progress.due)}</div>` : ""}${progress.invited ? `<div class="notice">${tx("Участник в демо", "Demo participant")}: ${esc(progress.invitee)}. ${tx("Настоящее приглашение не отправлялось.", "No real invitation was sent.")}</div>` : ""}${progress.notifications ? `<div class="notice">${tx("В примере выбраны ежедневные уведомления в 16:00. Настоящие сообщения не отправляются.", "Daily updates at 16:00 selected in this example. No real messages will be sent.")}</div>` : ""}${progress.completed ? `<div class="notice">${icon("check", 18)} ${tx("Готово. Вы прошли путь от вопроса до решения.", "Done. You went from a question to a decision.")}</div>` : ""}${composer(agentId)}</div><aside><div class="section-heading" style="margin-top:0"><h2>${tx("Что дальше?", "What’s next?")}</h2></div><div class="next-steps">${nextStep(agentId, "save", "file", progress.saved ? tx("Материал сохранён", "Material saved") : tx("Сохранить разбор", "Save the result"), tx("Будет под рукой в материалах", "Keep it close in your materials"), progress.saved)}${nextStep(agentId, "invite", "users", tx("Пригласить близкого", "Invite someone close"), tx("Обсудить и разделить заботы", "Discuss it and share the load"), progress.invited)}${nextStep(agentId, "assign", "cases", tx("Кто и когда поможет?", "Who can help, and when?"), tx("Назначить участника и срок", "Set an assignee and due date"), progress.assigned)}${nextStep(agentId, "notify", "bell", tx("Получать сводку", "Get a daily summary"), tx("Каждый день, в удобном канале", "Every day, in your preferred channel"), progress.notifications)}${nextStep(agentId, "complete", "check", progress.completed ? tx("Задача завершена", "Task completed") : tx("Подтвердить и завершить", "Confirm and complete"), tx("Решение остаётся за вами", "The decision stays with you"), progress.completed)}</div><section class="rail-card rail-note" style="margin-top:22px"><div class="eyebrow">${tx("МАЛЕНЬКИЙ СЛЕДУЮЩИЙ ШАГ", "ONE SMALL NEXT STEP")}</div><p>${tx("Не нужно делать всё сразу. Сохраните полезное и вернитесь, когда удобно.", "There’s no need to do everything now. Save what helps and return when you’re ready.")}</p></section></aside></div>`;
}
function discoverScreen() {
  return heading(tx("ЗНАКОМСТВО ЧЕРЕЗ ПОЛЬЗУ", "DISCOVER BY DOING"), tx("Попробуйте на одном деле", "Start with one small thing"), tx("Посмотрите результат до подключения. В примерах кредиты не тратятся.", "See the result before connecting anything. Examples cost no credits.")) + `<div class="scenario-grid">${["domashkin", "fixarik", "lawyer"].map(agentId => `<article class="scenario"><div class="scenario-art">${icon(agentId === "domashkin" ? "book" : agentId === "lawyer" ? "scales" : "sun", 58)}</div><h2>${label(agents[agentId].result)}</h2><p>${label(agents[agentId].update)}</p><small class="cost">${tx("Демо · 0 кредитов · без подключений", "Demo · 0 credits · no connections")}</small>${button(tx("Посмотреть пример", "Try the example"), "open-case", "arrow", "", agentId)}</article>`).join("")}</div><div class="notice">${tx("В рабочем сервисе перед запуском будут показаны стоимость, необходимые материалы и разрешения. Здесь можно спокойно изучить сам путь.", "In the live service, cost, required materials, and permissions will be shown before starting. Here, explore the experience at your own pace.")}</div>`;
}
function documentsScreen() {
  const documents = state.documents.filter(agentId => agents[agentId]);
  return heading(tx("ПОЛЕЗНОЕ ОСТАЁТСЯ С ВАМИ", "KEEP WHAT HELPS"), tx("Ваши материалы", "Your materials"), tx("Сохранённые примеры доступны на этом устройстве. Их можно открыть и скачать.", "Saved examples stay on this device. Open or download them anytime.")) + (documents.length ? documents.map(agentId => `<article class="doc-row">${icon("file", 26)}<div><h3>${label(agents[agentId].result)}</h3><p>${label(agents[agentId].name)} · ${tx("Демо-материал", "Demo material")}</p></div>${button(tx("Открыть", "Open"), "open-case", "arrow", "", agentId)}${button(tx("Скачать TXT", "Download TXT"), "download", "file", "", agentId)}</article>`).join("") : `<section class="empty">${icon("file", 42)}<h2 style="margin-top:18px">${tx("Здесь будет то, что пригодится", "A home for useful things")}</h2><p>${tx("Откройте пример дела и нажмите «Сохранить разбор». Он появится здесь.", "Open a sample case and choose Save the result. It will appear here.")}</p><a class="btn primary" href="#discover">${tx("Выбрать пример", "Choose an example")}${icon("arrow", 17)}</a></section>`);
}
function componentsScreen() {
  return heading(tx("ВИТРИНА КОМПОНЕНТОВ", "COMPONENT GALLERY"), tx("Один язык для всех разделов", "One language for every space"), tx("Те же карточки, состояния и действия работают в семье, личном пространстве и практике.", "The same cards, states, and actions work across family, personal, and practice spaces.")) + `<div class="workshop-grid"><section class="panel"><h2>${tx("Характер пространства", "A space with character")}</h2><p class="muted">${tx("Меняйте акцент — все компоненты подстроятся вместе.", "Change the accent and every component follows.")}</p><label class="control" for="hue">${tx("Оттенок", "Hue")}<input id="hue" type="range" min="100" max="280" value="${state.hue}"><output id="hue-output">${state.hue}°</output></label><div class="swatches" aria-hidden="true"><span class="swatch" style="background:var(--accent)"></span><span class="swatch" style="background:var(--soft)"></span><span class="swatch" style="background:var(--peach)"></span><span class="swatch" style="background:var(--purple)"></span></div>${button(tx("Сменить пространство", "Switch space"), "space", "chevron")}</section><section class="panel"><h2>${tx("Понятные состояния", "States that make sense")}</h2><div class="quick-row">${statusChip("", tx("Готово", "Ready"))}${statusChip("attention", tx("Нужно ваше решение", "Needs your decision"))}${statusChip("working", tx("В работе", "Working"))}${statusChip("off", tx("Не подключён", "Not connected"))}</div><p class="muted" style="margin-top:20px">${tx("Витрина состояний. В рабочей версии каждое состояние должно приходить от сервера.", "State samples. In the live version, every state must come from the server.")}</p><div class="quick-row">${button(tx("Главное действие", "Primary action"), "open-case", "arrow", "primary", "domashkin")}${button(tx("Следующий шаг", "Next step"), "save", "file", "", "domashkin")}</div></section><div>${agentCard(spaces[state.space].agents[0])}</div><section class="panel"><h2>${tx("Следующее полезное действие", "The next useful action")}</h2>${nextStep("domashkin", "invite", "users", tx("Пригласить второго родителя", "Invite another parent"), tx("Уместно после школьной сводки", "Useful after a school summary"))}</section><section class="panel"><h2>${tx("Диалог, который даёт место", "A conversation with room to grow")}</h2>${composer("domashkin")}</section><section class="panel"><h2>${tx("Мягкое знакомство", "A gentle introduction")}</h2>${onboarding() || `<p class="muted">${tx("Подсказка скрыта. Её можно вернуть.", "The tip is dismissed. You can bring it back.")}</p>`}${button(tx("Вернуть подсказку", "Restore tip"), "restore", "plus")}</section></div>`;
}
function render(moveFocus = false) {
  const current = route(), space = spaces[state.space];
  document.documentElement.lang = state.lang;
  document.documentElement.style.setProperty("--hue", state.hue);
  document.title = `FixAR · ${tx("Мой день · прототип", "My day · prototype")}`;
  const screen = current.startsWith("case/") ? caseScreen(current.split("/")[1]) : current === "discover" ? discoverScreen() : current === "documents" ? documentsScreen() : current === "components" ? componentsScreen() : current === "cases" ? heading(tx("ПОМОЩЬ, У КОТОРОЙ ЕСТЬ ПРОДОЛЖЕНИЕ", "HELP THAT GOES SOMEWHERE"), tx("Дела ваших помощников", "Your assistants’ cases"), tx("Результаты, договорённости и следующие шаги — вместе.", "Results, agreements, and next steps, all together.")) + `<div class="agent-grid">${space.agents.map(agentCard).join("")}</div>` : dayScreen();
  app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#day"><span class="brand-mark">✳</span>FixAR<small>ДЕМО / DEMO</small></a><button class="space-control" data-action="space" aria-haspopup="dialog">${icon(space.icon)}<span><small>${tx("Моё пространство", "My space")}</small>${label(space.title)}</span>${icon("chevron", 16)}</button><nav class="side-nav" aria-label="${tx("Главная навигация", "Main navigation")}">${navigation()}</nav><div class="side-bottom"><a class="nav-item${current === "components" ? " active" : ""}" href="#components">${icon("sliders")}${tx("Дизайн-система", "Design system")}</a><a class="nav-item" href="/v2/">${icon("arrow")}${tx("Рабочий FixAR", "Live FixAR")}</a><div class="side-note"><strong>${tx("Маленькие шаги. Большая разница.", "Small steps. A real difference.")}</strong>${tx("Начните с того, что важно вам.", "Start with what matters to you.")}</div></div></aside><div class="workspace"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="menu" aria-label="${tx("Открыть меню", "Open menu")}" aria-haspopup="dialog">${icon("menu")}</button><span class="eyebrow">${label(space.title)} <span class="muted">/ FixAR</span></span></div><div class="toolbar"><span class="demo-label">${tx("ПРОТОТИП · ДЕМО", "PROTOTYPE · DEMO")}</span><button class="language" data-action="language" aria-label="${tx("Switch to English", "Переключить на русский")}">${tx("EN", "RU")}</button><button class="icon-button" data-action="space" aria-haspopup="dialog" aria-label="${tx("Сменить пространство", "Switch space")}">${icon(space.icon, 18)}</button></div></header><main class="content" id="main" tabindex="-1">${screen}<footer class="footer-note"><span>${tx("Прототип FixAR · вымышленные данные · 0 списаний", "FixAR prototype · fictional data · no charges")}</span><button data-action="reset">${tx("Начать демо заново", "Start demo again")}</button></footer></main></div></div>`;
  if (moveFocus) { document.querySelector("#main").focus({ preventScroll: true }); window.scrollTo(0, 0); }
}
function openCase(agentId, question = "") {
  if (!agents[agentId]) return;
  updateCase(agentId, { opened: true });
  lastQuestion = question;
  expanded = true;
  if (route() === `case/${agentId}`) render(true);
  else location.hash = `case/${agentId}`;
}
function openModal(title, body) {
  modalTrigger = document.activeElement;
  modal.innerHTML = `<div class="dialog-head"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close" aria-label="${tx("Закрыть", "Close")}">${icon("close")}</button></div>${body}`;
  document.body.classList.add("dialog-open");
  modal.showModal();
}
function closeModal() { modal.close(); }
function refreshAfterAction(message, agentId) {
  render();
  const target = [...document.querySelectorAll("[data-action]")].find(element => element.dataset.action === "open-case" && element.dataset.id === agentId);
  (target || document.querySelector("#main")).focus({ preventScroll: true });
  announce(message);
}
function action(name, agentId, source) {
  if (name === "open-case" || name === "sample") { openCase(agentId, name === "sample" ? agents[agentId].prompt[state.lang === "en" ? 1 : 0] : ""); return; }
  if (name === "close") { closeModal(); return; }
  if (name === "space") {
    openModal(tx("Где займёмся делами?", "Where shall we start?"), Object.entries(spaces).map(([key, space]) => `<button class="space-option" data-action="choose-space" data-id="${key}" aria-pressed="${state.space === key}">${icon(space.icon, 24)}<span><strong>${label(space.title)}</strong><small>${label(space.subtitle)}</small></span>${state.space === key ? icon("check") : icon("arrow")}</button>`).join(""));
  } else if (name === "choose-space" && spaces[agentId]) {
    closeModal(); state.space = agentId; state.hue = spaces[agentId].hue; persist();
    location.hash = "day"; render(true);
  } else if (name === "menu") {
    openModal(tx("Ваш FixAR", "Your FixAR"), `<nav class="side-nav">${navigation()}<a class="nav-item" href="#components">${icon("sliders")}${tx("Дизайн-система", "Design system")}</a><a class="nav-item" href="/v2/">${icon("arrow")}${tx("Рабочий FixAR", "Live FixAR")}</a></nav>`);
  } else if (name === "language") {
    state.lang = state.lang === "ru" ? "en" : "ru"; persist(); render(); document.querySelector('[data-action="language"]').focus();
  } else if (name === "dismiss" || name === "restore") {
    state.dismissed = name === "dismiss"; persist(); render(); document.querySelector("#main").focus({ preventScroll: true });
  } else if (name === "collapse") {
    expanded = !expanded; document.querySelector("#result-body").hidden = !expanded;
    source.setAttribute("aria-expanded", String(expanded)); source.textContent = expanded ? tx("Свернуть", "Collapse") : tx("Развернуть", "Expand");
  } else if (name === "reset") {
    openModal(tx("Начать заново?", "Start again?"), `<p>${tx("Удалятся только сохранённые шаги этого прототипа на устройстве.", "Only saved progress for this prototype on this device will be removed.")}</p><div class="dialog-actions">${button(tx("Сбросить демо", "Reset demo"), "confirm-reset", "check", "primary")}${button(tx("Продолжить изучение", "Keep exploring"), "close", "arrow")}</div>`);
  } else if (name === "confirm-reset") {
    closeModal(); state = { ...structuredClone(initial), lang: state.lang }; lastQuestion = ""; expanded = true; persist(); location.hash = "day"; render(true);
  } else if (!agents[agentId]) return;
  else if (name === "save") {
    if (!state.documents.includes(agentId)) state.documents.push(agentId);
    updateCase(agentId, { saved: true });
    refreshAfterAction(tx("Материал сохранён в демо.", "Material saved in demo."), agentId);
    openModal(tx("Полезное — под рукой", "Saved for later"), `<p>${tx("Пример сохранён на этом устройстве. Откройте материалы, чтобы вернуться к нему или скачать текст.", "The sample is saved on this device. Open materials to revisit it or download the text.")}</p><div class="dialog-actions"><a class="btn primary" href="#documents">${tx("Открыть материалы", "Open materials")}${icon("arrow", 17)}</a>${button(tx("Остаться в деле", "Stay in this case"), "close", "check")}</div>`);
  } else if (name === "invite") {
    openModal(tx("Разделите заботы", "Share the load"), `<p class="muted">${tx("Пример приглашения: никому ничего не отправится. Используйте вымышленное имя.", "Sample invitation: nothing will be sent. Please use a fictional name.")}</p><form data-form="invite" data-agent="${agentId}"><label class="control">${tx("Как назвать участника", "Participant name")}<input name="name" required maxlength="60" value="${tx("Второй родитель", "Another parent")}"></label><label class="control">${tx("Роль и доступ", "Role and access")}<select name="role"><option value="reader">${tx("Читатель — смотрит материалы", "Reader — views materials")}</option><option value="parent">${tx("Помощник — обсуждает и выполняет задачи", "Helper — discusses and completes tasks")}</option></select></label><button class="btn primary" type="submit">${tx("Добавить в демо", "Add to demo")}</button></form>`);
  } else if (name === "assign") {
    openModal(tx("Кто возьмёт следующий шаг?", "Who takes the next step?"), `<form data-form="assign" data-agent="${agentId}"><label class="control">${tx("Ответственный", "Assignee")}<select name="assignee"><option value="me">${tx("Я", "Me")}</option>${caseState(agentId).invited && caseState(agentId).role === "parent" ? `<option value="helper">${esc(caseState(agentId).invitee)}</option>` : ""}</select></label><label class="control">${tx("Срок в примере", "Sample due date")}<input name="due" type="date" required value="2026-09-18"></label><p class="muted">${tx("Другого участника можно назначить после добавления с ролью «Помощник».", "Add a participant with the Helper role before assigning them.")}</p><div class="dialog-actions"><button class="btn primary" type="submit">${tx("Сохранить назначение", "Save assignment")}</button></div></form>`);
  } else if (name === "notify") {
    openModal(tx("Узнавать главное вовремя", "Keep up with what matters"), `<form data-form="notify" data-agent="${agentId}"><p class="muted">${tx("Сводка в 16:00. Это пример настройки, боты не подключаются.", "A summary at 16:00. This is a sample setting; no bots will be connected.")}</p><label class="check-control"><input name="telegram" type="checkbox"${caseState(agentId).telegram ? " checked" : ""}><span>Telegram<small>${tx("Короткая сводка и ссылка на дело", "A short summary and a link to the case")}</small></span></label><label class="check-control"><input name="max" type="checkbox"${caseState(agentId).max ? " checked" : ""}><span>MAX<small>${tx("Тот же результат в удобном канале", "The same result in your preferred channel")}</small></span></label><button class="btn primary" type="submit">${tx("Сохранить в демо", "Save in demo")}</button></form>`);
  } else if (name === "complete") {
    const progress = caseState(agentId);
    if (progress.completed) { announce(tx("Это дело уже завершено.", "This case is already complete.")); return; }
    openModal(tx("Всё готово?", "All done?"), `<p>${tx("После подтверждения задача получит статус «Завершено». Материалы останутся доступны.", "Confirm to mark the task as completed. Your materials will remain available.")}</p><div class="notice">${tx("Ответственный", "Assignee")}: ${esc(progress.assignee || tx("Я", "Me"))}<br>${tx("Материал", "Material")}: ${progress.saved ? tx("сохранён", "saved") : tx("ещё не сохранён", "not saved yet")}</div><div class="dialog-actions">${button(tx("Подтвердить завершение", "Confirm completion"), "confirm-complete", "check", "primary", agentId)}${button(tx("Вернуться к делу", "Back to case"), "close", "arrow")}</div>`);
  } else if (name === "confirm-complete") {
    closeModal(); updateCase(agentId, { completed: true }); refreshAfterAction(tx("Задача завершена в демо.", "Demo task completed."), agentId);
  } else if (name === "download") {
    const agent = agents[agentId], languageIndex = state.lang === "en" ? 1 : 0;
    const content = [tx("FixAR · демо-материал", "FixAR · demo material"), agent.result[languageIndex], ...agent.items.map(item => `${item.name[languageIndex]}\n${item.brief[languageIndex]}\n${item.detail[languageIndex]}`)].join("\n\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `fixar-demo-${agentId}.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (target) action(target.dataset.action, target.dataset.id, target);
  if (event.target.closest('dialog a[href^="#"]')) closeModal();
});
modal.addEventListener("click", event => {
  const bounds = modal.getBoundingClientRect();
  if (event.target === modal && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) closeModal();
});
modal.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  if (modalTrigger?.isConnected) modalTrigger.focus({ preventScroll: true });
});
modal.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});
document.addEventListener("submit", event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const data = new FormData(form), agentId = form.dataset.agent;
  if (form.id === "composer") {
    const message = String(data.get("message") || "").trim();
    if (!message) { form.elements.message.setCustomValidity(tx("Напишите вопрос.", "Enter a question.")); form.reportValidity(); return; }
    openCase(agentId || spaces[state.space].agents[0], message); return;
  }
  if (!agents[agentId]) return;
  if (form.dataset.form === "invite") {
    const invitee = String(data.get("name") || "").trim();
    if (!invitee) { form.elements.name.setCustomValidity(tx("Укажите имя.", "Enter a name.")); form.reportValidity(); return; }
    updateCase(agentId, { invited: true, invitee, role: data.get("role") });
  } else if (form.dataset.form === "assign") {
    const progress = caseState(agentId);
    const helper = data.get("assignee") === "helper" && progress.invited && progress.role === "parent";
    updateCase(agentId, { assigned: true, assignee: helper ? progress.invitee : tx("Я", "Me"), due: data.get("due") });
  } else if (form.dataset.form === "notify") {
    updateCase(agentId, { notifications: data.has("telegram") || data.has("max"), telegram: data.has("telegram"), max: data.has("max") });
  }
  closeModal(); refreshAfterAction(tx("Настройка сохранена в демо.", "Setting saved in demo."), agentId);
});
document.addEventListener("input", event => {
  const field = event.target;
  if (field.matches("input,textarea")) field.setCustomValidity("");
  if (field.id === "message") { field.style.height = "auto"; field.style.height = `${Math.min(field.scrollHeight, 260)}px`; }
  if (field.id === "hue") {
    state.hue = Number(field.value); document.documentElement.style.setProperty("--hue", state.hue);
    document.querySelector("#hue-output").value = `${state.hue}°`; persist();
  }
});
window.addEventListener("hashchange", () => {
  if (modal.open) closeModal();
  render(true);
});
render();

  "use strict";

  // Оболочка v2: навигация, пространства, экраны настроек и кабинета.
  // Зависит только от foundation; дела подключаются следующим слоем.
  // --- Сайдбар ---
  const nav = document.getElementById("nav");
  const NAV_ICON_PATHS = {
    home:'<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4Z"/>',
    dialog:'<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h7"/>',
    case:'<path d="M4 7h6l2 2h8v10H4Z"/><path d="M4 7V5h6l2 2"/>',
    calendar:'<path d="M5 5h14v15H5Z"/><path d="M8 3v4m8-4v4M5 10h14"/>',
    document:'<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v5h5M10 13h5m-5 4h5"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V20M15 5.5a3 3 0 0 1 0 5.8M17 13a4 4 0 0 1 3.5 4v3"/>',
    plan:'<path d="M5 4h14v16H5Z"/><path d="m8 9 1.4 1.4L12 7.8M14 9h3m-9 6 1.4 1.4L12 13.8M14 15h3"/>',
    assistant:'<path d="m12 3 2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1Z"/><circle cx="12" cy="12" r="2.2"/>',
    settings:'<path d="M4 7h10M18 7h2M4 17h2m4 0h10M9 4v6m0 4v6m7-6v6m0-16v6"/>',
    marketplace:'<path d="M4 9h16l-1-5H5Z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/><path d="M4 9c0 2 3 2.5 4 0 1 2.5 4 2.5 5 0 1 2.5 4 2.5 5 0"/>',
    shield:'<path d="M12 3 20 6v5c0 5.1-3.2 8.2-8 10-4.8-1.8-8-4.9-8-10V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    bell:'<path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5Z"/><path d="M10 20h4"/>',
    connection:'<path d="M8 12a4 4 0 0 1 4-4h4a4 4 0 0 1 0 8h-2M16 12a4 4 0 0 1-4 4H8a4 4 0 0 1 0-8h2"/>',
    wallet:'<path d="M4 6h14a2 2 0 0 1 2 2v10H4Z"/><path d="M4 7V5h12M15 11h5v4h-5a2 2 0 0 1 0-4Z"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1.1 1-1.1 1.8M12 17h.01"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5Z"/>'
  };
  function navIconKey(name){
    const value=String(name||"").toLowerCase();
    if(/диалог|разговор|переписк/.test(value))return "dialog";
    if(/главн|сводк|сегодня/.test(value))return "home";
    if(/дел|обращен|проект/.test(value))return "case";
    if(/срок|календар|расписан/.test(value))return "calendar";
    if(/документ|материал|файл/.test(value))return "document";
    if(/участ|люд|семь|профил|роль/.test(value))return "people";
    if(/план|задач|действ|этап/.test(value))return "plan";
    if(/агент|помощ|фиксар|домашкин/.test(value))return "assistant";
    if(/настрой|оформ|язык|пространств/.test(value))return "settings";
    if(/пак|витрин|каталог|решени/.test(value))return "marketplace";
    if(/безопас|прав|соглас|юрид|доступ/.test(value))return "shield";
    if(/уведом|событ/.test(value))return "bell";
    if(/подключ|канал|сервис/.test(value))return "connection";
    if(/тариф|оплат|кредит/.test(value))return "wallet";
    if(/помощ|справ|ошиб/.test(value))return "help";
    return "compass";
  }
  function navIcon(name){
    const key=navIconKey(name);
    return '<span class="n-icon n-icon-'+key+'" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none">'+NAV_ICON_PATHS[key]+'</svg></span>';
  }
  // --- Простой режим меню ---
  // В целевой архитектуре больше сотни пунктов, и большинство из них пока
  // заглушки «Ещё не подключено». По умолчанию меню показывает только то,
  // что открывается по-настоящему: свои экраны, списки дел, главные и
  // готовые страницы вне оболочки. Полное дерево включается в настройках.
  const NAV_FULL_KEY = "fixar-v2-nav-full";
  let navFull = store(NAV_FULL_KEY)==="1";
  let navScreens = null; // SCREENS объявлены ниже; до них считаем всё живым
  const LINKED_PAGES = {
    "Для жизни · Семья / Школа / Электронный дневник": "/dnevnik/",
    "Для жизни · Семья / Школа / Домашние задания": "/fixclo/?preset=education.domashkin&pilot=domashkin",
    "Для работы · Разработка / Паки / Мои паки": "/pak/kabinet/",
    "Для работы · Разработка / Паки / Создать пак": "/pak/"
  };
  const navPath = node => ancestors(node).filter(n=>n!==ROOT).map(n=>n.name).concat(node.name).join(" / ");
  function linkedPage(node){ return (node&&LINKED_PAGES[navPath(node)])||""; }
  window.linkedPage = linkedPage;
  function opensDirectly(node){
    return !navScreens || !!linkedPage(node) || !!navScreens[navPath(node)] || node.name==="Главная" || isListNode(node);
  }
  function isLiveNode(node){
    if(!navScreens) return true;
    return opensDirectly(node) || node.children.some(isLiveNode);
  }
  function navChildren(node){
    if(navFull) return node.children;
    const out=[];
    node.children.forEach(child=>{
      if(!isLiveNode(child)) return;
      // Группа, в которой готов один пункт, не заставляет раскрывать себя.
      const live=child.children.filter(isLiveNode);
      if(!opensDirectly(child)&&live.length===1&&!live[0].children.some(isLiveNode)){ out.push(live[0]); return; }
      out.push(child);
    });
    return out;
  }
  function setNavFull(value){
    navFull=!!value; put(NAV_FULL_KEY,navFull?"1":"0");
    rebuildNav();
    const raw=location.hash.slice(1),cut=raw.search(/[~?]/),node=byId[cut>=0?raw.slice(0,cut):raw];
    if(node) expandTo(node);
  }
  window.setNavFull = setNavFull;
  function buildNav(node, container, depth){
    depth=depth||0;
    navChildren(node).forEach(child => {
      const kidsShown = navChildren(child);
      const row = document.createElement("div"); row.className = "n-row"; row.dataset.id = child.id;
      row.dataset.depth=String(depth);
      const caret = document.createElement("button");
      caret.className = "caret" + (kidsShown.length ? "" : " leaf");
      caret.setAttribute("aria-expanded", "false");
      caret.setAttribute("aria-label", "Развернуть");
      caret.textContent = kidsShown.length ? "⌄" : "";
      const label = document.createElement("button");
      label.className = "n-label";
      label.setAttribute("aria-label",child.name);
      label.innerHTML = navIcon(child.name)+'<span class="n-copy"><strong>'+esc(child.name)+'</strong>'+(navFull&&child.children.length?'<small>'+child.children.length+' разделов</small>':'')+(linkedPage(child)?'<small>'+((window.FixarV2I18n&&window.FixarV2I18n.english)?"Opens separately":"Откроется отдельно")+' ↗</small>':'')+'</span>';
      row.append(label, caret); container.appendChild(row);
      let kids = null;
      if (kidsShown.length){
        kids = document.createElement("div"); kids.className = "kids"; kids.hidden = true;
        container.appendChild(kids);
        buildNav(child, kids, depth+1);
        caret.addEventListener("click", e => { e.stopPropagation();
          const open = kids.hidden; kids.hidden = !open; caret.setAttribute("aria-expanded", String(open)); });
      }
      label.addEventListener("click", () => { listFilter="Все"; go(child.id); });
      child._row = row; child._caret = caret; child._kids = kids;
    });
  }
  // --- Скоуп: показываем только выбранное пространство + аккаунт (не всё дерево) ---
  const SPACE_NODES = {
    "Личное": findNode("Для жизни · Личное"),
    "Семья": findNode("Для жизни · Семья"),
    "Практика": findNode("Для работы · Практика"),
    "Разработка": findNode("Для работы · Разработка"),
    "Проекты и исследования": findNode("Для работы · Проекты и исследования")
  };
  const ACCOUNT_SETTINGS_NODE = ROOT.children.find(node=>node.name==="Настройки");
  window.FixarV2AppearanceRoute=ACCOUNT_SETTINGS_NODE?ACCOUNT_SETTINGS_NODE.id:"";
  const ACCOUNT_NODES = [findNode("Общие разделы аккаунта"), ACCOUNT_SETTINGS_NODE, findNode("Помощь")].filter(Boolean);
  const kidOf = (node,name) => { const k=node&&node.children.find(c=>c.name===name); return k?k.id:(node?node.id:"0"); };
  const CASE_VIEW_KEY = "fixar-v2-case-view";
  const SPACE_KEY = "fixar-v2-space";
  let currentSpace = SPACE_NODES[store(SPACE_KEY)] ? store(SPACE_KEY) : "Семья";
  let listFilter = "Все";
  let caseViewMode = store(CASE_VIEW_KEY)==="notes" ? "notes" : "list";
  function spaceOf(node){ let n=node; while(n){ for(const k in SPACE_NODES){ if(SPACE_NODES[k]===n) return k; } n=n.parent; } return null; }
  function switchSpace(k){ if(k===currentSpace) return; rememberInteraction("switch_space",k); currentSpace=k; if(typeof HOME_WORK_MODE!=="undefined"&&Object.prototype.hasOwnProperty.call(HOME_WORK_MODE,k))HOME_WORK_MODE[k]=false; rebuildNav(); go(kidOf(SPACE_NODES[k],"Главная")); }
  window.switchSpace = switchSpace;
  function renderSwitch(){
    document.getElementById("switch").innerHTML =
      '<button class="me" id="spacepick" type="button" aria-haspopup="dialog" aria-label="Сменить пространство: '+esc(currentSpace)+'">'+
      '<span class="me-space-mark" aria-hidden="true">'+navIcon(currentSpace)+'</span><span class="me-space-copy"><span class="me-label">Пространство</span><strong class="me-space">'+esc(currentSpace)+'</strong></span><span class="me-space-arrow" aria-hidden="true">⌄</span></button>'+
      '<button class="credit-pill" id="sidecredits" type="button" hidden>кредиты —</button>';
    const p=document.getElementById("spacepick"); if(p) p.addEventListener("click", openSpacePicker);
    renderCredits();
  }
  function renderFoot(){
    const el=document.getElementById("protofoot");
    const notif=findNode("Центр уведомлений"), settings=ACCOUNT_SETTINGS_NODE;
    const ctx=[["Публичная часть","Публичная часть"],["Первый запуск","Первый запуск"],["Структура дела","Внутренняя структура любого дела"],["Юридические","Юридические документы"]];
    el.innerHTML =
      '<div class="sidebar-utility">'+
      (notif?'<button class="foot-link" onclick="go(\''+notif.id+'\')">'+navIcon("Уведомления")+'<span>Уведомления</span></button>':'')+
      (settings?'<button class="foot-link" onclick="go(\''+settings.id+'\')">'+navIcon("Настройки")+'<span>Все настройки</span></button>':'')+
      '<details class="sidebar-more"><summary>Помощь и правила <span>+</span></summary><div>'+ctx.map(c=>{ if(c[0]==="Структура дела") return '<button class="foot-link dim" onclick="openCaseRow(\'\',\'\',\'shkola-raspisanie\')">'+esc(c[0])+'</button>'; const n=findNode(c[1]); return n?'<button class="foot-link dim" onclick="go(\''+n.id+'\')">'+esc(c[0])+'</button>':''; }).join("")+'</div></details></div>';
  }
  function rebuildNav(){ put(SPACE_KEY,currentSpace); nav.innerHTML=""; buildNav(SPACE_NODES[currentSpace], nav); renderSwitch(); renderFoot(); }
  function openSpacePicker(){
    const choices=Object.keys(SPACE_NODES).map(k=>'<button class="tile" type="button" data-space="'+attr(k)+'"><span><h3>'+esc(k)+'</h3><p>'+esc(k===currentSpace?"выбрано":"перейти в пространство")+'</p></span><span class="chev" aria-hidden="true">→</span></button>').join("");
    modalOpen("Выберите пространство",'<div class="tiles" id="spacechoices">'+choices+'</div>',body=>{ body.querySelector("#spacechoices").onclick=e=>{ const b=e.target.closest("[data-space]"); if(!b)return; modalClose(); switchSpace(b.dataset.space); }; });
  }
  rebuildNav();

  function expandTo(node){
    ancestors(node).concat(node).forEach(n => {
      if (n._kids){ n._kids.hidden = false; if (n._caret) n._caret.setAttribute("aria-expanded","true"); }
    });
    document.querySelectorAll(".n-row.active").forEach(r => r.classList.remove("active"));
    if (node._row){ node._row.classList.add("active"); node._row.scrollIntoView({block:"nearest"}); }
  }

  // --- Контент ---
  const vwrap = document.getElementById("vwrap");
  // Крошки без служебного корня «ФиксАР» и без «Для жизни · …»: пространство
  // называется так же, как в переключателе.
  const crumbName = n => { for(const k in SPACE_NODES){ if(SPACE_NODES[k]===n) return k; } return n.name; };
  const crumbHtml = node => {
    const chain = ancestors(node).filter(n=>n!==ROOT).concat(node);
    return chain.map((n,i)=> (i<chain.length-1
      ? '<a href="#'+n.id+'">'+esc(crumbName(n))+'</a><span class="sep">›</span>'
      : '<span>'+esc(crumbName(n))+'</span>')).join("");
  };
  const eyebrowFor = node => { const a = ancestors(node); return a.length ? a.map(n=>n.name).join(" · ") : "ФиксАР"; };

  function tileGrid(node){
    return '<div class="tiles">' + navChildren(node).map(c =>
      '<button class="tile" onclick="go(\''+c.id+'\')">'+
        '<span><h3>'+esc(c.name)+(c.children.length?'<span class="count">'+c.children.length+'</span>':'')+'</h3>'+
        '<p>'+(c.children.length? 'Раздел · '+c.children.length+' пункт(ов)':'Экран')+'</p></span>'+
        '<span class="chev" aria-hidden="true">→</span>'+
      '</button>').join("") + '</div>';
  }

  // SPACE_DATA удалён 22.09.2026: выдуманные «Семейные дела 1.3.0» и
  // рейтинги паков вместо живых /packs. Живые данные грузят
  // loadDevPacks / loadDevPublications / searchDeveloperPacks.

  let PRACTICE={principal:"",loaded:false,loading:false,items:[],selectedId:"",error:""};
  // Один живой запрос на список кабинетов. Возврат немедленно завершённого
  // Promise при `loading=true` запускал такую петлю: render → load → then
  // refresh → render. Достаточно было параллельного refresh от bootIdentity,
  // чтобы вкладка съедала память и падала раньше ответа /practice.
  let practiceLoad=null;
  const FIXAR_PRACTICES=[
    {domain:"household",agent:"chores",title:"Дом и быт",limits:"Разбор, план и черновики; опасные работы выполняет специалист."},
    {domain:"realty",agent:"guest_helper",title:"Недвижимость",limits:"Разбор и подготовка; FixAR не представляет стороны и не ведёт расчёты."},
    {domain:"education",agent:"tutor_planner",title:"Обучение",limits:"Планирование и материалы; решения об ученике остаются за человеком."}
  ];
  const practiceTitle = item => item.kind_title||item.title||item.domain_title||item.domain||"Кабинет";
  const SPECIALIST_INVITE_KEY="fixar-v2-specialist-invite";
  function practiceStorageKey(){ return "fixar-v2-practice:"+(authState.principal||"guest"); }
  function selectedPractice(){ return PRACTICE.items.find(item=>item.id===PRACTICE.selectedId)||null; }
  function practiceCaseStorageKey(caseId){ return "fixar-v2-practice-case:"+(authState.principal||"guest")+":"+caseId; }
  function rememberPracticeCase(caseId,practice){ try{ localStorage.setItem(practiceCaseStorageKey(caseId),JSON.stringify({domain:practice.domain,agent:practice.agent})); }catch(_){} }
  function practiceCaseBinding(caseData){ if(!caseData||caseData.domain)return null; if(caseData.scope==="home"&&/домашкин/i.test(caseData.title||""))return {domain:"household",agent:"chores"}; if(caseData.scope!=="pro")return null; try{ const value=JSON.parse(localStorage.getItem(practiceCaseStorageKey(caseData.id))||"null"); return value&&value.domain&&value.agent?value:null; }catch(_){return null;} }
  function loadPracticeCabinets(force){
    if(!authState.token||!authState.principal){ PRACTICE={principal:"",loaded:true,loading:false,items:[],selectedId:"",error:""}; return Promise.resolve(); }
    // Все читатели ждут ТОТ ЖЕ сетевой ход. Второй вызов не считает
    // «загрузка уже идёт» готовым результатом и не начинает цикл отрисовок.
    if(practiceLoad)return practiceLoad;
    if(!force&&PRACTICE.loaded&&PRACTICE.principal===authState.principal)return Promise.resolve();
    const principal=authState.principal;
    PRACTICE.loading=true;
    practiceLoad=authFetch("GET","/practice").then(data=>{
      if(authState.principal!==principal){PRACTICE={principal:authState.principal||"",loaded:!authState.principal,loading:false,items:[],selectedId:"",error:""};return;}
      const items=Array.isArray(data&&data.practices)?data.practices:[];let selected="";
      try{selected=localStorage.getItem(practiceStorageKey())||"";}catch(_){}
      if(!items.some(item=>item.id===selected))selected=(items[0]||{}).id||"";
      PRACTICE={principal,loaded:true,loading:false,items,selectedId:selected,error:""};
    }).catch(error=>{
      if(authState.principal===principal)PRACTICE={principal,loaded:true,loading:false,items:[],selectedId:"",error:(error&&error.message)||"Не удалось загрузить кабинеты."};
    }).finally(()=>{practiceLoad=null;});
    return practiceLoad;
  }
  let practiceSection="needed";
  const PRACTICE_SECTIONS=[
    ["needed","Где я нужен","Главная"],["tools","Инструменты","Агенты практики"],["inbox","Переписка","Обращения"],["cases","Дела","Клиентские дела"],["people","Участники","Клиенты"],["docs","Документы","Документы"],["calendar","Календарь и сроки","Календарь"],["agents","Агенты","Агенты практики"],["face","Лицо наружу",null],["money","Деньги","Деньги"],["team","Команда кабинета","Команда"],["watch","Наблюдения",null],["links","Подключения",null],["bounds","Границы",null],["archive","Архив и выход",null]
  ];
  function practiceSectionNode(name){return SPACE_NODES["Практика"].children.find(node=>node.name===name)||null;}
  function practiceCases(practice){return ((typeof REAL!=="undefined"&&REAL.cases)||[]).filter(item=>item.domain===practice.domain);}
  function practiceReferralCard(practice){
    return '<div class="practice-invite-card"><p class="eyebrow">ПРИГЛАШЕНИЕ В КОМАНДУ</p><h4>Пригласить помощника в этот кабинет</h4><p>Это отдельное приглашение в вашу команду, не приглашение на платформу. Приглашённый увидит права и условия до вступления.</p><form class="pform" data-act="practice-referral" data-practice-id="'+attr(practice.id)+'"><label>Лимит на ходы помощника, кредитов в месяц<input name="monthly_credits" type="number" min="1" max="1000000" required placeholder="Например, 1000"></label><label>Источник ссылки<input name="referral_source" maxlength="32" pattern="[a-z0-9][a-z0-9_-]{0,31}" value="direct" required placeholder="telegram, max, case_ivanov"><small>Короткий тег латиницей: direct, telegram, max или название вашего дела. По нему можно различать источники.</small></label><label>Сообщение приглашённому<input name="note" maxlength="300" placeholder="Например, для работы с заявками по ремонту"></label><label class="check-line"><input name="library_write" type="checkbox"> <span>Разрешить класть материалы в библиотеку кабинета</span></label><button class="btn primary" type="submit">Создать ссылку в команду</button><div data-practice-referral-result role="status" aria-live="polite"></div></form></div>';
  }
  function screenPracticeInvite(node){
    const head='<main class="research-projects">'+crumbsBlock(node)+'<header class="research-projects-heading"><p class="eyebrow">ПРАКТИКА · КОМАНДА</p><h1>Пригласить в команду</h1><p>Это доступ к выбранному кабинету на оговорённых условиях. Чтобы просто позвать человека на платформу, используйте ссылку «Пригласить в FixAR» на главной.</p></header>';
    if(!hasSession())return head+'<section class="practice-invite-card"><p>Войдите, чтобы создать приглашение от своего кабинета.</p><button class="btn primary" type="button" data-my-day-account>Войти</button></section></main>';
    if(!PRACTICE.loaded||PRACTICE.principal!==authState.principal){
      loadPracticeCabinets().then(()=>{if(currentSpace==="Практика"&&location.hash==="#"+node.id)refreshCurrentView();});
      return head+'<section class="practice-invite-card"><p>Загружаю кабинеты…</p></section></main>';
    }
    if(PRACTICE.error)return head+'<section class="practice-invite-card"><p>'+esc(PRACTICE.error)+'</p><button class="btn" type="button" data-act="practice-reload">Повторить</button></section></main>';
    const practice=selectedPractice();
    if(!practice)return head+'<section class="practice-invite-card"><p>Сначала создайте кабинет практики.</p><button class="btn primary" type="button" data-act="practice-add">Добавить кабинет</button></section></main>';
    const choices=PRACTICE.items.length>1?'<div class="cta-row">'+PRACTICE.items.map(item=>'<button class="btn'+(item.id===practice.id?' primary':'')+'" type="button" data-act="practice-select" data-id="'+attr(item.id)+'">'+esc(practiceTitle(item))+'</button>').join('')+'</div>':'';
    return head+'<p class="rc-hint">Кабинет: '+esc(practiceTitle(practice))+'</p>'+choices+practiceReferralCard(practice)+'</main>';
  }
  function practiceCabinetSection(practice){
    const section=PRACTICE_SECTIONS.find(item=>item[0]===practiceSection)||PRACTICE_SECTIONS[0],cases=practiceCases(practice),target=section[2]&&practiceSectionNode(section[2]);
    let body="";
    if(section[0]==="needed"||section[0]==="cases"){
      const shown=section[0]==="needed"?cases.filter(item=>item.needs_word):cases;
      body=shown.length?'<div class="lst">'+shown.slice(0,8).map(item=>'<button class="lrow" type="button" data-my-day-case="'+attr(item.id)+'"><span><h4>'+esc(item.title||item.goal||"Дело без названия")+'</h4><p>'+esc(item.state||"")+'</p></span><span class="when">открыть →</span></button>').join("")+'</div>':'<p class="rc-hint">'+(cases.length?"Сейчас ни одно дело кабинета не ждёт вашего слова.":"В кабинете пока нет дел.")+'</p>';
      if(section[0]==="needed")body+='<button class="btn" type="button" data-practice-section="team">Пригласить в команду →</button>';
    }else if(section[0]==="team")body=practiceReferralCard(practice);
    else if(section[0]==="face")body='<p class="rc-hint">Публичная страница, подписка и витрина сохраняются в старом кабинете; перенос этого экрана в v2 ещё не завершён.</p>';
    else if(section[0]==="watch")body='<p class="rc-hint">Наблюдения кабинета ещё не построены. Здесь появятся сигналы агентов без доступа к чужим делам.</p>';
    else if(section[0]==="links")body='<p class="rc-hint">Подключения мессенджеров и источников пока настраиваются в общих настройках аккаунта.</p>';
    else if(section[0]==="bounds")body='<p class="rc-hint">Границы действий агентов будут показаны здесь до выдачи разрешений.</p>';
    else if(section[0]==="archive")body='<p class="rc-hint">Закрытие кабинета остаётся защищённым действием и будет перенесено отдельным подтверждаемым экраном.</p>';
    else body='<p class="rc-hint">Откройте полноценный раздел выбранного кабинета.</p>';
    return '<section class="practice-cabinet"><header><p class="eyebrow">КАБИНЕТ · '+esc(practiceTitle(practice))+'</p><h3>'+esc(section[1])+'</h3></header><div class="practice-tabs" role="tablist" aria-label="Разделы кабинета">'+PRACTICE_SECTIONS.map(item=>'<button type="button" role="tab" aria-selected="'+String(item[0]===practiceSection)+'" data-practice-section="'+item[0]+'">'+esc(item[1])+'</button>').join("")+'</div><div class="practice-section-body">'+body+(target&&section[0]!=="needed"&&section[0]!=="team"?'<button class="btn" type="button" data-practice-node="'+attr(target.id)+'">Открыть раздел →</button>':'')+'</div></section>';
  }
  function practicePanel(){
    if(!authState.token) return '<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-hint">Войдите, чтобы увидеть только открытые вами кабинеты практики.</p><button class="btn primary" data-acct="open">Войти</button></div>';
    if(PRACTICE.loading||!PRACTICE.loaded||PRACTICE.principal!==authState.principal) return '<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-hint">Загружаем кабинеты…</p></div>';
    if(PRACTICE.error) return '<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-note">'+esc(PRACTICE.error)+'</p><button class="btn" data-act="practice-reload">Повторить</button></div>';
    const rows=PRACTICE.items.length?PRACTICE.items.map(item=>'<button class="lrow" data-act="practice-select" data-id="'+attr(item.id)+'"><span><h4>'+esc(practiceTitle(item))+'</h4><p>'+esc(item.domain_title||item.domain||"Рабочее направление")+'</p></span>'+(item.id===PRACTICE.selectedId?'<span class="chip">выбран</span>':'<span class="when">выбрать →</span>')+'</button>').join(""):'<p class="rc-hint">Вы ещё не открывали кабинеты.</p>';
    const add=authState.assurance>=2?'<button class="btn primary" data-act="practice-add">Добавить кабинет</button>':'<p class="rc-note">Чтобы добавить кабинет, подтвердите вход до уровня 2.</p>';
    const practice=selectedPractice();
    return (practice?practiceCabinetSection(practice):"")+'<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-hint">Выберите кабинет, в котором сейчас работаете. В списке только ваши кабинеты.</p><div class="lst">'+rows+'</div><div class="cta-row" style="margin-top:12px">'+add+'</div></div>';
  }
  async function submitPracticeReferral(form){
    const button=form.querySelector('button[type="submit"]'),out=form.querySelector('[data-practice-referral-result]');
    const source=form.elements.referral_source.value.trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(source)){out.textContent="Тег источника: до 32 знаков, латинские буквы, цифры, _ или -.";return;}
    button.disabled=true;out.textContent="Создаю ссылку…";
    try{
      const data=await authFetch("POST","/practice/team/invites",{practice_id:form.dataset.practiceId,monthly_credits:Number(form.elements.monthly_credits.value),note:form.elements.note.value.trim(),may:form.elements.library_write.checked?["library_write"]:[],specialist_referral:true,referral_source:source});
      const link=new URL(data.link||("/v2/#teaminvite="+encodeURIComponent(data.code)),location.origin).href;
      out.innerHTML='<div class="practice-referral-result"><label>Ссылка в команду<input type="url" readonly value="'+attr(link)+'"></label><div class="cta-row"><button class="btn" type="button" data-copy-practice-referral="'+attr(link)+'">Копировать ссылку</button></div><p>Ссылка одноразовая, действует '+esc(String(data.expires_in_hours||""))+' ч. Анкету заполняет приглашённый.</p>'+acquisitionTerms(data)+'</div>';
    }catch(error){out.textContent=(error&&error.message)||"Не удалось создать ссылку.";}
    finally{button.disabled=false;}
  }
  async function openPracticeAdd(){
    if(!authState.token){ openAccount(); return; }
    if(authState.assurance<2){ toast("Подтвердите вход до уровня 2, чтобы добавить кабинет."); return; }
    let packs; try{ packs=await authFetch("GET","/packs"); }catch(error){ toast((error&&error.message)||"Не удалось загрузить направления."); return; }
    const enabled={}; PRACTICE.items.forEach(item=>enabled[item.domain+"/"+(item.kind||"")]=true);
    const choices=[]; (packs.packs||[]).forEach(pack=>(pack.practice&&pack.practice.kinds||[]).forEach(kind=>{ if(!enabled[pack.id+"/"+kind.id]) choices.push({domain:pack.id,kind:kind.id,title:(pack.title||pack.id)+" — "+(kind.title||kind.id)}); }));
    if(!choices.length){ toast("Все доступные кабинеты уже открыты."); return; }
    modalOpen("Добавить кабинет",'<p class="lead">Выберите направление. Новый кабинет создаётся только в вашем аккаунте и не даёт доступа к чужим делам.</p><div class="tiles" id="practicechoices">'+choices.map(choice=>'<button class="tile" type="button" data-domain="'+attr(choice.domain)+'" data-kind="'+attr(choice.kind)+'" data-title="'+attr(choice.title)+'"><span><h3>'+esc(choice.title)+'</h3><p>Открыть кабинет</p></span><span class="chev" aria-hidden="true">→</span></button>').join("")+'</div>',body=>{ body.querySelector("#practicechoices").onclick=async event=>{ const button=event.target.closest("[data-domain]"); if(!button)return; button.disabled=true; try{ const item=await authFetch("POST","/practice",{domain:button.dataset.domain,kind:button.dataset.kind,title:button.dataset.title}); await loadPracticeCabinets(true); PRACTICE.selectedId=item.id||PRACTICE.selectedId; try{localStorage.setItem(practiceStorageKey(),PRACTICE.selectedId);}catch(_){} modalClose(); refreshCurrentView(); }catch(error){ button.disabled=false; toast((error&&error.message)||"Кабинет не добавлен."); } }; });
  }

  function specialistDays(days){
    const names={1:"пн",2:"вт",3:"ср",4:"чт",5:"пт",6:"сб",7:"вс"};
    return (days||[]).map(day=>names[day]||day).join(", ");
  }
  function specialistTerms(data){
    const s=data&&data.specialist;if(!s)return "";
    const narrow=(s.narrow_specializations||[]).join(", "),territory=s.territory||{},radius=territory.radius_km?" · до "+territory.radius_km+" км":"",messenger=s.messenger_preference==="tg"?"только Telegram":s.messenger_preference==="max"?"только MAX":"Telegram или MAX — доступный канал автоматически";
    return '<div class="specialist-terms"><div class="prow"><span>Специализация</span><b>'+esc(s.specialty||"")+'</b></div>'+(narrow?'<div class="prow"><span>'+(s.strict_specialization?'Только':'В том числе')+'</span><b>'+esc(narrow)+'</b></div>':'')+'<div class="prow"><span>Территория</span><b>'+esc((territory.name||"")+radius)+'</b></div><div class="prow"><span>Календарь</span><b>'+esc(specialistDays(s.weekdays)+' · '+String(s.start_local||"").slice(0,5)+'–'+String(s.end_local||"").slice(0,5)+' · '+(s.timezone||""))+'</b></div><div class="prow"><span>Мессенджер</span><b>'+esc(messenger)+'</b></div><div class="prow"><span>Публикация окон</span><b>'+(s.publish_availability?'да, для подбора':'нет, только личный календарь')+'</b></div></div>';
  }
  function acquisitionTerms(data){const a=data&&data.acquisition;return a&&a.disclosure?'<p class="rc-note referral-disclosure">'+esc(a.disclosure)+'</p>':"";}
  var TEAM_INVITE_KEY="fixar-v2-team-invite";
  var LEGACY_SPECIALIST_INVITE_KEY="fixar-v2-specialist-invite";
  function teamInviteHash(){return /^#(?:teaminvite|specialist)=tm_[A-Za-z0-9_-]{8,64}$/.test(location.hash);}
  function teamInviteCode(){
    var raw=location.hash.match(/^#(?:teaminvite|specialist)=(tm_[A-Za-z0-9_-]{8,64})$/);if(raw){var code=raw[1];try{localStorage.setItem(TEAM_INVITE_KEY,code);}catch(_){}return code;}
    try{var code=localStorage.getItem(TEAM_INVITE_KEY)||localStorage.getItem(LEGACY_SPECIALIST_INVITE_KEY)||"";if(/^tm_[A-Za-z0-9_-]{8,64}$/.test(code)){localStorage.setItem(TEAM_INVITE_KEY,code);return code;}return "";}catch(_){return "";}
  }
  function teamInviteDraftKey(code){return "fixar.team.questionnaire."+code;}
  async function handleTeamInviteLink(){
    var code=teamInviteCode();if(!code)return false;
    var data;try{data=await authFetch("GET","/team-invites/"+encodeURIComponent(code));}catch(error){try{localStorage.removeItem(TEAM_INVITE_KEY);localStorage.removeItem(LEGACY_SPECIALIST_INVITE_KEY);}catch(_){}toast((error&&error.message)||"Приглашение недоступно.");return true;}
    if(!data.needs_questionnaire){
      modalOpen("Приглашение в практику",'<p class="lead">'+esc(data.what_it_is||"Вас приглашают в команду практики.")+'</p><p class="rc-note">'+esc(data.who_pays||"")+'</p><div class="cta-row"><button class="btn primary" type="button" data-accept-team>Принять приглашение</button></div><p data-team-status aria-live="polite"></p>',function(body){
        var button=body.querySelector("[data-accept-team]"),status=body.querySelector("[data-team-status]");
        button.onclick=function(){
          if(!authState.signed_in){openAccount();return;}
          if(Number(authState.assurance||0)<2){status.textContent="Для рабочего кабинета нужен подтверждённый вход уровня 2 — войдите почтой или телефоном с кодом.";openAccount();return;}
          button.disabled=true;
          authFetch("POST","/team-invites/"+encodeURIComponent(code)+"/accept",{principal_id:authState.principal,phone:"",code:""}).then(function(){
            try{localStorage.removeItem(TEAM_INVITE_KEY);localStorage.removeItem(LEGACY_SPECIALIST_INVITE_KEY);}catch(_){}modalClose();currentSpace="Практика";rebuildNav();go(kidOf(SPACE_NODES[currentSpace],"Главная"));
          }).catch(function(error){button.disabled=false;status.textContent=(error&&error.message)||"Приглашение не принято.";});
        };
      });return true;
    }
    var draft=null;try{draft=JSON.parse(localStorage.getItem(teamInviteDraftKey(code))||"null");}catch(_){}
    var questions;try{questions=await authFetch("GET","/cross-border/question");}catch(error){toast((error&&error.message)||"Не удалось загрузить условия обработки данных. Повторите позже.");return true;}
    var crossBorderQuestion=questions&&questions.ru;
    if(!crossBorderQuestion||!crossBorderQuestion.digest||!crossBorderQuestion.text){toast("Не удалось загрузить условия обработки данных. Повторите позже.");return true;}
    modalOpen("Анкета нового практика",'<p class="lead">Здравствуйте! Вас приглашают в направление «'+esc(data.domain_title||data.kind_title||"практика")+'» на платформе ФиксАР.</p><div class="rc-note">Что вас ждёт: вы заполняете анкету о своей работе (специализация, территория, график) — это 2 минуты. Дальше хозяин кабинета будет назначать вас в дела клиентов, а агент кабинета оплатит ваши ходы — до '+esc(data.monthly_credits)+' кредитов/мес. Членство не открывает дела клиентов автоматически: каждое назначение требует отдельного основания и согласия клиента. Отдельно входить никуда не нужно: код из сообщения подтвердит ваш телефон и сразу откроет пространство «Практика», готовое к работе.</div><div class="prow"><span>Работу агента оплачивает кабинет</span><b>до '+esc(data.monthly_credits)+' кредитов/мес.</b></div>'+acquisitionTerms(data)+(data.note?'<p class="rc-note">'+esc(data.note)+'</p>':'')+teamQuestionnaireHtml(crossBorderQuestion)+'<p class="rc-note">Членство не открывает дела клиентов автоматически: каждое назначение требует отдельного основания и согласия клиента.</p>',function(body){
      var form=body.querySelector("#teamQuestionnaire"),status=body.querySelector("[data-team-status]"),button=form.querySelector('button[type="submit"]'),phoneWrap=body.querySelector("[data-team-phone]"),codeWrap=body.querySelector("[data-team-code]");
      fillTeamQuestionnaire(form,draft);
      // Приём реферального приглашения подтверждается кодом на телефон
      // даже после входа через OAuth: так устроена серверная ручка accept.
      phoneWrap.hidden=false;codeWrap.hidden=true;button.textContent="Выслать код";
      form.specialty.focus();
      var sentPhone="";
      form.onsubmit=function(event){
        event.preventDefault();
        var specialist=readTeamQuestionnaire(form,status);if(!specialist)return;
        var crossBorder=readTeamCrossBorder(form,status,crossBorderQuestion);if(!crossBorder)return;
        try{localStorage.setItem(teamInviteDraftKey(code),JSON.stringify(Object.assign({},specialist,{cross_border:crossBorder})));}catch(_){}
        var phone=(form.phone.value||"").trim();
        if(!phone){status.textContent="Укажите номер телефона — на него придёт код подтверждения.";form.phone.focus();return;}
        if(!codeWrap.hidden&&sentPhone===phone&&form.code.value.trim()){
          specialist.phone=phone;
          submitTeamAccept(specialist,phone,form.code.value.trim(),button,status,code,body,crossBorder);return;
        }
        button.disabled=true;button.textContent="Высылаю код…";status.textContent="";
        authFetch("POST","/team-invites/"+encodeURIComponent(code)+"/invite-code/request",{phone:phone}).then(function(resp){
          button.disabled=false;button.textContent="Подключить практику";status.textContent="Код выслан"+(((resp||{}).channel_title||(resp||{}).channel)?" ("+((resp||{}).channel_title||(resp||{}).channel)+")":"")+" — введите его ниже.";
          sentPhone=phone;codeWrap.hidden=false;form.code.focus();
        }).catch(function(error){button.disabled=false;button.textContent="Выслать код";status.textContent=(error&&error.message)||"Код не выслан.";});
      };
    });
    return true;
  }
  function submitTeamAccept(specialist,phone,code,button,status,inviteCode,body,crossBorder){
    button.disabled=true;button.textContent="Подключаю…";status.textContent="";
    var payload={specialist:specialist,phone:phone,code:code};
    if(authState.signed_in&&authState.principal)payload.principal_id=authState.principal;
    authFetch("POST","/team-invites/"+encodeURIComponent(inviteCode)+"/accept",payload).then(async function(result){
      try{localStorage.removeItem(TEAM_INVITE_KEY);localStorage.removeItem(LEGACY_SPECIALIST_INVITE_KEY);localStorage.removeItem(teamInviteDraftKey(inviteCode));}catch(_){}
      if(result&&result.session&&result.session.token){
        try{
          localStorage.setItem("fixar.token",result.session.token);
          localStorage.setItem("fixar.start.token",result.session.token);
        }catch(_){}
        authState.token=result.session.token;authState.principal=result.session.principal_id||authState.principal;
        authState.assurance=result.session.assurance||2;authState.signed_in=true;
        if(typeof bootIdentity==="function")try{await bootIdentity();}catch(_){}
      }
      var consentError=null;
      if(crossBorder){
        try{await authFetch("PUT","/principals/"+encodeURIComponent(authState.principal)+"/cross-border",{max_jurisdiction:crossBorder.max_jurisdiction,text_digest:crossBorder.text_digest,context:"onboarding"});}
        catch(error){consentError=error;}
      }
      if(teamInviteHash())history.replaceState(null,"",location.pathname+location.search);
      try{await loadPracticeCabinets(true);}catch(_){}
      modalClose();currentSpace="Практика";rebuildNav();go(kidOf(SPACE_NODES[currentSpace],"Главная"));
      if(consentError){toast("Профиль практика создан, но решение о передаче данных не записано. До повторного ответа обработка ограничена Россией. Откройте Юридические документы.");}
      else toast("Профиль практика и календарь готовы. Здесь можно открыть свой кабинет и завести дело.");
    }).catch(function(error){button.disabled=false;button.textContent="Подключить практику";status.textContent=(error&&error.message)||"Не удалось принять приглашение.";});
  }
  function teamQuestionnaireHtml(question){
    var dayNames=[[1,"Пн"],[2,"Вт"],[3,"Ср"],[4,"Чт"],[5,"Пт"],[6,"Сб"],[7,"Вс"]];
    return '<div class="rc-note">Анкета и код — один шаг: заполните поля, укажите телефон, получите код и введите его здесь же. Отдельно входить никуда не нужно.</div><form id="teamQuestionnaire" class="pform specialist-invite-form"><label>Ваша основная специализация<input name="specialty" maxlength="200" required placeholder="Ремонт и обслуживание котлов"></label><label>Узкая специализация, марки через запятую<input name="narrow" maxlength="500" placeholder="Buderus"></label><label class="check-line"><input name="strict" type="checkbox"> <span><b>Работать только в указанной специализации</b><small>Например, только котлы Buderus — без заявок по другим маркам.</small></span></label><div class="pf-row"><label>Где вы работаете<input name="territory" maxlength="200" required placeholder="Приветнинское и окрестности"></label><label>Радиус выезда, км<input name="radius" type="number" min="1" max="500" inputmode="numeric" placeholder="30"></label></div><fieldset><legend>Ваши обычные рабочие дни</legend><div class="weekday-pills">'+dayNames.map(function(item){return '<label><input type="checkbox" name="weekday" value="'+item[0]+'" '+(item[0]<=5?'checked':'')+'><span>'+item[1]+'</span></label>';}).join("")+'</div></fieldset><div class="pf-row"><label>С<input name="start" type="time" value="09:00" required></label><label>До<input name="end" type="time" value="18:00" required></label><label>Часовой пояс<input name="timezone" value="Europe/Moscow" maxlength="64" required></label></div><label>Куда присылать рабочие уведомления<select name="messenger"><option value="auto">Telegram или MAX — доступный канал автоматически</option><option value="tg">Только Telegram</option><option value="max">Только MAX</option></select></label><div data-team-phone><div class="pf-row"><label>Телефон для кода подтверждения<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="32" required placeholder="+7 999 123-45-67"></label></div><p class="rc-note">Код придёт по номеру — Telegram, WhatsApp или СМС, какой дешевле и доступен. Отдельно входить никуда не нужно: верный код и есть вход (уровень 2).</p></div><div data-team-code hidden><label>Код из сообщения<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Код"></label></div><label class="check-line"><input name="publish" type="checkbox" checked> <span><b>Показывать свободные окна в подборе</b><small>Личность не раскрывается до согласованного контакта; видны специализация, территория и окно.</small></span></label><div class="rc-note" data-team-status aria-live="polite"></div><div class="cta-row"><button class="btn primary" type="submit">Выслать код</button></div></form>'.replace('<div data-team-phone>', '<fieldset><legend>Где можно обрабатывать ваши данные</legend><p class="rc-note">'+esc(question.text)+'</p><label class="check-line"><input type="radio" name="cross_border" value="foreign" checked> <span>'+esc(question.answers.foreign)+'</span></label><label class="check-line"><input type="radio" name="cross_border" value="ru"> <span>'+esc(question.answers.ru)+'</span></label><label class="check-line"><input type="checkbox" name="cross_border_confirm" required> <span><b>Я прочитал(а) условия и подтверждаю выбранный ответ</b></span></label></fieldset><label class="check-line"><input type="checkbox" name="gigachat_only"> <span><b>Только GigaChat</b><small>Если GigaChat недоступен, другой моделью не заменять.</small></span></label><div data-team-phone>');
  }
  function readTeamCrossBorder(form,status,question){
    if(!form.cross_border_confirm.checked){status.textContent="Подтвердите ответ об обработке данных.";form.cross_border_confirm.focus();return null;}
    return {max_jurisdiction:form.querySelector('input[name="cross_border"]:checked').value,text_digest:question.digest};
  }
  function readTeamQuestionnaire(form,status){
    var narrow=(form.narrow.value||"").split(",").map(function(value){return value.trim();}).filter(Boolean),weekdays=Array.from(form.querySelectorAll('input[name="weekday"]:checked')).map(function(input){return Number(input.value);});
    if(form.strict.checked&&!narrow.length){status.textContent="Для строгой специализации укажите хотя бы одну марку или вид работ.";form.narrow.focus();return null;}
    if(!weekdays.length){status.textContent="Выберите хотя бы один рабочий день.";return null;}
    if(form.start.value===form.end.value){status.textContent="Начало и конец рабочего окна не могут совпадать.";return null;}
    var territory={name:form.territory.value.trim()};if(form.radius.value)territory.radius_km=Number(form.radius.value);
    return {specialty:form.specialty.value.trim(),narrow_specializations:narrow,strict_specialization:form.strict.checked,territory:territory,timezone:form.timezone.value.trim(),weekdays:weekdays,start_local:form.start.value,end_local:form.end.value,messenger_preference:form.messenger.value,model_preference:form.gigachat_only.checked?"gigachat_only":"auto",publish_availability:form.publish.checked};
  }
  function fillTeamQuestionnaire(form,draft){
    if(!draft)return;form.specialty.value=draft.specialty||"";form.narrow.value=(draft.narrow_specializations||[]).join(", ");form.strict.checked=!!draft.strict_specialization;form.territory.value=(draft.territory||{}).name||"";form.radius.value=(draft.territory||{}).radius_km||"";form.timezone.value=draft.timezone||"Europe/Moscow";form.start.value=String(draft.start_local||"09:00").slice(0,5);form.end.value=String(draft.end_local||"18:00").slice(0,5);form.messenger.value=draft.messenger_preference||"auto";form.gigachat_only.checked=draft.model_preference==="gigachat_only";if(draft.cross_border){var choice=form.querySelector('input[name="cross_border"][value="'+draft.cross_border.max_jurisdiction+'"]');if(choice)choice.checked=true;}form.cross_border_confirm.checked=false;form.publish.checked=draft.publish_availability!==false;if(draft.phone&&form.phone)form.phone.value=draft.phone;form.querySelectorAll('input[name="weekday"]').forEach(function(input){input.checked=(draft.weekdays||[1,2,3,4,5]).includes(Number(input.value));});
  }

  function openFixarCase(){
    if(!authState.token){ openAccount(); return; }
    const choices=FIXAR_PRACTICES.map(item=>'<button class="tile" type="button" data-fixar-domain="'+attr(item.domain)+'"><span><h3>FixAR · '+esc(item.title)+'</h3><p>'+esc(item.limits)+'</p></span><span class="chev" aria-hidden="true">→</span></button>').join("");
    modalOpen("Практика FixAR",'<p class="lead">Выберите направление. Дело останется вашим: FixAR не становится его участником, не видит другие дела и использует только контекст этого дела и общие справочные материалы.</p><div class="tiles" id="fixarchoices">'+choices+'</div>',body=>{ body.querySelector("#fixarchoices").onclick=event=>{ const button=event.target.closest("[data-fixar-domain]"); if(!button)return; const practice=FIXAR_PRACTICES.find(item=>item.domain===button.dataset.fixarDomain); if(practice)openFixarConsent(practice); }; });
  }
  function openFixarConsent(practice){
    const requestId=window.caseRequestId("fixar-practice");
    modalOpen("Согласие на работу FixAR",'<p class="lead"><b>FixAR · '+esc(practice.title)+'</b></p><p>'+esc(practice.limits)+'</p><p class="rc-note">Отправляя дело в практику, вы поручаете FixAR помогать только в этом деле. Он не действует от вашего имени, не подписывает документы, не совершает платежи и просит подтверждение перед каждым внешним действием.</p><form id="fixarconsent" class="pform"><label style="display:flex;gap:9px;align-items:flex-start"><input name="consent" type="checkbox" required> <span>Понимаю границы AI-практики FixAR и согласен(на) на помощь в этом деле.</span></label><label style="display:block;margin-top:12px">Название дела<input name="title" required placeholder="Например, изменить расписание занятий" style="width:100%"></label><label style="display:block;margin-top:10px">Цель (необязательно)<input name="goal" placeholder="Что должно получиться" style="width:100%"></label><div class="cta-row" style="margin-top:16px"><button class="btn primary" type="submit">Создать дело с FixAR</button></div></form>',body=>{ const form=body.querySelector("#fixarconsent"); form.title.focus(); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"); button.disabled=true; button.textContent="Создаю…"; try{ const created=await window.createCaseOnce({title:form.title.value.trim(),goal:form.goal.value.trim(),side:"need_help"},requestId); await authFetch("PUT","/cases/"+encodeURIComponent(created.id)+"/routing",{domain:practice.domain,selected_agent_id:practice.agent,reason:"fixar-practice:v1:"+practice.domain,expect_domain:"",expect_selected_agent_id:""}); REAL.loaded=false; modalClose(); realTab=defaultRealTab(); currentSpace="Личное"; rebuildNav(); renderRealCase(created.id); }catch(error){ button.disabled=false; button.textContent="Создать дело с FixAR"; toast((error&&error.message)||"Не удалось создать дело."); } }; });
  }

  const uiText=(ru,en)=>(window.FixarV2I18n&&window.FixarV2I18n.english)?en:ru;
  let moodCrossBorder={principal:null,loading:false,response:null,error:""};
  function moodCrossBorderQuestion(response){ const questions=response&&response.question||{},language=legalLanguage(); return questions[language]||questions.ru||null; }
  function moodCrossBorderCurrent(response){ const current=response&&response.current_by_lang; return !!(current&&current[legalLanguage()]); }
  function moodCrossBorderLabel(response){ if(!response)return uiText("Где данные","Data region"); if(!response.asked||!moodCrossBorderCurrent(response))return uiText("Выбрать","Choose"); return response.max_jurisdiction==="foreign"?uiText("За рубеж","Abroad"):uiText("Россия","Russia"); }
  function paintMoodCrossBorder(){
    document.querySelectorAll("[data-my-day-globe]").forEach(button=>{
      const response=moodCrossBorder.principal===authState.principal?moodCrossBorder.response:null,label=button.querySelector("[data-my-day-globe-label]"),ready=!!response&&!moodCrossBorder.loading,current=ready&&response.asked&&moodCrossBorderCurrent(response),foreign=current&&response.max_jurisdiction==="foreign";
      button.disabled=moodCrossBorder.loading;
      button.dataset.state=moodCrossBorder.loading?"loading":(!current?"ask":(foreign?"foreign":"ru"));
      if(label)label.textContent=moodCrossBorder.loading?uiText("Проверяю…","Checking…"):moodCrossBorderLabel(response);
      if(current){ button.setAttribute("aria-pressed",String(foreign)); button.removeAttribute("aria-haspopup"); }
      else{ button.removeAttribute("aria-pressed"); button.setAttribute("aria-haspopup","dialog"); }
      const description=!ready?uiText("Проверить, где могут обрабатываться данные","Check where data may be processed"):(current?(foreign?uiText("Передача за рубеж разрешена. Нажмите, чтобы оставить обработку только в России.","Transfer abroad is allowed. Press to keep processing in Russia only."):uiText("Обработка только в России. Нажмите, чтобы разрешить передачу за рубеж.","Processing is limited to Russia. Press to allow transfer abroad.")):uiText("Открыть точный вопрос о передаче данных за рубеж","Open the exact cross-border transfer question"));
      button.setAttribute("aria-label",description); button.title=description;
    });
  }
  async function loadMoodCrossBorder(force){
    if(!authState.signed_in||!authState.token||!authState.principal)return;
    if(moodCrossBorder.loading)return;
    if(!force&&moodCrossBorder.principal===authState.principal&&moodCrossBorder.response){ paintMoodCrossBorder(); return; }
    moodCrossBorder={principal:authState.principal,loading:true,response:moodCrossBorder.principal===authState.principal?moodCrossBorder.response:null,error:""}; paintMoodCrossBorder();
    try{ moodCrossBorder.response=await authFetch("GET","/principals/"+encodeURIComponent(authState.principal)+"/cross-border"); }
    catch(error){ moodCrossBorder.error=(error&&error.message)||uiText("Настройка недоступна","Setting unavailable"); }
    moodCrossBorder.loading=false; paintMoodCrossBorder();
  }
  function openMoodCrossBorderQuestion(){ const legal=findNode("Юридические документы"); if(!legal){toast(uiText("Центр данных пока недоступен.","The data centre is unavailable."));return;} go(legal.id); setTimeout(()=>{const section=document.getElementById("legal-cross-border");if(section)section.scrollIntoView({behavior:"smooth",block:"start"});},80); }
  async function toggleMoodCrossBorder(button){
    if(!authState.signed_in){openAccount();return;}
    await loadMoodCrossBorder(); const response=moodCrossBorder.response,question=moodCrossBorderQuestion(response);
    if(!response||!question||!response.asked||!moodCrossBorderCurrent(response)){ openMoodCrossBorderQuestion(); return; }
    const next=response.max_jurisdiction==="foreign"?"ru":"foreign"; button.disabled=true; button.dataset.state="loading";
    try{ const result=await authFetch("PUT","/principals/"+encodeURIComponent(authState.principal)+"/cross-border/quick",{max_jurisdiction:next,text_digest:question.digest}); moodCrossBorder.response=Object.assign({},response,{asked:true,max_jurisdiction:(result&&result.max_jurisdiction)||next,last_hash:result&&result.entry_hash}); paintMoodCrossBorder(); toast(next==="foreign"?uiText("Передача за рубеж разрешена.","Transfer abroad is allowed."):uiText("Теперь обработка только в России.","Processing is now limited to Russia.")); }
    catch(error){ if(error&&error.status===409)openMoodCrossBorderQuestion(); else toast((error&&error.message)||uiText("Переключить не удалось.","Could not switch the setting.")); }
    finally{ button.disabled=false; }
  }
  function initHolographicScene(root,selector){
    const scene=root&&root.querySelector(selector);
    if(!scene||scene.dataset.textureReady==="1")return;
    scene.dataset.textureReady="1";
    const random=seed=>{let state=seed>>>0;return()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296}};
    scene.querySelectorAll("canvas[data-holo-seed]").forEach(canvas=>{
      const width=520,height=210,r=random(Number(canvas.dataset.holoSeed)||1),variant=Number(canvas.dataset.holoVariant)||0;
      canvas.width=width;canvas.height=height;
      const context=canvas.getContext("2d",{alpha:false}),image=context.createImageData(width,height),pixels=image.data;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const u=x/width,v=y/height,offset=(y*width+x)*4,noise=Math.pow(r(),.62),salt=r()>.977?1.32:1;
        const gauss=(value,center,spread)=>Math.exp(-Math.pow((value-center)/spread,2));
        const blue=gauss(u,variant===1?.18:.05,variant===2?.42:.22),orange=gauss(u,variant===1?.66:.94,variant===2?.39:.22);
        const grain=(.18+.97*noise)*salt*(.94+.06*Math.sin(v*14)),white=Math.max(0,noise-.85)*2.6*(blue+orange);
        pixels[offset]=Math.min(255,(blue*118+orange*340+white*255)*grain);
        pixels[offset+1]=Math.min(255,(blue*68+orange*105+white*220)*grain);
        pixels[offset+2]=Math.min(255,(blue*340+orange*52+white*255)*grain);
        pixels[offset+3]=255;
      }
      context.putImageData(image,0,0);
    });
  }
  function initHolographicHome(root){ initHolographicScene(root,"[data-holographic-home]"); }
  function initHolographicShell(){ initHolographicScene(document,"[data-holographic-shell]"); }
  // Мобильная адресная строка меняет innerHeight при каждой прокрутке; мелкие
  // скачки высоты не должны двигать фон — пересчитываем только при повороте,
  // смене ширины или заметной смене высоты окна.
  let holoScaleSize=null;
  function syncHolographicScale(){
    const w=innerWidth,h=innerHeight;
    if(holoScaleSize&&holoScaleSize[0]===w&&Math.abs(holoScaleSize[1]-h)<160)return;
    holoScaleSize=[w,h];
    document.documentElement.style.setProperty("--holo-scale",Math.max(.55,Math.min(1,h/1120)).toFixed(3));
  }
  syncHolographicScale();
  window.addEventListener("resize",syncHolographicScale,{passive:true});
  const HOME_WORK_MODE={"Личное":false,"Семья":false};
  function syncHomeChrome(node){
    const friendly=currentSpace==="Личное"||currentSpace==="Семья";
    const chatHome=Boolean(authState.signed_in&&friendly&&node&&node.name==="Главная"&&!HOME_WORK_MODE[currentSpace]);
    document.body.classList.toggle("chat-home-shell",chatHome);
    if(chatHome&&typeof closeNav==="function")closeNav();
  }
  function inviteColleagueTile(){
    return '<button class="holo-invite-card" type="button" data-act="invite-to-platform"><span class="holo-invite-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V20M18 8v8m-4-4h8"/></svg></span><span class="holo-invite-card-copy"><strong>'+uiText("Пригласить в FixAR","Invite to FixAR")+'</strong><small>'+uiText("Личная ссылка · 10% с работы платформы","Personal link · 10% of platform work")+'</small></span><span class="holo-invite-card-arrow" aria-hidden="true">↗</span></button>';
  }
  function myDayGuestHome(workEntry){
    const prompts=[["Найти квартиру","Find a flat"],["Разобраться с делами","Sort out my tasks"],["Выбрать лучшее","Choose the best option"]];
    const roadmap=[["01",uiText("Расскажите о задаче","Tell us about the task"),uiText("Обычными словами. Можно начать с одной мысли.","Use everyday language. One thought is enough to begin.")],["02",uiText("Найдите свой маршрут","Find your route"),uiText("Варианты, нужные помощники и понятный план.","Options, the right assistants and a clear plan.")],["03",uiText("Переходите к действию","Move to action"),uiText("Дело, люди и документы — вместе. Важные решения — с вами.","The case, people and documents stay together. Important decisions stay with you.")]];
    const roadmapIcons=['<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h7"/></svg>','<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 18h5V6h6v12h5M12 3v3m-9 9 3 3-3 3m14-6 3 3-3 3"/></svg>','<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6M4 21h16"/></svg>'];
    const layout=[[69,-4,14,90,1],[86,12,12,95,0],[53,135,13,112,0],[70,135,25,112,2],[39,282,12,111,1],[54,282,26,111,0],[83,282,14,111,2],[47,428,14,111,0],[64,428,32,111,0],[39,574,24,111,2],[66,574,13,111,1],[82,574,15,111,2],[55,720,40,111,0],[17,720,18,111,0],[43,866,14,111,1],[61,866,33,111,2]];
    const flickerDurations={3:12800,10:11600};
    const entryAction=workEntry?'<button class="my-day-signin" type="button" data-my-day-work>'+uiText("К делам","To cases")+' <b aria-hidden="true">→</b></button>':'<button class="my-day-signin" type="button" data-my-day-account>'+uiText("Войти","Sign in")+' <b aria-hidden="true">↗</b></button>';
    const panels=layout.map((panel,index)=>'<span class="fixar-holo-panel'+([3,10].includes(index)?' is-flicker':'')+'" style="--hx:'+panel[0]+'%;--hy:'+panel[1]+'px;--hw:'+panel[2]+'%;--hh:'+panel[3]+'px;--hi:'+index+';--base:'+(0.55+(index%4)*.12)+';--duration:'+(flickerDurations[index]||14500+(index%5)*2300)+'ms;--delay:'+(-(index*3770+4900))+'ms"><canvas data-holo-seed="'+(312+index*79)+'" data-holo-variant="'+panel[4]+'"></canvas><i aria-hidden="true"></i></span>').join("");
    return '<main class="my-day-home my-day-guest"><div class="fixar-holo-scene" data-holographic-home aria-hidden="true"><div class="fixar-holo-grid"></div><div class="fixar-holo-panels">'+panels+'</div><div class="fixar-holo-ambient"></div><div class="fixar-holo-veil"></div></div><div class="holo-home-page"><header class="holo-home-header"><a class="holo-home-brand" href="/v2/" aria-label="FixAR"><span class="holo-home-brand-mark" aria-hidden="true">✳</span><strong>FixAR</strong><small>'+esc(currentSpace)+" · "+uiText("пространство","space")+'</small></a><div class="holo-header-actions"><span><i></i>'+uiText("Рядом, когда нужно","Here when you need us")+'</span>'+entryAction+'</div></header><section class="holo-home-stage"><div class="holo-home-content"><div class="holo-home-hero-copy"><p class="eyebrow">'+uiText("НАЧНИТЕ С ОДНОГО СООБЩЕНИЯ","START WITH ONE MESSAGE")+'</p><h1>'+uiText("Что хотите","What would you like")+'<br><span>'+uiText("решить?","to solve?")+'</span></h1><p class="my-day-guest-lede">'+uiText("Из множества возможностей — ваш следующий шаг. Расскажите о задаче. Фиксарик поможет собрать решение.","From many possibilities to your next step. Tell Fixarik about the task and build the solution together.")+'</p><div class="my-day-main"><form class="my-day-composer my-day-guest-composer" data-act="my-day-ask"><label><span aria-hidden="true">✣</span>'+uiText("Фиксарик слушает","Fixarik is listening")+'</label><textarea name="message" rows="3" maxlength="8000" required placeholder="'+uiText("Хочу разобраться с…","I want to figure out…")+'"></textarea><div class="my-day-composer-foot"><small>⌾ '+uiText("Сначала разговор. Решение — за вами.","Conversation first. The decision is yours.")+'</small><button class="btn primary holo-send" type="submit" aria-label="'+uiText("Отправить сообщение","Send message")+'"><span>'+uiText("Отправить","Send")+'</span><b aria-hidden="true">↑</b></button></div><div class="my-day-answer" data-my-day-answer hidden aria-live="polite"></div></form><div class="my-day-prompts" aria-label="'+uiText("Попробуйте начать так","Try starting here")+'">'+prompts.map(pair=>'<button class="my-day-prompt" type="button" data-my-day-prompt="'+attr(uiText(pair[0],pair[1]))+'">'+esc(uiText(pair[0],pair[1]))+' ↗</button>').join("")+'</div></div></div><aside class="holo-home-aside"><svg class="holo-orbit-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="m18 2 3.8 12.2L34 18l-12.2 3.8L18 34l-3.8-12.2L2 18l12.2-3.8L18 2Z"/><circle cx="18" cy="18" r="4"/></svg><h2>'+uiText("Всё начинается с ясности.","Everything begins with clarity.")+'</h2><p>'+uiText("Ваши мысли становятся планом. План — действием.","Your thoughts become a plan. The plan becomes action.")+'</p></aside></div></section><section class="my-day-roadmap" aria-labelledby="my-day-roadmap-title"><div class="my-day-roadmap-head"><p id="my-day-roadmap-title">'+uiText("ОТ ВОПРОСА К РЕЗУЛЬТАТУ","FROM QUESTION TO OUTCOME")+'</p><small>'+uiText("ВЫ УПРАВЛЯЕТЕ КАЖДЫМ ШАГОМ","YOU CONTROL EVERY STEP")+'</small></div><div class="my-day-roadmap-grid">'+roadmap.map((item,index)=>'<article><div class="holo-step-top"><span>'+roadmapIcons[index]+'</span><b>'+item[0]+' /</b></div><h3>'+item[1]+'</h3><p>'+item[2]+'</p></article>').join("")+'</div>'+inviteColleagueTile()+'</section></div></main>';
  }
  function myDayCopy(){
    if(currentSpace==="Семья")return {highlight:uiText("Вечер можно освободить","Make room for your evening"),body:uiText("Соберите семейные дела в один понятный план. Остальное — время вместе.","Bring family tasks into one simple plan. The rest is time together."),prompts:[["Что важно сделать семье сегодня?","What matters for the family today?"],["Помоги разобраться с ближайшими сроками","Help me review upcoming deadlines"]],symbol:"⌂",banner:"domashkin"};
    if(currentSpace==="Личное")return {highlight:uiText("Оставьте время для себя","Leave some time for yourself"),body:uiText("Важное — на виду. Фиксарик поможет разложить заботы на небольшие шаги.","Keep what matters in sight. Fixarik turns everyday concerns into small steps."),prompts:[["Помоги спланировать день","Help me plan my day"],["Какой следующий шаг по моим делам?","What is the next step in my cases?"]],symbol:"✦",banner:"domashkin"};
    if(currentSpace==="Практика")return {highlight:uiText("Начните с ясного вопроса","Start with a clear question"),body:uiText("Соберите факты и документы. Профильный помощник подскажет, с чего начать подготовку.","Collect the facts and documents. A specialist assistant shows where to start."),prompts:[["Помоги сформулировать задачу","Help me frame the task"],["Какие материалы подготовить?","What materials should I prepare?"]],symbol:"§"};
    if(currentSpace==="Проекты и исследования")return {highlight:uiText("Проекты — от замысла до проверки","Projects, from idea to evidence"),body:uiText("Разработка ФиксАР и исследовательские дела: каждый шаг ведёт к проверяемому результату.","FixAR development and research cases: every step leads to a verifiable result."),prompts:[["Что на воротах A1?","What is on gate A1?"],["Как движется интеграция HarnessRouter?","How is HarnessRouter integration progressing?"]],symbol:"◈"};
    return {highlight:uiText("От идеи к безопасной публикации","From an idea to a safe release"),body:uiText("Инструменты владельца, паки и проверки собраны вокруг следующего проверяемого шага.","Owner tools, packs, and checks revolve around the next verifiable step."),prompts:[["Что требует проверки?","What needs review?"],["Покажи следующий шаг публикации","Show the next release step"]],symbol:"⌘"};
  }
  function myDayCases(){
    if(!hasSession()||!REAL||!REAL.loaded)return [];
    return realCasesForSpace(currentSpace).slice().sort((left,right)=>String(right.updated_at||"").localeCompare(String(left.updated_at||"")));
  }
  function myDayAgentCard(kind){
    const domashkin=kind==="domashkin",cases=(REAL&&REAL.cases)||[];
    const assistantCase=domashkin
      ? cases.find(c=>isDomashkinCase(c)&&c.state!=="archived")
      : cases.find(c=>/фиксарик|fixarik/i.test(c.title||"")&&c.state!=="archived");
    const name=domashkin?uiText("Домашкин","Domashkin"):uiText("Фиксарик","Fixarik");
    const role=domashkin?uiText("Школа без вечерней суеты","Calmer school evenings"):uiText("Порядок в повседневных делах","Everyday life, a little more organised");
    const ready=!!assistantCase;
    const update=ready
      ? uiText("Помощник работает в отдельном деле. Откройте его, чтобы увидеть диалог, действия и материалы.","This assistant works in a separate case. Open it to see the conversation, actions, and materials.")
      : (domashkin?uiText("Подключите дневник и каналы. Данные ребёнка откроются только после серверной проверки прав.","Connect the school diary and channels. Child data opens only after server-side permission checks."):uiText("Настройте каналы и границы чтения, затем заведите для Фиксарика отдельное дело.","Configure channels and reading boundaries, then create a separate Fixarik case."));
    const action=ready?'data-my-day-case="'+attr(assistantCase.id)+'"':(domashkin?'data-my-day-domashkin':'data-my-day-fixarik');
    return '<article class="my-day-agent agent-'+kind+'"><div class="my-day-agent-top"><span class="my-day-avatar" aria-hidden="true">'+(domashkin?'⌂':'✦')+'</span><span class="my-day-status '+(ready?'':'attention')+'">'+(ready?uiText("Отдельное дело","Separate case"):uiText("Нужна настройка","Setup needed"))+'</span></div><h3>'+name+'</h3><p class="role">'+role+'</p><p class="update">'+update+'</p><button class="my-day-text-button" type="button" '+action+'>'+(ready?uiText("Открыть дело","Open case"):uiText("Настроить","Set up"))+' →</button></article>';
  }
  function myDayBanner(){
    return '<section class="my-day-highlight domest-hkin-banner"><div><span class="eyebrow">ПОМОЩНИК ДЛЯ ШКОЛЬНИКОВ</span>'+
    '<h2>Домашкин — школа без вечерней суеты</h2>'+
    '<p>Объясняет задания простыми словами, помогает проверить работу, подхватывает домашку из дневника. Подключается за несколько минут — в Telegram или MAX.</p>'+
    '<div class="cta-row"><a class="btn primary" href="/fixclo/?preset=education.domashkin&amp;pilot=domashkin">Подключить Домашкина</a>'+
    '<a class="btn" href="https://t.me/do_mashkin_bot" target="_blank" rel="noopener">Telegram</a>'+
    '<a class="btn" href="https://max.ru/id780154675028_1_bot" target="_blank" rel="noopener">MAX</a></div></div>'+
    '<div class="my-day-orbit" aria-hidden="true"><div class="my-day-orbit-card">⌂<b>Домашкин</b></div></div></section>';
  }
  function myDayRail(){
    const cases=myDayCases();
    if(!hasSession())return '<aside class="my-day-rail"><section class="my-day-rail-card"><h2>'+uiText("Осваивайтесь в своём темпе","Make yourself at home")+'</h2><p>'+uiText("Пара шагов — и здесь станет привычно.","A couple of steps to feel at home.")+'</p><div class="my-day-steps"><button class="my-day-step" type="button" data-my-day-account><span class="my-day-step-icon">1</span><span><strong>'+uiText("Войдите в FixAR","Sign in to FixAR")+'</strong><small>'+uiText("Сохранить свои пространства и дела","Keep your spaces and cases")+'</small></span><span>→</span></button><button class="my-day-step" type="button" data-act="create-case"><span class="my-day-step-icon">2</span><span><strong>'+uiText("Создайте первое дело","Create your first case")+'</strong><small>'+uiText("Начните с реальной задачи","Start with a real task")+'</small></span><span>→</span></button></div></section></aside>';
    const rows=cases.map((item,index)=>'<button class="my-day-step" type="button" data-my-day-case="'+attr(item.id)+'"><span class="my-day-step-icon">'+(index+1)+'</span><span><strong>'+esc(item.title||uiText("Без названия","Untitled"))+'</strong><small>'+esc(fmtWhen(item.updated_at)||uiText("Открыть дело","Open case"))+'</small></span><span>→</span></button>').join("");
    return '<aside class="my-day-rail"><section class="my-day-rail-card"><h2>'+uiText("Следующие шаги","Next steps")+'</h2><p>'+uiText("Продолжите с того места, где нужна ваша мысль.","Continue where your input matters.")+'</p><div class="my-day-steps">'+(rows||'<button class="my-day-step" type="button" data-act="create-case"><span class="my-day-step-icon">+</span><span><strong>'+uiText("Создать первое дело","Create your first case")+'</strong><small>'+uiText("Опишите желаемый результат","Describe the outcome you need")+'</small></span><span>→</span></button>')+'</div></section>'+inviteColleagueTile()+'</aside>';
  }
  function myDayHome(node){
    if(!authState.signed_in)return myDayGuestHome();
    const copy=myDayCopy(),cases=myDayCases(),friendly=currentSpace==="Личное"||currentSpace==="Семья";
    if(friendly&&!HOME_WORK_MODE[currentSpace])return myDayGuestHome(true);
    const agents=currentSpace==="Семья"?["domashkin","fixarik"]:["fixarik","domashkin"];
    const prompts=copy.prompts.map(pair=>'<button class="my-day-prompt" type="button" data-my-day-prompt="'+attr(uiText(pair[0],pair[1]))+'">'+esc(uiText(pair[0],pair[1]))+'</button>').join("");
    const assistants=friendly?'<div class="my-day-section-head"><h2>'+uiText("Ваши помощники","In good company")+'</h2><small>'+uiText("У каждого — своё дело","A case for every assistant")+'</small></div><div class="my-day-agent-grid">'+agents.map(myDayAgentCard).join("")+'</div>':"";
    const banner=(copy.banner==="domashkin")?myDayBanner():"";
    const devPacksSection=currentSpace==="Разработка"?'<section class="my-day-highlight" id="dev-packs-preview"><div><span class="eyebrow">ПАКИ РЕЕСТРА</span><h2>Загрузка паков…</h2><div id="dev-packs-home" class="pgrid" style="margin-top:12px"><div class="skel-card" style="height:80px"></div></div></div></section>':'';
    const extras=devPacksSection+(currentSpace==="Разработка"?ownerToolsPanel():"")+(currentSpace==="Практика"?practicePanel():"");
    const spaceClass={"Семья":"space-family","Личное":"space-personal","Практика":"space-practice","Разработка":"space-development","Проекты и исследования":"space-development"}[currentSpace]||"space-personal";
    return '<main class="my-day-home '+spaceClass+'"><header class="my-day-heading"><div><p class="eyebrow">'+uiText("ВАШЕ ПРОСТРАНСТВО ДЛЯ ЖИЗНИ","A LITTLE SPACE FOR YOUR LIFE")+'</p><h1>'+uiText("Меньше забот.<br>Больше вашей жизни.","Less to manage.<br>More life to live.")+'</h1><p>'+uiText("Вы решаете, что важно. Мы помогаем с остальным.","You choose what matters. We help with the rest.")+'</p></div><button class="my-day-badge" type="button" data-my-day-chat>'+uiText("К чату","Back to chat")+' ←</button></header><div class="my-day-layout"><div class="my-day-main"><section class="my-day-highlight"><div><span class="eyebrow">'+uiText("ОДНА ХОРОШАЯ МЫСЛЬ НА СЕГОДНЯ","ONE GOOD IDEA FOR TODAY")+'</span><h2>'+copy.highlight+'</h2><p>'+copy.body+'</p><button class="my-day-text-button" type="button" '+(cases[0]?'data-my-day-case="'+attr(cases[0].id)+'"':'data-act="create-case"')+'>'+(cases[0]?uiText("Продолжить главное дело","Continue the main case"):uiText("Начать с одного дела","Start with one case"))+' →</button></div><div class="my-day-orbit" aria-hidden="true"><div class="my-day-orbit-card">'+copy.symbol+'<b>'+esc(currentSpace)+'</b></div></div></section><form class="my-day-composer" data-act="my-day-ask"><label>'+uiText("С чего начнём?","Where shall we start?")+'</label><textarea name="message" rows="2" maxlength="8000" required placeholder="'+uiText("Напишите, что хочется упростить…","What would you like to make easier?")+'"></textarea><div class="my-day-composer-foot"><small>'+uiText("Фиксарик видит текущую страницу и может передать вопрос профильному помощнику.","Fixarik sees this page and can hand the question to a specialist assistant.")+'</small><button class="btn primary" type="submit">'+uiText("Отправить","Send")+'</button></div><div class="my-day-answer" data-my-day-answer hidden aria-live="polite"></div></form><div class="my-day-prompts" aria-label="'+uiText("Умные подсказки","Smart suggestions")+'">'+prompts+'</div>'+assistants+banner+'</div>'+myDayRail()+'</div>'+extras+'</main>';
  }

  function dashboard(node){
    return myDayHome(node);
  }

  const OWNER_TOOLS = [
    ["overview","Сводка","Пользователи, дела, модели и агенты"],
    ["users","Пользователи","Состояние аккаунтов без контактов и токенов"],
    ["acquisition","Привлечение","Источники и новые пользователи"],
    ["settings","Настройки","Вход новых посетителей и параметры кабинета"],
    ["integrations","Почта 360","Корпоративный ящик и проверка входящей почты"],
    ["backups","Бэкапы","ЯОС, проверка восстановления и recovery-ключи"],
    ["broadcast","Ленты","Черновики и подтверждение публикаций"],
    ["audit","Аудит","Журнал действий владельца"]
  ];
  function ownerToolsPanel(){
    if(!ownerTools.allowed||ownerTools.principal!==authState.principal)return "";
    return '<section class="owner-tools"><p class="eyebrow">Owner · private</p><h2>Инструменты владельца</h2><p>Доступ подтверждён сервером. Опасные изменения и публикации требуют отдельного подтверждения.</p><div class="owner-tool-grid">'+OWNER_TOOLS.map((tool,index)=>'<a class="owner-tool tone-'+(index%6)+'" href="#owner/'+tool[0]+'"><b>'+esc(tool[1])+'</b><span>'+esc(tool[2])+' →</span></a>').join("")+'</div></section>';
  }

  let ownerRouteToken=0, ownerRouteSettings=null;
  const ownerNumber=value=>new Intl.NumberFormat("ru-RU").format(Number(value)||0);
  function ownerDate(value){ const date=new Date(value||""); return isNaN(date.getTime())?"—":date.toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}); }
  function ownerTool(id){ return OWNER_TOOLS.find(tool=>tool[0]===id)||OWNER_TOOLS[0]; }
  function ownerShell(tab,body,status){
    const tool=ownerTool(tab);
    return '<main class="owner-workspace"><header class="owner-heading"><div><p class="eyebrow">Owner · private</p><h1>'+esc(tool[1])+'</h1><p>'+esc(tool[2])+'</p></div><a class="btn" href="#'+kidOf(SPACE_NODES["Разработка"],"Главная")+'">← '+uiText("На главную","Back home")+'</a></header>'+
      '<nav class="owner-route-tabs" aria-label="Разделы кабинета">'+OWNER_TOOLS.map(item=>'<a href="#owner/'+item[0]+'" aria-current="'+(item[0]===tab?'page':'false')+'">'+esc(item[1])+'</a>').join("")+'</nav>'+
      '<p class="owner-route-status" role="status" aria-live="polite">'+esc(status||"Доступ проверен сервером. Каждый просмотр записывается в аудит.")+'</p>'+body+'</main>';
  }
  function ownerEmpty(message){ return '<div class="owner-empty"><span>✳</span><p>'+esc(message)+'</p></div>'; }
  function ownerTable(headers,rows){
    return '<div class="owner-table-wrap"><table class="owner-table"><thead><tr>'+headers.map(value=>'<th>'+esc(value)+'</th>').join("")+'</tr></thead><tbody>'+(rows.length?rows.join(""):'<tr><td colspan="'+headers.length+'">Нет данных.</td></tr>')+'</tbody></table></div>';
  }
  function ownerMetricCard(label,value,note,tone){ return '<article class="owner-metric tone-'+tone+'"><span>'+esc(label)+'</span><strong>'+esc(ownerNumber(value))+'</strong><small>'+esc(note)+'</small></article>'; }
  function ownerOverview(data){
    const summary=data.summary||{};
    const cards=[
      ["Пользователи",summary.users_total,"новых "+ownerNumber(summary.users_new)+" · активных "+ownerNumber(summary.users_active),0],
      ["Дела",summary.cases_total,"активных "+ownerNumber(summary.cases_active)+" · ждут "+ownerNumber(summary.cases_waiting),1],
      ["Обращения к моделям",summary.model_calls,ownerNumber(summary.model_tokens)+" токенов",2],
      ["Работа агентов",summary.runs_succeeded,"сейчас "+ownerNumber(summary.runs_active)+" · сбоев "+ownerNumber(summary.runs_failed),3],
      ["Документы",summary.documents_total,"без чтения содержимого",4],
      ["Кредиты",summary.credits_spent,"начислено "+ownerNumber(summary.credits_granted),5],
      ["Требует внимания",Number(summary.denied_calls||0)+Number(summary.reports_open||0)+Number(summary.unfunded_spends||0),"отказы · сообщения · списания",2]
    ];
    const models=(data.top_models||[]).map(row=>'<tr><td>'+esc(row.agent||"—")+'</td><td>'+esc(row.model||"—")+'</td><td>'+esc(row.egress==="remote"?"наружу":"локально")+'</td><td>'+ownerNumber(row.calls)+'</td><td>'+ownerNumber(row.denied)+'</td><td>'+ownerNumber(row.tokens)+'</td></tr>');
    return '<section class="owner-metrics">'+cards.map(card=>ownerMetricCard(...card)).join("")+'</section><section class="owner-block"><div class="owner-block-head"><h2>Модели и агенты</h2><small>Без содержимого запросов · '+esc(ownerDate(data.generated_at))+'</small></div>'+ownerTable(["Агент","Модель","Контур","Вызовы","Отказы","Токены"],models)+'</section>';
  }
  function ownerUsers(data){
    const rows=(data.users||[]).map(row=>'<tr><td><b>'+esc(row.display_name||"Без имени")+'</b><small>'+esc(row.principal_id||"")+'</small></td><td>'+esc(row.retired?"погашен":row.demo?"демо":Number(row.assurance)>=2?"подтверждён":(row.channels||[]).length?"привязан":"только браузер")+'<small>'+esc((row.channels||[]).join(" · "))+'</small></td><td>'+esc(ownerDate(row.created_at))+'</td><td>'+esc(ownerDate(row.last_seen_at))+'</td><td>'+ownerNumber(row.open_cases)+' / '+ownerNumber(row.cases)+'</td><td>'+ownerNumber(row.documents)+'</td><td>'+ownerNumber(row.credits_spent)+'</td><td>'+ownerNumber(row.credit_balance)+'</td></tr>');
    return '<form class="owner-user-search" data-owner-users><label>Имя или внутренний ID<input type="search" name="q" maxlength="100" value="'+attr(data.query||"")+'"></label><label>Сортировка<select name="sort"><option value="recent">Недавно были</option><option value="created">Новые</option><option value="cases">По делам</option><option value="credits">По расходу</option></select></label><button class="btn primary" type="submit">Найти</button></form><section class="owner-block"><div class="owner-block-head"><h2>Пользователи</h2><small>Найдено '+ownerNumber(data.total)+' · контакты и токены не выдаются</small></div>'+ownerTable(["Пользователь","Состояние","Создан","Был","Дела","Файлы","Потратил","Остаток"],rows)+'</section>';
  }
  function ownerBreakdown(title,rows){ return '<section class="owner-block"><div class="owner-block-head"><h2>'+esc(title)+'</h2></div>'+ownerTable(["Группа","Людей"],(rows||[]).map(row=>'<tr><td>'+esc(row.bucket||"не указано")+'</td><td>'+ownerNumber(row.n)+'</td></tr>'))+'</section>'; }
  function ownerAcquisition(data){ const acquisition=data.acquisition||{}; return '<div class="owner-grid">'+ownerBreakdown("По каналу привлечения",acquisition.by_source)+ownerBreakdown("По локали",acquisition.by_locale)+ownerBreakdown("По юрисдикции",acquisition.by_jurisdiction)+'</div>'; }
  function ownerSettingsPanel(settings){
    ownerRouteSettings=settings;
    return '<form class="owner-settings-v2" data-owner-settings><section class="owner-setting tone-0"><h2>Новые посетители</h2><p>Настоящий серверный рубильник: выключение закрывает создание новых аккаунтов.</p><label class="owner-check"><input type="checkbox" name="enabled" '+(settings.new_visitors_enabled?'checked':'')+'> Разрешить новому браузеру начать</label></section><section class="owner-setting tone-2"><h2>Публичное объявление</h2><p>Показывается всем на первом экране. Только обычный текст.</p><textarea name="notice" maxlength="500" rows="5">'+esc(settings.public_notice||"")+'</textarea></section><section class="owner-setting tone-3"><h2>Параметры кабинета</h2><div class="owner-setting-fields"><label>Окно метрик, часов<input name="hours" type="number" min="1" max="720" value="'+attr(settings.metrics_window_hours)+'" required></label><label>Обновление, секунд<input name="refresh" type="number" min="15" max="900" value="'+attr(settings.auto_refresh_seconds)+'" required></label><label>Людей на странице<input name="pageSize" type="number" min="10" max="100" value="'+attr(settings.user_page_size)+'" required></label></div></section><div class="owner-actions"><button class="btn primary" type="submit">Сохранить настройки</button><small>Версия '+ownerNumber(settings.version)+' · '+esc(ownerDate(settings.updated_at))+'</small></div></form>';
  }
  function ownerYandex360(data){
    const ready=!!data.configured,connected=!!data.connected,last=data.last_checked_at?ownerDate(data.last_checked_at):"ещё не проверялось";
    const missing=(data.missing||[]).map(value=>'<code>'+esc(value)+'</code>').join(" · ");
    if(!ready)return '<section class="owner-mail-hero tone-warn"><div><p class="eyebrow">ЯНДЕКС 360 · НАСТРОЙКА</p><h2>OAuth-приложение ещё не готово</h2><p>Нужны серверные параметры: '+(missing||"конфигурация OAuth")+'. Значения в браузер не передаются.</p></div></section>';
    if(!connected)return '<section class="owner-mail-hero"><div><p class="eyebrow">ТОЛЬКО ЧТЕНИЕ · IMAP</p><h2>Подключите почту @'+esc(data.allowed_domain||"agrigate.pro")+'</h2><p>Яндекс покажет точный список разрешений. ФиксАР получит чтение входящих писем, но не сможет отправлять или удалять их. Токен останется зашифрованным на сервере.</p><div class="owner-actions"><button class="btn primary" type="button" data-yandex360-connect>Войти через Яндекс OAuth</button></div></div><aside><b>Что произойдёт</b><ol><li>Вы выберете корпоративный аккаунт.</li><li>Яндекс попросит разрешение на чтение.</li><li>ФиксАР сразу проверит INBOX и вернёт вас сюда.</li></ol></aside></section>';
    return '<div class="owner-mail-grid"><section class="owner-mail-hero connected"><div><p class="eyebrow">ЯНДЕКС 360 · ПОДКЛЮЧЕНО</p><h2>'+esc(data.mailbox||"Корпоративная почта")+'</h2><p>Входящая почта доступна ФиксАРу в режиме только чтения. OAuth-токен не хранится в браузере и никогда не показывается в ответах API.</p><div class="owner-actions"><button class="btn primary" type="button" data-yandex360-test>Проверить сейчас</button><button class="btn" type="button" data-yandex360-reconnect>Сменить аккаунт</button><button class="btn danger" type="button" data-yandex360-disconnect>Отключить</button></div></div><aside><b>Последняя проверка</b><strong>'+esc(last)+'</strong><small>'+esc(data.last_error||"IMAP принимает OAuth-доступ")+'</small></aside></section><section class="owner-block owner-wide"><div class="owner-block-head"><h2>Границы доступа</h2><small>read-only IMAP</small></div><div class="owner-mail-boundaries"><article><b>Можно</b><p>увидеть папки и прочитать входящие письма выбранного ящика</p></article><article><b>Нельзя</b><p>отправлять письма, удалять сообщения или управлять организацией</p></article><article><b>Отзыв</b><p>кнопка отключения стирает локальные токены и просит Яндекс отозвать доступ</p></article></div></section></div>';
  }
  function ownerBackups(data){
    const rows=(data.backups||[]).map((row,index)=>{ const ok=row.исход==="успех",state=ok?"Проверен":row.исход==="идёт"?"Выполняется":row.исход==="ошибка"?"Ошибка":"Нет отметки"; return '<article class="owner-backup tone-'+(index%3)+'"><div><p class="eyebrow">'+esc(row.kind||"")+'</p><h2>'+esc(row.title||"Бэкап")+'</h2><span class="owner-backup-state '+(ok?'ok':'')+'">'+esc(state)+'</span></div><dl><div><dt>Последний ход</dt><dd>'+esc(ownerDate(row.когда))+'</dd></div><div><dt>Объект</dt><dd>'+esc(row.имя||"—")+'</dd></div><div><dt>Состав</dt><dd>'+esc(row.документов!==undefined?ownerNumber(row.документов)+" документов · "+ownerNumber(row.кусков||0)+" кусков":row.что||"зашифрованный архив")+'</dd></div><div><dt>Ключ</dt><dd>'+esc(row.key_available?"готов к экспорту":"не найден")+'</dd></div></dl>'+(row.почему?'<p class="owner-backup-error">'+esc(row.почему)+'</p>':'')+'</article>'; }).join("");
    return '<section class="owner-backup-hero"><div><p class="eyebrow">ЯНДЕКС OBJECT STORAGE · RU</p><h2>Три независимые зашифрованные копии</h2><p>Код, база людей и корпус 62 закрыты разными ключами. Корпус 62 считается готовым только после обратного скачивания и восстановления в отдельную базу.</p><div class="owner-actions"><button class="btn primary" type="button" data-owner-backup-keys '+(data.key_export_ready?'':'disabled')+'>Скачать recovery-ключи</button><button class="btn" type="button" data-owner-refresh>Обновить состояние</button></div><small>На iPhone сохраните ZIP в «Файлы» или защищённый менеджер паролей. Не храните его в той же корзине, что архивы.</small></div><aside><b>Хранение</b><strong>'+esc(data.storage||"Yandex Object Storage")+'</strong><span>'+ownerNumber(data.retention_days||28)+' суток</span></aside></section><div class="owner-backup-grid">'+rows+'</div>';
  }
  function ownerAudit(data){ const names={settings_read:"открыты настройки",settings_updated:"изменены настройки",metrics_read:"открыты метрики",users_read:"открыта таблица пользователей",backups_read:"открыты бэкапы",backup_keys_exported:"скачаны recovery-ключи",audit_read:"открыт журнал"}; const rows=(data.events||[]).map(row=>'<tr><td>'+esc(ownerDate(row.at))+'</td><td>'+esc(names[row.action]||row.action||"—")+'</td><td>'+esc(row.actor||"—")+'</td><td><small>'+esc(JSON.stringify(row.details||{}))+'</small></td></tr>'); return '<section class="owner-block"><div class="owner-block-head"><h2>Журнал доступа</h2><small>Без копий пользовательских данных</small></div>'+ownerTable(["Когда","Действие","Кто","Детали"],rows)+'</section>'; }
  function ownerBroadcast(data){
    const outlets=data.outlets||[],drafts=data.drafts||[],published=data.published||[];
    const draftCards=drafts.map(post=>'<article class="owner-draft"><div><b>'+esc(post.outlet_title||post.outlet_id||"Лента")+'</b><small>'+esc(ownerDate(post.created_at))+'</small></div>'+(post.rationale?'<p class="owner-draft-reason">'+esc(post.rationale)+'</p>':'')+'<p>'+esc(post.body||"")+'</p><div class="owner-actions"><button class="btn primary" type="button" data-owner-publish="'+attr(post.id)+'">Опубликовать</button><button class="btn" type="button" data-owner-reject="'+attr(post.id)+'">Отклонить</button></div></article>').join("");
    const options=outlets.filter(outlet=>!outlet.disabled_at).map(outlet=>'<option value="'+attr(outlet.id)+'">'+esc(outlet.title)+'</option>').join("");
    const outletRows=outlets.map(outlet=>'<tr><td>'+esc(outlet.title)+'</td><td>'+esc(outlet.platform)+'</td><td>'+esc(outlet.ключ_на_месте?"ключ на месте":"ключ не задан")+'</td><td>'+esc(outlet.disabled_at?"отключена":"работает")+'</td></tr>');
    const publishedRows=published.map(post=>'<tr><td>'+esc(ownerDate(post.published_at||post.created_at))+'</td><td>'+esc(post.outlet_title||"")+'</td><td>'+esc((post.body||"").slice(0,120))+'</td><td>'+(post.link?'<a href="'+attr(post.link)+'" target="_blank" rel="noopener">смотреть ↗</a>':esc(post.failure||"—"))+'</td></tr>');
    return '<div class="owner-grid"><section class="owner-block owner-wide"><div class="owner-block-head"><h2>Ждут решения</h2><small>'+ownerNumber(drafts.length)+'</small></div><div class="owner-drafts">'+(draftCards||ownerEmpty("Черновиков нет."))+'</div></section><section class="owner-block"><div class="owner-block-head"><h2>Новый черновик</h2></div><form class="owner-post-form" data-owner-post><label>Лента<select name="outlet" required>'+options+'</select></label><label>Текст<textarea name="body" rows="6" maxlength="4000" required></textarea></label><button class="btn primary" type="submit">Сохранить в черновики</button></form></section><section class="owner-block"><div class="owner-block-head"><h2>Ленты</h2><small>Ключи не раскрываются</small></div>'+ownerTable(["Лента","Площадка","Ключ","Состояние"],outletRows)+'</section><section class="owner-block owner-wide"><div class="owner-block-head"><h2>Опубликовано</h2></div>'+ownerTable(["Когда","Лента","Текст","Пост"],publishedRows)+'</section></div>';
  }
  async function ownerLoad(tab,options){
    if(tab==="overview"||tab==="acquisition"){ const settings=await authFetch("GET","/ops/owner/settings"); ownerRouteSettings=settings.settings; return authFetch("GET","/ops/owner/metrics?hours="+encodeURIComponent((settings.settings||{}).metrics_window_hours||24)); }
    if(tab==="users"){ const query=(options&&options.q)||"",sort=(options&&options.sort)||"recent"; const data=await authFetch("GET","/ops/owner/users?page=1&limit=50&sort="+encodeURIComponent(sort)+"&include_retired=false&q="+encodeURIComponent(query)); data.query=query; data.sort=sort; return data; }
    if(tab==="settings"){ const data=await authFetch("GET","/ops/owner/settings"); return data.settings||{}; }
    if(tab==="integrations")return authFetch("GET","/ops/owner/yandex360");
    if(tab==="backups")return authFetch("GET","/ops/owner/backups");
    if(tab==="audit")return authFetch("GET","/ops/owner/audit?limit=150");
    const [outlets,drafts,published]=await Promise.all([authFetch("GET","/ops/owner/broadcast/outlets?include_disabled=true"),authFetch("GET","/ops/owner/broadcast/posts?state=draft&limit=50"),authFetch("GET","/ops/owner/broadcast/posts?state=published&limit=30")]);
    return {outlets:outlets.outlets||[],drafts:drafts.posts||[],published:published.posts||[]};
  }
  function ownerBody(tab,data){ if(tab==="overview")return ownerOverview(data); if(tab==="users")return ownerUsers(data); if(tab==="acquisition")return ownerAcquisition(data); if(tab==="settings")return ownerSettingsPanel(data); if(tab==="integrations")return ownerYandex360(data); if(tab==="backups")return ownerBackups(data); if(tab==="broadcast")return ownerBroadcast(data); return ownerAudit(data); }
  async function renderOwnerRoute(requested,options){
    syncHomeChrome(null);
    const tab=ownerTool(requested)[0],token=++ownerRouteToken;
    currentSpace="Разработка"; rebuildNav(); closeNav(); vwrap.classList.remove("dialog-view");
    vwrap.innerHTML=ownerShell(tab,'<div class="owner-loading">'+skelCard(5)+'</div>',"Проверяю доступ и читаю данные…"); vwrap.parentElement.scrollTop=0;
    if(!authState.ready){ setTimeout(()=>{ if(token===ownerRouteToken)renderOwnerRoute(tab,options); },120); return; }
    await probeOwnerTools(); if(token!==ownerRouteToken)return;
    if(!ownerTools.allowed){ const message=authState.token?"Сервер не подтвердил доступ владельца.":"Войдите в аккаунт владельца, чтобы открыть кабинет."; const action=authState.token?"":'<button class="btn primary" type="button" data-owner-signin>Войти</button>'; vwrap.innerHTML=ownerShell(tab,'<div class="owner-empty"><span>✳</span><p>'+esc(message)+'</p>'+action+'</div>',"Закрытый раздел"); const button=vwrap.querySelector("[data-owner-signin]"); if(button)button.onclick=openAccount; return; }
    try{ const data=await ownerLoad(tab,options); if(token!==ownerRouteToken)return; vwrap.innerHTML=ownerShell(tab,ownerBody(tab,data)); bindOwnerRoute(tab,data); }
    catch(error){ if(token!==ownerRouteToken)return; vwrap.innerHTML=ownerShell(tab,'<div class="owner-empty"><span>!</span><p>'+esc((error&&error.message)||"Данные кабинета не загрузились.")+'</p><button class="btn" type="button" data-owner-refresh>Повторить</button></div>',"Не удалось прочитать раздел"); bindOwnerRoute(tab,{}); }
  }
  async function ownerFingerprint(post){ try{ const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(post.body||"")); return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join(""); }catch(_){ return post.body_sha256||""; } }
  function bindOwnerRoute(tab,data){
    const refresh=vwrap.querySelector("[data-owner-refresh]"); if(refresh)refresh.onclick=()=>renderOwnerRoute(tab);
    const users=vwrap.querySelector("[data-owner-users]"); if(users){ users.elements.sort.value=data.sort||"recent"; users.onsubmit=event=>{ event.preventDefault(); renderOwnerRoute("users",{q:users.elements.q.value.trim(),sort:users.elements.sort.value}); }; }
    const settings=vwrap.querySelector("[data-owner-settings]"); if(settings)settings.onsubmit=async event=>{ event.preventDefault(); const fields=settings.elements,button=settings.querySelector("button[type=submit]"),enabled=fields.enabled.checked; if(ownerRouteSettings&&ownerRouteSettings.new_visitors_enabled&&!enabled&&!confirm("Закрыть вход новым посетителям? Уже вошедшие продолжат работать.")){ fields.enabled.checked=true; return; } button.disabled=true; try{ const response=await authFetch("PUT","/ops/owner/settings",{expected_version:ownerRouteSettings.version,new_visitors_enabled:enabled,public_notice:fields.notice.value,metrics_window_hours:Number(fields.hours.value),auto_refresh_seconds:Number(fields.refresh.value),user_page_size:Number(fields.pageSize.value),confirmation:enabled?"":"close-new-visitors"}); ownerRouteSettings=response.settings; toast("Настройки сохранены и записаны в аудит."); renderOwnerRoute("settings"); }catch(error){ button.disabled=false; toast((error&&error.message)||"Настройки не сохранены."); } };
    const connectYandex=async button=>{ button.disabled=true; try{ const response=await authFetch("POST","/ops/owner/yandex360/start",{}); put(OWNER_YANDEX360_STATE,response.state); location.href=response.authorize_url; }catch(error){ button.disabled=false; toast((error&&error.message)||"Подключение Яндекс 360 не началось."); } };
    const yandexConnect=vwrap.querySelector("[data-yandex360-connect]"); if(yandexConnect)yandexConnect.onclick=()=>connectYandex(yandexConnect);
    const yandexReconnect=vwrap.querySelector("[data-yandex360-reconnect]"); if(yandexReconnect)yandexReconnect.onclick=()=>connectYandex(yandexReconnect);
    const yandexTest=vwrap.querySelector("[data-yandex360-test]"); if(yandexTest)yandexTest.onclick=async()=>{ yandexTest.disabled=true; try{ await authFetch("POST","/ops/owner/yandex360/test",{}); toast("Яндекс 360 отвечает: INBOX доступен."); renderOwnerRoute("integrations"); }catch(error){ yandexTest.disabled=false; toast((error&&error.message)||"Почта не прошла проверку."); } };
    const yandexDisconnect=vwrap.querySelector("[data-yandex360-disconnect]"); if(yandexDisconnect)yandexDisconnect.onclick=async()=>{ if(!confirm("Отключить Яндекс 360? ФиксАР перестанет получать входящие письма."))return; yandexDisconnect.disabled=true; try{ await authFetch("POST","/ops/owner/yandex360/disconnect",{confirmation:"disconnect-yandex360"}); drop(OWNER_YANDEX360_STATE); toast("Яндекс 360 отключён, локальные токены удалены."); renderOwnerRoute("integrations"); }catch(error){ yandexDisconnect.disabled=false; toast((error&&error.message)||"Не удалось отключить почту."); } };
    const backupKeys=vwrap.querySelector("[data-owner-backup-keys]"); if(backupKeys)backupKeys.onclick=async()=>{ if(!confirm("Скачать три recovery-ключа? Любой, кто получит ZIP, сможет расшифровать соответствующие архивы."))return; backupKeys.disabled=true; try{ await authDownload("/ops/owner/backups/keys/export","fixar-recovery-keys.zip",{confirmation:"download-recovery-keys"}); toast("Recovery-ключи скачаны. Сохраните ZIP отдельно от архивов."); }catch(error){ toast((error&&error.message)||"Ключи не скачались."); }finally{ backupKeys.disabled=false; } };
    const postForm=vwrap.querySelector("[data-owner-post]"); if(postForm)postForm.onsubmit=async event=>{ event.preventDefault(); const fields=postForm.elements,button=postForm.querySelector("button"); button.disabled=true; try{ await authFetch("POST","/ops/owner/broadcast/posts",{outlet_id:fields.outlet.value,body:fields.body.value.trim()}); renderOwnerRoute("broadcast"); }catch(error){ button.disabled=false; toast((error&&error.message)||"Черновик не сохранён."); } };
    vwrap.querySelectorAll("[data-owner-publish]").forEach(button=>button.onclick=async()=>{ const post=(data.drafts||[]).find(item=>String(item.id)===button.dataset.ownerPublish); if(!post||!confirm("Пост уйдёт в сообщество и будет виден всем. Опубликовать?"))return; button.disabled=true; try{ await authFetch("POST","/ops/owner/broadcast/posts/"+encodeURIComponent(post.id)+"/publish",{expected_body_sha256:await ownerFingerprint(post)}); renderOwnerRoute("broadcast"); }catch(error){ button.disabled=false; toast((error&&error.message)||"Пост не опубликован."); } });
    vwrap.querySelectorAll("[data-owner-reject]").forEach(button=>button.onclick=async()=>{ const note=prompt("Почему не публикуем? Это увидит ведущий.",""); if(note===null)return; button.disabled=true; try{ await authFetch("POST","/ops/owner/broadcast/posts/"+encodeURIComponent(button.dataset.ownerReject)+"/reject",{note}); renderOwnerRoute("broadcast"); }catch(error){ button.disabled=false; toast((error&&error.message)||"Черновик не отклонён."); } });
  }

  function isListNode(node){ return node.children.length>=3 && node.children.some(c=>/^Все |^Активные$|Завершённые|Черновики|Опубликованные|^Новые$|^Мои /.test(c.name)); }
  function statusNorm(s){ if(/заверш|закрыт|опубликов/i.test(s)) return "Завершено"; if(/^нов|обращ|черновик|иде[яю]/i.test(s)) return "Новое"; if(/ждёт|ожида|подпис|наблюд|взросл|модерац|тестиров/i.test(s)) return "Ожидает человека"; return "В работе"; }
  const LIST_FILTERS = [
    {n:"Все",en:"All",f:()=>true},
    {n:"Мои",en:"Mine",f:item=>item.mine},
    {n:"Требуют меня",en:"Need me",f:item=>item.needsMe},
    {n:"Агенты работают",en:"Agents working",f:item=>item.agentWorking},
    {n:"Завершённые",en:"Completed",f:item=>item.completed}
  ];
  function caseListStatus(c){
    if(c.state==="closed"||c.state==="archived")return "Завершено";
    if(c.needs_word)return "Требует вас";
    if(c.active_run_id)return "Агент работает";
    return "Активно";
  }
  function caseListStatusLabel(status){
    if(status==="Завершено")return uiText("Завершено","Completed");
    if(status==="Требует вас")return uiText("Требует вас","Needs you");
    if(status==="Агент работает")return uiText("Агент работает","Agent working");
    return uiText("Активно","Active");
  }
  function caseListAssistant(c){
    if(!c.selected_agent_id)return "";
    if(isDomashkinCase(c)||/domashkin/i.test(c.selected_agent_id))return uiText("Домашкин","Domashkin");
    const practice=PRACTICE.items.find(item=>item.domain===c.domain&&item.agent===c.selected_agent_id);
    return practice?practiceTitle(practice):"FixAR";
  }
  function caseListItem(c){
    const status=caseListStatus(c),participants=(c.participants||[]).length;
    return {title:c.title||uiText("Без названия","Untitled"),summary:c.goal||uiText("Откройте дело, чтобы продолжить с ближайшего шага.","Open the case to continue with the next step."),status,meta:(participants?participants+" "+uiText("уч.","people")+" · ":"")+uiText("обновлено ","updated ")+fmtWhen(c.updated_at),id:c.id,real:true,mine:c.owner_id===authState.principal,needsMe:!!c.needs_word,agentWorking:!!c.active_run_id&&!c.needs_word,completed:c.state==="closed"||c.state==="archived",assistant:caseListAssistant(c)};
  }
  function listItemsFor(node){
    if(realMode()) return realCasesForSpace(currentSpace).map(caseListItem);
    return [];
  }
  function listEmptyState(node,items){
    const create='<button class="btn primary" data-act="create-case">'+uiText("Создать дело","Create case")+'</button>';
    if(!hasSession())return '<section class="my-cases-empty"><span aria-hidden="true">○</span><h2>'+uiText("Здесь появятся ваши дела","Your cases will appear here")+'</h2><p>'+uiText("Войдите или создайте первое настоящее дело. Демонстрационные записи не подставляются.","Sign in or create your first real case. Demo records are never substituted.")+'</p><div class="cta-row">'+create+'<button class="btn" data-my-day-account>'+uiText("Войти","Sign in")+'</button></div></section>';
    if(!items.length)return '<section class="my-cases-empty"><span aria-hidden="true">○</span><h2>'+uiText("Пока спокойно","All quiet for now")+'</h2><p>'+uiText("В этом пространстве ещё нет дел. Начните с результата, который хотите получить.","There are no cases in this space yet. Start with the outcome you want.")+'</p>'+create+'</section>';
    return "";
  }
  function listRowsHtml(node){
    const cur = LIST_FILTERS.find(x=>x.n===listFilter) || LIST_FILTERS[0];
    const items = listItemsFor(node);
    const empty=listEmptyState(node,items); if(empty)return empty;
    const shown = items.filter(cur.f);
    if(!shown.length)return '<section class="my-cases-empty compact"><span aria-hidden="true">○</span><h2>'+uiText("В этом фильтре спокойно","Nothing needs attention here")+'</h2><p>'+uiText("Выберите другой взгляд или создайте новое дело.","Choose another view or create a new case.")+'</p><button class="btn" data-act="reset-filter" data-node="'+node.id+'">'+uiText("Показать все","Show all")+'</button></section>';
    if(caseViewMode==="notes")return shown.map((it,index)=>{
      const tone=it.needsMe?"need":(it.agentWorking?"agent":(it.completed?"done":"active"));
      return '<button class="my-case-note note-'+tone+'" data-open="1" data-real="1" data-id="'+attr(it.id)+'" data-title="'+attr(it.title)+'" data-status="'+attr(it.status)+'"><span class="my-case-note-head"><span class="my-case-note-index" aria-hidden="true">'+String(index+1).padStart(2,"0")+'</span><span class="my-case-status status-'+tone+'">'+caseListStatusLabel(it.status)+'</span></span><span class="my-case-note-copy"><h3>'+esc(it.title)+'</h3><p>'+esc(it.summary||"")+'</p></span><span class="my-case-note-foot"><span>'+esc(it.assistant||uiText("Без помощника","No assistant"))+'</span><span>'+uiText("Открыть","Open")+' →</span></span></button>';
    }).join("");
    return shown.map((it,index)=>'<button class="my-case-row" data-open="1" data-real="1" data-id="'+attr(it.id)+'" data-title="'+attr(it.title)+'" data-status="'+attr(it.status)+'"><span class="my-case-index" aria-hidden="true">'+String(index+1).padStart(2,"0")+'</span><span class="my-case-copy"><h3>'+esc(it.title)+'</h3><p>'+esc(it.meta||"")+(it.assistant?' · '+uiText("помощник ","assistant ")+esc(it.assistant):"")+'</p></span><span class="my-case-status status-'+(it.needsMe?'need':(it.agentWorking?'agent':(it.completed?'done':'active')))+'">'+caseListStatusLabel(it.status)+'</span><span class="my-case-open">'+uiText("Открыть","Open")+' →</span></button>').join("");
  }
  function applyFilter(nodeId,name){
    listFilter=name; try{ history.replaceState(null,"","#"+nodeId+"~"+encodeURIComponent(name)); }catch(e){}
    const node=byId[nodeId]; const bar=vwrap.querySelector('.filter-bar');
    if(!bar){ render(node); return; }
    bar.querySelectorAll('.tab').forEach(t=>{ const active=t.dataset.filter===name; t.classList.toggle('active',active); t.setAttribute('aria-pressed',String(active)); });
    const lst=vwrap.querySelector('#lst'); if(lst){ lst.innerHTML=listRowsHtml(node); bindListRows(); }
  }
  window.applyFilter = applyFilter;
  function setCaseView(nodeId,mode){
    caseViewMode=mode==="notes"?"notes":"list"; put(CASE_VIEW_KEY,caseViewMode);
    vwrap.querySelectorAll("[data-case-view]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.caseView===caseViewMode)));
    const node=byId[nodeId],list=vwrap.querySelector("#lst");
    if(list&&node){ list.className="my-cases-list view-"+caseViewMode; list.innerHTML=listRowsHtml(node); bindListRows(); }
  }
  function bindListRows(){
    vwrap.querySelectorAll('.my-case-row[data-open],.my-case-note[data-open],.lrow[data-open]').forEach(r=>r.onclick=()=>{ if(r.dataset.real){ realTab=defaultRealTab(); location.hash="#case/"+r.dataset.id; } else openCaseRow(r.dataset.title,r.dataset.status,r.dataset.seed); });
    const rf=vwrap.querySelector('[data-act="reset-filter"]'); if(rf) rf.onclick=()=>applyFilter(rf.dataset.node,"Все");
  }
  function renderList(node){
    const items = listItemsFor(node);
    const cur = LIST_FILTERS.find(x=>x.n===listFilter) || LIST_FILTERS[0];
    // Фильтр, который ничего не меняет (пусто или совпадает со «Всеми»), не показываем.
    const chips = LIST_FILTERS.map(x=>{ const cnt=items.filter(x.f).length,active=x.n===cur.n; if(!active&&x.n!=="Все"&&(cnt===0||cnt===items.length))return ""; return '<button class="tab'+(active?" active":"")+'" type="button" aria-pressed="'+active+'" data-filter="'+attr(x.n)+'" data-node="'+node.id+'">'+uiText(x.n,x.en)+'<span class="tcount">'+cnt+'</span></button>'; }).join("");
    const create='<button class="btn primary create-btn" data-act="create-case">'+uiText("Создать дело","Create case")+'</button>';
    const view='<div class="case-view-toggle" role="group" aria-label="'+uiText("Вид дел","Case view")+'"><button type="button" data-case-view="list" data-node="'+node.id+'" aria-pressed="'+(caseViewMode==="list")+'"><span aria-hidden="true">≡</span>'+uiText("Список","List")+'</button><button type="button" data-case-view="notes" data-node="'+node.id+'" aria-pressed="'+(caseViewMode==="notes")+'"><span aria-hidden="true">▦</span>'+uiText("Стикеры","Sticky notes")+'</button></div>';
    return '<main class="my-cases"><div class="crumbs">'+crumbHtml(node)+'</div><header class="my-cases-heading"><div><p class="eyebrow">'+esc(currentSpace)+' · '+uiText("ВАШИ ДЕЛА","YOUR CASES")+'</p><h1>'+uiText("Смотрите, что движется дальше.","See what moves forward next.")+'</h1><p>'+uiText("Ваш ответ — первым. Работа помощников — рядом. Завершённое не мешает.","Your input comes first. Assistant work stays visible. Completed cases stay out of the way.")+'</p></div></header><div class="lbar sticky"><div class="tabs filter-bar">'+chips+'</div><div class="case-list-actions">'+view+create+'</div></div><div class="my-cases-list view-'+caseViewMode+'" id="lst">'+listRowsHtml(node)+'</div></main>';
  }

  function screenResearchProjects(node){
    const cases=realCasesForSpace("Проекты и исследования");
    const parents=cases.filter(isProjectParent),grouped=new Set(parents.map(c=>c.id));
    const link=(c,label)=>'<a class="research-project-link" href="#case/'+attr(c.id)+'"><span>'+esc(label||c.title)+'</span><span aria-hidden="true">↗</span></a>';
    const cards=parents.map(parent=>{
      let children=projectChildren(parent,cases);
      // Existing projects already have known branches; show them immediately
      // while the event-backed links are loading from case-service.
      if(!children.length&&parent.id===FIXAR_PROJECT_CASE_ID)children=[HARNESS_ROUTER_CASE_ID].map(id=>cases.find(c=>c.id===id)).filter(Boolean);
      if(!children.length&&parent.id===SBERINDEX_PROJECT_CASE_ID)children=SBERINDEX_CHILD_CASE_IDS.map(id=>cases.find(c=>c.id===id)).filter(Boolean);
      children.forEach(child=>grouped.add(child.id));
      const research=parent.project_kind==="research"||parent.id===SBERINDEX_PROJECT_CASE_ID;
      const action=parent.owner_id===authState.principal?'<button class="btn primary" type="button" data-act="new-project-branch" data-project-id="'+attr(parent.id)+'">'+uiText("Новая ветка","New branch")+'</button>':'';
      return '<article class="research-project-card'+(parent.id===FIXAR_PROJECT_CASE_ID?' research-project-featured':'')+'"><p class="eyebrow">'+(research?uiText("ИССЛЕДОВАНИЕ","RESEARCH"):uiText("ПРОЕКТ","PROJECT"))+'</p><h2>'+esc(parent.title)+'</h2><p>'+esc(parent.goal||uiText("Соберите связанные направления в одном месте.","Keep related streams in one place."))+'</p><div class="research-project-branches">'+children.map(c=>link(c)).join("")+'</div><div class="cta-row">'+link(parent,uiText("Открыть проект","Open project"))+action+'</div></article>';
    }).join("");
    const other=cases.filter(c=>!grouped.has(c.id));
    const research=other.length?'<article class="research-project-card"><p class="eyebrow">'+uiText("ИССЛЕДОВАНИЯ","RESEARCH")+'</p><h2>'+uiText("Активные исследования","Active research")+'</h2><p>'+uiText("Каждое направление открывается как отдельное дело с материалами и ходом работы.","Each area opens as its own case with materials and progress.")+'</p><div class="research-project-branches">'+other.map(c=>link(c)).join("")+'</div></article>':'';
    const empty=!hasSession()?'<section class="research-project-card research-project-empty"><h2>'+uiText("Ваши проекты ждут входа","Sign in to see your projects")+'</h2><p>'+uiText("Войдите, чтобы увидеть только доступные вам проекты и исследования.","Sign in to see only your projects and research.")+'</p><button class="btn primary" type="button" data-my-day-account>'+uiText("Войти","Sign in")+'</button></section>':(!cases.length?'<section class="research-project-card research-project-empty"><h2>'+uiText("Проектов пока нет","No projects yet")+'</h2><p>'+uiText("Здесь появятся ваши проекты и исследования, когда вы начнёте работу.","Your projects and research will appear here when you start.")+'</p></section>':'');
    return '<main class="research-projects">'+crumbsBlock(node)+'<header class="research-projects-heading"><p class="eyebrow">'+uiText("РАБОЧЕЕ ПРОСТРАНСТВО","WORKSPACE")+'</p><h1>'+uiText("Проекты и исследования","Projects and research")+'</h1><p>'+uiText("Замысел, шаги, материалы и результат — в одном месте.","Ideas, steps, materials, and outcomes in one place.")+'</p>'+(hasSession()?'<button class="btn primary" type="button" data-act="create-project">'+uiText("Создать проект / исследование","Create project / research")+'</button>':'')+'</header><div class="research-project-grid">'+cards+research+empty+'</div></main>';
  }

  // --- Богатые экраны (нативные button/<a>, фокус, без эмодзи-иконок) ---
  const crumbsBlock = node => '<div class="crumbs">'+crumbHtml(node)+'</div>';
  function findNode(name){ let f=null; (function w(n){ if(f)return; if(n.name===name)f=n; n.children.forEach(w); })(ROOT); return f; }
  const PACK_NODE = findNode("Страница пака") || ROOT;
  const kidId = (node,name)=>{ const k=node.children.find(c=>c.name===name); return k?k.id:node.id; };
  const sibId = (node,name)=>{ const s=(node.parent?node.parent.children:[]).find(c=>c.name===name); return s?s.id:node.id; };

  // Заглушек паков больше нет: карточки строятся из /packs (18 направлений
  // площадки), кнопка ведёт на страницу пака с его id. Старый массив PACKS
  // и packCard удалены 22.09.2026 — они показывали выдуманные «Семейные дела»
  // и вели на страницу без pack в адресе, которая молча открывала software.
  function packCard(p){
    const id = p.id || p.n, title = p.title || p.n, desc = p.description || p.d || "";
    return '<button class="pcard" data-pack-open="'+attr(id)+'">'+
    '<div style="display:flex;gap:10px;align-items:center"><span class="pico">'+esc((title||"П")[0].toUpperCase())+'</span><span class="chip">пак</span></div>'+
    '<h3>'+esc(title)+'</h3><p>'+esc(desc.slice(0,100))+'</p>'+
    '<span class="popen">Открыть пак →</span></button>'; }

  function screenLanding(node){
    const feat = node.children.filter(k=>/возможности|как работают|безопасность/i.test(k.name));
    const FD = {
      "Как работают долгоживущие агенты":"Агент помнит контекст дела неделями: следит за изменениями, готовит документы и напоминает — без повторных объяснений.",
      "Возможности для жизни":"Личное и семья: документы, здоровье, авто, школа, дом. Сроки под контролем, платежи и напоминания вовремя.",
      "Возможности для работы":"Практика и разработка: обращения, клиенты, дела, публикация паков — рабочий поток вместе с агентами.",
      "Безопасность и границы агентов":"Каждое действие — по вашему разрешению и в чётких границах. Данные детей и персональные данные под особой защитой."
    };
    const flow = [
      ["Пришло изменение","Школа прислала новое расписание — ФиксАР это заметил"],
      ["Создалось дело","Агент завёл дело и предложил план: подтвердить, напомнить ребёнку"],
      ["Напомнил вовремя","За день до контрольной — тихое напоминание вам и ребёнку"],
      ["Готов результат","Домашка собрана, расписание в календаре — вы только подтвердили"]
    ];
    return crumbsBlock(node)+
      '<div class="hero"><p class="eyebrow" style="color:var(--cyan)">Дела с ИИ-помощниками</p>'+
      '<h1>Меньше рутины. Больше контроля.</h1>'+
      '<p class="lead">ФиксАР собирает личные, семейные и рабочие дела в одном месте. Агенты следят за изменениями и готовят следующий шаг — вы решаете, что выполнить.</p>'+
      '<div class="cta-row"><button class="btn primary" onclick="go(\''+kidId(node,"Начать работу")+'\')">Начать работу</button>'+
      '<button class="btn" onclick="go(\''+sibId(node,"Каталог решений")+'\')">Каталог решений</button></div></div>'+
      '<div class="section-t">Один понятный путь</div>'+
      '<div class="flow">'+flow.map((s,i)=>'<div class="flow-step"><span class="flow-n">'+(i+1)+'</span><div><b>'+esc(s[0])+'</b><p>'+esc(s[1])+'</p></div>'+(i<flow.length-1?'<span class="flow-arrow" aria-hidden="true">→</span>':'')+'</div>').join('')+'</div>'+
      '<div class="section-t">Для жизни и работы</div><div class="feat">'+
      feat.map(f=>'<article class="card" onclick="go(\''+f.id+'\')"><div class="ch"><h2 style="font-size:16px">'+esc(f.name)+'</h2></div>'+
        '<div class="cb">'+esc(FD[f.name]||"Открыть подробности.")+'</div></article>').join('')+'</div>'+
      '<div class="section-t">Готовые помощники</div><div class="pgrid" id="landing-packs"><div class="skel-card" style="height:120px"></div><div class="skel-card" style="height:120px"></div><div class="skel-card" style="height:120px"></div><div class="skel-card" style="height:120px"></div></div>'+
      '<div class="section-t">Школа без вечерней суеты</div>'+myDayBanner()+
      '<div class="section-t">Начните с одного дела</div><div class="stub"><span class="tag">Без сложной настройки</span><p>Опишите результат своими словами. ФиксАР предложит структуру дела, сроки и подходящего помощника.</p>'+
      '<div class="cta-row"><button class="btn primary" onclick="go(\''+kidId(node,"Начать работу")+'\')">Начать работу</button></div></div>';
  }

  function screenCatalog(node){
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Каталог решений</p><h1>Каталог решений</h1><p>Все паки реестра. Нажмите на карточку, чтобы увидеть сценарии, сущности и документы.</p></div>'+
      '<div class="pgrid" id="pgrid"><div class="skel-card" style="height:120px"></div><div class="skel-card" style="height:120px"></div><div class="skel-card" style="height:120px"></div></div>';
  }

  function screenPack(node){
    return crumbsBlock(node)+
      '<div class="pack-head"><span class="big" id="pack-initial">…</span><div style="flex:1;min-width:220px">'+
      '<p class="eyebrow">Пак · <span id="pack-version-eyebrow">каталог</span></p><h1 style="font-size:30px;margin:2px 0 6px" id="pack-title">Загружаем пак…</h1>'+
      '<div class="pmeta" id="pack-meta"><span>Загрузка из реестра…</span></div></div>'+
      '<button class="btn primary" style="align-self:center" data-act="create-case" id="pack-cta">Создать дело по паку</button></div>'+
      '<div id="pack-body"><div class="skel-card" style="height:200px"></div></div>';
  }
  window.FixarPackPage = { current:null };
  async function loadPackPage(){
    const title=document.getElementById("pack-title"); if(!title) return;
    const urlPack=new URLSearchParams(location.hash.split("?")[1]||"").get("pack");
    try{
      const r=await HTTP.fetchApi("/packs",{headers:{"Content-Type":"application/json"}});
      const txt=await r.text(); let data=null; try{data=txt?JSON.parse(txt):null;}catch(e){}
      if(!r.ok) throw new Error("реестр недоступен ("+r.status+")");
      const packs=(data&&data.packs)||[];
      if(!packs.length) throw new Error("Реестр паков пуст");
      let p=urlPack?packs.find(x=>x.id===urlPack):null;
      if(urlPack && !p) throw new Error("Пака «"+urlPack+"» нет в реестре — возможно, он ещё на разборе. Опубликованные паки: "+packs.map(x=>x.id).join(", "));
      if(!p) p=packs.find(x=>x.id==="software")||packs[0];
      window.FixarPackPage.current=p;
      title.textContent=p.title||p.id;
      const init=document.getElementById("pack-initial"); if(init) init.textContent=(p.title||"П")[0].toUpperCase();
      const eyebrow=document.getElementById("pack-version-eyebrow"); if(eyebrow) eyebrow.textContent="v"+(p.version||1)+" · "+esc(p.id);
      const meta=document.getElementById("pack-meta");
      if(meta) meta.innerHTML='<span>'+esc(p.id)+'</span><span>v'+esc(String(p.version||1))+'</span><span>'+esc(String((p.deal_kinds||[]).length))+' тип(ов) дел</span>';
      document.getElementById("pack-body").innerHTML=packBodyHtml(p,packs);
    }catch(err){
      document.getElementById("pack-body").innerHTML='<div class="stub"><span class="tag">Ошибка</span><p>'+esc((err&&err.message)||"Не удалось загрузить пак")+'</p></div>';
    }
  }
  function packBodyHtml(p,allPacks){
    const desc=esc(p.description||"Описание пока не заполнено.");
    const deals=(p.deal_kinds||[]).map(k=>'<div class="perm"><span class="dot"></span><b>'+esc(k.title||k.kind)+'</b><span>'+esc((k.stages||[]).join(" → ")||"этапы уточняются")+'</span></div>').join("")||'<p class="rc-hint">Типы дел пока не заданы.</p>';
    const entities=(p.entity_types||[]).map(e=>'<span class="tab">'+esc(e.title||e.type)+'</span>').join("");
    const docs=(p.document_kinds||[]).map(d=>'<div class="perm"><span class="dot"></span><b>'+esc(d)+'</b></div>').join("")||'<p class="rc-hint">Документы не перечислены.</p>';
    const tmpls=(p.case_templates||[]).map(t=>'<div class="perm"><span class="dot"></span><b>'+esc(t.title||t.id)+'</b><span>'+esc(t.id)+'</span></div>').join("")||'';
    let b='<div class="section-t">Что это</div><p style="max-width:72ch">'+desc+'</p>';
    b+='<div class="section-t">Сценарии ('+(p.deal_kinds||[]).length+')</div><div>'+deals+'</div>';
    if(entities) b+='<div class="section-t">Сущности</div><div class="tabs">'+entities+'</div>';
    if(docs) b+='<div class="section-t">Документы</div><div>'+docs+'</div>';
    if(tmpls) b+='<div class="section-t">Шаблоны дел</div><div>'+tmpls+'</div>';
    if(p.id==="software") b+=softwareTutorialHtml();
    const others=(allPacks||[]).filter(x=>x.id!==p.id).slice(0,6);
    if(others.length) b+='<div class="section-t">Другие паки</div><div class="pgrid">'+others.map(x=>'<button class="pcard" data-pack-open="'+attr(x.id)+'"><div style="display:flex;gap:10px;align-items:center"><span class="pico">'+esc(((x.title||"П")[0]).toUpperCase())+'</span><span class="chip">v'+esc(String(x.version||1))+'</span></div><h3>'+esc(x.title||x.id)+'</h3><p>'+esc((x.description||"").slice(0,100))+'</p><span class="popen">Открыть →</span></button>').join("")+'</div>';
    return b;
  }
  function softwareTutorialHtml(){
    return '<div class="section-t">Обучающий пак для разработчиков</div>'+
    '<div class="settings-card"><p class="eyebrow">КАК СОБРАН ЭТОТ ПАК</p><h3>Разработка ПО — пример живого пака</h3>'+
    '<p>Этот пак описан одним YAML-файлом <b>packs/software.yaml</b>: id, title, description, сущности (product, stand, release), типы дел (work_scope, support) с этапами, документы и шаблоны дел. Реестр читает YAML через <b>GET /packs</b>, а эта страница рисует его без единой строчки захардкоженного текста.</p>'+
    '<p><b>Чтобы собрать свой пак:</b> 1) скопируйте software.yaml под новым id; 2) опишите свои сущности и этапы; 3) положите в packs/ и выполните <b>POST /packs/reload</b>; 4) ваш пак появится в каталоге и здесь — с сценариями, сущностями и документами.</p>'+
    '<div class="cta-row"><a class="btn" href="https://github.com/lech2000/fixar-packs" target="_blank" rel="noopener">Формат пака на GitHub</a></div></div>';
  }
  document.addEventListener("click",e=>{ const b=e.target.closest("[data-pack-open]"); if(b){ location.hash="#"+PACK_NODE.id+"?pack="+encodeURIComponent(b.dataset.packOpen); } });

  const CHANNEL_INFO = {
    tg:{title:"Telegram",icon:"TG",note:"Фиксарик видит сообщения своему боту и явно пересланные ему сообщения. Личные чаты без бота недоступны."},
    max:{title:"MAX",icon:"M",note:"Фиксарик работает в своём диалоге с ботом. Другие диалоги MAX он не читает."},
    vk_bot:{title:"ВКонтакте",icon:"VK",note:"Подключается переписка с сообществом Фиксарика, а не личные диалоги VK ID."}
  };
  function screenAppearanceSettings(node){
    const appearance=readAppearance(),fixarik=node.children.find(child=>child.name==="Фиксарик"),legal=findNode("Юридические документы");
    const language=(window.FixarV2I18n&&window.FixarV2I18n.code)||"ru";
    const modes=[["system","Как на устройстве"],["light","Светлая"],["dark","Тёмная"]];
    const palettes=[["fixar","FixAR",275,270],["calm","Спокойная",215,220],["family","Семья",153,35],["practice","Практика",305,300]];
    return crumbsBlock(node)+'<div class="appearance">'+
      '<div class="vhead"><p class="eyebrow">Ваш интерфейс</p><h1>Оформление под вас</h1><p>Выберите свет, характер и оттенок. Изменения видны сразу и сохраняются только на этом устройстве.</p></div>'+
      '<section class="theme-preview" aria-label="Предпросмотр оформления"><p class="eyebrow">ФиксАР рядом</p><h2>Важное видно. Лишнее не мешает.</h2><p>Короткие заголовки, спокойный ритм и один понятный следующий шаг на каждом экране.</p><div class="cta-row"><span class="btn primary">Главное действие</span><span class="btn">Второй шаг</span></div></section>'+
      '<section class="settings-card appearance-mood-card" aria-labelledby="appearance-mood-title"><div class="appearance-mood-visual" aria-hidden="true"><span></span><i></i></div><div><p class="eyebrow">ЛИЧНОЕ НАСТРОЕНИЕ</p><h2 id="appearance-mood-title">Поймайте сочетание света</h2><p>Фиксар подберёт фиолетовый контекст и оттенок глубины. Тёплый сигнал действия, контраст текста и важные статусы останутся неизменными.</p><button class="btn appearance-mood-catch" type="button" data-catch-appearance-mood><span aria-hidden="true">✦</span> Поймать настроение</button></div></section>'+
      '<section class="settings-card"><div class="appearance-group"><div class="appearance-label">Язык</div><div class="choice-row" data-language-choices><button class="choice'+(language==='ru'?' active':'')+'" type="button" data-language="ru" aria-pressed="'+(language==='ru')+'">Русский</button><button class="choice'+(language==='en'?' active':'')+'" type="button" data-language="en" aria-pressed="'+(language==='en')+'">English</button></div></div>'+
      '<div class="appearance-group" style="margin-top:20px"><div class="appearance-label">Свет</div><div class="choice-row" data-theme-choices>'+modes.map(item=>'<button class="choice'+(appearance.mode===item[0]?' active':'')+'" type="button" data-theme-mode="'+item[0]+'" aria-pressed="'+(appearance.mode===item[0])+'">'+item[1]+'</button>').join("")+'</div></div>'+
      '<div class="appearance-group" style="margin-top:20px"><div class="appearance-label">Палитра</div><div class="choice-row" data-palette-choices>'+palettes.map(item=>'<button class="choice palette-choice'+(appearance.preset===item[0]?' active':'')+'" type="button" data-palette="'+item[0]+'" data-hue="'+item[2]+'" data-background-hue="'+item[3]+'" aria-pressed="'+(appearance.preset===item[0])+'"><span class="palette-dot" style="--swatch:'+item[2]+'"></span>'+item[1]+'</button>').join("")+'</div></div>'+
      '<div class="appearance-group" style="margin-top:20px"><label class="appearance-label" for="accent-hue">Точный оттенок</label><div class="hue-control"><input id="accent-hue" type="range" min="0" max="359" step="1" value="'+appearance.hue+'" aria-describedby="hue-help"><output class="hue-value" id="hue-value" for="accent-hue">'+appearance.hue+'°</output></div><p id="hue-help">Меняется только акцент. Яркость текста и контраст интерфейса остаются безопасными.</p></div>'+
      '<div class="appearance-group" style="margin-top:20px"><label class="appearance-label" for="background-hue">Оттенок фона</label><div class="hue-control"><input id="background-hue" type="range" min="0" max="359" step="1" value="'+appearance.backgroundHue+'" aria-describedby="background-hue-help"><output class="hue-value" id="background-hue-value" for="background-hue">'+appearance.backgroundHue+'°</output></div><p id="background-hue-help">Задайте фону тёплый или холодный тон независимо от цвета кнопок.</p></div>'+
      '<div class="appearance-group" style="margin-top:20px"><label class="appearance-label" for="background-light">Видимость голографического фона</label><div class="hue-control"><input id="background-light" type="range" min="0" max="100" step="1" value="'+appearance.background+'" aria-describedby="background-help"><output class="hue-value" id="background-value" for="background-light">'+appearance.background+'%</output></div><p id="background-help">0 — почти незаметный фон, 100 — яркие зернистые блоки. Карточки и текст сохраняют контраст.</p></div>'+
      '<div class="cta-row"><button class="btn" type="button" data-reset-appearance>Вернуть оформление FixAR</button></div></section>'+
      '<section class="settings-card"><div class="appearance-group"><div class="appearance-label">'+uiText("Меню","Menu")+'</div><div class="choice-row" data-nav-mode-choices>'+[["simple",uiText("Только готовое","Ready sections only")],["full",uiText("Все разделы","All sections")]].map(item=>{ const active=(item[0]==="full")===navFull; return '<button class="choice'+(active?' active':'')+'" type="button" data-nav-mode="'+item[0]+'" aria-pressed="'+active+'">'+item[1]+'</button>'; }).join("")+'</div><p>'+uiText("«Только готовое» прячет разделы, которые ещё в разработке. «Все разделы» показывает полную карту FixAR.","\u201cReady sections only\u201d hides sections still in development. \u201cAll sections\u201d shows the full FixAR map.")+'</p></div></section>'+
      (fixarik?'<section class="settings-card"><h3>Помощники и каналы</h3><p>Подключения Фиксарика, доступ к перепискам и паки разработчиков настраиваются отдельно.</p><div class="cta-row"><button class="btn" type="button" onclick="go(\''+fixarik.id+'\')">Настройки Фиксарика</button></div></section>':'')+
      (legal?'<section class="settings-card"><h3>Данные и согласия</h3><p>Посмотрите, что хранится на устройстве, какие документы опубликованы и разрешена ли передача данных за рубеж.</p><div class="cta-row"><button class="btn" type="button" onclick="go(\''+legal.id+'\')">Открыть центр данных</button></div></section>':'')+
      '</div>';
  }
  function screenFixarikSettings(node){
    return crumbsBlock(node)+'<div class="fixarik-settings">'+
      '<header class="fixarik-settings-hero"><span class="fixarik-settings-avatar" aria-hidden="true">✦</span><div><p class="eyebrow">ЛИЧНЫЙ ПОМОЩНИК</p><h1>Фиксарик рядом, но не заглядывает лишнего</h1><p>Подключайте только нужные каналы и расширения. Здесь всегда видно, откуда приходят сообщения и где хранятся секреты. Скрытого доступа к личным перепискам нет.</p><div class="cta-row"><a class="btn primary" href="/fixclo/">Настроить Фиксарика</a><button class="btn" type="button" data-open-account>Вход и аккаунт</button></div></div></header>'+
      '<div class="assistant-boundaries"><div><span>1</span><p><b>Только явные каналы</b><small>Личные переписки без бота не читаются</small></p></div><div><span>2</span><p><b>Каждое подключение видно</b><small>Статус и подпись показываются рядом</small></p></div><div><span>3</span><p><b>Секреты остаются у вас</b><small>Телефонный волт не отдаёт пароли модели</small></p></div></div>'+
      '<section class="assistant-settings-section"><div class="assistant-section-head"><div><p class="eyebrow">КАНАЛЫ</p><h2>Где Фиксарик может вас услышать</h2></div><p>Сообщения обрабатываются только в подтверждённых точках контакта.</p></div><div class="settings-grid assistant-channel-grid" id="fixarik-channels"><div class="assistant-loading-card"><span></span><p>Проверяю подключения…</p></div></div></section>'+
      '<section class="assistant-settings-section"><div class="assistant-section-head"><div><p class="eyebrow">ТЕЛЕФОННЫЙ ВОЛТ</p><h2>Доступ без передачи секретов</h2></div><p>Телефон выполняет подписанные задания локально, когда сервису нужен повторный вход.</p></div><div class="assistant-vault-layout"><div class="settings-card assistant-vault-card" id="fixar-device-vault"><p>Проверяю сопряжённые устройства…</p></div><aside class="assistant-tip-card"><span>◎</span><div><h3>Как это работает</h3><p>FixAR отправляет телефону задание, а не запрос на пароль. Cookies и страницы входа остаются на устройстве.</p></div></aside></div></section>'+
      '<section class="assistant-settings-section"><div class="assistant-section-head"><div><p class="eyebrow">РАСШИРЕНИЯ</p><h2>Добавьте Фиксарику новый навык</h2></div><p>В каталоге появляются только опубликованные паки и коннекторы разработчиков.</p></div><div class="settings-card assistant-pack-card"><form class="pform case-modern-form assistant-pack-search" id="developer-pack-search"><div class="case-field-grid"><label><span>Что найти</span><input name="q" maxlength="120" placeholder="Например, важные сообщения или календарь"></label><label><span>Вид расширения</span><select name="kind"><option value="">Все расширения</option><option value="Connector">Коннекторы</option><option value="Pack">Паки</option><option value="Solution">Решения</option></select></label></div><button class="btn primary case-form-submit" type="submit">Найти в каталоге</button></form><div class="pack-search-results" id="developer-pack-results" aria-live="polite"><p class="rc-hint">Загружаю опубликованные расширения…</p></div></div></section>'+
      '</div>';
  }
  function channelCard(code,connected,label){
    const info=CHANNEL_INFO[code];
    return '<article class="settings-card assistant-channel-card'+(connected?' connected':'')+'"><div class="assistant-channel-head"><span>'+esc(info.icon)+'</span><div><h3>'+esc(info.title)+'</h3><small>'+(connected?'готов к работе':'можно подключить')+'</small></div></div><p>'+esc(info.note)+'</p><div class="channel-state"><span class="chip'+(connected?'':' warn')+'">'+(connected?'подключён':'не подключён')+'</span><span class="rc-hint">'+esc(label||'')+'</span></div></article>';
  }
  async function loadFixarikChannels(){
    const box=document.getElementById("fixarik-channels"); if(!box)return;
    if(!authState.token||!authState.principal){ box.innerHTML='<div class="settings-card"><h3>Сначала войдите</h3><p>После входа здесь появятся только ваши подтверждённые подключения.</p><div class="cta-row"><button class="btn primary" type="button" data-channel-signin>Войти</button></div></div>'; const button=box.querySelector("[data-channel-signin]"); if(button)button.onclick=openAccount; return; }
    try{
      const response=await authFetch("GET","/channels"),channels=response.channels||[];
      box.innerHTML=Object.keys(CHANNEL_INFO).map(code=>{ const found=channels.find(channel=>channel.channel===code); return channelCard(code,!!found,found?(found.label||""):""); }).join("");
    }catch(error){ box.innerHTML='<div class="settings-card"><h3>Подключения не загрузились</h3><p>'+esc((error&&error.message)||"Попробуйте позже.")+'</p></div>'; }
  }
  function deviceVaultCard(devices){
    const active=(devices||[]).filter(device=>device.state==="active");
    const rows=active.map(device=>'<div class="perm"><span class="dot"></span><b>'+esc(device.display_name||"Телефон FixAR")+'</b><span>'+esc(device.last_seen_at?"был на связи "+new Date(device.last_seen_at).toLocaleString("ru-RU"):"подключён, ещё не опрашивал задания")+'</span></div>').join("");
    return '<h3>Секреты остаются на вашем устройстве</h3><p>FixAR передаёт телефону только подписанное задание. Cookies, пароль и страницы входа агенту и модели не выдаются.</p>'+
      (rows?'<div style="margin-top:14px">'+rows+'</div>':'<p class="rc-note">Сопряжённых телефонов пока нет.</p>')+
      '<div class="cta-row"><button class="btn primary" type="button" data-pair-fixar-device>Подключить телефон</button></div>';
  }
  async function loadDeviceVault(){
    const box=document.getElementById("fixar-device-vault"); if(!box)return;
    if(!authState.token||!authState.principal){ box.innerHTML='<h3>Сначала войдите</h3><p>Сопряжение доступно только подтверждённому владельцу аккаунта.</p><div class="cta-row"><button class="btn primary" type="button" data-vault-signin>Войти</button></div>'; const button=box.querySelector("[data-vault-signin]"); if(button)button.onclick=openAccount; return; }
    if(Number(authState.assurance||0)<2){ box.innerHTML='<h3>Подтвердите аккаунт</h3><p>Телефон сможет выполнять фоновые задания от вашего имени, поэтому одного гостевого входа недостаточно.</p><div class="cta-row"><button class="btn primary" type="button" data-vault-confirm>Подтвердить вход</button></div>'; const button=box.querySelector("[data-vault-confirm]"); if(button)button.onclick=openAccount; return; }
    try{
      const response=await authFetch("GET","/browser/devices"),devices=response.devices||[];
      box.innerHTML=deviceVaultCard(devices);
      const button=box.querySelector("[data-pair-fixar-device]"); if(button)button.onclick=()=>startDevicePairing(button);
    }catch(error){ box.innerHTML='<h3>Устройства не загрузились</h3><p>'+esc((error&&error.message)||"Попробуйте позже.")+'</p>'; }
  }
  async function startDevicePairing(button){
    if(button)button.disabled=true;
    try{
      const response=await authFetch("POST","/browser/devices/pairing-ticket",{});
      const handoff=location.origin+"/v2/pair/?ticket="+encodeURIComponent(response.ticket);
      const appLink="fixar://pair?ticket="+encodeURIComponent(response.ticket);
      const share=async()=>{
        if(navigator.share){ try{await navigator.share({title:"Подключить телефон к FixAR",text:"Откройте ссылку на телефоне. Она одноразовая и действует пять минут.",url:handoff});return;}catch(_){} }
        try{await navigator.clipboard.writeText(handoff);toast("Одноразовая ссылка скопирована.");}catch(_){toast("Не удалось скопировать ссылку.");}
      };
      modalOpen("Подключить телефон",'<p class="lead">Откройте одноразовую ссылку на телефоне, затем введите в Companion код ниже. Основной токен аккаунта в ссылку не попадает.</p><div class="settings-card"><p class="eyebrow">КОД ПОДТВЕРЖДЕНИЯ</p><p style="font-size:2rem;font-weight:800;letter-spacing:.24em;margin:.35rem 0">'+esc(response.confirmation_code)+'</p><p class="rc-hint">Код и ссылка действуют до '+esc(new Date(response.expires_at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}))+'</p><div class="cta-row"><a class="btn primary" href="'+attr(appLink)+'">Открыть Companion</a><button class="btn" type="button" data-share-pair>Передать ссылку</button></div></div>');
      const shareButton=document.querySelector("[data-share-pair]"); if(shareButton)shareButton.onclick=share;
    }catch(error){ toast((error&&error.message)||"Не удалось выдать ссылку для телефона."); }
    finally{ if(button)button.disabled=false; }
  }
  function packResultCard(pack){
    const type={Connector:"коннектор",Pack:"пак",Solution:"решение"}[pack.kind]||pack.kind||"расширение";
    return '<article class="pack-search-result"><div><h3>'+esc(pack.title||pack.name||"Без названия")+'</h3><p>'+esc(pack.summary||"Описание не указано.")+'</p><small>'+esc(type)+' · '+esc(pack.publisher_name||pack.namespace||"разработчик не указан")+' · '+esc(pack.version||"")+(pack.on_canary?' · ограниченный круг':'')+'</small></div><button class="btn" type="button" data-pack-details="'+attr(pack.id)+'">Подробнее</button></article>';
  }
  async function searchDeveloperPacks(form){
    const results=document.getElementById("developer-pack-results"); if(!results)return;
    const button=form&&form.querySelector("button[type=submit]"); if(button)button.disabled=true;
    results.innerHTML='<p class="rc-hint">Ищу только опубликованные расширения…</p>';
    try{
      if(!authState.token)await ensureSession();
      const query=form?(form.q.value||"").trim():"",kind=form?form.kind.value:"";
      const response=await authFetch("POST","/storefront/search",{q:query,kind,limit:20}),packs=response.packs||[];
      results.innerHTML=packs.length?packs.map(packResultCard).join(""):'<div class="rc-note">'+esc(response.why_empty||"Опубликованных расширений пока нет. Поиск уже подключён и покажет их после публикации разработчиками.")+'</div>';
    }catch(error){ results.innerHTML='<div class="rc-note">Каталог не загрузился: '+esc((error&&error.message)||"попробуйте позже")+'. Это не означает, что паков нет.</div>'; }
    finally{ if(button)button.disabled=false; }
  }
  async function openDeveloperPack(versionId){
    if(!authState.principal)return openAccount();
    try{
      const pack=await authFetch("GET","/storefront/packs/"+encodeURIComponent(authState.principal)+"/"+encodeURIComponent(versionId));
      const requested=(pack.requested_capabilities||[]).map(item=>'<div class="perm"><span class="dot"></span><b>'+esc(item["сможет"]||item.code||"Право")+'</b><span>'+esc(item["не сможет"]||"")+'</span></div>').join("");
      modalOpen(pack.title||pack.name||"Пак разработчика",'<p class="lead">'+esc(pack.summary||"Описание не указано.")+'</p><div class="prow"><span>Разработчик</span><b>'+esc(pack.publisher_name||"не указан")+'</b></div><div class="prow"><span>Версия</span><b>'+esc(pack.version||"")+'</b></div>'+(requested?'<div class="section-t">Запрашиваемые права</div>'+requested:'')+'<p class="rc-note">Карточка показывает опубликованное описание до установки. Установка и выдача прав выполняются отдельно и только после вашего подтверждения.</p>');
    }catch(error){ toast((error&&error.message)||"Карточка пака не загрузилась."); }
  }

  function screenOnboarding(node){
    const steps=node.children;
    const spaces=[["Личное","Ваши дела — только для вас"],["Семья","Общее пространство семьи"],["Практика","Клиенты и ведение дел"],["Разработка","Проекты, паки и агенты"]];
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Первый запуск</p><h1>Добро пожаловать в ФиксАР</h1><p>Несколько шагов — и агенты начнут вести ваши дела.</p></div>'+
      '<div class="stepper">'+steps.map((s,i)=>'<div class="step'+(i===2?' active':(i<2?' done':''))+'"><span class="num">'+(i<2?'✓':(i+1))+'</span>'+esc(s.name)+'</div>').join('')+'</div>'+
      '<div class="section-t">Шаг 3 · Выбор пространства</div>'+
      '<div class="tiles">'+spaces.map(s=>'<button class="tile"><span><h3>'+s[0]+'</h3><p>'+s[1]+'</p></span><span class="chev" aria-hidden="true">→</span></button>').join('')+'</div>'+
      '<div class="cta-row" style="margin-top:22px"><button class="btn">Назад</button><button class="btn primary">Далее</button></div>';
  }

  function legalLanguage(){ return (window.FixarV2I18n&&window.FixarV2I18n.code)==="en"?"en":"ru"; }
  function legalDate(value){ if(!value)return "—"; try{return new Intl.DateTimeFormat(legalLanguage()==="en"?"en-GB":"ru-RU",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch(_){return String(value);} }
  function legalKind(kind){ return kind==="terms"?uiText("Условия пользования","Terms of use"):uiText("Персональные данные","Personal data"); }
  function screenLegalCenter(node){
    const section=node.name==="Юридические документы"?"overview":node.name;
    return crumbsBlock(node)+'<div class="legal-center" data-legal-section="'+attr(section)+'">'+
      '<header class="legal-hero"><span class="legal-hero-mark" aria-hidden="true">◉</span><div><p class="eyebrow">'+uiText("КОНТРОЛЬ ДАННЫХ","DATA CONTROL")+'</p><h1>'+uiText("Ваши данные — ваши решения","Your data, your decisions")+'</h1><p>'+uiText("Здесь собраны документы, история ваших согласий и отдельное разрешение на передачу текста и вложений иностранным моделям.","Documents, your consent history, and the separate permission for foreign AI processing are kept together here.")+'</p></div></header>'+
      '<section class="legal-overview-grid"><article class="legal-overview-card tone-device"><span>1</span><div><h2>'+uiText("На этом устройстве","On this device")+'</h2><p>'+uiText("Ключ входа, язык, тема и состояние интерфейса. Cookie и внешних счётчиков нет.","Sign-in key, language, theme, and interface state. There are no cookies or external trackers.")+'</p></div></article><article class="legal-overview-card tone-home"><span>2</span><div><h2>'+uiText("Основное хранение","Primary storage")+'</h2><p>'+uiText("По текущей конфигурации основные базы и резервные копии размещены в России.","Under the current configuration, primary databases and backups are located in Russia.")+'</p></div></article><article class="legal-overview-card tone-choice"><span>3</span><div><h2>'+uiText("Передача за рубеж","Cross-border transfer")+'</h2><p>'+uiText("Текст сообщений и вложения уходят названным иностранным обработчикам только после отдельного ответа ниже.","Message text and attachments go to the named foreign processors only after your separate answer below.")+'</p></div></article></section>'+
      '<section class="legal-section" id="legal-documents"><div class="legal-section-head"><div><p class="eyebrow">'+uiText("ДОГОВОРЫ","DOCUMENTS")+'</p><h2>'+uiText("Опубликованные редакции","Published revisions")+'</h2></div><p>'+uiText("Согласие относится к точному тексту и отпечатку редакции. Черновик согласия не собирает.","Consent applies to the exact text and revision digest. A draft never collects consent.")+'</p></div><div class="legal-loading">'+uiText("Проверяю статус документов…","Checking document status…")+'</div></section>'+
      '<section class="legal-section" id="legal-consents"><div class="legal-section-head"><div><p class="eyebrow">'+uiText("ВАША ИСТОРИЯ","YOUR HISTORY")+'</p><h2>'+uiText("Согласия на документы","Document consents")+'</h2></div><p>'+uiText("Отзыв не стирает прежнюю запись: он фиксирует дату, с которой согласие больше не действует.","Withdrawal keeps the previous record and marks when consent stopped applying.")+'</p></div><div class="legal-loading">'+uiText("Проверяю вход…","Checking sign-in…")+'</div></section>'+
      '<section class="legal-section legal-transfer" id="legal-cross-border"><div class="legal-section-head"><div><p class="eyebrow">'+uiText("ОТДЕЛЬНОЕ РЕШЕНИЕ","SEPARATE DECISION")+'</p><h2>'+uiText("Где модели могут обработать данные","Where models may process data")+'</h2></div><p>'+uiText("Молчание не считается согласием. Пока ответа нет, действует предел «только Россия».","Silence is not consent. Until you answer, the Russia-only limit applies.")+'</p></div><div class="legal-loading">'+uiText("Загружаю точный текст вопроса…","Loading the exact question…")+'</div></section>'+
      '<section class="legal-section legal-actions"><div><p class="eyebrow">'+uiText("ВАШИ ДЕЙСТВИЯ","YOUR ACTIONS")+'</p><h2>'+uiText("Получить копию или удалить данные","Get a copy or request deletion")+'</h2><p>'+uiText("Запрос владельца аккаунта проверяется перед выдачей или удалением серверных данных.","Account ownership is verified before server data is exported or deleted.")+'</p></div><div class="legal-action-buttons"><a class="btn" href="mailto:info@agrigate.pro?subject='+encodeURIComponent("FixAR: копия моих данных")+'">'+uiText("Запросить копию","Request a copy")+'</a><a class="btn" href="mailto:info@agrigate.pro?subject='+encodeURIComponent("FixAR: удаление моих данных")+'">'+uiText("Запросить удаление аккаунта","Request account deletion")+'</a><button class="btn legal-erase" type="button" data-erase-fixar>'+uiText("Стереть данные браузера и выйти","Erase browser data and sign out")+'</button></div></section>'+
      '<p class="legal-caveat">'+uiText("Этот экран показывает техническое состояние сервиса и не заменяет юридическую проверку документов оператором.","This screen reports the service’s technical state and does not replace the operator’s legal review.")+'</p></div>';
  }

  function legalDocumentCard(document){
    const status=document.ready?uiText("Опубликован","Published"):uiText("На юридической проверке","Under legal review");
    const title=legalLanguage()==="en"?legalKind(document.kind):(document.title||legalKind(document.kind));
    return '<article class="legal-document-card'+(document.ready?' ready':' draft')+'"><div class="legal-document-head"><div><span class="legal-status">'+status+'</span><h3>'+esc(title)+'</h3></div>'+(document.ready?'<span class="legal-version">'+uiText("редакция ","revision ")+esc(document.version)+'</span>':'')+'</div><p>'+esc(document.status_note||"")+'</p>'+(document.ready?'<div class="legal-consent-phrase"><b>'+uiText("Текст согласия","Consent statement")+'</b><span>'+esc(document.consent_text||"")+'</span></div><details><summary>'+uiText("Прочитать документ","Read document")+'</summary><pre>'+esc(document.text||"")+'</pre></details><small class="legal-digest">SHA-256 · '+esc(document.digest||"")+'</small>':'')+'</article>';
  }
  async function loadLegalDocuments(){
    const section=document.getElementById("legal-documents"); if(!section)return;
    try{ const response=await authFetch("GET","/legal/documents"),documents=response.documents||[]; section.querySelector(".legal-loading").outerHTML='<div class="legal-document-grid">'+documents.map(legalDocumentCard).join("")+'</div>'; }
    catch(error){ section.querySelector(".legal-loading").outerHTML='<div class="errbox"><div><b>'+uiText("Документы не загрузились","Documents did not load")+'</b><p>'+esc((error&&error.message)||uiText("Попробуйте позже.","Try again later."))+'</p></div></div>'; }
  }
  function consentCard(item){
    const live=item.current&&!item.withdrawn_at;
    return '<article class="legal-consent-item"><span class="legal-consent-dot '+(live?'live':'closed')+'"></span><div><div class="legal-consent-title"><b>'+esc(legalKind(item.kind))+'</b><span class="chip'+(live?'':' warn')+'">'+(live?uiText("действует","active"):item.withdrawn_at?uiText("отозвано","withdrawn"):uiText("старая редакция","older revision"))+'</span></div><p>'+esc(item.text||"")+'</p><small>'+uiText("Дано: ","Given: ")+legalDate(item.given_at)+(item.withdrawn_at?" · "+uiText("отозвано: ","withdrawn: ")+legalDate(item.withdrawn_at):"")+" · "+uiText("редакция ","revision ")+esc(item.version||"—")+'</small>'+(live?'<button class="legal-text-button" type="button" data-withdraw-consent="'+attr(item.kind)+'">'+uiText("Отозвать согласие","Withdraw consent")+'</button>':'')+'</div></article>';
  }
  async function loadLegalConsents(){
    const section=document.getElementById("legal-consents"); if(!section)return;
    const loading=section.querySelector(".legal-loading");
    if(!authState.ready){ setTimeout(loadLegalConsents,180); return; }
    if(!authState.token||!authState.principal){ loading.outerHTML='<div class="legal-signin"><p>'+uiText("Войдите, чтобы увидеть только свою историю согласий.","Sign in to see your own consent history.")+'</p><button class="btn" type="button" data-legal-signin>'+uiText("Войти","Sign in")+'</button></div>'; return; }
    try{ const response=await authFetch("GET","/principals/"+encodeURIComponent(authState.principal)+"/consents"),items=response.consents||[]; loading.outerHTML=items.length?'<div class="legal-consent-list">'+items.map(consentCard).join("")+'</div>':'<div class="legal-empty">'+uiText("Записанных согласий на опубликованные документы пока нет.","There are no recorded consents to published documents yet.")+'</div>'; }
    catch(error){ loading.outerHTML='<div class="errbox"><div><b>'+uiText("История не загрузилась","History did not load")+'</b><p>'+esc((error&&error.message)||"")+'</p></div></div>'; }
  }
  function crossBorderStatus(value,asked){ if(!asked)return uiText("Не отвечено · действует только Россия","Not answered · Russia-only applies"); return value==="foreign"?uiText("Передача разрешена","Transfer allowed"):value==="own"?uiText("Только инфраструктура FixAR","FixAR infrastructure only"):uiText("Только в России","Russia only"); }
  async function loadCrossBorder(){
    const section=document.getElementById("legal-cross-border"); if(!section)return;
    const loading=section.querySelector(".legal-loading");
    if(!authState.ready){ setTimeout(loadCrossBorder,180); return; }
    if(!authState.token||!authState.principal){ loading.outerHTML='<div class="legal-signin"><p>'+uiText("Войдите, чтобы сервер показал ваше текущее решение и точный список получателей.","Sign in so the server can show your current decision and exact recipient list.")+'</p><button class="btn" type="button" data-legal-signin>'+uiText("Войти","Sign in")+'</button></div>'; return; }
    try{
      const path="/principals/"+encodeURIComponent(authState.principal)+"/cross-border",response=await authFetch("GET",path),language=legalLanguage(),question=response.question[language]||response.question.ru;
      moodCrossBorder={principal:authState.principal,loading:false,response,error:""}; paintMoodCrossBorder();
      let log={entries:[],verification:{}}; try{log=await authFetch("GET",path+"/log");}catch(_){}
      const entries=(log.entries||[]).slice(-3).reverse(),verified=!log.verification||log.verification.intact!==false;
      loading.outerHTML='<div class="legal-transfer-panel"><div class="legal-current"><span>'+uiText("Сейчас","Current")+'</span><b>'+esc(crossBorderStatus(response.max_jurisdiction,response.asked))+'</b><small>'+(response.answered_at?uiText("Последнее решение: ","Last decision: ")+legalDate(response.answered_at):uiText("Ответ ещё не записан.","No answer has been recorded."))+'</small></div><p class="legal-question">'+esc(question.text)+'</p><div class="legal-jurisdiction-choices">'+["foreign","ru"].map(answer=>'<button type="button" data-cross-border-answer="'+answer+'" data-digest="'+attr(question.digest)+'" class="legal-jurisdiction-choice'+(response.max_jurisdiction===answer?' selected':'')+'"><span>'+esc(question.answers[answer])+'</span><small>'+(answer==="foreign"?uiText("Можно изменить в любой момент","You can change this at any time"):uiText("Российские модели без передачи за рубеж","Russian models without cross-border transfer"))+'</small></button>').join("")+'</div><div class="legal-transfer-log"><div><b>'+uiText("Журнал решений","Decision log")+'</b><span class="chip'+(verified?'':' warn')+'">'+(verified?uiText("цепочка цела","chain intact"):uiText("нужна проверка","review required"))+'</span></div>'+(entries.length?entries.map(entry=>'<p><span>'+esc(crossBorderStatus(entry.answer,true))+'</span><small>'+legalDate(entry.answered_at)+' · #'+esc(entry.seq)+'</small></p>').join(""):'<p>'+uiText("Записей пока нет.","No entries yet.")+'</p>')+'</div></div>';
    }catch(error){ loading.outerHTML='<div class="errbox"><div><b>'+uiText("Настройка не загрузилась","Setting did not load")+'</b><p>'+esc((error&&error.message)||"")+'</p></div></div>'; }
  }
  function loadLegalCenter(){ loadLegalDocuments(); loadLegalConsents(); loadCrossBorder(); }

  function fixarStorageKeys(storage){
    const keys=[]; try{ for(let index=0;index<storage.length;index+=1){ const key=storage.key(index); if(key&&(key==="aios_token"||key.indexOf("fixar.")===0||key.indexOf("fixar-v2-")===0))keys.push(key); } }catch(_){} return keys;
  }
  async function eraseFixarBrowserData(){
    try{ if(authState.token)await authFetch("POST","/entry/logout",{token:authState.token}); }catch(_){}
    [window.localStorage,window.sessionStorage].forEach(storage=>fixarStorageKeys(storage).forEach(key=>{try{storage.removeItem(key);}catch(_){}}));
    location.reload();
  }

  function casePanel(tab){
    if(/диалог/i.test(tab.name)) return '<div class="bubble" style="max-width:560px">Нашёл ваш прошлый полис — срок до 24 сентября. Подготовить заявку на продление и запросить счёт у страховой?</div>'+
      '<div class="composer" style="max-width:560px"><input placeholder="Сообщение по делу…" aria-label="Сообщение"><button aria-label="Отправить">→</button></div>';
    if(!tab.children.length) return '<div class="stub"><span class="tag">Вкладка дела</span><p>«'+esc(tab.name)+'» — содержимое в дизайне v2.</p></div>';
    return '<div class="tiles">'+tab.children.map(c=>'<button class="tile" onclick="go(\''+c.id+'\')"><span><h3>'+esc(c.name)+'</h3><p>раздел дела</p></span><span class="chev" aria-hidden="true">→</span></button>').join('')+'</div>';
  }
  function screenCase(node){
    const tabs=node.children;
    return crumbsBlock(node)+
      '<p class="eyebrow" style="color:var(--cyan)">Дело · пример</p>'+
      '<h1 style="margin:2px 0 0;font-size:30px">Продлить страховку автомобиля</h1>'+
      '<div class="pmeta" style="margin-top:10px"><span class="chip">активно</span><span>Следующий шаг: подтвердить полис · сегодня</span><span>Прогресс 60%</span></div>'+
      '<div class="case-tabs" data-casetabs>'+tabs.map((t,i)=>'<button class="ct'+(i===0?' active':'')+'" data-ctab="'+t.id+'">'+esc(t.name)+'</button>').join('')+'</div>'+
      '<div id="casepanel">'+casePanel(tabs[0])+'</div>';
  }

  // --- Экраны «Разработка» — реальные данные ---
  function screenDevPacks(node){
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Разработка · Паки</p><h1>Мои паки</h1><p>Реальные паки из реестра.</p></div>'+
      '<div id="dev-packs-grid" class="pgrid"><div class="skel-card" style="height:120px"></div><div class="skel-card" style="height:120px"></div></div>';
  }
  function screenDevAgents(node){
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Разработка · Агенты</p><h1>Мои агенты</h1><p>Личные и деловые помощники. Данные — из ваших дел.</p></div>'+
      '<div id="dev-agents-grid" class="pgrid"><div class="skel-card" style="height:120px"></div></div>';
  }
  function screenDevTesting(node){
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Разработка · Тестирование</p><h1>Тесты и результаты</h1><p>Метрики golden-прогонов и агентов за 24 часа.</p></div>'+
      '<div id="dev-tests-grid" class="pgrid"><div class="skel-card" style="height:120px"></div></div>';
  }
  function screenDevPublications(node){
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Разработка · Публикации</p><h1>Публикации</h1><p>Версии паков в реестре — что уже опубликовано.</p></div>'+
      '<div id="dev-pub-grid" class="pgrid"><div class="skel-card" style="height:120px"></div></div>';
  }
  function screenDevAnalytics(node){
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Разработка · Аналитика</p><h1>Аналитика паков</h1><p>Что уже измеряется платформой, а что ещё предстоит подключить.</p></div>'+
      '<div id="dev-analytics-grid" class="pgrid"><div class="skel-card" style="height:120px"></div></div>';
  }
  async function loadDevPacks(grid){
    try{
      const r=await HTTP.fetchApi("/packs",{headers:{"Content-Type":"application/json"}});
      const txt=await r.text(); let data=null; try{data=txt?JSON.parse(txt):null;}catch(e){}
      if(!r.ok) throw new Error("реестр недоступен ("+r.status+")");
      const packs=(data&&data.packs)||[];
      if(!packs.length){ grid.innerHTML='<div class="stub"><span class="tag">Паков нет</span><p>В реестре пока нет паков.</p></div>'; return; }
      grid.innerHTML=packs.map(p=>{
        const title=esc(p.title||p.id), desc=esc((p.description||"").slice(0,120));
        const ver=p.version?'<span class="chip">v'+esc(String(p.version))+'</span>':'';
        const kinds=(p.deal_kinds||[]).length, kindsLabel=kinds?kinds+' тип(ов) дел':'';
        return '<button class="pcard" data-pack-open="'+attr(p.id)+'">'+
          '<div style="display:flex;gap:10px;align-items:center"><span class="pico">'+esc((title[0]||"П").toUpperCase())+'</span>'+ver+'</div>'+
          '<h3>'+title+'</h3><p>'+desc+'</p>'+
          '<div class="pmeta"><span>'+esc(p.id)+'</span><span>'+esc(kindsLabel)+'</span></div>'+
          '<span class="popen">Открыть пак →</span></button>';
      }).join("");
    }catch(err){ grid.innerHTML='<div class="stub"><span class="tag">Ошибка</span><p>'+esc((err&&err.message)||"Не удалось загрузить паки")+'</p></div>'; }
  }
  // Лендинг: первые 4 пака из того же /packs, теми же карточками packCard,
  // что ведут на страницу пака с pack в адресе. Отдельной логики здесь нет.
  async function loadLandingPacks(grid){
    try{
      const r=await HTTP.fetchApi("/packs",{headers:{"Content-Type":"application/json"}});
      const txt=await r.text(); let data=null; try{data=txt?JSON.parse(txt):null;}catch(e){}
      if(!r.ok) throw new Error("реестр недоступен ("+r.status+")");
      const packs=(data&&data.packs)||[];
      if(!packs.length){ grid.innerHTML='<p style="color:var(--muted)">Пока пусто — можно запросить пак.</p>'; return; }
      grid.innerHTML=packs.slice(0,4).map(packCard).join("");
    }catch(err){ grid.innerHTML='<div class="stub"><span class="tag">Ошибка</span><p>'+esc((err&&err.message)||"Не удалось загрузить паки")+'</p></div>'; }
  }
  async function loadDevTests(grid){
    try{
      const data=await authFetch("GET","/ops/owner/metrics?hours=24");
      const models=(data&&data.models)||[];
      if(!models.length){ grid.innerHTML='<div class="stub"><span class="tag">Нет данных</span><p>Метрики за 24 часа пусты.</p></div>'; return; }
      grid.innerHTML='<div class="section-t">Агенты и модели за 24ч</div>'+
        '<div style="overflow-x:auto"><table class="otable"><thead><tr><th>Агент</th><th>Модель</th><th>Контур</th><th>Вызовы</th><th>Отказы</th></tr></thead><tbody>'+
        models.map(m=>'<tr><td>'+esc(m.agent_id||"—")+'</td><td>'+esc(m.model||"—")+'</td><td>'+esc(m.egress||"—")+'</td><td>'+esc(String(m.calls||0))+'</td><td>'+esc(String(m.denied||0))+'</td></tr>').join("")+
        '</tbody></table></div>';
    }catch(err){ grid.innerHTML='<div class="stub"><span class="tag">Ошибка</span><p>'+esc((err&&err.message)||"Не удалось загрузить метрики")+'</p></div>'; }
  }
  // --- Агенты: помощники из ваших дел (case_service, без нового бэкенда) ---
  async function loadDevAgents(grid){
    if(!hasSession()){ grid.innerHTML='<section class="my-cases-empty"><span aria-hidden="true">○</span><h2>Войдите, чтобы увидеть помощников</h2><p>Помощники живут в ваших делах. Без входа их список недоступен.</p><div class="cta-row"><button class="btn primary" data-my-day-account>Войти</button></div></section>'; return; }
    try{
      const cases=(REAL&&REAL.cases)||[];
      const seen={};
      cases.forEach(c=>{ const a=c.assistant||c.agent_id; if(a&&!seen[a]) seen[a]={name:a,cases:0}; if(a) seen[a].cases++; });
      const agents=Object.values(seen);
      if(!agents.length){ grid.innerHTML='<section class="my-cases-empty"><span aria-hidden="true">○</span><h2>Помощников пока нет</h2><p>Создайте первое дело — в нём появится помощник.</p><div class="cta-row"><button class="btn primary" data-act="create-case">Создать дело</button></div></section>'; return; }
      grid.innerHTML=agents.map(a=>'<div class="perm"><span class="pico">'+esc((a.name[0]||"✦").toUpperCase())+'</span><b>'+esc(a.name)+'</b><span>'+esc(String(a.cases))+' дел(а)</span></div>').join("");
    }catch(err){ grid.innerHTML='<div class="stub"><span class="tag">Ошибка</span><p>'+esc((err&&err.message)||"Не удалось загрузить помощников")+'</p></div>'; }
  }
  // --- Публикации: витрина опубликованного + очередь на разборе ---
  // /packs — направления площадки (живут всегда). Витрина реестра
  // (storefront/search) — одобренные чужие паки; их сейчас ноль, и это
  // честно показывается. Очередь submitted видна только автору в кабинете
  // /pak/kabinet — наружу она не проложена, и притворяться, что «всё
  // опубликовано», здесь нельзя: человек ждёт решения по своим версиям.
  async function loadDevPublications(grid){
    let packs=[], storefront=[], storefrontNote="";
    try{
      const r=await HTTP.fetchApi("/packs",{headers:{"Content-Type":"application/json"}});
      const txt=await r.text(); let data=null; try{data=txt?JSON.parse(txt):null;}catch(e){}
      if(!r.ok) throw new Error("реестр недоступен ("+r.status+")");
      packs=(data&&data.packs)||[];
    }catch(err){ grid.innerHTML='<div class="stub"><span class="tag">Ошибка</span><p>'+esc((err&&err.message)||"Не удалось загрузить публикации")+'</p></div>'; return; }
    try{
      const s=await authFetch("POST","/storefront/search",{q:"",kind:"",limit:50});
      storefront=(s&&s.packs)||[]; storefrontNote=(s&&s.why_empty)||"";
    }catch(err){ storefrontNote="Витрина не прочиталась: "+((err&&err.message)||"попробуйте позже"); }
    let h='<div class="section-t">Направления площадки: '+packs.length+'</div>'+
      '<div style="overflow-x:auto"><table class="otable"><thead><tr><th>Пак</th><th>ID</th><th>Версия</th><th>Типов дел</th></tr></thead><tbody>'+
      packs.map(p=>'<tr><td>'+esc(p.title||p.id)+'</td><td>'+esc(p.id)+'</td><td>v'+esc(String(p.version||1))+'</td><td>'+esc(String((p.deal_kinds||[]).length))+'</td></tr>').join("")+
      '</tbody></table></div>';
    h+='<div class="section-t">Опубликовано авторами: '+storefront.length+'</div>';
    if(storefront.length){
      h+='<div style="overflow-x:auto"><table class="otable"><thead><tr><th>Пак</th><th>Версия</th><th>Издатель</th></tr></thead><tbody>'+
        storefront.map(p=>'<tr><td>'+esc(p.title||p.name||"Без названия")+'</td><td>'+esc(String(p.version||""))+'</td><td>'+esc(p.publisher_name||p.namespace||"")+'</td></tr>').join("")+
        '</tbody></table></div>';
    } else {
      h+='<p class="rc-hint">'+esc(storefrontNote||"Опубликованных авторских паков пока нет. Ваши версии на разборе — в кабинете автора.")+'</p>'+
        '<div class="cta-row"><a class="btn" href="/pak/kabinet/">Кабинет автора</a></div>';
    }
    grid.innerHTML=h;
  }
  // --- Аналитика: честное описание задачи, бэкенда наружу нет ---
  function loadDevAnalytics(grid){
    grid.innerHTML='<div class="stub"><span class="tag">Задача для бэкенда</span>'+
      '<p><b>Что нужно:</b> открыть наружу <b>GET /registry/analytics/{publisher}/{pack}/{metric}</b> (сейчас отвечает «этот путь наружу не открыт») и решить, чьи данные показывать: агрегированные по всем пользователям или только свои.</p>'+
      '<p><b>Что уже есть:</b> телеметрия пишется внутри (landscape_service/telemetry.py), owner-метрики доступны через <b>/ops/owner/metrics</b> — их видно во вкладке «Тестирование».</p>'+
      '<p><b>Временно:</b> смотрите метрики агентов и моделей во вкладке «Тестирование».</p></div>';
  }

  const SCREENS = {
    "Публичная часть / Главная": screenLanding,
    "Публичная часть / Каталог решений": screenCatalog,
    "Публичная часть / Страница пака": screenPack,
    "Настройки": screenAppearanceSettings,
    "Настройки / Фиксарик": screenFixarikSettings,
    "Настройки / Язык и регион": screenAppearanceSettings,
    "Первый запуск": screenOnboarding,
    "Внутренняя структура любого дела": screenCase,
    "Юридические документы": screenLegalCenter,
    "Юридические документы / Пользовательское соглашение": screenLegalCenter,
    "Юридические документы / Политика конфиденциальности": screenLegalCenter,
    "Юридические документы / Согласие на обработку данных": screenLegalCenter,
    "Юридические документы / Данные несовершеннолетних": screenLegalCenter,
    "Юридические документы / Правила публикации паков": screenLegalCenter,
    "Юридические документы / Условия для разработчиков": screenLegalCenter,
    "Юридические документы / Политика удаления данных": screenLegalCenter,
    "Для работы · Практика / Команда / Пригласить в команду": screenPracticeInvite,
    "Для работы · Разработка / Паки": screenDevPacks,
    "Для работы · Разработка / Агенты": screenDevAgents,
    "Для работы · Разработка / Тестирование": screenDevTesting,
    "Для работы · Разработка / Публикации": screenDevPublications,
    "Для работы · Разработка / Аналитика паков": screenDevAnalytics,
    "Для работы · Проекты и исследования / Проекты": screenResearchProjects
  };
  const pathKey = node => ancestors(node).filter(n=>n!==ROOT).map(n=>n.name).concat(node.name).join(" / ");
  navScreens = SCREENS; rebuildNav();

  function bindScreen(){
    initHolographicShell();
    initHolographicHome(vwrap);
    // --- Загрузка реальных данных для экранов «Разработка» ---
    const catGrid=vwrap.querySelector('#pgrid');
    if(catGrid) loadDevPacks(catGrid);
    const packsGrid=vwrap.querySelector('#dev-packs-grid');
    if(packsGrid) loadDevPacks(packsGrid);
    const packsHome=vwrap.querySelector('#dev-packs-home');
    if(packsHome) loadDevPacks(packsHome);
    const testsGrid=vwrap.querySelector('#dev-tests-grid');
    if(testsGrid) loadDevTests(testsGrid);
    const agentsGrid=vwrap.querySelector('#dev-agents-grid');
    if(agentsGrid) loadDevAgents(agentsGrid);
    const pubGrid=vwrap.querySelector('#dev-pub-grid');
    if(pubGrid) loadDevPublications(pubGrid);
    const analyticsGrid=vwrap.querySelector('#dev-analytics-grid');
    if(analyticsGrid) loadDevAnalytics(analyticsGrid);
    const landingGrid=vwrap.querySelector('#landing-packs');
    if(landingGrid) loadLandingPacks(landingGrid);
    if(vwrap.querySelector('#pack-title')) loadPackPage();
    const appearancePanel=vwrap.querySelector('.appearance');
    if(appearancePanel){
      const sync=(value)=>{
        appearancePanel.querySelectorAll('[data-theme-mode]').forEach(button=>{ const active=button.dataset.themeMode===value.mode; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
        appearancePanel.querySelectorAll('[data-palette]').forEach(button=>{ const active=button.dataset.palette===value.preset; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
        const slider=appearancePanel.querySelector('#accent-hue'),output=appearancePanel.querySelector('#hue-value'),backgroundHue=appearancePanel.querySelector('#background-hue'),backgroundHueOutput=appearancePanel.querySelector('#background-hue-value'),background=appearancePanel.querySelector('#background-light'),backgroundOutput=appearancePanel.querySelector('#background-value'); if(slider)slider.value=value.hue; if(output)output.value=value.hue+'°'; if(backgroundHue)backgroundHue.value=value.backgroundHue; if(backgroundHueOutput)backgroundHueOutput.value=value.backgroundHue+'°'; if(background)background.value=value.background; if(backgroundOutput)backgroundOutput.value=value.background+'%';
      };
      appearancePanel.addEventListener('click',event=>{
        const navMode=event.target.closest('button[data-nav-mode]'); if(navMode){ setNavFull(navMode.dataset.navMode==="full"); appearancePanel.querySelectorAll('[data-nav-mode]').forEach(button=>{ const active=button===navMode; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); }); return; }
        const language=event.target.closest('button[data-language]'); if(language){ if(window.FixarV2I18n)window.FixarV2I18n.choose(language.dataset.language); return; }
        const mode=event.target.closest('button[data-theme-mode]'); if(mode){ sync(applyAppearance({mode:mode.dataset.themeMode},true)); return; }
        const palette=event.target.closest('button[data-palette]'); if(palette){ sync(applyAppearance({preset:palette.dataset.palette,hue:Number(palette.dataset.hue),backgroundHue:Number(palette.dataset.backgroundHue)},true)); return; }
        const mood=event.target.closest('[data-catch-appearance-mood]'); if(mood){ const hue=Math.floor(Math.random()*360),backgroundHue=(hue+24)%360,background=68+Math.floor(Math.random()*25); sync(applyAppearance({preset:'mood',hue,backgroundHue,background,moodCaught:true},true)); const card=mood.closest('.appearance-mood-card'); if(card){card.style.setProperty('--caught-h',hue);card.classList.remove('caught');requestAnimationFrame(()=>card.classList.add('caught'));} toast(uiText("Настроение поймано. Можно поймать ещё.","Mood caught. Try another anytime.")); return; }
        if(event.target.closest('[data-reset-appearance]'))sync(applyAppearance({mode:'system',preset:'fixar',hue:275,backgroundHue:270,background:62},true));
      });
      const hue=appearancePanel.querySelector('#accent-hue'); if(hue)hue.addEventListener('input',()=>sync(applyAppearance({preset:'custom',hue:Number(hue.value)},true)));
      const backgroundHue=appearancePanel.querySelector('#background-hue'); if(backgroundHue)backgroundHue.addEventListener('input',()=>sync(applyAppearance({preset:'custom',backgroundHue:Number(backgroundHue.value)},true)));
      const background=appearancePanel.querySelector('#background-light'); if(background)background.addEventListener('input',()=>sync(applyAppearance({background:Number(background.value)},true)));
    }
    const cat=vwrap.querySelector('.tabs[data-cat]');
    // Вкладок-фильтров каталога в разметке нет (screenCatalog их не рисует),
    // и фильтровать тут было нечего: PACKS удалён. Ветка оставлена как
    // no-op, чтобы старый обработчик не падал, если разметка вернётся.
    if(cat) cat.addEventListener('click',e=>{ const btn=e.target.closest('.tab'); if(!btn)return;
      cat.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); btn.classList.add('active');
      const grid=vwrap.querySelector('#pgrid'); if(grid) loadDevPacks(grid); });
    const ct=vwrap.querySelector('[data-casetabs]');
    if(ct) ct.addEventListener('click',e=>{ const btn=e.target.closest('.ct'); if(!btn)return;
      ct.querySelectorAll('.ct').forEach(t=>t.classList.remove('active')); btn.classList.add('active');
      vwrap.querySelector('#casepanel').innerHTML = casePanel(byId[btn.dataset.ctab]); });
    const fb=vwrap.querySelector('.filter-bar');
    if(fb) fb.addEventListener('click',e=>{ const b=e.target.closest('[data-filter]'); if(b) applyFilter(b.dataset.node,b.dataset.filter); });
    const caseView=vwrap.querySelector('.case-view-toggle');
    if(caseView) caseView.addEventListener('click',event=>{ const button=event.target.closest('[data-case-view]'); if(button)setCaseView(button.dataset.node,button.dataset.caseView); });
    const fixarikSearch=vwrap.querySelector('#developer-pack-search');
    if(fixarikSearch){
      fixarikSearch.onsubmit=event=>{ event.preventDefault(); searchDeveloperPacks(fixarikSearch); };
      const accountButton=vwrap.querySelector('[data-open-account]'); if(accountButton)accountButton.onclick=openAccount;
      const results=vwrap.querySelector('#developer-pack-results'); if(results)results.onclick=event=>{ const button=event.target.closest('[data-pack-details]'); if(button)openDeveloperPack(button.dataset.packDetails); };
      loadFixarikChannels(); loadDeviceVault(); searchDeveloperPacks(fixarikSearch);
    }
    const legalCenter=vwrap.querySelector('.legal-center');
    if(legalCenter){
      legalCenter.addEventListener('click',async event=>{
        if(event.target.closest('[data-legal-signin]')){ openAccount(event); return; }
        const answer=event.target.closest('[data-cross-border-answer]');
        if(answer){ const buttons=legalCenter.querySelectorAll('[data-cross-border-answer]'); buttons.forEach(button=>button.disabled=true); try{ await authFetch("PUT","/principals/"+encodeURIComponent(authState.principal)+"/cross-border",{max_jurisdiction:answer.dataset.crossBorderAnswer,text_digest:answer.dataset.digest,context:"command"}); const section=document.getElementById("legal-cross-border"); section.querySelector(".legal-transfer-panel").outerHTML='<div class="legal-loading">'+uiText("Сохраняю решение…","Saving your decision…")+'</div>'; await loadCrossBorder(); }catch(error){ buttons.forEach(button=>button.disabled=false); toast((error&&error.message)||uiText("Решение не сохранено.","Decision was not saved.")); } return; }
        const withdraw=event.target.closest('[data-withdraw-consent]');
        if(withdraw){ if(!confirm(uiText("Отозвать это согласие? Запись останется в истории.","Withdraw this consent? The record will remain in history.")))return; withdraw.disabled=true; try{ await authFetch("POST","/principals/"+encodeURIComponent(authState.principal)+"/consents/withdraw",{kind:withdraw.dataset.withdrawConsent}); const section=document.getElementById("legal-consents"); section.querySelector(".legal-consent-list").outerHTML='<div class="legal-loading">'+uiText("Обновляю историю…","Updating history…")+'</div>'; await loadLegalConsents(); }catch(error){ withdraw.disabled=false; toast((error&&error.message)||uiText("Согласие не отозвано.","Consent was not withdrawn.")); } return; }
        if(event.target.closest('[data-erase-fixar]')){ if(confirm(uiText("Стереть ключ входа и настройки FixAR на этом устройстве? Серверные данные останутся до отдельного подтверждённого запроса.","Erase the FixAR sign-in key and settings on this device? Server data remains until a separately verified request.")))await eraseFixarBrowserData(); }
      });
      loadLegalCenter();
    }
    bindListRows();
  }

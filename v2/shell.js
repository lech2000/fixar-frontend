  "use strict";

  // Оболочка v2: навигация, пространства, экраны настроек и кабинета.
  // Зависит только от foundation; дела подключаются следующим слоем.
  // --- Сайдбар ---
  const nav = document.getElementById("nav");
  function buildNav(node, container){
    node.children.forEach(child => {
      const row = document.createElement("div"); row.className = "n-row"; row.dataset.id = child.id;
      const caret = document.createElement("button");
      caret.className = "caret" + (child.children.length ? "" : " leaf");
      caret.setAttribute("aria-expanded", "false");
      caret.setAttribute("aria-label", "Развернуть");
      caret.textContent = "▶";
      const label = document.createElement("button");
      label.className = "n-label"; label.textContent = child.name;
      row.append(caret, label); container.appendChild(row);
      let kids = null;
      if (child.children.length){
        kids = document.createElement("div"); kids.className = "kids"; kids.hidden = true;
        container.appendChild(kids);
        buildNav(child, kids);
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
    "Разработка": findNode("Для работы · Разработка")
  };
  const ACCOUNT_SETTINGS_NODE = ROOT.children.find(node=>node.name==="Настройки");
  const ACCOUNT_NODES = [findNode("Общие разделы аккаунта"), ACCOUNT_SETTINGS_NODE, findNode("Помощь")].filter(Boolean);
  const kidOf = (node,name) => { const k=node&&node.children.find(c=>c.name===name); return k?k.id:(node?node.id:"0"); };
  const CASE_VIEW_KEY = "fixar-v2-case-view";
  let currentSpace = "Семья";
  let listFilter = "Все";
  let caseViewMode = store(CASE_VIEW_KEY)==="notes" ? "notes" : "list";
  function spaceOf(node){ let n=node; while(n){ for(const k in SPACE_NODES){ if(SPACE_NODES[k]===n) return k; } n=n.parent; } return null; }
  function switchSpace(k){ if(k===currentSpace) return; rememberInteraction("switch_space",k); currentSpace=k; rebuildNav(); go(kidOf(SPACE_NODES[k],"Главная")); }
  window.switchSpace = switchSpace;
  function renderSwitch(){
    const signed = authState.signed_in;
    document.getElementById("switch").innerHTML =
      '<div class="me"><div><div class="me-label">Пространство</div><div class="me-space">'+esc(currentSpace)+'</div></div>'+
      '<button class="btn small" id="spacepick" type="button">Сменить</button><button class="me-av" id="meav" aria-haspopup="dialog" aria-label="'+(signed?"Аккаунт: "+esc(meName()):"Войти в ФиксАР")+'">'+esc(meInitials())+'</button></div>'+
      '<button class="credit-pill" id="sidecredits" type="button" hidden>кредиты —</button>';
    const b=document.getElementById("meav"); if(b) b.addEventListener("click", openAccount);
    paintUserAvatar(b);
    const p=document.getElementById("spacepick"); if(p) p.addEventListener("click", openSpacePicker);
    renderCredits();
  }
  function renderFoot(){
    const el=document.getElementById("protofoot");
    const others=Object.keys(SPACE_NODES).filter(k=>k!==currentSpace);
    const notif=findNode("Центр уведомлений"), settings=ACCOUNT_SETTINGS_NODE;
    const ctx=[["Публичная часть","Публичная часть"],["Первый запуск","Первый запуск"],["Структура дела","Внутренняя структура любого дела"],["Юридические","Юридические документы"]];
    el.innerHTML =
      '<div class="nav-div">Сменить пространство</div>'+
      others.map(k=>'<button class="foot-link sp-link" onclick="switchSpace(\''+esc(k)+'\')">'+esc(k)+'</button>').join("")+
      '<div class="nav-div">Аккаунт</div>'+
      '<div class="acct-line"><span class="av" aria-hidden="true">'+esc(meInitials())+'</span><span class="who"><b>'+esc(meName())+'</b><small>'+(authState.signed_in?'вход подтверждён · уровень '+(authState.assurance||0):'вход не выполнен')+'</small></span></div>'+
      (authState.signed_in
        ? '<button class="foot-link" data-acct="open">Профиль и выход</button>'
        : '<button class="foot-link enter" data-acct="open">Войти →</button>')+
      (notif?'<button class="foot-link" onclick="go(\''+notif.id+'\')">Уведомления</button>':'')+
      (settings?'<button class="foot-link" onclick="go(\''+settings.id+'\')">Настройки</button>':'')+
      '<div class="nav-div">Помощь и правила</div>'+
      ctx.map(c=>{ if(c[0]==="Структура дела") return '<button class="foot-link dim" onclick="openCaseRow(\'\',\'\',\'shkola-raspisanie\')">'+esc(c[0])+'</button>'; const n=findNode(c[1]); return n?'<button class="foot-link dim" onclick="go(\''+n.id+'\')">'+esc(c[0])+'</button>':''; }).join("");
  }
  function rebuildNav(){ nav.innerHTML=""; buildNav(SPACE_NODES[currentSpace], nav); renderSwitch(); renderFoot(); }
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
  const crumbHtml = node => {
    const chain = ancestors(node).concat(node);
    return chain.map((n,i)=> (i<chain.length-1
      ? '<a href="#'+n.id+'">'+esc(n.name)+'</a><span class="sep">›</span>'
      : '<span>'+esc(n.name)+'</span>')).join("");
  };
  const eyebrowFor = node => { const a = ancestors(node); return a.length ? a.map(n=>n.name).join(" · ") : "ФиксАР"; };

  function tileGrid(node){
    return '<div class="tiles">' + node.children.map(c =>
      '<button class="tile" onclick="go(\''+c.id+'\')">'+
        '<span><h3>'+esc(c.name)+(c.children.length?'<span class="count">'+c.children.length+'</span>':'')+'</h3>'+
        '<p>'+(c.children.length? 'Раздел · '+c.children.length+' пункт(ов)':'Экран')+'</p></span>'+
        '<span class="chev" aria-hidden="true">→</span>'+
      '</button>').join("") + '</div>';
  }

  // Реальные примеры данных по пространствам (rows: [title, meta, chip])
  const SPACE_DATA = {
    "Личное": {
      "Диалог с ФиксАР": {dialog:"Сегодня в 18:00 истекает ОСАГО, и пришёл счёт за интернет. Подготовить продление и оплату?"},
      "Главное сегодня": {rows:[["Продлить ОСАГО","","сегодня 18:00"],["Счёт за интернет — 700 ₽","до завтра",""]]},
      "Мои активные дела": {rows:[["Продлить страховку авто","","в работе"],["Записаться к терапевту","","ожидает вас"],["Транспортный налог","","под наблюдением"]]},
      "Сроки и изменения": {rows:[["Продлить ОСАГО","сегодня 18:00",""],["Оплатить налог","24 сен",""],["Техосмотр","30 сен",""]]},
      "Личная сводка": {metrics:[["18 мин","сэкономлено сегодня"],["3","активных дела"],["0","просрочек"]]},
      cases:[["Продлить страховку автомобиля","в работе","обновлено 8 мин назад"],["Записаться к терапевту","ожидает вас","создано вчера"],["Оплатить транспортный налог","под наблюдением","срок 24 сен"],["Оформить загранпаспорт","завершено","закрыто 12 сен"]]
    },
    "Семья": {
      "Семейный диалог": {dialog:"У Миши завтра контрольная и изменилось расписание. Показания счётчиков — до 25-го. Что сделать первым?"},
      "Главное сегодня": {rows:[["Подтвердить домашку Миши","","сегодня 18:00"],["Показания воды и света","до 25 сен",""]]},
      "Общие дела": {rows:[["Ремонт в ванной","","в работе"],["Поездка на каникулы","","планируется"],["Страховка квартиры","","ждёт взрослого"]]},
      "Сроки и изменения": {rows:[["Изменилось расписание Миши","завтра 09:00",""],["Передать показания","25 сен",""],["Родительское собрание","1 окт",""]]},
      "Семейная сводка": {metrics:[["2","взрослых · 1 ребёнок"],["5","общих дел"],["0","просрочек"]]},
      cases:[["Ремонт в ванной","в работе","3 задачи · 2 участника"],["Школа Миши — изменение расписания","под наблюдением","обновлено сегодня","shkola-raspisanie"],["Поездка на осенние каникулы","планируется","создано 3 дня назад"],["Страховка квартиры","ждёт взрослого","срок 5 окт"]]
    },
    "Практика": {
      "Рабочий диалог": {dialog:"3 новых обращения, одно похоже на срочное (наследство). Квалифицировать и подготовить ответы?"},
      "Новые обращения": {rows:[["Оформление наследства","2 ч назад","срочно"],["Раздел имущества","4 ч назад",""],["Консультация по договору","вчера","квалификация"]]},
      "Клиенты и дела": {rows:[["Иванов И. — развод","","активно"],["ООО «Ромашка» — спор","","ждёт клиента"],["Петрова А. — наследство","","на подписи"]]},
      "Сроки и агенты": {rows:[["Заседание — Иванов","сегодня 15:00",""],["Подача иска — Ромашка","26 сен",""],["Агент готовит проект договора","в работе",""]]},
      "Рабочая сводка": {metrics:[["14","клиентов"],["23","активных дела"],["0","просрочек"]]},
      cases:[["Иванов И. — расторжение брака","активно","заседание сегодня 15:00"],["ООО «Ромашка» — договорный спор","ждёт клиента","подача иска 26 сен"],["Петрова А. — наследство","на подписи","обновлено 1 ч назад"],["Сидоров — консультация","завершено","закрыто 10 сен"]]
    },
    "Разработка": {
      "Помощник разработчика": {dialog:"Тесты пака «Семейные дела» зелёные, безопасность пройдена. Опубликовать версию 1.3.0?"},
      "Мои проекты и паки": {rows:[["Семейные дела 1.3.0","","на тестировании"],["Школьный дневник 2.1","","опубликован"],["Автопомощник","","черновик"]]},
      "Тесты и публикации": {rows:[["Семейные дела","тесты ок","на модерации"],["Школьный дневник","","опубликовано"]]},
      "Рейтинг паков": {rank:[["Семейные дела","12k · ★4.8"],["Школьный дневник","9k · ★4.7"],["Личные документы","7k · ★4.6"]]},
      "Рейтинг запросов": {rank:[["Учёт лекарств","+320% спрос"],["Садовод-помощник","+180%"],["Репетитор по математике","+90%"]]},
      projects:[["Семейные дела 1.3.0","на тестировании","12k пользователей · ★4.8"],["Школьный дневник 2.1","опубликован","9k пользователей · ★4.7"],["Автопомощник","черновик","создан 2 дня назад"],["Учёт лекарств","идея по запросу","+320% спрос"]]
    }
  };

  let PRACTICE={principal:"",loaded:false,loading:false,items:[],selectedId:"",error:""};
  const FIXAR_PRACTICES=[
    {domain:"household",agent:"chores",title:"Дом и быт",limits:"Разбор, план и черновики; опасные работы выполняет специалист."},
    {domain:"realty",agent:"guest_helper",title:"Недвижимость",limits:"Разбор и подготовка; FixAR не представляет стороны и не ведёт расчёты."},
    {domain:"education",agent:"tutor_planner",title:"Обучение",limits:"Планирование и материалы; решения об ученике остаются за человеком."}
  ];
  const practiceTitle = item => item.kind_title||item.title||item.domain_title||item.domain||"Кабинет";
  function practiceStorageKey(){ return "fixar-v2-practice:"+(authState.principal||"guest"); }
  function selectedPractice(){ return PRACTICE.items.find(item=>item.id===PRACTICE.selectedId)||null; }
  function practiceCaseStorageKey(caseId){ return "fixar-v2-practice-case:"+(authState.principal||"guest")+":"+caseId; }
  function rememberPracticeCase(caseId,practice){ try{ localStorage.setItem(practiceCaseStorageKey(caseId),JSON.stringify({domain:practice.domain,agent:practice.agent})); }catch(_){} }
  function practiceCaseBinding(caseData){ if(!caseData||caseData.domain)return null; if(caseData.scope==="home"&&/домашкин/i.test(caseData.title||""))return {domain:"household",agent:"chores"}; if(caseData.scope!=="pro")return null; try{ const value=JSON.parse(localStorage.getItem(practiceCaseStorageKey(caseData.id))||"null"); return value&&value.domain&&value.agent?value:null; }catch(_){return null;} }
  async function loadPracticeCabinets(force){
    if(!authState.token||!authState.principal){ PRACTICE={principal:"",loaded:true,loading:false,items:[],selectedId:"",error:""}; return; }
    if(PRACTICE.loading||(!force&&PRACTICE.loaded&&PRACTICE.principal===authState.principal)) return;
    PRACTICE.loading=true;
    try{ const data=await authFetch("GET","/practice"); const items=Array.isArray(data&&data.practices)?data.practices:[]; let selected=""; try{selected=localStorage.getItem(practiceStorageKey())||"";}catch(_){} if(!items.some(item=>item.id===selected))selected=(items[0]||{}).id||""; PRACTICE={principal:authState.principal,loaded:true,loading:false,items,selectedId:selected,error:""}; }
    catch(error){ PRACTICE={principal:authState.principal,loaded:true,loading:false,items:[],selectedId:"",error:(error&&error.message)||"Не удалось загрузить кабинеты."}; }
  }
  function practicePanel(){
    if(!authState.token) return '<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-hint">Войдите, чтобы увидеть только открытые вами кабинеты практики.</p><button class="btn primary" data-acct="open">Войти</button></div>';
    if(PRACTICE.loading||!PRACTICE.loaded||PRACTICE.principal!==authState.principal) return '<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-hint">Загружаем кабинеты…</p></div>';
    if(PRACTICE.error) return '<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-note">'+esc(PRACTICE.error)+'</p><button class="btn" data-act="practice-reload">Повторить</button></div>';
    const rows=PRACTICE.items.length?PRACTICE.items.map(item=>'<button class="lrow" data-act="practice-select" data-id="'+attr(item.id)+'"><span><h4>'+esc(practiceTitle(item))+'</h4><p>'+esc(item.domain_title||item.domain||"Рабочее направление")+'</p></span>'+(item.id===PRACTICE.selectedId?'<span class="chip">выбран</span>':'<span class="when">выбрать →</span>')+'</button>').join(""):'<p class="rc-hint">Вы ещё не открывали кабинеты.</p>';
    const add=authState.assurance>=2?'<button class="btn primary" data-act="practice-add">Добавить кабинет</button>':'<p class="rc-note">Чтобы добавить кабинет, подтвердите вход до уровня 2.</p>';
    return '<div class="rc-strip"><h3>Мои кабинеты</h3><p class="rc-hint">Выберите кабинет, в котором сейчас работаете. В списке только ваши кабинеты.</p><div class="lst">'+rows+'</div><div class="cta-row" style="margin-top:12px">'+add+'</div></div>';
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
  function myDayAppearance(){
    const appearance=readAppearance(),language=(window.FixarV2I18n&&window.FixarV2I18n.code)||"ru",caught=appearance.moodCaught;
    const modes=[["system",uiText("Авто","Auto")],["light",uiText("Светлая","Light")],["dark",uiText("Тёмная","Dark")]];
    return '<section class="my-day-mood" data-my-day-mood style="--caught-h:'+appearance.hue+'" aria-label="'+uiText("Настройка оформления","Appearance playground")+'">'+
      '<div class="my-day-mood-actions"><button class="my-day-mood-catcher'+(caught?' caught':'')+'" type="button" data-my-day-mood-catch aria-expanded="false" aria-controls="my-day-mood-controls"><span class="my-day-mood-spark" aria-hidden="true">✦</span><span data-my-day-mood-label>'+(caught?uiText("Настроить вручную","Fine-tune manually"):uiText("Поймай своё настроение","Catch your mood"))+'</span></button>'+(authState.signed_in?'<button class="my-day-globe" type="button" data-my-day-globe data-state="loading" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"></circle><ellipse cx="10" cy="10" rx="3.2" ry="7.5"></ellipse><path d="M2.8 7.2h14.4M2.8 12.8h14.4"></path></svg><span data-my-day-globe-label>'+uiText("Проверяю…","Checking…")+'</span></button>':'<button class="my-day-signin" type="button" data-my-day-account>'+uiText("Войти","Sign in")+' →</button>')+'</div>'+
      '<div class="my-day-mood-controls" id="my-day-mood-controls" data-my-day-mood-controls hidden><div class="my-day-mood-control-head"><b>'+uiText("Быстрая настройка","Quick setup")+'</b><span data-my-day-mood-time>'+uiText("10 секунд","10 seconds")+'</span></div><label><span>'+uiText("Цвет","Colour")+'</span><input type="range" min="0" max="359" step="1" value="'+appearance.hue+'" data-my-day-hue aria-label="'+uiText("Оттенок интерфейса","Interface hue")+'"><output data-my-day-hue-output>'+appearance.hue+'°</output></label>'+
      '<label><span>'+uiText("Тон фона","Background hue")+'</span><input type="range" min="0" max="359" step="1" value="'+appearance.backgroundHue+'" data-my-day-background-hue aria-label="'+uiText("Оттенок фона","Background hue")+'"><output data-my-day-background-hue-output>'+appearance.backgroundHue+'°</output></label>'+
      '<label><span>'+uiText("Свет фона","Background light")+'</span><input type="range" min="0" max="100" step="1" value="'+appearance.background+'" data-my-day-background aria-label="'+uiText("Яркость фона","Background brightness")+'"><output data-my-day-background-output>'+appearance.background+'%</output></label>'+
      '<div class="my-day-mood-row"><div class="my-day-segment" role="group" aria-label="'+uiText("Тема интерфейса","Interface theme")+'">'+modes.map(item=>'<button type="button" data-my-day-theme="'+item[0]+'" aria-pressed="'+(appearance.mode===item[0])+'">'+item[1]+'</button>').join("")+'</div>'+
      '<div class="my-day-segment" role="group" aria-label="Language"><button type="button" data-my-day-language="ru" aria-pressed="'+(language==="ru")+'">RU</button><button type="button" data-my-day-language="en" aria-pressed="'+(language==="en")+'">EN</button></div></div></div></section>';
  }
  function myDayGuestHome(){
    const prompts=[["Помоги понять, с чего начать","Help me decide where to start"],["Разложи мою задачу на шаги","Turn my task into clear steps"],["Как FixAR может помочь семье?","How can FixAR help my family?"]];
    const roadmap=[["1",uiText("Расскажите","Tell us"),uiText("Опишите задачу обычными словами.","Describe the task in your own words.")],["2",uiText("Получите маршрут","Get a route"),uiText("Фиксарик найдёт следующий шаг и нужного помощника.","Fixarik finds the next step and the right assistant.")],["3",uiText("Соберите дело","Build the case"),uiText("Диалог, люди, документы и срок останутся вместе.","Chat, people, documents and deadlines stay together.")],["4",uiText("Действуйте","Move forward"),uiText("Внешние действия происходят только после подтверждения.","External actions happen only after confirmation.")]];
    return '<main class="my-day-home my-day-guest">'+myDayAppearance()+'<header class="my-day-guest-heading"><div class="my-day-guest-brand"><span class="brand-mark" aria-hidden="true">✳</span><b>FixAR</b><span>v2</span></div><p class="eyebrow">'+uiText("НАЧНИТЕ С ОДНОГО СООБЩЕНИЯ","START WITH ONE MESSAGE")+'</p><h1>'+uiText("Что хотите решить?","What would you like to solve?")+'</h1><p>'+uiText("Опишите ситуацию. Фиксарик соберёт понятный маршрут — без меню, настроек и лишних шагов.","Describe the situation. Fixarik will build a clear route without menus, settings or extra steps.")+'</p></header><div class="my-day-main"><form class="my-day-composer my-day-guest-composer" data-act="my-day-ask"><label>'+uiText("Напишите Фиксарику","Message Fixarik")+'</label><textarea name="message" rows="4" maxlength="8000" required placeholder="'+uiText("Например: нужно перенести школьное занятие и согласовать новое время…","For example: I need to reschedule a school lesson and agree on a new time…")+'"></textarea><div class="my-day-composer-foot"><small>'+uiText("Разговор можно начать без регистрации. Вход понадобится, когда вы решите сохранить дело.","You can start without signing up. Sign in when you want to save the case.")+'</small><button class="chat-tool" type="button" data-act="voice-input" aria-label="'+uiText("Сказать голосом","Speak")+'" aria-pressed="false"><span class="tool-icon" aria-hidden="true">🎙</span><span>'+uiText("Голос","Voice")+'</span></button><button class="btn primary" type="submit">'+uiText("Отправить","Send")+'</button></div><div class="chat-status" data-voice-status role="status" aria-live="polite"></div><div class="my-day-answer" data-my-day-answer hidden aria-live="polite"></div></form><div class="my-day-prompts" aria-label="'+uiText("Умные подсказки","Smart suggestions")+'">'+prompts.map(pair=>'<button class="my-day-prompt" type="button" data-my-day-prompt="'+attr(uiText(pair[0],pair[1]))+'">'+esc(uiText(pair[0],pair[1]))+'</button>').join("")+'</div></div><section class="my-day-roadmap" aria-labelledby="my-day-roadmap-title"><div class="my-day-roadmap-head"><p class="eyebrow">'+uiText("КАК ЭТО РАБОТАЕТ","HOW IT WORKS")+'</p><h2 id="my-day-roadmap-title">'+uiText("От вопроса до результата","From question to outcome")+'</h2></div><div class="my-day-roadmap-grid">'+roadmap.map(item=>'<article><span>'+item[0]+'</span><div><h3>'+item[1]+'</h3><p>'+item[2]+'</p></div></article>').join("")+'</div></section></main>';
  }
  function myDayCopy(){
    if(currentSpace==="Семья")return {highlight:uiText("Вечер можно освободить","Make room for your evening"),body:uiText("Соберите семейные дела в один понятный план. Остальное — время вместе.","Bring family tasks into one simple plan. The rest is time together."),prompts:[["Что важно сделать семье сегодня?","What matters for the family today?"],["Помоги разобраться с ближайшими сроками","Help me review upcoming deadlines"]],symbol:"⌂"};
    if(currentSpace==="Личное")return {highlight:uiText("Оставьте время для себя","Leave some time for yourself"),body:uiText("Важное — на виду. Фиксарик поможет разложить заботы на небольшие шаги.","Keep what matters in sight. Fixarik turns everyday concerns into small steps."),prompts:[["Помоги спланировать день","Help me plan my day"],["Какой следующий шаг по моим делам?","What is the next step in my cases?"]],symbol:"✦"};
    if(currentSpace==="Практика")return {highlight:uiText("Начните с ясного вопроса","Start with a clear question"),body:uiText("Соберите факты и документы. Профильный помощник подскажет, с чего начать подготовку.","Collect the facts and documents. A specialist assistant shows where to start."),prompts:[["Помоги сформулировать задачу","Help me frame the task"],["Какие материалы подготовить?","What materials should I prepare?"]],symbol:"§"};
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
  function myDayRail(){
    const cases=myDayCases();
    if(!hasSession())return '<aside class="my-day-rail"><section class="my-day-rail-card"><h2>'+uiText("Осваивайтесь в своём темпе","Make yourself at home")+'</h2><p>'+uiText("Пара шагов — и здесь станет привычно.","A couple of steps to feel at home.")+'</p><div class="my-day-steps"><button class="my-day-step" type="button" data-my-day-account><span class="my-day-step-icon">1</span><span><strong>'+uiText("Войдите в FixAR","Sign in to FixAR")+'</strong><small>'+uiText("Сохранить свои пространства и дела","Keep your spaces and cases")+'</small></span><span>→</span></button><button class="my-day-step" type="button" data-act="create-case"><span class="my-day-step-icon">2</span><span><strong>'+uiText("Создайте первое дело","Create your first case")+'</strong><small>'+uiText("Начните с реальной задачи","Start with a real task")+'</small></span><span>→</span></button></div></section></aside>';
    const rows=cases.slice(0,3).map((item,index)=>'<button class="my-day-step" type="button" data-my-day-case="'+attr(item.id)+'"><span class="my-day-step-icon">'+(index+1)+'</span><span><strong>'+esc(item.title||uiText("Без названия","Untitled"))+'</strong><small>'+esc(fmtWhen(item.updated_at)||uiText("Открыть дело","Open case"))+'</small></span><span>→</span></button>').join("");
    return '<aside class="my-day-rail"><section class="my-day-rail-card"><h2>'+uiText("Следующие шаги","Next steps")+'</h2><p>'+uiText("Продолжите с того места, где нужна ваша мысль.","Continue where your input matters.")+'</p><div class="my-day-steps">'+(rows||'<button class="my-day-step" type="button" data-act="create-case"><span class="my-day-step-icon">+</span><span><strong>'+uiText("Создать первое дело","Create your first case")+'</strong><small>'+uiText("Опишите желаемый результат","Describe the outcome you need")+'</small></span><span>→</span></button>')+'</div></section><section class="my-day-safety"><b>'+uiText("Только подтверждённые данные.","Verified data only.")+'</b> '+uiText("Детские сведения и подключения не подставляются из демонстрации.","Child data and connections are never filled with demo content.")+'</section></aside>';
  }
  function myDayHome(node){
    if(!authState.signed_in)return myDayGuestHome();
    const copy=myDayCopy(),cases=myDayCases(),friendly=currentSpace==="Личное"||currentSpace==="Семья";
    const agents=currentSpace==="Семья"?["domashkin","fixarik"]:["fixarik","domashkin"];
    const prompts=copy.prompts.map(pair=>'<button class="my-day-prompt" type="button" data-my-day-prompt="'+attr(uiText(pair[0],pair[1]))+'">'+esc(uiText(pair[0],pair[1]))+'</button>').join("");
    const assistants=friendly?'<div class="my-day-section-head"><h2>'+uiText("Ваши помощники","In good company")+'</h2><small>'+uiText("У каждого — своё дело","A case for every assistant")+'</small></div><div class="my-day-agent-grid">'+agents.map(myDayAgentCard).join("")+'</div>':"";
    const extras=(currentSpace==="Разработка"?ownerToolsPanel():"")+(currentSpace==="Практика"?practicePanel():"");
    const spaceClass={"Семья":"space-family","Личное":"space-personal","Практика":"space-practice","Разработка":"space-development"}[currentSpace]||"space-personal";
    return '<main class="my-day-home '+spaceClass+'">'+myDayAppearance()+'<header class="my-day-heading"><div><p class="eyebrow">'+uiText("ВАШЕ ПРОСТРАНСТВО ДЛЯ ЖИЗНИ","A LITTLE SPACE FOR YOUR LIFE")+'</p><h1>'+uiText("Меньше забот.<br>Больше вашей жизни.","Less to manage.<br>More life to live.")+'</h1><p>'+uiText("Вы решаете, что важно. Мы помогаем с остальным.","You choose what matters. We help with the rest.")+'</p></div><span class="my-day-badge">'+(hasSession()?uiText("Ваши данные","Your data"):uiText("Можно начать без входа","Start without signing in"))+'</span></header><div class="my-day-layout"><div class="my-day-main"><section class="my-day-highlight"><div><span class="eyebrow">'+uiText("ОДНА ХОРОШАЯ МЫСЛЬ НА СЕГОДНЯ","ONE GOOD IDEA FOR TODAY")+'</span><h2>'+copy.highlight+'</h2><p>'+copy.body+'</p><button class="my-day-text-button" type="button" '+(cases[0]?'data-my-day-case="'+attr(cases[0].id)+'"':'data-act="create-case"')+'>'+(cases[0]?uiText("Продолжить главное дело","Continue the main case"):uiText("Начать с одного дела","Start with one case"))+' →</button></div><div class="my-day-orbit" aria-hidden="true"><div class="my-day-orbit-card">'+copy.symbol+'<b>'+esc(currentSpace)+'</b></div></div></section><form class="my-day-composer" data-act="my-day-ask"><label>'+uiText("С чего начнём?","Where shall we start?")+'</label><textarea name="message" rows="2" maxlength="8000" required placeholder="'+uiText("Напишите, что хочется упростить…","What would you like to make easier?")+'"></textarea><div class="my-day-composer-foot"><small>'+uiText("Фиксарик видит текущую страницу и может передать вопрос профильному помощнику.","Fixarik sees this page and can hand the question to a specialist assistant.")+'</small><button class="btn primary" type="submit">'+uiText("Отправить","Send")+'</button></div><div class="my-day-answer" data-my-day-answer hidden aria-live="polite"></div></form><div class="my-day-prompts" aria-label="'+uiText("Умные подсказки","Smart suggestions")+'">'+prompts+'</div>'+assistants+'</div>'+myDayRail()+'</div>'+extras+'</main>';
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
  function ownerAudit(data){ const names={settings_read:"открыты настройки",settings_updated:"изменены настройки",metrics_read:"открыты метрики",users_read:"открыта таблица пользователей",audit_read:"открыт журнал"}; const rows=(data.events||[]).map(row=>'<tr><td>'+esc(ownerDate(row.at))+'</td><td>'+esc(names[row.action]||row.action||"—")+'</td><td>'+esc(row.actor||"—")+'</td><td><small>'+esc(JSON.stringify(row.details||{}))+'</small></td></tr>'); return '<section class="owner-block"><div class="owner-block-head"><h2>Журнал доступа</h2><small>Без копий пользовательских данных</small></div>'+ownerTable(["Когда","Действие","Кто","Детали"],rows)+'</section>'; }
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
    if(tab==="audit")return authFetch("GET","/ops/owner/audit?limit=150");
    const [outlets,drafts,published]=await Promise.all([authFetch("GET","/ops/owner/broadcast/outlets?include_disabled=true"),authFetch("GET","/ops/owner/broadcast/posts?state=draft&limit=50"),authFetch("GET","/ops/owner/broadcast/posts?state=published&limit=30")]);
    return {outlets:outlets.outlets||[],drafts:drafts.posts||[],published:published.posts||[]};
  }
  function ownerBody(tab,data){ if(tab==="overview")return ownerOverview(data); if(tab==="users")return ownerUsers(data); if(tab==="acquisition")return ownerAcquisition(data); if(tab==="settings")return ownerSettingsPanel(data); if(tab==="integrations")return ownerYandex360(data); if(tab==="broadcast")return ownerBroadcast(data); return ownerAudit(data); }
  async function renderOwnerRoute(requested,options){
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
    const chips = LIST_FILTERS.map(x=>{ const cnt=items.filter(x.f).length,active=x.n===cur.n; return '<button class="tab'+(active?" active":"")+'" type="button" aria-pressed="'+active+'" data-filter="'+attr(x.n)+'" data-node="'+node.id+'">'+uiText(x.n,x.en)+'<span class="tcount">'+cnt+'</span></button>'; }).join("");
    const need=items.filter(item=>item.needsMe).length,working=items.filter(item=>item.agentWorking).length,done=items.filter(item=>item.completed).length;
    const create='<button class="btn primary create-btn" data-act="create-case">'+uiText("Создать дело","Create case")+'</button>';
    const view='<div class="case-view-toggle" role="group" aria-label="'+uiText("Вид дел","Case view")+'"><button type="button" data-case-view="list" data-node="'+node.id+'" aria-pressed="'+(caseViewMode==="list")+'"><span aria-hidden="true">≡</span>'+uiText("Список","List")+'</button><button type="button" data-case-view="notes" data-node="'+node.id+'" aria-pressed="'+(caseViewMode==="notes")+'"><span aria-hidden="true">▦</span>'+uiText("Стикеры","Sticky notes")+'</button></div>';
    return '<main class="my-cases"><div class="crumbs">'+crumbHtml(node)+'</div><header class="my-cases-heading"><div><p class="eyebrow">'+esc(currentSpace)+' · '+uiText("ВАШИ ДЕЛА","YOUR CASES")+'</p><h1>'+uiText("Смотрите, что движется дальше.","See what moves forward next.")+'</h1><p>'+uiText("Ваш ответ — первым. Работа помощников — рядом. Завершённое не мешает.","Your input comes first. Assistant work stays visible. Completed cases stay out of the way.")+'</p></div><span class="my-day-badge">'+items.length+' '+uiText("дел","cases")+'</span></header><section class="my-cases-pulse" aria-label="'+uiText("Состояние дел","Case status")+'"><div><b>'+need+'</b><span>'+uiText("требуют вас","need you")+'</span></div><div><b>'+working+'</b><span>'+uiText("помощники работают","assistants working")+'</span></div><div><b>'+done+'</b><span>'+uiText("завершено","completed")+'</span></div></section><div class="lbar sticky"><div class="tabs filter-bar">'+chips+'</div><div class="case-list-actions">'+view+create+'</div></div><div class="my-cases-list view-'+caseViewMode+'" id="lst">'+listRowsHtml(node)+'</div></main>';
  }

  // --- Богатые экраны (нативные button/<a>, фокус, без эмодзи-иконок) ---
  const crumbsBlock = node => '<div class="crumbs">'+crumbHtml(node)+'</div>';
  function findNode(name){ let f=null; (function w(n){ if(f)return; if(n.name===name)f=n; n.children.forEach(w); })(ROOT); return f; }
  const PACK_NODE = findNode("Страница пака") || ROOT;
  const kidId = (node,name)=>{ const k=node.children.find(c=>c.name===name); return k?k.id:node.id; };
  const sibId = (node,name)=>{ const s=(node.parent?node.parent.children:[]).find(c=>c.name===name); return s?s.id:node.id; };

  const PACKS = [
    {n:"Семейные дела", d:"Дела, документы и сроки всей семьи", c:"Семья", r:"4.8", i:"12k", ic:"С"},
    {n:"Школьный дневник", d:"Оценки, домашка и изменения расписания", c:"Семья", r:"4.7", i:"9k", ic:"Ш"},
    {n:"Личные документы", d:"Сроки действия паспортов и справок", c:"Личное", r:"4.6", i:"7k", ic:"Д"},
    {n:"Автомобиль", d:"Страховка, ТО, штрафы и расходы", c:"Личное", r:"4.5", i:"6k", ic:"А"},
    {n:"Приём клиентов", d:"Обращения, квалификация и дела практики", c:"Практика", r:"4.9", i:"3k", ic:"П"},
    {n:"Конструктор паков", d:"Декларативная сборка агентов и инструментов", c:"Разработка", r:"4.8", i:"2k", ic:"К"}
  ];
  function packCard(p){ return '<button class="pcard" onclick="go(\''+PACK_NODE.id+'\')">'+
    '<div style="display:flex;gap:10px;align-items:center"><span class="pico">'+esc(p.ic)+'</span><span class="chip">'+esc(p.c)+'</span></div>'+
    '<h3>'+esc(p.n)+'</h3><p>'+esc(p.d)+'</p>'+
    '<div class="pmeta"><span>пример интерфейса</span><span>каталог подключается</span></div>'+
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
      '<div class="section-t">Готовые помощники</div><div class="pgrid">'+PACKS.slice(0,4).map(packCard).join('')+'</div>'+
      '<div class="section-t">Начните с одного дела</div><div class="stub"><span class="tag">Без сложной настройки</span><p>Опишите результат своими словами. ФиксАР предложит структуру дела, сроки и подходящего помощника.</p>'+
      '<div class="cta-row"><button class="btn primary" onclick="go(\''+kidId(node,"Начать работу")+'\')">Начать работу</button></div></div>';
  }

  function screenCatalog(node){
    return crumbsBlock(node)+
      '<div class="vhead"><p class="eyebrow">Публичная часть · пример</p><h1>Каталог решений</h1><p>Предварительный вид каталога. Реальная установка и показатели паков ещё подключаются.</p></div>'+
      '<div class="tabs" data-cat>'+node.children.map((c,i)=>'<button class="tab'+(i===0?' active':'')+'" data-tab="'+esc(c.name)+'">'+esc(c.name)+'</button>').join('')+'</div>'+
      '<div class="pgrid" id="pgrid">'+PACKS.map(packCard).join('')+'</div>';
  }

  function screenPack(node){
    const perms=["Чтение календаря","Доступ к документам дела","Отправка уведомлений","Подключение электронного дневника"];
    const conns=["Telegram","Электронный дневник","Google Календарь","Почта"];
    let b = crumbsBlock(node)+
      '<div class="pack-head"><span class="big">С</span><div style="flex:1;min-width:220px">'+
      '<p class="eyebrow">Публичная часть · пример карточки</p><h1 style="font-size:30px;margin:2px 0 6px">Семейные дела</h1>'+
      '<div class="pmeta"><span>Показатели и отзывы демонстрационные</span></div></div>'+
      '<button class="btn primary" style="align-self:center" disabled>Установка подключается</button></div>';
    node.children.forEach(s=>{ b+='<div class="section-t">'+esc(s.name)+'</div>';
      if(/разрешен/i.test(s.name)) b+='<div>'+perms.map(x=>'<div class="perm"><span class="dot"></span><b>'+esc(x)+'</b><span>по запросу</span></div>').join('')+'</div>';
      else if(/коннектор/i.test(s.name)) b+='<div class="tabs">'+conns.map(x=>'<span class="tab">'+esc(x)+'</span>').join('')+'</div>';
      else if(/отзыв|рейтинг/i.test(s.name)) b+='<p class="rc-hint">Настоящие рейтинг и отзывы появятся после подключения registry.</p>';
      else if(/разработчик/i.test(s.name)) b+='<div class="perm"><span class="pico" style="width:32px;height:32px">L</span><b>Пример разработчика</b><span>профиль подключается</span></div>';
      else b+='<p style="color:var(--muted);max-width:72ch;margin:4px 0 0">Раздел «'+esc(s.name)+'»: содержательный текст пака в дизайне v2.</p>';
    });
    return b;
  }

  const CHANNEL_INFO = {
    tg:{title:"Telegram",icon:"TG",note:"Фиксарик видит сообщения своему боту и явно пересланные ему сообщения. Личные чаты без бота недоступны."},
    max:{title:"MAX",icon:"M",note:"Фиксарик работает в своём диалоге с ботом. Другие диалоги MAX он не читает."},
    vk_bot:{title:"ВКонтакте",icon:"VK",note:"Подключается переписка с сообществом Фиксарика, а не личные диалоги VK ID."}
  };
  function screenAppearanceSettings(node){
    const appearance=readAppearance(),fixarik=node.children.find(child=>child.name==="Фиксарик"),legal=findNode("Юридические документы");
    const language=(window.FixarV2I18n&&window.FixarV2I18n.code)||"ru";
    const modes=[["system","Как на устройстве"],["light","Светлая"],["dark","Тёмная"]];
    const palettes=[["fixar","FixAR",155,145],["calm","Спокойная",215,220],["family","Семья",153,35],["practice","Практика",275,270]];
    return crumbsBlock(node)+'<div class="appearance">'+
      '<div class="vhead"><p class="eyebrow">Ваш интерфейс</p><h1>Оформление под вас</h1><p>Выберите свет, характер и оттенок. Изменения видны сразу и сохраняются только на этом устройстве.</p></div>'+
      '<section class="theme-preview" aria-label="Предпросмотр оформления"><p class="eyebrow">ФиксАР рядом</p><h2>Важное видно. Лишнее не мешает.</h2><p>Короткие заголовки, спокойный ритм и один понятный следующий шаг на каждом экране.</p><div class="cta-row"><span class="btn primary">Главное действие</span><span class="btn">Второй шаг</span></div></section>'+
      '<section class="settings-card"><div class="appearance-group"><div class="appearance-label">Язык</div><div class="choice-row" data-language-choices><button class="choice'+(language==='ru'?' active':'')+'" type="button" data-language="ru" aria-pressed="'+(language==='ru')+'">Русский</button><button class="choice'+(language==='en'?' active':'')+'" type="button" data-language="en" aria-pressed="'+(language==='en')+'">English</button></div></div>'+
      '<div class="appearance-group" style="margin-top:20px"><div class="appearance-label">Свет</div><div class="choice-row" data-theme-choices>'+modes.map(item=>'<button class="choice'+(appearance.mode===item[0]?' active':'')+'" type="button" data-theme-mode="'+item[0]+'" aria-pressed="'+(appearance.mode===item[0])+'">'+item[1]+'</button>').join("")+'</div></div>'+
      '<div class="appearance-group" style="margin-top:20px"><div class="appearance-label">Палитра</div><div class="choice-row" data-palette-choices>'+palettes.map(item=>'<button class="choice palette-choice'+(appearance.preset===item[0]?' active':'')+'" type="button" data-palette="'+item[0]+'" data-hue="'+item[2]+'" data-background-hue="'+item[3]+'" aria-pressed="'+(appearance.preset===item[0])+'"><span class="palette-dot" style="--swatch:'+item[2]+'"></span>'+item[1]+'</button>').join("")+'</div></div>'+
      '<div class="appearance-group" style="margin-top:20px"><label class="appearance-label" for="accent-hue">Точный оттенок</label><div class="hue-control"><input id="accent-hue" type="range" min="0" max="359" step="1" value="'+appearance.hue+'" aria-describedby="hue-help"><output class="hue-value" id="hue-value" for="accent-hue">'+appearance.hue+'°</output></div><p id="hue-help">Меняется только акцент. Яркость текста и контраст интерфейса остаются безопасными.</p></div>'+
      '<div class="appearance-group" style="margin-top:20px"><label class="appearance-label" for="background-hue">Оттенок фона</label><div class="hue-control"><input id="background-hue" type="range" min="0" max="359" step="1" value="'+appearance.backgroundHue+'" aria-describedby="background-hue-help"><output class="hue-value" id="background-hue-value" for="background-hue">'+appearance.backgroundHue+'°</output></div><p id="background-hue-help">Задайте фону тёплый или холодный тон независимо от цвета кнопок.</p></div>'+
      '<div class="appearance-group" style="margin-top:20px"><label class="appearance-label" for="background-light">Яркость фона</label><div class="hue-control"><input id="background-light" type="range" min="0" max="100" step="1" value="'+appearance.background+'" aria-describedby="background-help"><output class="hue-value" id="background-value" for="background-light">'+appearance.background+'%</output></div><p id="background-help">Осветляйте или затемняйте только общий фон. Карточки и текст сохраняют контраст.</p></div>'+
      '<div class="cta-row"><button class="btn" type="button" data-reset-appearance>Вернуть оформление FixAR</button></div></section>'+
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

  const SCREENS = {
    "Публичная часть / Главная": screenLanding,
    "Публичная часть / Каталог решений": screenCatalog,
    "Публичная часть / Страница пака": screenPack,
    "Настройки": screenAppearanceSettings,
    "Настройки / Фиксарик": screenFixarikSettings,
    "Первый запуск": screenOnboarding,
    "Внутренняя структура любого дела": screenCase,
    "Юридические документы": screenLegalCenter,
    "Юридические документы / Пользовательское соглашение": screenLegalCenter,
    "Юридические документы / Политика конфиденциальности": screenLegalCenter,
    "Юридические документы / Согласие на обработку данных": screenLegalCenter,
    "Юридические документы / Данные несовершеннолетних": screenLegalCenter,
    "Юридические документы / Правила публикации паков": screenLegalCenter,
    "Юридические документы / Условия для разработчиков": screenLegalCenter,
    "Юридические документы / Политика удаления данных": screenLegalCenter
  };
  const pathKey = node => ancestors(node).filter(n=>n!==ROOT).map(n=>n.name).concat(node.name).join(" / ");

  function bindScreen(){
    if(vwrap.querySelector("[data-my-day-mood]"))loadMoodCrossBorder();
    const appearancePanel=vwrap.querySelector('.appearance');
    if(appearancePanel){
      const sync=(value)=>{
        appearancePanel.querySelectorAll('[data-theme-mode]').forEach(button=>{ const active=button.dataset.themeMode===value.mode; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
        appearancePanel.querySelectorAll('[data-palette]').forEach(button=>{ const active=button.dataset.palette===value.preset; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
        const slider=appearancePanel.querySelector('#accent-hue'),output=appearancePanel.querySelector('#hue-value'),backgroundHue=appearancePanel.querySelector('#background-hue'),backgroundHueOutput=appearancePanel.querySelector('#background-hue-value'),background=appearancePanel.querySelector('#background-light'),backgroundOutput=appearancePanel.querySelector('#background-value'); if(slider)slider.value=value.hue; if(output)output.value=value.hue+'°'; if(backgroundHue)backgroundHue.value=value.backgroundHue; if(backgroundHueOutput)backgroundHueOutput.value=value.backgroundHue+'°'; if(background)background.value=value.background; if(backgroundOutput)backgroundOutput.value=value.background+'%';
      };
      appearancePanel.addEventListener('click',event=>{
        const language=event.target.closest('button[data-language]'); if(language){ if(window.FixarV2I18n)window.FixarV2I18n.choose(language.dataset.language); return; }
        const mode=event.target.closest('button[data-theme-mode]'); if(mode){ sync(applyAppearance({mode:mode.dataset.themeMode},true)); return; }
        const palette=event.target.closest('button[data-palette]'); if(palette){ sync(applyAppearance({preset:palette.dataset.palette,hue:Number(palette.dataset.hue),backgroundHue:Number(palette.dataset.backgroundHue)},true)); return; }
        if(event.target.closest('[data-reset-appearance]'))sync(applyAppearance({mode:'system',preset:'fixar',hue:155,backgroundHue:145,background:62},true));
      });
      const hue=appearancePanel.querySelector('#accent-hue'); if(hue)hue.addEventListener('input',()=>sync(applyAppearance({preset:'custom',hue:Number(hue.value)},true)));
      const backgroundHue=appearancePanel.querySelector('#background-hue'); if(backgroundHue)backgroundHue.addEventListener('input',()=>sync(applyAppearance({preset:'custom',backgroundHue:Number(backgroundHue.value)},true)));
      const background=appearancePanel.querySelector('#background-light'); if(background)background.addEventListener('input',()=>sync(applyAppearance({background:Number(background.value)},true)));
    }
    const cat=vwrap.querySelector('.tabs[data-cat]');
    if(cat) cat.addEventListener('click',e=>{ const btn=e.target.closest('.tab'); if(!btn)return;
      cat.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); btn.classList.add('active');
      const map={'Для личных дел':'Личное','Для семьи':'Семья','Для практики':'Практика','Для разработчиков':'Разработка'};
      const f=map[btn.dataset.tab]; const list=f?PACKS.filter(p=>p.c===f):PACKS;
      vwrap.querySelector('#pgrid').innerHTML = list.length?list.map(packCard).join(''):'<p style="color:var(--muted)">Пока пусто — можно запросить пак.</p>'; });
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

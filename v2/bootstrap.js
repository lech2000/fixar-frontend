  "use strict";

  // Единственная точка запуска v2: роутинг, DOM-события и начальная отрисовка.
  // Этот файл всегда последний — к моменту выполнения доступны все три слоя.
  // ===== P5: состояния — загрузка / пусто / ошибка =====
  let loadToken = 0;
  function loadThen(build, skel, after, ms){
    const t = ++loadToken; vwrap.innerHTML = skel; vwrap.parentElement.scrollTop = 0;
    setTimeout(()=>{ if(t!==loadToken) return; vwrap.innerHTML = build(); vwrap.parentElement.scrollTop = 0; if(after) after(); }, ms||300);
  }
  const skelCard = n => '<div class="sk-card"><div class="sk sk-title"></div>'+Array.from({length:n||3}).map((_,i)=>'<div class="sk sk-line '+["w80","w60","w40"][i%3]+'"></div>').join("")+'</div>';
  const skeletonDash = head => head+'<div class="dash">'+skelCard(4)+skelCard(3)+skelCard(3)+skelCard(3)+skelCard(2)+'</div>';
  const skeletonList = head => head+'<div class="lbar sticky"><div class="tabs filter-bar">'+Array.from({length:5}).map(()=>'<span class="sk" style="height:32px;width:100px;border-radius:999px"></span>').join("")+'</div></div><div class="lst">'+Array.from({length:4}).map(()=>'<div style="padding:16px;border-bottom:1px solid var(--line-soft)"><div class="sk sk-line w40" style="height:15px"></div><div class="sk sk-line w60"></div></div>').join("")+'</div>';
  const skeletonCase = () => '<div class="sk" style="height:26px;width:52%;margin-bottom:16px;border-radius:10px"></div><div class="sk" style="height:14px;width:70%;margin-bottom:18px;border-radius:8px"></div>'+skelCard(6);
  function emptyState(emoji,title,text,ctaLabel,ctaAttr){ return '<div class="empty"><div class="emoji" aria-hidden="true">'+emoji+'</div><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+(ctaLabel?'<button class="btn primary" '+(ctaAttr||"")+'>'+esc(ctaLabel)+'</button>':'')+'</div>'; }
  function errorBox(msg,retryAttr){ return '<div class="errbox"><span class="ic" aria-hidden="true">!</span><div><b>Не удалось загрузить</b><p>'+esc(msg)+'</p><button class="btn" '+(retryAttr||"")+'>Повторить</button></div></div>'; }
  function renderStatesDemo(){
    syncHomeChrome(null);
    const homeId = kidOf(SPACE_NODES[currentSpace],"Главная");
    vwrap.innerHTML = '<div class="crumbs"><span>Прототип</span><span class="sep">›</span><span>Состояния экранов</span></div>'+
      '<div class="vhead"><p class="eyebrow">Прототип</p><h1>Состояния экранов</h1><p>Как выглядят загрузка, пустой экран и ошибка.</p></div>'+
      '<div class="demo-grid">'+
        '<div class="demo-cell" id="demoLoad"><h4>Загрузка</h4>'+skelCard(4)+'</div>'+
        '<div class="demo-cell"><h4>Пусто</h4>'+emptyState("🗂","Пока нет дел","Здесь появятся ваши дела. Начните с готового пака или создайте дело.","Создать дело","onclick=\"go('"+homeId+"')\"")+'</div>'+
        '<div class="demo-cell" id="demoErr"><h4>Ошибка</h4>'+errorBox("Проверьте соединение и попробуйте ещё раз.","data-act=\"demo-retry\"")+'</div>'+
      '</div>';
    vwrap.parentElement.scrollTop = 0;
    const t=++loadToken, dl=document.getElementById("demoLoad");
    setTimeout(()=>{ if(t!==loadToken||!dl||!dl.isConnected) return; dl.innerHTML='<h4>Загрузка → готово</h4><div class="row"><b>Ремонт в ванной</b><span class="chip">В работе</span></div><div class="row"><b>Школа Миши</b><span class="chip warn">Ожидает человека</span></div><div class="row"><b>Поездка</b><span class="chip">В работе</span></div>'; },1300);
    document.getElementById("demoErr").addEventListener("click",e=>{ if(!e.target.closest('[data-act="demo-retry"]'))return; const cell=document.getElementById("demoErr");
      cell.innerHTML='<h4>Повтор…</h4>'+skelCard(3);
      setTimeout(()=>{ if(!cell.isConnected)return; cell.innerHTML='<h4>Ошибка → успех</h4><div class="row"><b>Данные загрузились</b><span class="chip">ок</span></div><div class="row"><b>Соединение восстановлено</b><span class="chip">ок</span></div>'; },900); });
  }

  function render(node){
    syncHomeChrome(node);
    const custom = SCREENS[pathKey(node)];
    if (custom===screenResearchProjects){
      loadCasesThen(()=>custom(node), '<div class="research-projects">'+skelCard(3)+skelCard(4)+'</div>', bindScreen);
      return;
    }
    if (custom){ vwrap.innerHTML = custom(node); vwrap.parentElement.scrollTop = 0; bindScreen(); return; }
    const isMain = node.name==="Главная";
    if(isMain){
      loadCasesThen(()=>dashboard(node), '<div class="my-day-home">'+skelCard(2)+skelCard(5)+'</div>', ()=>{ bindScreen(); setAgentDockCompact(true); if(currentSpace==="Практика"&&hasSession()&&!PRACTICE.loading&&(!PRACTICE.loaded||PRACTICE.principal!==authState.principal)) loadPracticeCabinets().then(()=>{ if(currentSpace==="Практика")refreshCurrentView(); }); });
      return;
    }
    if(isListNode(node)){
      loadCasesThen(()=>renderList(node), skeletonList(""), bindScreen);
      return;
    }
    let head = '<div class="crumbs">'+crumbHtml(node)+'</div>'+
      '<div class="vhead"><p class="eyebrow">'+esc(isMain?currentSpace:eyebrowFor(node))+'</p><h1>'+esc(isMain?("Главная — "+currentSpace):node.name)+'</h1>';
    if (node.children.length){
      head += '<p>Раздел «'+esc(node.name)+'» · '+node.children.length+' пункт(ов).</p></div>';
      vwrap.innerHTML = head+tileGrid(node);
    } else {
      head += '</div><div class="stub"><span class="tag">Ещё не подключено</span><p>Раздел «'+esc(node.name)+'» есть в целевой архитектуре, но его данные и действия ещё не перенесены в v2. Демонстрационные записи вместо ваших данных не показываются.</p></div>';
      vwrap.innerHTML = head;
    }
    vwrap.parentElement.scrollTop = 0;
    bindScreen();
  }

  // --- Роутинг ---
  function go(id){
    const node = byId[id]; if (!node) return;
    vwrap.classList.remove("dialog-view");
    activeReal=null; activeCaseId=null;
    const sp = spaceOf(node);
    if (sp && sp !== currentSpace){ currentSpace = sp; rebuildNav(); }
    if ((location.hash.slice(1).split("~")[0]) !== id) location.hash = "#"+id;
    expandTo(node); render(node);
    closeNav();
  }
  window.go = go;
  window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (teamInviteHash()){ handleTeamInviteLink(); return; }
    if (h==="demo/states"){ renderStatesDemo(); return; }
    if (h.indexOf("case/")===0){ routeCase(h.slice(5)); return; }
    if (h.indexOf("owner/")===0){ renderOwnerRoute(h.slice(6)); return; }
    // Страница пака живёт с query в хэше: #id?pack=auto. Режем по «?» раньше,
    // чем по «~»: иначе id с хвостом не находится в byId и клик по карточке
    // молча ничего не делает — та самая «кнопка не открывает».
    const q=h.indexOf("?"); const base=q>=0?h.slice(0,q):h;
    const t=base.indexOf("~"); const id=t>=0?base.slice(0,t):base; listFilter = t>=0 ? decodeURIComponent(base.slice(t+1)) : "Все";
    if (byId[id]) go(id);
  });

  // «Назад» возвращает по экранам оболочки, а не на чужой сайт.
  // Свой стек нужен и для входа по прямой ссылке: там запасная дорога —
  // главная текущего пространства. Ограничение не даёт долгой сессии расти без конца.
  const screenNav=document.getElementById("screenNav"),screenTrail=[];
  function screenHomeHash(){ return "#"+kidOf(SPACE_NODES[currentSpace],"Главная"); }
  function currentScreenHash(){ return location.hash||screenHomeHash(); }
  function screenFallbackHash(){
    const raw=currentScreenHash().slice(1),split=raw.indexOf("~"),id=split>=0?raw.slice(0,split):raw,node=byId[id];
    if(node&&node.parent&&node.parent.name!=="__root__"&&node.parent!==SPACE_NODES[currentSpace])return "#"+node.parent.id;
    return screenHomeHash();
  }
  function updateScreenBack(){
    const fallback=screenFallbackHash(),available=screenTrail.length>1||currentScreenHash()!==fallback;
    screenNav.hidden=!available;
    const label=screenNav.querySelector("[data-screen-back-label]"); if(label)label.textContent=uiText("Назад","Back");
  }
  function rememberScreenRoute(){
    const route=currentScreenHash(); if(screenTrail[screenTrail.length-1]!==route)screenTrail.push(route);
    if(screenTrail.length>40)screenTrail.splice(0,screenTrail.length-40); updateScreenBack();
  }
  function returnToPreviousScreen(){
    let target;
    if(screenTrail.length>1){screenTrail.pop();target=screenTrail[screenTrail.length-1];}
    else{target=screenFallbackHash();screenTrail.length=0;if(target)screenTrail.push(target);}
    closeNav(); if(target&&target!==currentScreenHash())location.hash=target; else updateScreenBack();
  }
  screenNav.addEventListener("click",event=>{ if(event.target.closest("[data-screen-back]"))returnToPreviousScreen(); });
  window.addEventListener("hashchange",rememberScreenRoute);

  // --- Поиск ---
  document.getElementById("q").addEventListener("input", e => {
    const term = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".n-row").forEach(row => {
      const n = byId[row.dataset.id]; const hit = !term || n.name.toLowerCase().includes(term);
      row.style.display = hit ? "" : "none";
      if (hit && term){ ancestors(n).forEach(a => { if (a._kids){ a._kids.hidden=false; if(a._caret) a._caret.setAttribute("aria-expanded","true"); } if (a._row) a._row.style.display=""; }); }
    });
  });

  // --- Мобильное меню (drawer): вне/Escape закрывают, скролл блокируется, фокус ловится и возвращается ---
  const menu = document.getElementById("menu"), scrim = document.getElementById("scrim"), side = document.getElementById("side");
  scrim.hidden = false;
  function focusables(){ return Array.from(side.querySelectorAll('input,button,[href],[tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent!==null); }
  function openNav(){ document.body.classList.add("nav-open"); menu.setAttribute("aria-expanded","true"); const f=focusables()[0]; if(f) f.focus(); }
  function closeNav(){ const was=document.body.classList.contains("nav-open"); document.body.classList.remove("nav-open"); menu.setAttribute("aria-expanded","false"); if(was && menu.offsetParent) menu.focus(); }
  window.closeNav = closeNav;
  menu.addEventListener("click", () => document.body.classList.contains("nav-open") ? closeNav() : openNav());
  scrim.addEventListener("click", closeNav);
  document.addEventListener("keydown", e => {
    if (!document.body.classList.contains("nav-open")) return;
    if (e.key === "Escape"){ e.preventDefault(); closeNav(); return; }
    if (e.key === "Tab"){ const f=focusables(); if(!f.length) return; const first=f[0], last=f[f.length-1];
      if (e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } }
  });

  // Композер (демо): «Отправить» добавляет реплику и канонический ответ — кнопка не «мёртвая»
  async function composerSend(comp){
    const inp=comp.querySelector("input"); if(!inp)return; const v=(inp.value||"").trim(); if(!v) return;
    if(currentSpace==="Семья"){ await openFamilyDialog(v); return; }
    const mk=(cls,html)=>{ const d=document.createElement("div"); d.className="bubble"+(cls?" "+cls:""); d.innerHTML=html; return d; };
    comp.parentElement.insertBefore(mk("user", esc(v)), comp); inp.value="";
    setTimeout(()=>{ comp.parentElement.insertBefore(mk("", "Это демо-экран: в рабочей версии запрос уйдёт агенту дела. <small>ФиксАР · сейчас</small>"), comp); comp.scrollIntoView({block:"nearest"}); }, 300);
  }
  document.getElementById("view").addEventListener("click", e=>{ const b=e.target.closest(".composer button"), comp=b&&b.closest(".composer"); if(b&&comp&&comp.querySelector("input")){ e.preventDefault(); composerSend(comp); } });
  document.getElementById("view").addEventListener("keydown", e=>{ if(e.key==="Enter"){ const i=e.target.closest(".composer input"); if(i){ e.preventDefault(); composerSend(i.closest(".composer")); } } });
  document.addEventListener("click",e=>{ const el=e.target.closest("button,a[href],[data-act]"); if(!el)return; const target=el.dataset.act||el.id||(el.tagName==="A"?"link":"control"); rememberInteraction("click",target); },true);
  document.addEventListener("submit",e=>{ const form=e.target.closest("form"); if(form)rememberInteraction("submit",form.dataset.act||form.id||"form"); },true);
  window.addEventListener("hashchange",()=>rememberInteraction("navigate",location.hash.indexOf("#case/")===0?"case":"screen"));

  // Аккаунт: триггеры (мобильная шапка + подвал навигации) и загрузка личности
  document.getElementById("acct").addEventListener("click", openAccount);
  document.getElementById("desktopacct").addEventListener("click", openAccount);
  document.getElementById("protofoot").addEventListener("click", e=>{ const b=e.target.closest('[data-acct="open"]'); if(b){ e.preventDefault(); openAccount(e); } });
  // Реальные дела: создание и переход из дашборд-полоски (делегируем на #view)
  document.getElementById("view").addEventListener("click", async e=>{
    const invite=e.target.closest('[data-act="invite-to-platform"]');
    if(!invite)return;
    e.preventDefault();
    if(!authState.ready)await bootIdentity();
    if(!authState.signed_in||authState.assurance<2){
      toast(uiText("Личная ссылка доступна после подтверждения входа до уровня 2.","Verify your sign-in to level 2 to get a personal link."));
      openAccount(e);
      return;
    }
    try{
      const data=await authFetch("POST","/entry/platform-referral-link",{});
      if(!data.link||!data.acquisition||!data.acquisition.disclosure)throw new Error("Служба не вернула условия реферальной ссылки.");
      const link=new URL(data.link,location.origin).href;
      modalOpen(uiText("Личная ссылка в FixAR","Your FixAR referral link"),
        '<p class="lead">'+uiText("Пригласите человека на платформу по своей ссылке.","Invite someone to the platform with your personal link.")+'</p>'+
        acquisitionTerms(data)+
        '<p class="rc-note">'+uiText("Это не приглашение в вашу команду: оно не открывает кабинет, дела и бюджет.","This does not invite anyone into your team or grant access to your workspace, cases, or budget.")+'</p>'+
        '<div class="practice-referral-result"><label>'+uiText("Моя реферальная ссылка","My referral link")+'<input type="url" readonly value="'+attr(link)+'"></label><div class="cta-row"><button class="btn primary" type="button" data-copy-platform-invite>'+uiText("Копировать ссылку","Copy link")+'</button></div></div>',
        body=>{const button=body.querySelector('[data-copy-platform-invite]'),field=body.querySelector('input[type="url"]');button.onclick=async()=>{try{await navigator.clipboard.writeText(link);toast(uiText("Личная ссылка скопирована.","Personal link copied."));}catch(_){field.select();toast(uiText("Ссылка выделена — скопируйте её вручную.","Link selected — copy it manually."));}};});
    }catch(error){toast((error&&error.message)||"Не удалось получить личную ссылку.");}
  });
  document.getElementById("view").addEventListener("click", e=>{ const project=e.target.closest('[data-act="create-project"]'); if(project){ e.preventDefault(); openCreateProject(); return; } const branch=e.target.closest('[data-act="new-project-branch"]'); if(branch){ e.preventDefault(); openProjectBranch(branch.dataset.projectId); return; } const fixar=e.target.closest('[data-act="fixar-case"]'); if(fixar){ e.preventDefault(); openFixarCase(); return; } const cc=e.target.closest('[data-act="create-case"]'); if(cc){ e.preventDefault(); openCreateCase(); return; } const add=e.target.closest('[data-act="practice-add"]'); if(add){ e.preventDefault(); openPracticeAdd(); return; } const reload=e.target.closest('[data-act="practice-reload"]'); if(reload){ e.preventDefault(); loadPracticeCabinets(true).then(refreshCurrentView); return; } const section=e.target.closest('[data-practice-section]'); if(section){ practiceSection=section.dataset.practiceSection||"needed"; refreshCurrentView(); return; } const practiceNode=e.target.closest('[data-practice-node]'); if(practiceNode){ go(practiceNode.dataset.practiceNode); return; } const selected=e.target.closest('[data-act="practice-select"]'); if(selected){ PRACTICE.selectedId=selected.dataset.id; practiceSection="needed"; try{localStorage.setItem(practiceStorageKey(),PRACTICE.selectedId);}catch(_){} refreshCurrentView(); return; } const rr=e.target.closest('.rc-strip .rc-row[data-id]'); if(rr){ realTab=defaultRealTab(); location.hash="#case/"+rr.dataset.id; } });
  document.getElementById("view").addEventListener("click",async event=>{
    const button=event.target.closest("[data-copy-practice-referral]");if(!button)return;
    const link=button.dataset.copyPracticeReferral;
    try{await navigator.clipboard.writeText(link);toast("Ссылка в команду скопирована.");}
    catch(_){const field=button.closest(".practice-referral-result").querySelector('input[type="url"]');if(field){field.select();toast("Выделили ссылку — скопируйте её вручную.");}}
  });
  document.getElementById("view").addEventListener("submit",event=>{
    const form=event.target.closest('form[data-act="practice-referral"]');if(!form)return;
    event.preventDefault();submitPracticeReferral(form);
  });
  document.getElementById("view").addEventListener("click",event=>{
    const caseButton=event.target.closest("[data-my-day-case]"); if(caseButton){ realTab=defaultRealTab(); location.hash="#case/"+caseButton.dataset.myDayCase; return; }
    if(event.target.closest("[data-my-day-work]")){ HOME_WORK_MODE[currentSpace]=true; refreshCurrentView(); return; }
    if(event.target.closest("[data-my-day-chat]")){ HOME_WORK_MODE[currentSpace]=false; refreshCurrentView(); return; }
    if(event.target.closest("[data-my-day-account]")){ openAccount(); return; }
    if(event.target.closest("[data-my-day-domashkin]")){ location.href="/fixclo/?preset=education.domashkin&channel=max&pilot=domashkin"; return; }
    if(event.target.closest("[data-my-day-fixarik]")){ const settings=findNode("Фиксарик"); if(settings)go(settings.id); return; }
    const prompt=event.target.closest("[data-my-day-prompt]"); if(prompt){ const form=event.target.closest(".my-day-main").querySelector('.my-day-composer'),field=form&&form.elements.message; if(field){ field.value=prompt.dataset.myDayPrompt; field.dispatchEvent(new Event("input",{bubbles:true})); field.focus(); } }
  });
  document.getElementById("view").addEventListener("submit",async event=>{
    const form=event.target.closest('form[data-act="my-day-ask"]'); if(!form)return;
    event.preventDefault(); const field=form.elements.message,button=form.querySelector('button[type="submit"]'),answer=form.querySelector("[data-my-day-answer]"),message=(field.value||"").trim(); if(!message)return;
    button.disabled=true; button.classList.add("thinking"); button.setAttribute("aria-busy","true"); answer.hidden=false; answer.textContent=uiText("Фиксарик думает…","Fixarik is thinking…");
    try{ answer.innerHTML=agentRichText(await askCaseAgent(message)); field.value=""; field.style.height=""; }
    catch(error){ answer.textContent=(error&&error.message)||uiText("Фиксарик пока не ответил. Попробуйте ещё раз.","Fixarik has not answered yet. Please try again."); }
    finally{ button.disabled=false; button.classList.remove("thinking"); button.removeAttribute("aria-busy"); }
  });
  const agentDock=document.getElementById("agentdock"), agentDockToggle=document.getElementById("agentdocktoggle");
  function setAgentDockCompact(compact){ agentDock.classList.toggle("compact",compact); agentDockToggle.setAttribute("aria-expanded",String(!compact)); agentDockToggle.querySelector("span").textContent=compact?"Открыть":"Свернуть"; try{ localStorage.setItem("fixar-v2-agent-dock-compact",compact?"1":"0"); }catch(_){} }
  let savedDock; try{ savedDock=localStorage.getItem("fixar-v2-agent-dock-compact"); }catch(_){} setAgentDockCompact(savedDock===null?window.matchMedia("(max-width: 760px)").matches:savedDock==="1");
  agentDockToggle.addEventListener("click",()=>setAgentDockCompact(!agentDock.classList.contains("compact")));
  document.getElementById("agentdockform").addEventListener("submit",async e=>{ e.preventDefault(); const f=e.currentTarget, input=f.elements.message, answer=document.getElementById("agentdockanswer"), button=f.querySelector('button[type="submit"]'), message=(input.value||"").trim(); if(!message)return; button.disabled=true; button.classList.add("thinking"); button.setAttribute("aria-busy","true"); answer.textContent="Агент думает…";
    try{ answer.innerHTML=agentRichText(await askCaseAgent(message)); input.value=""; setTimeout(()=>setAgentDockCompact(true),900); }catch(err){ answer.textContent=(err&&err.message)||"Агент пока не ответил."; }finally{ button.disabled=false; button.classList.remove("thinking"); button.removeAttribute("aria-busy"); } });
  document.addEventListener("input",e=>{ const field=e.target.closest("textarea[name=message]"); if(!field)return; field.style.height="auto"; field.style.height=Math.min(field.scrollHeight,180)+"px"; });
  const STORAGE_NOTICE_KEY="fixar.notice.storage.v2",STORAGE_NOTICE_VERSION="1";
  function markStorageNoticeRead(){ try{localStorage.setItem(STORAGE_NOTICE_KEY,STORAGE_NOTICE_VERSION);}catch(_){} }
  function initStorageNotice(){
    const notice=document.getElementById("storageNotice"); if(!notice)return; let seen=""; try{seen=localStorage.getItem(STORAGE_NOTICE_KEY)||"";}catch(_){} if(seen!==STORAGE_NOTICE_VERSION)notice.hidden=false;
    document.getElementById("storageNoticeOk").addEventListener("click",()=>{markStorageNoticeRead();notice.hidden=true;});
    document.getElementById("storageNoticeManage").addEventListener("click",()=>{markStorageNoticeRead();notice.hidden=true;const legal=findNode("Юридические документы");if(legal)go(legal.id);});
  }
  initStorageNotice();
  const DOMASHKIN_STRIP_KEY="fixar.notice.domashkin-strip.v1";
  (function initDomashkinStrip(){
    const strip=document.getElementById("domashkinStrip"); if(!strip)return;
    let seen=""; try{seen=localStorage.getItem(DOMASHKIN_STRIP_KEY)||"";}catch(_){}
    if(seen!=="1") strip.hidden=false;
    document.getElementById("domashkinStripHide").addEventListener("click",()=>{ try{localStorage.setItem(DOMASHKIN_STRIP_KEY,"1");}catch(_){} strip.hidden=true; });
  })();
  if(window.FixarCommunity) window.FixarCommunity.init();
  // Сохраняем код до первого go(): он заменяет hash адресом экрана.
  if(teamInviteHash()) teamInviteCode();
  bootIdentity().then(handleTeamInviteLink);

  // старт
  (function(){ const h=location.hash.slice(1);
    if (teamInviteHash()){ go(kidOf(SPACE_NODES["Практика"],"Главная")); return; }
    if (h==="demo/states"){ renderStatesDemo(); return; }
    if (h.indexOf("case/")===0){ routeCase(h.slice(5)); return; }
    if (h.indexOf("owner/")===0){ renderOwnerRoute(h.slice(6)); return; }
    const t=h.indexOf("~"); const id=t>=0?h.slice(0,t):h; if(t>=0) listFilter=decodeURIComponent(h.slice(t+1));
    go(byId[id] ? id : kidOf(SPACE_NODES[currentSpace],"Главная"));
  })();
  rememberScreenRoute();

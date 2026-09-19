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
    const custom = SCREENS[pathKey(node)];
    if (custom){ vwrap.innerHTML = custom(node); vwrap.parentElement.scrollTop = 0; bindScreen(); return; }
    const isMain = node.name==="Главная";
    if(isMain){
      loadCasesThen(()=>dashboard(node), '<div class="my-day-home">'+skelCard(2)+skelCard(5)+'</div>', ()=>{ bindScreen(); setAgentDockCompact(true); if(currentSpace==="Практика"&&hasSession()&&(!PRACTICE.loaded||PRACTICE.principal!==authState.principal)) loadPracticeCabinets().then(refreshCurrentView); });
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
    if (h==="demo/states"){ renderStatesDemo(); return; }
    if (h.indexOf("case/")===0){ routeCase(h.slice(5)); return; }
    if (h.indexOf("owner/")===0){ renderOwnerRoute(h.slice(6)); return; }
    const t=h.indexOf("~"); const id=t>=0?h.slice(0,t):h; listFilter = t>=0 ? decodeURIComponent(h.slice(t+1)) : "Все";
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
  document.getElementById("protofoot").addEventListener("click", e=>{ const b=e.target.closest('[data-acct="open"]'); if(b){ e.preventDefault(); openAccount(e); } });
  let moodControlTimeout=null,moodControlInterval=null;
  function stopMoodControlWindow(){ if(moodControlTimeout)clearTimeout(moodControlTimeout); if(moodControlInterval)clearInterval(moodControlInterval); moodControlTimeout=null; moodControlInterval=null; }
  function closeMoodControls(mood){ stopMoodControlWindow(); if(!mood||!mood.isConnected)return; const controls=mood.querySelector("[data-my-day-mood-controls]"),catcher=mood.querySelector("[data-my-day-mood-catch]"); if(controls)controls.hidden=true; if(catcher)catcher.setAttribute("aria-expanded","false"); }
  function startMoodControlWindow(mood){
    stopMoodControlWindow(); let remaining=10; const output=mood.querySelector("[data-my-day-mood-time]");
    const paint=()=>{if(output)output.textContent=remaining+" "+uiText(remaining===1?"секунда":(remaining>=2&&remaining<=4?"секунды":"секунд"),remaining===1?"second":"seconds");}; paint();
    moodControlInterval=setInterval(()=>{remaining=Math.max(0,remaining-1);paint();},1000);
    moodControlTimeout=setTimeout(()=>closeMoodControls(mood),10000);
  }
  // Реальные дела: создание и переход из дашборд-полоски (делегируем на #view)
  document.getElementById("view").addEventListener("click", e=>{ const fixar=e.target.closest('[data-act="fixar-case"]'); if(fixar){ e.preventDefault(); openFixarCase(); return; } const cc=e.target.closest('[data-act="create-case"]'); if(cc){ e.preventDefault(); openCreateCase(); return; } const add=e.target.closest('[data-act="practice-add"]'); if(add){ e.preventDefault(); openPracticeAdd(); return; } const reload=e.target.closest('[data-act="practice-reload"]'); if(reload){ e.preventDefault(); loadPracticeCabinets(true).then(refreshCurrentView); return; } const selected=e.target.closest('[data-act="practice-select"]'); if(selected){ PRACTICE.selectedId=selected.dataset.id; try{localStorage.setItem(practiceStorageKey(),PRACTICE.selectedId);}catch(_){} refreshCurrentView(); return; } const rr=e.target.closest('.rc-strip .rc-row[data-id]'); if(rr){ realTab=defaultRealTab(); location.hash="#case/"+rr.dataset.id; } });
  document.getElementById("view").addEventListener("click",event=>{
    const caseButton=event.target.closest("[data-my-day-case]"); if(caseButton){ realTab=defaultRealTab(); location.hash="#case/"+caseButton.dataset.myDayCase; return; }
    if(event.target.closest("[data-my-day-account]")){ openAccount(); return; }
    if(event.target.closest("[data-my-day-domashkin]")){ location.href="/fixclo/?preset=education.domashkin&channel=max&pilot=domashkin"; return; }
    if(event.target.closest("[data-my-day-fixarik]")){ const settings=findNode("Фиксарик"); if(settings)go(settings.id); return; }
    const globe=event.target.closest("[data-my-day-globe]"); if(globe){ toggleMoodCrossBorder(globe); return; }
    const catcher=event.target.closest("[data-my-day-mood-catch]"); if(catcher){ const mood=catcher.closest("[data-my-day-mood]"),controls=mood.querySelector("[data-my-day-mood-controls]"),label=catcher.querySelector("[data-my-day-mood-label]"); if(!catcher.classList.contains("caught")){ const hue=Math.floor(Math.random()*360),backgroundHue=(hue+24)%360; applyAppearance({preset:"mood",hue,backgroundHue,moodCaught:true},true); mood.style.setProperty("--caught-h",hue); catcher.classList.add("caught"); label.textContent=uiText("Настроить вручную","Fine-tune manually"); const slider=controls.querySelector("[data-my-day-hue]"),output=controls.querySelector("[data-my-day-hue-output]"),backgroundSlider=controls.querySelector("[data-my-day-background-hue]"),backgroundOutput=controls.querySelector("[data-my-day-background-hue-output]"); slider.value=hue; output.value=hue+"°"; backgroundSlider.value=backgroundHue; backgroundOutput.value=backgroundHue+"°"; return; } const open=controls.hidden; controls.hidden=!open; catcher.setAttribute("aria-expanded",String(open)); if(open){ controls.querySelector("input").focus(); startMoodControlWindow(mood); }else stopMoodControlWindow(); return; }
    const theme=event.target.closest("[data-my-day-theme]"); if(theme){ const mood=theme.closest("[data-my-day-mood]"); applyAppearance({mode:theme.dataset.myDayTheme,moodCaught:true},true); mood.querySelectorAll("[data-my-day-theme]").forEach(button=>button.setAttribute("aria-pressed",String(button===theme))); return; }
    const language=event.target.closest("[data-my-day-language]"); if(language&&window.FixarV2I18n){ window.FixarV2I18n.choose(language.dataset.myDayLanguage); return; }
    const prompt=event.target.closest("[data-my-day-prompt]"); if(prompt){ const form=event.target.closest(".my-day-main").querySelector('.my-day-composer'),field=form&&form.elements.message; if(field){ field.value=prompt.dataset.myDayPrompt; field.dispatchEvent(new Event("input",{bubbles:true})); field.focus(); } }
  });
  document.getElementById("view").addEventListener("input",event=>{ const hue=event.target.closest("[data-my-day-hue]"),backgroundHue=event.target.closest("[data-my-day-background-hue]"),background=event.target.closest("[data-my-day-background]"); if(!hue&&!backgroundHue&&!background)return; const mood=event.target.closest("[data-my-day-mood]"); if(hue){ const value=Number(hue.value),output=mood&&mood.querySelector("[data-my-day-hue-output]"); applyAppearance({preset:"custom",hue:value,moodCaught:true},true); if(mood)mood.style.setProperty("--caught-h",value); if(output)output.value=value+"°"; return; } if(backgroundHue){ const value=Number(backgroundHue.value),output=mood&&mood.querySelector("[data-my-day-background-hue-output]"); applyAppearance({preset:"custom",backgroundHue:value,moodCaught:true},true); if(output)output.value=value+"°"; return; } const value=Number(background.value),output=mood&&mood.querySelector("[data-my-day-background-output]"); applyAppearance({background:value},true); if(output)output.value=value+"%"; });
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
  bootIdentity();

  // старт
  (function(){ const h=location.hash.slice(1);
    if (h==="demo/states"){ renderStatesDemo(); return; }
    if (h.indexOf("case/")===0){ routeCase(h.slice(5)); return; }
    if (h.indexOf("owner/")===0){ renderOwnerRoute(h.slice(6)); return; }
    const t=h.indexOf("~"); const id=t>=0?h.slice(0,t):h; if(t>=0) listFilter=decodeURIComponent(h.slice(t+1));
    go(byId[id] ? id : kidOf(SPACE_NODES[currentSpace],"Главная"));
  })();
  rememberScreenRoute();

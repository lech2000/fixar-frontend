  "use strict";

  // Предметный слой v2: демонстрационные и реальные дела, материалы и агенты.
  // Регистрирует поведение, но не ставит глобальные обработчики и не стартует UI.
  // ===== P1: настоящее дело (интерактивно, состояние в памяти) =====
  const attr = s => esc(String(s)).replace(/"/g,"&quot;");
  const PERM_LABELS = { docs:"Может видеть документы", tasks:"Может добавлять задачи", confirm:"Может подтверждать действия агента", invite:"Может приглашать участников" };
  const CASE_TABS = ["Обзор","Диалог","План","Участники","Документы","Сроки","Агенты","Настройки"];
  const CASE_SEEDS = {
    "shkola-raspisanie": {
      id:"shkola-raspisanie", space:"Семья", assistant:"Домашкин",
      title:"Школа Миши — изменение расписания",
      goal:"Учесть новое расписание и не пропустить контрольную по математике",
      status:"в работе", nextStep:"Подтвердить действие агента: перенести напоминание",
      responsible:"Мама (вы)", deadline:"завтра, 09:00", visibility:"Участники дела", progress:65, agentWatch:true, requireConfirm:true,
      participants:[
        {name:"Мама (вы)", contact:"вы", role:"Владелец", actions:["docs","tasks","confirm","invite"], notify:true, invite:"принято"},
        {name:"Папа", contact:"Telegram", role:"Взрослый", actions:["docs","tasks","confirm"], notify:true, invite:"принято"},
        {name:"Миша", contact:"—", role:"Ребёнок", actions:["tasks"], notify:true, invite:"—"}
      ],
      plan:[
        {name:"Разобраться с изменением", tasks:[{name:"Получить новое расписание из дневника", status:"done", who:"Агент"},{name:"Сверить с контрольной по математике", status:"done", who:"Агент"}]},
        {name:"Подготовиться к контрольной", tasks:[{name:"Перенести напоминание на новое время", status:"waiting", who:"Агент → ждёт подтверждения"},{name:"Напомнить Мише вечером", status:"todo", who:"Агент"},{name:"Подтвердить готовность домашки", status:"todo", who:"Миша"}]}
      ],
      dialog:[
        {who:"agent", text:"Дневник прислал новое расписание: математика во вторник в 9:00 вместо среды. Завтра — контрольная."},
        {who:"agent", propose:true, text:"Предлагаю перенести напоминание Мише на понедельник 19:00 и добавить контрольную в семейный календарь. Подтвердить?"}
      ],
      docs:[["Скрин расписания","из дневника · сегодня"],["Темы к контрольной","прикрепил Миша"]],
      deadlines:[["Контрольная по математике","завтра 09:00","срочно"],["Родительское собрание","1 окт",""]],
      agents:[["Домашкин","ведёт отдельное рабочее дело","в работе"]],
      linkedCases:[{id:"domashkin-raspisanie",title:"Домашкин — изменение расписания",assistant:"Домашкин",status:"в работе"}]
    },
    "domashkin-raspisanie": {
      id:"domashkin-raspisanie", space:"Семья", assistantWork:"Домашкин", parentCaseId:"shkola-raspisanie",
      title:"Домашкин — изменение расписания", goal:"Выполнить подтверждённые действия по школьному расписанию", status:"в работе", nextStep:"Ждёт подтверждения переноса напоминания",
      responsible:"Домашкин", deadline:"сегодня", visibility:"Участники исходного дела", progress:50, agentWatch:true, requireConfirm:true,
      participants:[{name:"Мама (вы)",contact:"вы",role:"Владелец",actions:["docs","tasks","confirm","invite"],notify:true,invite:"принято"}],
      plan:[{name:"Поручение",tasks:[{name:"Сверить новое расписание",status:"done",who:"Домашкин"},{name:"Подготовить перенос напоминания",status:"waiting",who:"Домашкин → ждёт подтверждения"}]}],
      dialog:[{who:"agent",text:"Я выделил изменения расписания и подготовил перенос напоминания. Исходное семейное дело остаётся у вас; это — моё рабочее дело."},{who:"agent",propose:true,text:"Перенести напоминание Мише на понедельник 19:00 и добавить контрольную в семейный календарь. Подтвердить?"}],
      docs:[],deadlines:[["Контрольная по математике","завтра 09:00","срочно"]],agents:[["Домашкин","рабочее дело","активен"]],linkedCases:[{id:"shkola-raspisanie",title:"Школа Миши — изменение расписания",assistant:"",status:"исходное дело"}]
    }
  };
  let CASES = {}, activeCaseId = null, caseTab = "Обзор";
  const hashStr = s => { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); };
  const cloneCase = o => JSON.parse(JSON.stringify(o));
  function genericCase(title,status){
    const id="gen-"+hashStr(title||"case"), assistant=currentSpace==="Семья"?"Домашкин":"Фиксарик", workId="work-"+assistant.toLowerCase()+"-"+hashStr(id);
    return { id, space:currentSpace, assistant, title:title||"Дело", goal:"—", status:status||"в работе",
      nextStep:"Определить следующий шаг", responsible:"вы", deadline:"—", visibility:"Участники дела", progress:25, agentWatch:true, requireConfirm:true,
      participants:[{name:"вы", contact:"вы", role:"Владелец", actions:["docs","tasks","confirm","invite"], notify:true, invite:"принято"}],
      plan:[{name:"Начало", tasks:[{name:"Разобраться в задаче", status:"todo", who:"вы"}]}],
      dialog:[{who:"agent", text:"Готов помочь с этим делом. С чего начнём?"}],
      docs:[], deadlines:[], agents:[[assistant,"ведёт отдельное рабочее дело","готов"]], linkedCases:[{id:workId,title:assistant+" — "+(title||"Дело"),assistant,status:"не начато"}] };
  }
  function assistantWorkCase(parent,link){ return { id:link.id, space:parent.space, assistantWork:link.assistant, parentCaseId:parent.id, title:link.title, goal:"Выполнить поручение по делу «"+parent.title+"»", status:"не начато", nextStep:"Ждёт поручения в исходном деле", responsible:link.assistant, deadline:"—", visibility:"Участники исходного дела", progress:0, agentWatch:true, requireConfirm:true, participants:parent.participants, plan:[{name:"Поручение",tasks:[]}], dialog:[{who:"agent",text:"Это отдельное рабочее дело "+link.assistant+". Здесь появятся только действия и диалог по вашему поручению."}], docs:[],deadlines:[],agents:[[link.assistant,"рабочее дело","готов"]],linkedCases:[{id:parent.id,title:parent.title,assistant:"",status:"исходное дело"}] }; }
  function openCaseRow(title,status,seed){
    const cs = cloneCase((seed && CASE_SEEDS[seed]) || genericCase(title,status));
    CASES[cs.id]=cs; (cs.linkedCases||[]).forEach(link=>{ if(!CASES[link.id]&&!CASE_SEEDS[link.id]) CASES[link.id]=assistantWorkCase(cs,link); }); activeCaseId=cs.id; caseTab="Обзор";
    if (location.hash !== "#case/"+cs.id) location.hash = "#case/"+cs.id; else renderCase();
  }
  window.openCaseRow = openCaseRow;

  const statusChip = s => { const c = /заверш|архив/i.test(s)?" done" : (/ожида|ждёт|просроч|сроч/i.test(s)?" warn" : (/^нов/i.test(s)?" info":"")); return '<span class="chip'+c+'">'+esc(s)+'</span>'; };
  const kvRow = (k,v) => '<div class="kvr"><span class="k">'+esc(k)+'</span><span class="v">'+esc(v)+'</span></div>';
  const toggleRow = (label,on,act) => '<button type="button" class="toggle'+(on?" on":"")+'" data-act="'+act+'" aria-pressed="'+on+'"><span class="knob"></span>'+esc(label)+'</button>';
  const activeCase = () => CASES[activeCaseId];
  const assistantWorkTitle = cs => cs.assistantWork ? cs.assistantWork+" · отдельное рабочее дело" : "";
  function linkedCasesPanel(cs){ const links=cs.linkedCases||[]; if(!links.length) return ""; return '<div class="section-t">Связанные дела</div><div class="lst">'+links.map(link=>'<div class="prow"><div><b>'+esc(link.title)+'</b><div class="rc-hint">'+esc(link.assistant ? link.assistant+' работает отдельно; действия и диалог — в этом деле.' : 'Связано с текущим делом.')+'</div></div>'+statusChip(link.status||"—")+'<button class="btn small" data-act="open-linked" data-id="'+attr(link.id)+'">Открыть</button></div>').join("")+'</div>'; }

  function caseTabPanel(cs,tab){
    if (tab==="Обзор") return '<div class="kv">'+kvRow("Цель",cs.goal)+kvRow("Статус",cs.status)+kvRow("Следующий шаг",cs.nextStep)+kvRow("Ответственный",cs.responsible)+kvRow("Срок",cs.deadline)+kvRow("Видимость",cs.visibility)+(cs.assistantWork?kvRow("Тип",assistantWorkTitle(cs)):"")+'</div>'+linkedCasesPanel(cs)+
      '<div class="cta-row" style="margin-top:16px"><button class="btn" data-act="goto-settings">Изменить дело</button><button class="btn" data-act="goto-plan">Открыть план</button></div>';
    if (tab==="Диалог") return '<div class="thread2">'+cs.dialog.map((m,i)=> m.who==="agent"
      ? '<div class="bubble"><small>'+esc(cs.assistantWork||cs.assistant||"Агент дела")+'</small><br>'+esc(m.text)+ (m.propose && !m.done ? '<div class="cta-row" style="margin-top:10px"><button class="btn primary" data-act="agent-yes" data-i="'+i+'">Подтвердить</button><button class="btn" data-act="agent-no" data-i="'+i+'">Отклонить</button></div>' : (m.done?'<div class="done-mark">✓ подтверждено</div>':'')) +'</div>'
      : '<div class="bubble user">'+esc(m.text)+'</div>').join("")+'</div>'+
      '<div class="composer" style="max-width:620px;margin-top:12px"><input placeholder="Сообщение по делу…" aria-label="Сообщение"><button aria-label="Отправить">→</button></div>';
    if (tab==="План") return cs.plan.map((st,si)=>'<div class="stage"><div class="stage-h">'+esc(st.name)+'</div>'+
      st.tasks.map((t,ti)=>'<div class="task"><span class="tstat '+t.status+'" aria-hidden="true"></span><div class="tmain"><b>'+esc(t.name)+'</b><span>'+esc(t.who||"")+'</span></div>'+
        (t.status==="done"?'<span class="chip">готово</span>':'<button class="btn small" data-act="task-done" data-s="'+si+'" data-t="'+ti+'">Отметить готово</button>')+'</div>').join("")+'</div>').join("")+linkedCasesPanel(cs);
    if (tab==="Участники") return '<div class="lst">'+cs.participants.map(p=>'<div class="prow"><div><b>'+esc(p.name)+'</b> · '+esc(p.role)+
      '<div class="perm-tags">'+(p.actions||[]).map(a=>'<span class="ptag">'+esc(PERM_LABELS[a]||a)+'</span>').join("")+(p.notify?'<span class="ptag">🔔 уведомления</span>':'')+'</div></div><span class="chip">'+esc(p.invite)+'</span></div>').join("")+'</div>'+
      '<div class="section-t">Добавить участника</div>'+
      '<form class="pform" data-act="add-part">'+
        '<div class="pf-row"><label>Имя<input name="name" required></label><label>Контакт<input name="contact" placeholder="Telegram / телефон / email"></label>'+
        '<label>Роль<select name="role"><option>Взрослый</option><option>Ребёнок</option><option>Помощник</option></select></label></div>'+
        '<fieldset class="perms"><legend>Что разрешено</legend>'+Object.keys(PERM_LABELS).map(k=>'<label class="chk"><input type="checkbox" name="perm" value="'+k+'"> '+esc(PERM_LABELS[k])+'</label>').join("")+'</fieldset>'+
        '<label class="chk"><input type="checkbox" name="notify" checked> Получает уведомления</label>'+
        '<div class="cta-row"><button class="btn primary" type="submit">Пригласить</button></div></form>';
    if (tab==="Документы") return cs.docs.length? '<div class="lst">'+cs.docs.map(d=>'<div class="prow"><div><b>'+esc(d[0])+'</b></div><span class="when">'+esc(d[1])+'</span></div>').join("")+'</div>' : emptyState("📄","Пока нет документов","Их приложат участники или агент по ходу дела.","","");
    if (tab==="Сроки") return cs.deadlines.length? '<div class="lst">'+cs.deadlines.map(d=>'<div class="prow"><div><b>'+esc(d[0])+'</b></div>'+(d[2]?statusChip(d[2]):'<span class="when">'+esc(d[1])+'</span>')+'</div>').join("")+'</div>' : emptyState("🗓","Сроков пока нет","Появятся, когда в деле возникнут даты и напоминания.","","");
    if (tab==="Агенты") return '<div class="lst">'+cs.agents.map(a=>'<div class="prow"><div><b>'+esc(a[0])+'</b><span> · '+esc(a[1])+'</span></div><span class="chip">'+esc(a[2])+'</span></div>').join("")+'</div>'+
      '<div class="section-t">Границы агентов</div><div class="toggles">'+toggleRow("Разрешить наблюдение за делом",cs.agentWatch,"toggle-watch")+toggleRow("Спрашивать подтверждение перед действием",cs.requireConfirm,"toggle-confirm")+'</div>';
    if (tab==="Настройки") return '<form class="pform" data-act="save-case">'+
      '<div class="pf-row"><label>Название<input name="title" value="'+attr(cs.title)+'"></label><label>Цель<input name="goal" value="'+attr(cs.goal)+'"></label></div>'+
      '<div class="pf-row"><label>Ответственный<select name="responsible">'+cs.participants.map(p=>'<option'+(p.name===cs.responsible?' selected':'')+'>'+esc(p.name)+'</option>').join("")+'</select></label><label>Срок<input name="deadline" value="'+attr(cs.deadline)+'"></label></div>'+
      '<fieldset class="perms"><legend>Кто видит дело</legend>'+["Только я","Участники дела","По ссылке"].map(v=>'<label class="chk"><input type="radio" name="visibility" value="'+attr(v)+'"'+(cs.visibility===v?' checked':'')+'> '+esc(v)+'</label>').join("")+'</fieldset>'+
      '<div class="toggles">'+toggleRow("Наблюдение агента",cs.agentWatch,"toggle-watch")+toggleRow("Требовать подтверждение перед действием",cs.requireConfirm,"toggle-confirm")+'</div>'+
      '<div class="cta-row"><button class="btn primary" type="submit">Сохранить</button><button class="btn" type="button" data-act="archive">Архивировать дело</button></div></form>';
    return "";
  }

  function renderCase(fast){
    const cs = activeCase(); if(!cs) return;
    const sp = SPACE_NODES[cs.space] || SPACE_NODES[currentSpace];
    const build = () =>
      '<div class="crumbs"><a href="#'+(sp?sp.id:"0")+'">'+esc(cs.space)+'</a><span class="sep">›</span><span>'+esc(cs.title)+'</span></div>'+
      '<p class="eyebrow" style="color:var(--cyan)">Дело · '+esc(cs.space)+'</p>'+
      '<h1 style="margin:2px 0 0;font-size:28px">'+esc(cs.title)+'</h1>'+
      '<div class="pmeta" style="margin-top:10px">'+statusChip(cs.status)+'<span>Следующий шаг: '+esc(cs.nextStep)+'</span><span>Ответственный: '+esc(cs.responsible)+'</span><span>Срок: '+esc(cs.deadline)+'</span><span>Прогресс '+cs.progress+'%</span></div>'+
      '<div class="case-tabs" id="ctabs">'+CASE_TABS.map(t=>'<button class="ct'+(t===caseTab?" active":"")+'" data-tab="'+esc(t)+'">'+esc(t)+'</button>').join("")+'</div>'+
      '<div id="casepanel">'+caseTabPanel(cs,caseTab)+'</div>';
    if (fast){ vwrap.innerHTML = build(); vwrap.parentElement.scrollTop = 0; bindCase(); }
    else { loadThen(build, skeletonCase(), bindCase); }
  }

  function bumpProgress(cs){ const all=cs.plan.flatMap(s=>s.tasks); const done=all.filter(t=>t.status==="done").length; cs.progress=Math.round(done/all.length*100); }
  function bindCase(){
    const tabs=document.getElementById("ctabs"); if(!tabs) return;
    tabs.onclick=e=>{ const b=e.target.closest(".ct"); if(!b)return; caseTab=b.dataset.tab; renderCase(true); };
    const panel=document.getElementById("casepanel");
    panel.onclick=e=>{
      const b=e.target.closest("[data-act]"); if(!b)return; const cs=activeCase(); const act=b.dataset.act;
      if(act==="goto-settings"){ caseTab="Настройки"; renderCase(true); }
      else if(act==="goto-plan"){ caseTab="План"; renderCase(true); }
      else if(act==="open-linked"){ routeCase(b.dataset.id); }
      else if(act==="task-done"){ cs.plan[+b.dataset.s].tasks[+b.dataset.t].status="done"; bumpProgress(cs); renderCase(true); }
      else if(act==="toggle-watch"){ cs.agentWatch=!cs.agentWatch; renderCase(true); }
      else if(act==="toggle-confirm"){ cs.requireConfirm=!cs.requireConfirm; renderCase(true); }
      else if(act==="archive"){ if(window.confirm("Архивировать дело? Оно уйдёт в архив, но не удалится.")){ cs.status="в архиве"; renderCase(true); } }
      else if(act==="agent-no"){ const m=cs.dialog[+b.dataset.i]; m.propose=false; cs.dialog.push({who:"user",text:"Пока не надо."}); renderCase(true); }
      else if(act==="agent-yes"){
        const m=cs.dialog[+b.dataset.i]; m.done=true;
        cs.dialog.push({who:"user",text:"Подтверждаю."});
        cs.dialog.push({who:"agent",text:"Готово: напоминание перенесено на понедельник 19:00, контрольная добавлена в семейный календарь."});
        const t=cs.plan.flatMap(s=>s.tasks).find(x=>x.status==="waiting"); if(t){ t.status="done"; t.who="Агент"; }
        cs.nextStep="Напомнить Мише вечером"; bumpProgress(cs); renderCase(true);
      }
    };
    panel.onsubmit=e=>{
      const f=e.target.closest("form[data-act]"); if(!f)return; e.preventDefault(); const cs=activeCase();
      if(f.dataset.act==="add-part"){
        const perms=[...f.querySelectorAll('input[name="perm"]:checked')].map(x=>x.value);
        cs.participants.push({ name:f.name.value.trim()||"Участник", contact:f.contact.value.trim()||"—", role:f.role.value, actions:perms, notify:f.notify.checked, invite:"приглашение отправлено" });
        caseTab="Участники"; renderCase(true);
      } else if(f.dataset.act==="save-case"){
        cs.title=f.title.value.trim()||cs.title; cs.goal=f.goal.value.trim()||"—"; cs.responsible=f.responsible.value;
        cs.deadline=f.deadline.value.trim()||"—"; const v=f.querySelector('input[name="visibility"]:checked'); if(v)cs.visibility=v.value;
        renderCase(true);
      }
    };
  }

  /* ═══ РЕАЛЬНЫЕ ДЕЛА (Фаза 2) ══════════════════════════════════════════════
     Читаем и пишем настоящий case_service через шлюз. Контракт сверен по
     исходникам (см. корпус 62). Гость (без токена) остаётся на демо. Пути —
     строго из белого списка шлюза; идентичность (owner_id/principal_id/…)
     подставляет шлюз, мы её не шлём. Права участника менять нельзя (нет ручки),
     показываем как есть; менять можно только may_see (нужно право «решения»). */
  const RU_STATE={active:"в работе",waiting:"ждёт человека",closed:"завершено",archived:"в архиве"};
  const RU_SCOPE={"":"—",personal:"Личное",home:"Семья",pro:"Практика"};
  const RIGHT_RU={read:"чтение",comment:"комментарии",decide:"решения"};
  const SEE_RU={normal:"обычное",pii:"персональные",medical:"медицина",financial:"финансы",legal:"юридич.",biometric:"биометрия"};
  const SEE_ALL=["normal","pii","medical","financial","legal","biometric"];
  const STATEMENT_ACCEPT="application/pdf,.pdf,text/csv,.csv,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/zip,.zip,image/*";
  const ROLE_RU={owner:"Владелец",spouse:"Супруг(а)",lawyer:"Юрист",client:"Клиент",dealer:"Дилер",doctor:"Врач",agronomist:"Агроном",colleague:"Коллега",observer:"Наблюдатель",assistant:"Помощник"};
  const ENG_RU={owner:"владелец",paid:"платно",volunteer:"добровольно",partner:"партнёр"};
  const RUN_STATUS={queued:"в очереди",running:"выполняется",waiting_approval:"ждёт подтверждения",succeeded:"завершён",failed:"не удался",cancelled:"отменён",pending:"ожидает",claimed:"взят",skipped:"пропущен"};
  const INVITE_ROLES=["colleague","spouse","observer","lawyer","client","doctor","agronomist"];
  const SPACE_SCOPE={"Личное":"personal","Семья":"home","Практика":"pro","Проекты и исследования":"research"};
  const KIND_RU={"case.created":"дело создано","case.updated":"дело обновлено","work.commissioned":"работа заказана","case.state_changed":"статус изменён","routing.set":"назначен агент","brief.updated":"бриф обновлён","workflow.transitioned":"этап изменён","participant.added":"участник добавлен","participant.removed":"участник удалён","participant.may_see_changed":"доступ участника изменён","subject.added":"объект добавлен","client.set":"клиент задан","scope_set":"область задана","decision.made":"решение принято","action.added":"добавлено действие","action.updated":"пункт плана изменён","action.completed":"действие выполнено","material.added":"добавлен материал","material.extracted":"материал разобран","source.read":"источник прочитан","deal.stage_set":"стадия сделки","option.added":"добавлен вариант","calendar.event.added":"событие в календаре","draft.added":"черновик добавлен","dialog":"сообщение","thread_started":"начато обсуждение","handoff":"передача","owner_transferred":"передано владение","permit.granted":"разрешение выдано","permit.revoked":"разрешение отозвано","patch.proposed":"агент предлагает изменение","patch.applied":"изменение применено","patch.denied":"изменение отклонено","run.created":"запущен агент","run.step.claimed":"шаг взят","run.step.waiting_approval":"шаг ждёт подтверждения","run.step.succeeded":"шаг выполнен","run.step.skipped":"шаг пропущен","run.step.failed":"шаг не удался","run.succeeded":"агент завершил","run.failed":"агент не смог"};

  let REAL={loaded:false,loading:false,cases:[],error:null};
  let activeReal=null, realTab="Обзор";
  const onMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const defaultRealTab = () => onMobile()?"Диалог":"Обзор";
  const REAL_TABS=["Обзор","Диалог","Журнал","План","Сроки","Документы","Участники","Настройки"];
  const realTabs = c => { const tabs=isDomashkinCase(c) ? ["Обзор","Диалог","Школа","Журнал","План","Сроки","Документы","Участники","Настройки"] : REAL_TABS.slice(); if(c&&c.id===LAYA_ROUTING_CASE_ID)tabs.splice(1,0,"Обучение Лайи"); if(onMobile()){ const i=tabs.indexOf("Диалог"); if(i>0)tabs.unshift(tabs.splice(i,1)[0]); } return tabs; };
  function hasSession(){ return !!authState.token; }
  function realMode(){ return hasSession() && !!SPACE_SCOPE[currentSpace]; }

  function fmtWhen(iso){ if(!iso) return ""; const d=new Date(iso); if(isNaN(d.getTime())) return ""; const M=["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"]; const now=new Date(); const hh=String(d.getHours()).padStart(2,"0"),mm=String(d.getMinutes()).padStart(2,"0"); return d.toDateString()===now.toDateString()?("сегодня "+hh+":"+mm):(d.getDate()+" "+M[d.getMonth()]+", "+hh+":"+mm); }
  function calendarInputValue(date){ const d=date||new Date(Date.now()+24*60*60*1000), pad=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes()); }
  function dateInputValue(date){ const d=date||new Date(), pad=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  const CALENDAR_KIND={deadline:"Срок",hearing:"Заседание",meeting:"Встреча",reminder:"Напоминание"};
  async function loadRealCases(force){
    if(!authState.token||!authState.principal){ REAL.cases=[]; REAL.loaded=true; return; }
    if(REAL.loading) return; if(REAL.loaded && !force) return;
    REAL.loading=true;
    try{ const arr=await authFetch("GET","/principals/"+encodeURIComponent(authState.principal)+"/cases"); REAL.cases=Array.isArray(arr)?arr:[]; REAL.loaded=true; REAL.error=null; }
    catch(e){ REAL.error=e; REAL.cases=[]; REAL.loaded=true; }
    REAL.loading=false;
  }
  const isLegacyHomeworkAnalysisCase = c => /^Разбор домашнего задания$/i.test(String(c&&c.title||"").trim());
  const SBERINDEX_AGENTS=["sberindex_atlas_researcher","sberindex_radar_researcher","sberindex_graph_steward","sberindex_research_curator","adam_flybrain_researcher"];
  // Пока у Case нет поля project_id, связь проекта с веткой живёт в событиях
  // branch.started/branch.parent. Эти два id лишь помещают дела в нужную витрину;
  // право открыть их по-прежнему проверяет case-service.
  const FIXAR_PROJECT_CASE_ID="case_007520a9dcf04799";
  const SELFDIAG_CASE_ID="case_414597baaa0f4873";
  const LAYA_ROUTING_CASE_ID="case_81ff039dfdd645d6";
  const LAYA_REVIEW_TABLE_ID="tbl_33ac43226de644f5";
  const LAYA_BATCH_WHAT="Рой практиков · запустить следующий батч";
  const LAYA_BATCH_MARKER="laya_swarm_batch_v1";
  const HARNESS_ROUTER_CASE_ID="case_4b85ae06b5fa4145";
  const SBERINDEX_PROJECT_CASE_ID="case_c09b77b6882c486e";
  const SBERINDEX_CHILD_CASE_IDS=["case_66cae4a89ba6473f","case_008f37d03cf541e5","case_43de12a8dc2e4abd","case_d058db85c48a487c"];
  const RESEARCH_PROJECT_CASE_IDS=new Set([FIXAR_PROJECT_CASE_ID,HARNESS_ROUTER_CASE_ID,SBERINDEX_PROJECT_CASE_ID]);
  const isProjectParent = c => !!c&&(c.project_kind==="project"||c.project_kind==="research"||c.id===FIXAR_PROJECT_CASE_ID||c.id===SBERINDEX_PROJECT_CASE_ID);
  const isResearchCase = c => !!c&&(["project","research","branch"].includes(c.project_kind)||SBERINDEX_AGENTS.includes(c.selected_agent_id)||RESEARCH_PROJECT_CASE_IDS.has(c.id));
  const PROJECT_LINKS=new Map(),PROJECT_LINKS_LOADING=new Set();
  function projectChildren(parent,cases){
    if(!PROJECT_LINKS.has(parent.id)&&!PROJECT_LINKS_LOADING.has(parent.id)&&hasSession()){
      PROJECT_LINKS_LOADING.add(parent.id);
      authFetch("GET","/cases/"+encodeURIComponent(parent.id)+"/events?kind=branch.started&limit=200&newest=true")
        .then(events=>{ const seen=new Set(); PROJECT_LINKS.set(parent.id,(events||[]).map(event=>String(eventPayload(event).child_case_id||"")).filter(id=>id&&!seen.has(id)&&seen.add(id))); })
        .catch(()=>PROJECT_LINKS.set(parent.id,[]))
        .finally(()=>{PROJECT_LINKS_LOADING.delete(parent.id);refreshCurrentView();});
    }
    const ids=PROJECT_LINKS.get(parent.id)||[];
    return ids.map(id=>cases.find(c=>c.id===id)).filter(Boolean);
  }
  function spaceForRealCase(c){
    if((c.scope||"")==="home")return "Семья";
    if(isResearchCase(c))return "Проекты и исследования";
    if((c.scope||"")==="pro")return c.domain==="software"?"Разработка":"Практика";
    return "Личное";
  }
  function caseSpaceName(c){ return spaceForRealCase(c); }
  function realCasesForSpace(space){
    const cases=REAL.cases.filter(c=>c.state!=="archived"&&!isLegacyHomeworkAnalysisCase(c));
    if(space==="Личное") return cases.filter(c=>{const s=c.scope||"";return s===""||s==="personal";});
    if(space==="Семья")  return cases.filter(c=>(c.scope||"")==="home");
    if(space==="Практика")return cases.filter(c=>(c.scope||"")==="pro"&&c.domain!=="software"&&!isResearchCase(c));
    if(space==="Разработка")return cases.filter(c=>(c.scope||"")==="pro"&&c.domain==="software"&&!isResearchCase(c));
    if(space==="Проекты и исследования")return cases.filter(isResearchCase);
    return [];
  }
  const LAST_ACTIVE_CASE_KEY="fixar-v2-last-active-case:";
  function rememberLastActiveCase(c){
    if(!c||!authState.principal||c.state==="closed"||c.state==="archived")return;
    put(LAST_ACTIVE_CASE_KEY+authState.principal,c.id);
  }
  function restoreLastActiveCase(){
    if(!authState.signed_in||!authState.principal||!REAL.loaded||REAL.error)return false;
    const raw=location.hash.slice(1),familyHome=kidOf(SPACE_NODES["Семья"],"Главная");
    // Прямая ссылка и осознанно открытый раздел старше автоматического возврата.
    // На старте оболочка сама ставит семейную главную — это и есть landing,
    // который после входа заменяем последним живым делом.
    if(raw&&raw!==familyHome)return false;
    const active=REAL.cases.filter(c=>c.state!=="closed"&&c.state!=="archived"&&!isLegacyHomeworkAnalysisCase(c));
    if(!active.length)return false;
    const remembered=store(LAST_ACTIVE_CASE_KEY+authState.principal),chosen=active.find(c=>c.id===remembered)||active.slice().sort((left,right)=>String(right.updated_at||"").localeCompare(String(left.updated_at||"")))[0];
    if(!chosen)return false;
    currentSpace=spaceForRealCase(chosen);rebuildNav();realTab=defaultRealTab();
    if(location.hash!=="#case/"+chosen.id)location.hash="#case/"+chosen.id;else routeCase(chosen.id);
    return true;
  }
  async function openFamilyDialog(message){
    if(!authState.token){ openAccount(); return; }
    await ensureSession(); await loadRealCases(true);
    let dialog=REAL.cases.find(c=>c.scope==="home"&&/^(?:Семейный д|Д)иалог с Домашкиным$/.test(c.title||"")&&c.state==="active");
    if(!dialog){
      dialog=await authFetch("POST","/cases",{title:"Диалог с Домашкиным",goal:"Семейные вопросы, школа и ближайшие изменения",side:"need_help"});
      await authFetch("POST","/cases/"+encodeURIComponent(dialog.id)+"/scope",{scope:"home"});
      REAL.loaded=false;
    }else if(dialog.title!=="Диалог с Домашкиным"){
      dialog=await authFetch("PUT","/cases/"+encodeURIComponent(dialog.id)+"/details",{title:"Диалог с Домашкиным",goal:dialog.goal||"Семейные вопросы, школа и ближайшие изменения",expect_version:dialog.version});
      REAL.loaded=false;
    }
    currentSpace="Семья"; rebuildNav(); realTab=defaultRealTab(); location.hash="#case/"+dialog.id;
    await renderRealCase(dialog.id); if(message) await askCaseAgent(message);
  }
  window.openFamilyDialog=openFamilyDialog;
  const caseMeta = c => ((c.participants||[]).length)+" уч. · обновлено "+fmtWhen(c.updated_at);
  function eventPayload(ev){ const p=ev&&ev.payload; if(typeof p!=="string") return p||{}; try{return JSON.parse(p)||{};}catch(_){return{};} }
  const isDomashkinCase = c => !!c && /домашкин/i.test(c.title||"");
  const assistantName = c => { if(isDomashkinCase(c)) return "Домашкин"; if(c&&c.selected_agent_id){ if(/fixarik|fixar/i.test(c.selected_agent_id)) return "Фиксарик"; const practice=PRACTICE.items.find(item=>item.domain===c.domain&&item.agent===c.selected_agent_id); return practice?practiceTitle(practice):c.selected_agent_id; } return "Фиксарик"; };
  function domashkinBookPanel(){
    if(!isDomashkinCase(activeReal.c) || !activeReal.isOwner) return "";
    const children=activeReal.children||[];
    if(!children.length) return '<div class="book-upload"><h3>Загрузить учебник</h3><p>Сначала добавьте профиль ребёнка в настройках Домашкина. Детские данные читаются только после подтверждённого входа.</p><div class="cta-row"><a class="btn" href="/fixclo/?preset=education.domashkin&amp;channel=max&amp;pilot=domashkin">Настроить Домашкина</a></div></div>';
    return '<div class="book-upload"><h3>Загрузить учебник</h3><p>PDF останется приватным и будет использоваться Домашкиным только для выбранного ребёнка.</p><form class="pform" data-act="textbook-upload">'+
      '<div class="pf-row"><label>Ребёнок<select name="child" required>'+children.map(child=>'<option value="'+attr(child.id)+'">'+esc(child.display_name||"Ребёнок")+(child.grade?' · '+esc(String(child.grade))+' класс':'')+'</option>').join("")+'</select></label><label>Предмет<input name="subject" required maxlength="80" placeholder="Математика"></label></div>'+
      '<label class="book-file"><input name="book" type="file" accept="application/pdf,.pdf" required><span class="btn small">Скрепка · выбрать PDF</span><span class="book-file-name">Файл не выбран</span></label>'+
      '<fieldset class="perms"><legend>Отдельный вопрос об общем корпусе</legend><label class="chk"><input name="share" type="checkbox"> Предложить эту книгу общему корпусу после проверки прав</label><div data-share-fields hidden style="margin-top:10px"><label>Основание<select name="rights_basis"><option value="rights_holder">Я правообладатель</option><option value="open_license">Открытая лицензия</option></select></label><label style="display:block;margin-top:8px">Ссылка на лицензию<input name="license_url" type="url" placeholder="https://…" style="width:100%"></label><p class="rc-hint">Заявка не публикует файл автоматически. До проверки книга остаётся приватной.</p></div></fieldset>'+
      '<div class="cta-row"><button class="btn primary" type="submit">Загрузить и разобрать</button></div><div class="rc-hint" data-book-status>'+esc(activeReal.textbookStatus||"")+'</div></form></div>';
  }
  function domashkinParentInvitePanel(){
    if(!isDomashkinCase(activeReal.c) || !activeReal.canDecide) return "";
    const hasSecondParent=(activeReal.c.participants||[]).some(p=>p.principal_id!==activeReal.c.owner_id&&p.role==="spouse");
    if(hasSecondParent) return '<div class="rc-strip"><h3>Второй родитель подключён</h3><p class="rc-hint">Он участвует в деле Домашкина и получает уведомления о новых сообщениях. Каждый родитель управляет своими каналами уведомлений самостоятельно.</p></div>';
    return '<div class="rc-strip"><h3>Пригласить второго родителя</h3><p class="rc-hint">Он сможет читать и обсуждать материалы, назначать семейные действия и подтверждать предложения Домашкина. Персональные сведения открываются явно, без передачи вашего логина от дневника.</p>'+
      '<form class="pform" data-act="invite-parent"><label class="chk"><input name="pii" type="checkbox" checked> Разрешить видеть персональные сведения в этом деле</label><label class="chk"><input name="decide" type="checkbox" checked> Разрешить подтверждать действия Домашкина</label><p class="rc-hint">После принятия ссылки уведомления о новых сообщениях дела включены по умолчанию. Доступ к самому электронному дневнику остаётся отдельным и проверяется сервером.</p><div class="cta-row"><button class="btn primary" type="submit">Создать семейное приглашение</button></div><div data-parent-invite-out></div></form></div>';
  }
  function domashkinFamilyThreadPanel(){
    if(!isDomashkinCase(activeReal.c))return "";
    const messages=(activeReal.familyThread&&activeReal.familyThread.messages)||[];
    const rows=messages.slice(-20).map(message=>{ const participant=(activeReal.c.participants||[]).find(p=>p.principal_id===message.author_id); const author=message.author_id===authState.principal?"Вы":((participant&&participant.display_name)||"Второй родитель"); return '<div class="ev principal"><div class="eh"><b>'+esc(author)+'</b> · '+esc(fmtWhen(message.at))+'</div><div class="et">'+esc(message.retracted?"Сообщение отозвано":message.body)+'</div></div>'; }).join("");
    return '<div class="section-t">Семейное обсуждение</div>'+(rows||'<p class="rc-hint">Напишите первое сообщение. После принятия приглашения второй родитель получит следующие сообщения через свои подключённые каналы.</p>')+'<form class="composer" data-act="family-message" style="max-width:720px;display:flex;flex-direction:column"><textarea name="message" required rows="2" maxlength="8000" style="resize:vertical;min-height:58px" placeholder="Например, я заберу после изменённого шестого урока"></textarea><button class="btn primary" type="submit">Отправить семье</button></form>';
  }
  function realLinksPanel(){
    const plans={}, links=[];
    (activeReal.events||[]).forEach(ev=>{ const p=eventPayload(ev); if(ev.kind==="plan.branches") (p.branches||[]).forEach((branch,index)=>plans[index]=branch); if(ev.kind==="branch.started"&&p.child_case_id) links.push({id:String(p.child_case_id),title:String(p.title||((plans[p.ord]||{}).title)||"Рабочее дело")}); });
    if(!links.length)return isProjectParent(activeReal.c)?'<div class="section-t">Ветви проекта</div><p class="rc-hint">Ветвей пока нет. Создайте первую — она появится здесь и получит отдельный диалог.</p>':"";
    return '<div class="section-t">Связанные рабочие дела</div><div class="lst">'+links.map(link=>'<div class="prow"><div><b>'+esc(link.title)+'</b><div class="rc-hint">'+esc(assistantName(activeReal.c))+' работает в отдельном деле: его действия и диалог находятся там.</div></div><button class="btn small" data-act="open-real-linked" data-id="'+attr(link.id)+'">Открыть</button></div>').join("")+'</div>';
  }

  async function loadAllEvents(id){ let out=[],since=0; for(let i=0;i<20;i++){ const page=await authFetch("GET","/cases/"+encodeURIComponent(id)+"/events?since_seq="+since); if(!Array.isArray(page)||!page.length) break; out=out.concat(page); const mx=page.reduce((m,e)=>Math.max(m,e.seq||0),since); since=mx+1; if(page.length<200) break; } return out; }
  const evText = ev => { const p=ev.payload||{}; return p.title||p.message||p.text||p.note||p.name||p.step||p.reason||p.summary||""; };
  function evActor(ev){ if(ev.actor_kind==="principal"&&ev.actor_id===authState.principal)return "Вы"; if(ev.actor_kind==="agent")return assistantName(activeReal&&activeReal.c); if(ev.actor_kind==="system")return "Система"; if(ev.actor_kind==="worker")return "Служба"; if(ev.actor_kind==="principal"){ const p=(activeReal&&(activeReal.c.participants||[]).find(x=>x.principal_id===ev.actor_id)); return (p&&p.display_name)||"Человек"; } return ev.actor_kind||"—"; }
  function eventLine(ev){ const k=KIND_RU[ev.kind]||ev.kind; const t=evText(ev); const ag=ev.actor_kind==="agent"; return '<div class="ev '+esc(ev.actor_kind||"")+'"><div class="eh"><b>'+esc(evActor(ev))+'</b> · '+esc(k)+(ag?'<span class="badge">агент</span>':'')+' · '+esc(fmtWhen(ev.created_at))+'</div>'+(t?'<div class="et">'+esc(t)+'</div>':'')+'</div>'; }
  function ownerName(){ const c=activeReal.c; const o=(c.participants||[]).find(p=>p.role==="owner"); if(o&&o.display_name)return o.display_name; return c.owner_id===authState.principal?"Вы":"—"; }

  function routeCase(id){
    syncHomeChrome(null);
    if(!authState.ready){ window.setTimeout(()=>{ if(location.hash==="#case/"+id) routeCase(id); },80); return; }
    if (CASE_SEEDS[id] || CASES[id] || /^gen-/.test(id)){ if(!CASES[id]&&CASE_SEEDS[id])CASES[id]=cloneCase(CASE_SEEDS[id]); if(CASES[id]){ activeReal=null; activeCaseId=id; caseTab="Обзор"; renderCase(); } return; }
    if (hasSession()){ activeCaseId=null; realTab=defaultRealTab(); renderRealCase(id); return; }
    go(kidOf(SPACE_NODES[currentSpace],"Главная"));
  }
  async function optionalCaseLoad(loader,fallback){ try{return {value:await loader(),error:""};}catch(error){return {value:fallback,error};} }
  async function renderRealCase(id){
    vwrap.innerHTML=skeletonCase(); vwrap.parentElement.scrollTop=0;
    try{
      const c=await authFetch("GET","/cases/"+encodeURIComponent(id));
      const caseSpace=spaceForRealCase(c); if(currentSpace!==caseSpace){currentSpace=caseSpace;rebuildNav();}
      const encoded=encodeURIComponent(id),isOwner=c.owner_id===authState.principal,domashkin=isDomashkinCase(c),ownerDomashkin=isDomashkinCase(c)&&c.owner_id===authState.principal,loadOffers=isOwner&&c.template_id&&(!c.selected_agent_id||c.tariff_id);
      const [events,runsLoad,patchesLoad,draftsLoad,actionsLoad,materialsLoad,offersLoad,calendarLoad,childrenLoad,agentsLoad,threadLoad,layaTableLoad]=await Promise.all([
        loadAllEvents(id),
        optionalCaseLoad(()=>authFetch("GET","/cases/"+encoded+"/runs?limit=10"),[]),
        optionalCaseLoad(()=>authFetch("GET","/cases/"+encoded+"/patches?status=pending_approval"),{patches:[]}),
        optionalCaseLoad(()=>authFetch("GET","/cases/"+encoded+"/drafts"),{drafts:[]}),
        optionalCaseLoad(()=>authFetch("GET","/cases/"+encoded+"/actions"),[]),
        optionalCaseLoad(()=>authFetch("GET","/cases/"+encodeURIComponent(id)+"/materials"),{materials:[],hidden:0}),
        loadOffers?optionalCaseLoad(()=>authFetch("GET","/offers?q="+encodeURIComponent(c.goal||c.title||"")),{offers:[]}):Promise.resolve({value:{offers:[]},error:""}),
        isOwner?optionalCaseLoad(()=>authFetch("GET","/calendar?case_id="+encodeURIComponent(id)+"&days=730&past=365"),{events:[]}):Promise.resolve({value:{events:[]},error:""}),
        ownerDomashkin?optionalCaseLoad(()=>authFetch("GET","/homework/children"),[]):Promise.resolve({value:[],error:""}),
        ownerDomashkin?optionalCaseLoad(()=>authFetch("GET","/personal-agents"),{agents:[]}):Promise.resolve({value:{agents:[]},error:""}),
        domashkin?optionalCaseLoad(async()=>{ const list=await authFetch("GET","/principals/"+encodeURIComponent(authState.principal)+"/threads?limit=100"),ref=(list.threads||[]).find(thread=>thread.case_id===id); if(!ref)return null; const value=await authFetch("GET","/threads/"+encodeURIComponent(ref.thread_id)),messages=value.messages||[]; if(messages.length)try{await authFetch("POST","/threads/"+encodeURIComponent(ref.thread_id)+"/read",{seq:messages[messages.length-1].seq});}catch(_){} return value; },null):Promise.resolve({value:null,error:""}),
        id===LAYA_ROUTING_CASE_ID&&isOwner?optionalCaseLoad(()=>authFetch("GET","/cases/"+encoded+"/tables/"+LAYA_REVIEW_TABLE_ID),null):Promise.resolve({value:null,error:""})
      ]);
      const runs=Array.isArray(runsLoad.value)?runsLoad.value:[],patches=Array.isArray(patchesLoad.value&&patchesLoad.value.patches)?patchesLoad.value.patches:[],drafts=Array.isArray(draftsLoad.value&&draftsLoad.value.drafts)?draftsLoad.value.drafts:[],nextActions=Array.isArray(actionsLoad.value)?actionsLoad.value:[];
      const mm=materialsLoad.value,materialsDoc=mm||{},materials=Array.isArray(materialsDoc.materials)?materialsDoc.materials:[],hiddenMaterials=Number(mm&&mm.hidden)||0,domain=String(c.template_id||"").split(".")[0],workOffers=((offersLoad.value&&offersLoad.value.offers)||[]).filter(offer=>offer.domain===domain);
      const calendarEvents=Array.isArray(calendarLoad.value&&calendarLoad.value.events)?calendarLoad.value.events:[],calendarError=calendarLoad.error?((calendarLoad.error&&calendarLoad.error.message)||"Календарь временно недоступен."):"";
      const children=Array.isArray(childrenLoad.value)?childrenLoad.value:[],childrenError=childrenLoad.error?((childrenLoad.error&&childrenLoad.error.message)||"Не удалось проверить профили детей."):"",personalAgents=Array.isArray(agentsLoad.value&&agentsLoad.value.agents)?agentsLoad.value.agents:[],familyThread=threadLoad.value||null;
      const me=(c.participants||[]).find(p=>p.principal_id===authState.principal)||{};
      const eventQuestionnaire=questionnaireFromEvents(events);
      const pendingQuestionnaire=eventQuestionnaire===undefined?readQuestionnaire(id):eventQuestionnaire;
      rememberQuestionnaire(id,pendingQuestionnaire);
      activeReal={ c, events, runs, patches, drafts, nextActions, materials, hiddenMaterials, calendarEvents, calendarError, workOffers, children, childrenError, personalAgents, familyThread, layaTable:layaTableLoad.value, layaTableError:layaTableLoad.error, school:null, textbookStatus:"", reply:"", questionnaire:pendingQuestionnaire, questionnaireAutoOpen:!!pendingQuestionnaire, dialogHistoryShown:50, myRights:(me.rights||[]), canDecide:((me.rights||[]).indexOf("decide")>=0)||(c.owner_id===authState.principal), canComment:((me.rights||[]).indexOf("comment")>=0)||(c.owner_id===authState.principal), isOwner:c.owner_id===authState.principal };
      rememberLastActiveCase(c);
      if(isDomashkinCase(c)&&activeReal.isOwner&&children.length) await loadSchoolDay(children[0].id,dateInputValue(new Date(Date.now()+24*60*60*1000)),false);
      if(location.hash!=="#case/"+id) location.hash="#case/"+id;
      drawRealCase();
    }catch(e){
      vwrap.innerHTML=errorBox(e.status===410?"Это дело удалено.":(e.status===403?"Нет доступа к этому делу.":(e.message||"Не удалось открыть дело.")),'data-act="rc-retry"');
      const rb=vwrap.querySelector('[data-act="rc-retry"]'); if(rb) rb.onclick=()=>renderRealCase(id);
    }
  }
  // Вкладки дела: частые — всегда, редкие (журнал, сроки, люди, настройки) —
  // по кнопке «Ещё». Открытую редкую вкладку видно всегда; выбор «показывать
  // все» запоминается на устройстве.
  const PRIMARY_REAL_TABS=["Обзор","Диалог","План","Документы","Школа"];
  const CASE_TABS_ALL_KEY="fixar-v2-case-tabs-all";
  let realTabsAll=store(CASE_TABS_ALL_KEY)==="1";
  function realTabsHtml(tabsForCase){
    const shown=tabsForCase.filter(t=>realTabsAll||PRIMARY_REAL_TABS.indexOf(t)>=0||t===realTab),hidden=tabsForCase.length-shown.length;
    return shown.map(t=>'<button class="ct'+(t===realTab?" active":"")+'" data-rtab="'+esc(t)+'">'+esc(t)+'</button>').join("")+
      (hidden?'<button class="ct ct-more" type="button" data-rtabs-more aria-label="'+attr(uiText("Показать ещё вкладки","Show more tabs"))+'">'+uiText("Ещё","More")+' · '+hidden+'</button>':'');
  }
  function drawRealCase(){
    const c=activeReal.c; const sp=SPACE_NODES[currentSpace];
    const tabsForCase=realTabs(c); if(tabsForCase.indexOf(realTab)<0) realTab=defaultRealTab();
    const assistant=assistantName(c),domashkin=isDomashkinCase(c),practice=(c.scope||"")==="pro",tone=domashkin?"domashkin":(practice?"practice":"fixarik"),symbol=domashkin?"⌂":(practice?"§":"✦");
    vwrap.classList.toggle("dialog-view",realTab==="Диалог");
    vwrap.innerHTML=
      '<main class="case-detail-shell case-tone-'+tone+'"><div class="crumbs"><a href="#'+(sp?sp.id:"0")+'">'+esc(currentSpace)+'</a><span class="sep">›</span><span>'+esc(c.title||"Дело")+'</span></div>'+
      '<header class="case-detail-header"><span class="case-detail-avatar" aria-hidden="true">'+symbol+'</span><div><p class="eyebrow">'+(isProjectParent(c)?uiText("ПРОЕКТ","PROJECT"):uiText("ДЕЛО","CASE"))+'</p><h1>'+esc(c.title||"Без названия")+'</h1><p>'+uiText("Помогает ","Assistant: ")+esc(assistant)+'</p></div>'+(isProjectParent(c)&&activeReal.isOwner?'<button class="btn primary" type="button" data-act="new-project-branch" data-project-id="'+attr(c.id)+'">Новая ветка</button>':'')+'</header>'+
      '<div class="case-detail-meta">'+statusChip(RU_STATE[c.state]||c.state||"—")+(c.needs_word?'<span class="chip warn">'+uiText("нужно ваше слово","needs your decision")+'</span>':'')+'</div>'+
      '<div class="case-tabs" id="rctabs">'+realTabsHtml(tabsForCase)+'</div>'+
      '<div class="case-detail-panel" id="rcpanel">'+realTabPanel()+'</div></main>';
    vwrap.parentElement.scrollTop=0;
    const tabs=document.getElementById("rctabs"); if(tabs) tabs.onclick=e=>{ if(e.target.closest("[data-rtabs-more]")){ realTabsAll=true; put(CASE_TABS_ALL_KEY,"1"); tabs.innerHTML=realTabsHtml(tabsForCase); return; } const b=e.target.closest(".ct"); if(!b)return; realTab=b.dataset.rtab; vwrap.classList.toggle("dialog-view",realTab==="Диалог"); document.getElementById("rcpanel").innerHTML=realTabPanel(); tabs.querySelectorAll(".ct").forEach(x=>x.classList.toggle("active",x.dataset.rtab===realTab)); bindRealPanel(); };
    bindRealPanel();
  }
  function runCard(run){
    const steps=(run.steps||[]).map(s=>'<div class="task"><span class="tstat '+(s.status==="succeeded"?"done":(s.status==="failed"?"blocked":"todo"))+'" aria-hidden="true"></span><div class="tmain"><b>'+esc(s.step||"Шаг")+'</b><span>'+esc(RUN_STATUS[s.status]||s.status||"ожидает")+(s.error?' · '+esc(s.error):'')+'</span></div></div>').join("");
    return '<div class="rc-strip"><h3>'+esc(assistantName(activeReal&&activeReal.c))+' · '+esc(RUN_STATUS[run.status]||run.status||"—")+'</h3>'+(run.current_step?'<p class="rc-hint">Сейчас: '+esc(run.current_step)+'</p>':'')+(steps||'<p class="rc-hint">Шаги ещё готовятся.</p>')+(run.last_error?'<p class="rc-note">'+esc(run.last_error)+'</p>':'')+'</div>';
  }
  function patchCard(p){
    const detail=p.value===undefined?"Содержание доступно только решающему участнику.":JSON.stringify(p.value);
    return '<div class="rc-strip"><h3>Нужно подтверждение · '+esc(p.op||"изменение")+'</h3><p class="rc-hint">Агент предлагает изменение уровня '+esc(String(p.risk||"—"))+'.</p><p class="rc-hint">'+esc(detail)+'</p>'+ (activeReal.canDecide?'<div class="cta-row"><button class="btn primary" data-act="patch-approve" data-patch="'+attr(p.id)+'">Подтвердить</button><button class="btn" data-act="patch-reject" data-patch="'+attr(p.id)+'">Отклонить</button></div>':'<p class="rc-note">Подтвердить или отклонить может участник с правом «решения».</p>')+'</div>';
  }
  async function loadSchoolDay(childId,date,redraw=true){
    if(!activeReal)return;
    activeReal.school={childId,date,loading:true,schedule:[],assignments:[],error:""}; if(redraw)drawRealCase();
    try{
      const base="/homework/children/"+encodeURIComponent(childId);
      const values=await Promise.all([authFetch("GET",base+"/schedule?lesson_date="+encodeURIComponent(date)),authFetch("GET",base+"/assignments?for_lessons_on="+encodeURIComponent(date)+"&limit=50")]);
      activeReal.school={childId,date,loading:false,schedule:Array.isArray(values[0])?values[0]:[],assignments:Array.isArray(values[1])?values[1]:[],error:""};
    }catch(error){ activeReal.school={childId,date,loading:false,schedule:[],assignments:[],error:(error&&error.message)||"Не удалось загрузить школьный день."}; }
    if(redraw)drawRealCase();
  }
  function homeworkSummary(assignment){
    const summary=assignment&&assignment.summary; if(!summary)return "";
    if(typeof summary==="string")return summary;
    const value=summary.task_summary; return typeof value==="string"?value:((value&&value.text)||"");
  }
  function homeworkDocumentText(assignment){
    const summary=assignment&&assignment.summary||{}, parts=[String(summary.task_summary||assignment.task_text||"").trim()];
    [["На что обратить внимание",summary.attention_points],["Что спросить у ребёнка",summary.questions_for_child],["Родителю",summary.parent_notes],["Нужно уточнить",summary.needs_clarification]].forEach(item=>{ const values=Array.isArray(item[1])?item[1].filter(Boolean):[]; if(values.length)parts.push(item[0]+":\n"+values.map(value=>"• "+value).join("\n")); });
    return parts.filter(Boolean).join("\n\n");
  }
  function homeworkDetails(assignment){
    if(!assignment||!assignment.summary)return "";
    return '<details class="rc-note" style="margin-top:8px"><summary><b>Открыть разбор Домашкина</b></summary><div style="white-space:pre-wrap;margin-top:9px">'+esc(homeworkDocumentText(assignment))+'</div><div class="cta-row" style="margin-top:10px"><button class="btn small" data-act="save-homework-doc" data-id="'+attr(assignment.id)+'">Сохранить в документы дела</button></div></details>';
  }
  function schoolAssignmentRow(assignment,title,meta){
    const summary=homeworkSummary(assignment), agent=domashkinHomeworkAgent(); let action="";
    if(assignment&&!summary&&agent)action='<button class="btn small" data-act="analyze-homework" data-id="'+attr(assignment.id)+'">Разобрать</button>';
    return '<div class="prow"><div><b>'+esc(title||"Задание")+'</b>'+(meta?'<div class="rc-hint">'+esc(meta)+'</div>':'')+(assignment?'<div style="margin-top:7px">'+esc(assignment.task_text||"Задание без текста")+'</div>':'<div class="rc-hint" style="margin-top:7px">Задание к этому уроку не найдено.</div>')+homeworkDetails(assignment)+'</div>'+action+'</div>';
  }
  function schoolPanel(){
    if(!activeReal.isOwner) return '<div class="rc-note">Приглашённый родитель видит обсуждение и выданные материалы дела. Доступ к дневнику ребёнка подключается отдельно после серверной проверки прав.</div>';
    if(activeReal.childrenError) return errorBox(activeReal.childrenError,'data-act="school-retry"');
    if(!activeReal.children.length) return '<div class="rc-strip"><h3>Сначала подключите ребёнка</h3><p class="rc-hint">Расписание и задания не подставляются из демо: Домашкин покажет их только после подтверждённой привязки дневника.</p><div class="cta-row"><a class="btn primary" href="/fixclo/?preset=education.domashkin&amp;channel=max&amp;pilot=domashkin">Настроить Домашкина</a></div></div>';
    const school=activeReal.school||{childId:activeReal.children[0].id,date:dateInputValue(new Date(Date.now()+24*60*60*1000)),loading:true,schedule:[],assignments:[],error:""};
    const controls='<form class="pform" data-act="school-day"><div class="pf-row"><label>Ребёнок<select name="child">'+activeReal.children.map(child=>'<option value="'+attr(child.id)+'"'+(child.id===school.childId?' selected':'')+'>'+esc(child.display_name||"Ребёнок")+'</option>').join("")+'</select></label><label>День<input name="date" type="date" required value="'+attr(school.date)+'"></label></div><div class="cta-row"><button class="btn primary" type="submit">Показать день</button><button class="btn small" type="button" data-act="school-date" data-offset="-2">Позавчера</button><button class="btn small" type="button" data-act="school-date" data-offset="-1">Вчера</button><button class="btn small" type="button" data-act="school-date" data-offset="0">Сегодня</button><button class="btn small" type="button" data-act="school-date" data-offset="1">Завтра</button></div></form>';
    if(school.loading)return controls+'<div class="rc-strip"><p class="rc-hint">Домашкин сверяет расписание и задания…</p></div>';
    if(school.error)return controls+errorBox(school.error,'data-act="school-retry"');
    const bySubject={}; school.assignments.forEach(a=>{bySubject[String(a.subject||"").trim()]=a;});
    const lessons=school.schedule.map(lesson=>{ const assignment=bySubject[String(lesson.subject||"").trim()]; return schoolAssignmentRow(assignment,(lesson.lesson_number?lesson.lesson_number+". ":"")+(lesson.subject||"Урок"),[lesson.start_time,lesson.end_time].filter(Boolean).join("–")+(lesson.room?' · каб. '+lesson.room:'')); }).join("");
    const extra=school.assignments.filter(a=>!school.schedule.some(l=>String(l.subject||"").trim()===String(a.subject||"").trim())).map(a=>schoolAssignmentRow(a,a.subject||"Задание","")).join("");
    const empty=!lessons&&!extra?'<div class="rc-note">На выбранный день расписание ещё не загружено. Домашкин не угадывает уроки; проверьте синхронизацию дневника.</div>':'';
    return controls+'<div class="section-t">Уроки и задания</div><div class="lst">'+lessons+extra+'</div>'+empty+(!domashkinHomeworkAgent()?'<div class="rc-note">Для автоматического разбора включите личного Домашкина с модулем домашних заданий.</div>':'');
  }
  function domashkinHomeworkAgent(){ return (activeReal.personalAgents||[]).find(agent=>agent.state==="active"&&(agent.modules||[]).indexOf("homework")>=0); }
  function caseHasSubstantiveWork(){ return !!((activeReal.nextActions||[]).length||(activeReal.materials||[]).length||(activeReal.drafts||[]).length||(activeReal.runs||[]).length); }
  function smartCasePrompts(c){
    const prompts=[];
    // В кабинете разработки подсказки — это две ступени настоящего F7a,
    // а не общие вопросы по делу. Первая просит агента свести разговор в
    // ратифицируемое ТЗ, вторая является отдельным словом человека, которое
    // только и вправе поставить headless-сборку в очередь.
    if(c.domain==="software"||c.selected_agent_id==="cabinet"){
      if(!caseHasSubstantiveWork())return ["Собрать окончательное ТЗ","Запускай сборку"];
      return ["Покажи ближайший незавершённый шаг","Что сейчас блокирует работу?","Сверь материалы с планом","Подготовь статус по срокам"];
    }
    if(c.needs_word)prompts.push("Что сейчас требует моего подтверждения?");
    if(isDomashkinCase(c)){
      const school=activeReal.school, assignments=school&&school.assignments||[];
      prompts.push(assignments.length?"Разбери задания выбранного дня":"Что задано на завтра?","Покажи расписание на завтра","Что важно проверить родителю?");
    }else{
      prompts.push("Что сейчас самое важное?","Покажи ближайшие сроки","Какие документы нужны?");
      if(c.scope==="pro")prompts.push("Какой следующий шаг по делу?");
      else prompts.push("Составь простой план действий");
    }
    return [...new Set(prompts)].slice(0,4);
  }
  function questionnaireKey(caseId){ return "fixar-v2-questionnaire:"+caseId; }
  function normalizeQuestionnaire(action){
    if(!action||action.type!=="questionnaire"||!Array.isArray(action.fields))return null;
    const actionId=String(action.id||"questionnaire").replace(/[^A-Za-z0-9_-]/g,"").slice(0,80);
    if(actionId==="pack_requirements_v1"||actionId==="accounting_usn_requirements_v1")return null;
    const allowed=["text","textarea","single_choice","multi_choice"],fields=action.fields.slice(0,8).map((raw,index)=>{
      if(!raw||allowed.indexOf(raw.type)<0)return null;
      const name=String(raw.name||("field_"+index)).replace(/[^A-Za-z0-9_-]/g,"").slice(0,50),label=String(raw.label||"").trim().slice(0,180),options=Array.isArray(raw.options)?raw.options.map(value=>String(value).trim().slice(0,140)).filter(Boolean).slice(0,12):[];
      if(!name||!label||((raw.type==="single_choice"||raw.type==="multi_choice")&&!options.length))return null;
      return {name,label,type:raw.type,required:raw.required===true,options,placeholder:String(raw.placeholder||"").slice(0,220)};
    }).filter(Boolean);
    if(!fields.length)return null;
    return {type:"questionnaire",id:actionId,title:String(action.title||"Уточняющие вопросы").trim().slice(0,180),intro:String(action.intro||"").trim().slice(0,500),submit_label:String(action.submit_label||"Отправить ответы").trim().slice(0,80),fields};
  }
  function readQuestionnaire(caseId){
    try{ const questionnaire=normalizeQuestionnaire(JSON.parse(store(questionnaireKey(caseId))||"null"));if(!questionnaire)drop(questionnaireKey(caseId));return questionnaire; }catch(_){drop(questionnaireKey(caseId));return null;}
  }
  function rememberQuestionnaire(caseId,questionnaire){
    if(questionnaire)put(questionnaireKey(caseId),JSON.stringify(questionnaire));else drop(questionnaireKey(caseId));
  }
  function questionnaireFromEvents(events){
    let seen=false,pending=null;
    (events||[]).forEach(event=>{
      if(event.kind!=="dialog")return;
      const payload=event.payload||{};
      if(payload.role==="assistant"){
        const action=normalizeQuestionnaire(payload.ui_action);
        if(action){seen=true;pending=action;}
        return;
      }
      if(payload.role==="user"&&pending&&/^\s*ответы на анкету\s+«/i.test(evText(event)||""))pending=null;
    });
    return seen?pending:undefined;
  }
  function questionnaireField(field,index){
    const name="answer_"+index,required=field.required?' required':'';
    if(field.type==="textarea")return '<label class="dialog-question-field"><span>'+esc(field.label)+(field.required?' <em>обязательно</em>':'')+'</span><textarea name="'+name+'" rows="3"'+required+' placeholder="'+attr(field.placeholder)+'"></textarea></label>';
    if(field.type==="text")return '<label class="dialog-question-field"><span>'+esc(field.label)+(field.required?' <em>обязательно</em>':'')+'</span><input name="'+name+'" type="text"'+required+' placeholder="'+attr(field.placeholder)+'"></label>';
    const inputType=field.type==="single_choice"?"radio":"checkbox";
    return '<fieldset class="dialog-question-field" data-question-options="'+index+'"><legend>'+esc(field.label)+(field.required?' <em>обязательно</em>':'')+'</legend><div class="dialog-question-options">'+field.options.map(value=>'<label><input type="'+inputType+'" name="'+name+'" value="'+attr(value)+'"'+(field.required&&inputType==="radio"?' required':'')+'><span>'+esc(value)+'</span></label>').join("")+'</div></fieldset>';
  }
  function questionnaireCard(questionnaire){
    if(!questionnaire)return "";
    return '<form class="dialog-questionnaire" data-act="answer-questionnaire"><div class="dialog-questionnaire-head"><span aria-hidden="true">✦</span><div><small>ФИКСАР УТОЧНЯЕТ</small><h3>'+esc(questionnaire.title)+'</h3>'+(questionnaire.intro?'<p>'+esc(questionnaire.intro)+'</p>':'')+'</div></div>'+questionnaire.fields.map(questionnaireField).join("")+'<div class="dialog-questionnaire-foot"><span data-questionnaire-status role="status"></span><button class="btn primary" type="submit">'+esc(questionnaire.submit_label)+'</button></div></form>';
  }
  function questionnairePrompt(questionnaire,assistant){
    if(!questionnaire)return "";
    return '<aside class="dialog-questionnaire-prompt" role="status"><span class="dialog-questionnaire-prompt-icon" aria-hidden="true">✦</span><div><b>'+esc(assistant)+' ждёт ваши ответы</b><p>Чтобы продолжить, заполните анкету «'+esc(questionnaire.title)+'».</p></div><button class="btn primary" type="button" data-act="open-questionnaire">Заполнить анкету</button></aside>';
  }
  function questionnaireAnswer(questionnaire,form){
    const lines=["Ответы на анкету «"+questionnaire.title+"»:"],missing=[];
    questionnaire.fields.forEach((field,index)=>{ const nodes=[...form.querySelectorAll('[name="answer_'+index+'"]')],values=(field.type==="single_choice"||field.type==="multi_choice")?nodes.filter(node=>node.checked).map(node=>node.value):nodes.map(node=>node.value.trim()).filter(Boolean); if(field.required&&!values.length)missing.push(field.label); if(values.length)lines.push("- "+field.label+": "+values.join(", ")); else lines.push("- "+field.label+": не указано"); });
    return {message:lines.join("\n"),missing};
  }
  function dialogActionTiles(c){
    const tiles=[];
    const offer=commissionedOffer(c);
    const canCommission=activeReal.isOwner&&!c.active_run_id&&!(activeReal.runs||[]).length&&offer&&!(!c.tariff_id&&caseHasSubstantiveWork());
    if(canCommission)tiles.push({act:"commission-work",offer:offer.id,icon:"▶",title:c.tariff_id?"Продолжить запуск":"Разобрать задачу и запустить",hint:(offer.title||"")+" · "+String(offer.price).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" "+(offer.currency||"CREDITS")});
    const canGrant=activeReal.canDecide&&authState.assurance>=2&&c.selected_agent_id&&c.template_version&&!c.active_run_id;
    if(canGrant)tiles.push({act:"grant-agent",icon:"✦",title:"Дать поручение агенту",hint:"По закреплённому плану этого дела"});
    if((activeReal.patches||[]).length)tiles.push({act:"goto-patches",icon:"☑",title:"Ждут решения: "+activeReal.patches.length,hint:"Подтвердить или отклонить"});
    if(canCommission)tiles.push({act:"match-specialists-direct",icon:"◎",title:"Подобрать специалистов",hint:"Бесплатно, без запуска модели"});
    if(!tiles.length)return "";
    return '<div class="dialog-tiles" role="toolbar" aria-label="Действия по делу">'+tiles.map(t=>'<button class="dialog-tile" type="button" data-act="'+t.act+'"'+(t.offer?' data-offer="'+attr(t.offer)+'"':'')+'><span class="dialog-tile-icon" aria-hidden="true">'+t.icon+'</span><span><b>'+esc(t.title)+'</b><small>'+esc(t.hint)+'</small></span></button>').join("")+'</div>';
  }
  function realDialogPanel(){
    const c=activeReal.c, assistant=assistantName(c);
    const allMessages=activeReal.events.filter(e=>e.kind==="dialog"&&evText(e)),shown=Math.max(50,Number(activeReal.dialogHistoryShown)||50),hidden=Math.max(0,allMessages.length-shown);
    const first=Math.max(0,allMessages.length-shown);
    const messages=allMessages.slice(first).map((e,index)=>{ const text=evText(e); if(!text)return ""; const mine=e.actor_kind==="principal"&&e.actor_id===authState.principal,reader=mine?'':' readable-answer" role="button" tabindex="0" data-act="read-agent-answer" data-reader-index="'+(first+index); return '<div class="bubble'+(mine?' user':reader)+'"><small>'+esc(mine?"Вы":evActor(e))+' · '+esc(fmtWhen(e.created_at))+'</small>'+(mine?esc(text):agentRichText(text))+(mine?'':'<span class="answer-open-hint">Открыть чистый текст ↗</span>')+'</div>'; }).join("");
    const older=hidden?'<button class="chat-history-more" type="button" data-act="dialog-older">Показать более ранние сообщения ('+hidden+')</button>':"";
    const reply=activeReal.reply?'<div class="bubble readable-answer" role="button" tabindex="0" data-act="read-agent-answer" data-reader-source="reply"><small>'+esc(assistant)+' · сейчас</small>'+agentRichText(activeReal.reply)+'<span class="answer-open-hint">Открыть чистый текст ↗</span></div>':"";
    const empty=messages||reply?"":'<div class="bubble"><small>'+esc(assistant)+'</small>Я в контексте этого дела. Можно написать, сказать голосом или приложить снимок.</div>';
    const prompts=smartCasePrompts(c).map(text=>'<button class="smart-prompt" type="button" data-chat-suggestion="'+attr(text)+'">'+esc(text)+'</button>').join("");
    const promptTray=(onMobile()&&(messages||reply))?'<details class="smart-prompts-fold"><summary>Быстрые подсказки</summary><div class="smart-prompts" aria-label="Умные подсказки">'+prompts+'</div></details>':'<div class="smart-prompts" aria-label="Умные подсказки">'+prompts+'</div>';
    return '<section class="case-dialog" aria-label="Диалог по делу"><div class="case-dialog-head"><div><h2>'+esc(assistant)+'</h2><p>Знает текущее дело, его инструменты и разрешённые материалы</p></div><span class="chip info">в контексте</span></div>'+questionnairePrompt(activeReal.questionnaire,assistant)+promptTray+dialogActionTiles(c)+'<div class="case-thread" id="caseThread" aria-live="polite">'+older+messages+reply+empty+'</div><form class="chat-composer" data-act="ask-agent"><div class="chat-file-state" data-chat-file-state hidden></div><textarea name="message" rows="1" maxlength="8000" placeholder="Напишите или скажите, что нужно сделать…" aria-label="Сообщение агенту"></textarea><div class="chat-actions"><button class="chat-tool" type="button" data-act="voice-input" aria-label="Сказать голосом" aria-pressed="false"><span class="tool-icon" aria-hidden="true">🎙</span><span>Голос</span></button><label class="chat-tool" aria-label="Сфотографировать"><input name="camera" type="file" accept="image/*" capture="environment"><span class="tool-icon" aria-hidden="true">📷</span><span>Камера</span></label><label class="chat-tool" aria-label="Приложить PDF, Excel, CSV или ZIP"><input name="attachment" type="file" accept="'+attr(STATEMENT_ACCEPT)+'"><span class="tool-icon" aria-hidden="true">📎</span><span>Файл</span></label><button class="btn primary chat-send" type="submit">Отправить</button></div><div class="chat-status" data-chat-status role="status" aria-live="polite"></div></form></section>';
  }
  function realCaseNextStep(c){
    if(c.state==="closed"||c.state==="archived")return {title:"Дело завершено",note:"Результаты и материалы остаются под рукой.",tab:"Документы",action:"Открыть материалы"};
    if(c.needs_word)return {title:"Нужно ваше решение",note:"Помощник подготовил действие, но не выполнит его без подтверждения.",tab:"Журнал",action:"Посмотреть и решить"};
    if(c.active_run_id)return {title:"Помощник работает",note:"Можно посмотреть ход работы, не прерывая выполнение.",tab:"План",action:"Открыть ход работы"};
    return {title:"Продолжить разговор",note:"Опишите изменение или спросите, какой шаг сейчас самый полезный.",tab:"Диалог",action:"Написать помощнику"};
  }
  function commissionedOffer(c){
    const offers=activeReal.workOffers||[];
    if(c.tariff_id)return offers.find(offer=>offer.id===c.tariff_id)||null;
    return offers[0]||null;
  }
  function workCommissionPanel(c){
    if(!activeReal.isOwner||c.active_run_id||(activeReal.runs||[]).length)return "";
    if(!c.tariff_id&&caseHasSubstantiveWork())return "";
    const offer=commissionedOffer(c);if(!offer)return "";
    const price=String(offer.price).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" "+(offer.currency||"CREDITS"),selected=!!c.tariff_id;
    return '<section class="case-form-card tone-blue"><p class="eyebrow">'+(selected?'РАБОТА ОПЛАЧЕНА':'ДВА ПУТИ')+'</p><h2>'+esc(offer.title)+' — '+esc(price)+'</h2><p>'+esc(offer.deliverable)+'</p><div class="case-form-note"><span>◎</span><p><b>Не входит:</b> '+esc((offer.excludes||[]).join("; "))+'.</p></div><button class="btn primary case-form-submit" type="button" data-act="commission-work" data-offer="'+attr(offer.id)+'">'+(selected?'Продолжить запуск':'Разобрать задачу и запустить')+'</button><button class="btn case-form-submit" type="button" data-act="match-specialists-direct">Сразу подобрать специалистов</button><p class="rc-hint">Прямой подбор не запускает модель, не создаёт AI-работу и не списывает кредиты.</p></section>';
  }
  function realOverviewPanel(){
    const c=activeReal.c,next=realCaseNextStep(c),assistant=assistantName(c),goal=c.goal||"Сформулируйте желаемый результат вместе с помощником.";
    const related=realLinksPanel(),needs=c.needs_word?'<div class="case-attention">По делу ждут вашего решения. Внешнее действие не выполнено без подтверждения.</div>':"";
    const primary='<article class="case-result-card"><div class="case-result-head"><div><p class="eyebrow">ГЛАВНОЕ В ДЕЛЕ</p><h2>'+esc(goal)+'</h2></div><span class="my-day-status '+(c.needs_word?'attention':'')+'">'+esc(caseListStatusLabel(caseListStatus(c)))+'</span></div><div class="case-facts">'+kvRow("Владелец",ownerName())+kvRow("Участников",String((c.participants||[]).length))+'</div>'+needs+related+'<div class="case-question"><p class="eyebrow">С ЧЕГО ПРОДОЛЖИМ?</p><form class="my-day-composer" data-act="ask-agent"><textarea name="message" required rows="2" placeholder="Напишите, что изменилось или что нужно сделать…" aria-label="Сообщение агенту"></textarea><div class="my-day-composer-foot"><small>'+esc(assistant)+' знает контекст этого дела и доступные здесь инструменты.</small><button class="btn primary" type="submit">Отправить</button></div></form><div id="agentreply">'+(activeReal.reply?'<div class="bubble readable-answer" role="button" tabindex="0" data-act="read-agent-answer" data-reader-source="reply">'+agentRichText(activeReal.reply)+'<span class="answer-open-hint">Открыть чистый текст ↗</span></div>':'')+'</div></div></article>';
    const nextRail='<aside class="case-next-rail"><p class="eyebrow">ЧТО ДАЛЬШЕ?</p><button class="case-next-primary" type="button" data-act="rc-goto" data-tab="'+attr(next.tab)+'"><span class="case-next-icon">→</span><span><b>'+esc(next.title)+'</b><small>'+esc(next.note)+'</small><em>'+esc(next.action)+' →</em></span></button><div class="case-next-links"><button type="button" data-act="rc-goto" data-tab="План"><b>План и действия</b><small>Что уже сделано и что впереди</small></button><button type="button" data-act="rc-goto" data-tab="Участники"><b>Люди и доступ</b><small>Кто участвует и что может</small></button><button type="button" data-act="rc-goto" data-tab="Документы"><b>Материалы дела</b><small>Файлы, результаты и общие ссылки</small></button></div><section class="case-gentle-note"><p class="eyebrow">ОДИН НЕБОЛЬШОЙ ШАГ</p><p>Не нужно решать всё сразу. Сохраните полезное и вернитесь, когда удобно.</p></section></aside>';
    const laya=c.id===LAYA_ROUTING_CASE_ID?'<section class="case-form-card tone-blue" style="margin-top:16px"><p class="eyebrow">ОБУЧЕНИЕ МАРШРУТИЗАЦИИ</p><h2>Ручная разметка Лайи</h2><p>Сверьте решение MiMo с правильным направлением и решите, какие примеры допустить в оценку или обучение.</p><button class="btn primary" type="button" data-act="laya-open-training">Работа с обучением Лайи</button></section>':'';
    return '<div class="case-overview-layout"><div>'+primary+workCommissionPanel(c)+laya+'</div>'+nextRail+'</div>'+domashkinParentInvitePanel()+domashkinBookPanel()+domashkinFamilyThreadPanel();
  }
  const LAYA_DOMAINS=["administration","auto","construction","education","excavation","finance","household","it","legal","machinery","medicine","newbuild","platform","psychology","realty","renovation","software","travel","video","unclear"];
  const LAYA_PACK_SEAMS=[
    {topic:"fitness",title:"Фитнес",target:"orlov-tools/fitness@1.0.0",state:"Опубликован; не установлен и не включён в каталог Лайи"},
    {topic:"photo",title:"Фото",target:"orlov-tools/photo@1.0.0",state:"Опубликован; не установлен и не включён в каталог Лайи"},
    {topic:"beauty",title:"Бьюти",target:"orlov-tools/beauty@1.0.0",state:"Опубликован; не установлен и не включён в каталог Лайи"},
    {topic:"bookkeeping",title:"Бухучёт",target:"pending:bookkeeping",state:"Пак пока не опубликован; дело разработки существует"},
    {topic:"family-budget",title:"Семейный бюджет",target:"serg-tools/family-budget@1.2.0",state:"Установлен; пока маршрут только через finance"},
    {topic:"homework",title:"Домашние задания",target:"education.domashkin",state:"Личный агент Домашкин; пока маршрут только через education"}
  ];
  function layaCell(row,key){return String(((row.cells||{})[key]||{}).value||"");}
  const layaNetworkError=error=>!!error&&(error.name==="TypeError"||/Failed to fetch|NetworkError|Load failed/i.test(error.message||"")||[502,503,504].includes(error.status));
  const layaWait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function layaReadRow(caseId,rowId){
    let lastError;
    for(let attempt=0;attempt<4;attempt++){
      if(attempt)await layaWait(400*attempt);
      try{
        const table=await authFetch("GET","/cases/"+encodeURIComponent(caseId)+"/tables/"+LAYA_REVIEW_TABLE_ID);
        const row=(table.rows||[]).find(item=>item.id===rowId);
        if(!row)throw new Error("Образец больше не найден в таблице.");
        return row;
      }catch(error){if(!layaNetworkError(error))throw error;lastError=error;}
    }
    throw new Error("Связь с API временно недоступна. Выбор остался в форме; повторите сохранение после восстановления связи.");
  }
  async function saveLayaReview(caseId,original,values){
    const path="/cases/"+encodeURIComponent(caseId)+"/tables/"+LAYA_REVIEW_TABLE_ID+"/cells",keys=Object.keys(values);
    const matches=row=>keys.every(key=>layaCell(row,key)===String(values[key]));
    let current=original;
    for(let attempt=0;attempt<3;attempt++){
      const cells=keys.filter(key=>layaCell(current,key)!==String(values[key])).map(key=>({row_id:original.id,col_key:key,value:values[key],expect_version:((current.cells||{})[key]||{}).version||0}));
      if(!cells.length)return;
      try{
        const result=await authFetch("PUT",path,{cells});
        if(!(result.conflicts||[]).length&&(result.saved||[]).length===cells.length)return;
        current=await layaReadRow(caseId,original.id);
        if(matches(current))return;
        throw new Error("Таблица изменилась в другом окне. Обновите результаты и повторите разметку.");
      }catch(error){
        if(!layaNetworkError(error))throw error;
        current=await layaReadRow(caseId,original.id);
        if(matches(current))return;
        if(keys.some(key=>layaCell(current,key)!==String(values[key])&&(((current.cells||{})[key]||{}).version||0)!==(((original.cells||{})[key]||{}).version||0)))throw new Error("Образец изменился в другом окне. Обновите результаты перед повтором.");
      }
    }
    throw new Error("Сохранение не подтвердилось из-за связи с API. Выбор остался в форме; повторите попытку.");
  }
  function layaSampleText(row){
    const key=layaCell(row,"sample_key"),swarm=key.match(/^swarm:([a-f0-9]{12}):(evt_[a-z0-9]+)$/),pack=key.match(/^pack:([a-f0-9]{12}):([a-z-]+)$/);
    if(!swarm&&!pack)return "";
    const materialId=swarm?"mat_laya_swarm_"+swarm[1]:"mat_laya_pack_routes_"+pack[1];
    const material=(activeReal.materials||[]).find(item=>item.id.startsWith(materialId));if(!material)return "";
    const source=String(material.extracted||""),marker="\n## "+(swarm?swarm[2]:pack[2])+"\n",start=source.indexOf(marker);
    if(start<0)return "";
    const next=source.indexOf("\n## ",start+marker.length),section=source.slice(start+marker.length,next<0?undefined:next),textAt=section.indexOf("\n\n");
    return textAt<0?"":section.slice(textAt+2).trim();
  }
  function layaTrainingPanel(){
    if(!activeReal.isOwner)return '<p class="rc-note">Разметка доступна владельцу дела.</p>';
    if(activeReal.layaTableError)return errorBox("Не удалось загрузить таблицу разметки.",'data-act="laya-refresh"');
    const table=activeReal.layaTable;
    if(!table)return '<p class="rc-note">Таблица разметки пока не доступна.</p>';
    const rows=(table.rows||[]).filter(row=>layaCell(row,"review_status")!=="exclude"),reviewed=rows.filter(row=>layaCell(row,"review_status")==="reviewed").length;
    const running=(activeReal.nextActions||[]).some(action=>!action.done&&action.what===LAYA_BATCH_WHAT&&action.waiting_for===LAYA_BATCH_MARKER);
    const items=rows.map(row=>{const key=layaCell(row,"sample_key"),seam=LAYA_PACK_SEAMS.find(item=>key.endsWith(":"+item.topic));return '<div class="task"><span class="tstat '+(layaCell(row,"review_status")==="reviewed"?'done':'todo')+'" aria-hidden="true"></span><div class="tmain"><b>'+esc(layaSampleText(row)||"Текст запроса пока недоступен — обновите результаты")+'</b>'+(seam?'<span>Целевой пак: '+esc(seam.target)+' · '+esc(seam.state)+'</span>':'')+'<span>MiMo: '+esc(layaCell(row,"mimo_domain")||"воздержался")+' · '+esc(layaCell(row,"mimo_model")||"нет квитанции")+' · уверенность '+esc(layaCell(row,"mimo_confidence")||"—")+'</span><span>Метка человека: '+esc(layaCell(row,"gold_domain")||"не задана")+' · '+esc(layaCell(row,"use_decision")||"исключено")+'</span><small>Квитанция SHA256: '+esc(layaCell(row,"receipt_hash")||"отсутствует")+'</small></div><button class="btn small" type="button" data-act="laya-review-row" data-id="'+attr(row.id)+'">Разметить</button></div>'}).join("");
    const seams=LAYA_PACK_SEAMS.map(seam=>{const row=rows.filter(item=>layaCell(item,"sample_key").endsWith(":"+seam.topic)).at(-1);return '<div class="task"><div class="tmain"><b>'+esc(seam.title)+' · '+esc(seam.target)+'</b><span>'+esc(seam.state)+'</span><small>'+(row?'MiMo: '+esc(layaCell(row,"mimo_domain")||"воздержался")+' · квитанция '+esc(layaCell(row,"receipt_hash")||"отсутствует"):'Проверка маршрута ещё не загружена')+'</small></div></div>'}).join("");
    const materials=(activeReal.materials||[]).filter(item=>/Laya|Лайя|рой практиков/i.test(item.title||"")&&item.extracted).slice().reverse().slice(0,12).map(item=>'<button class="btn small" type="button" data-act="laya-show-material" data-id="'+attr(item.id)+'">'+esc(item.title||"Материал")+'</button>').join("");
    return '<section class="case-form-card tone-blue"><p class="eyebrow">ЛАЙЯ · РУЧНАЯ РАЗМЕТКА</p><h2>Обучение маршрутизации</h2><p>Сверьте текст запроса ниже с решением MiMo и задайте правильный адресат. Размечено '+reviewed+' из '+rows.length+' запросов. Ответы практиков исключены.</p><div class="cta-row"><button class="btn primary" type="button" data-act="laya-next-batch"'+(running?' disabled':'')+'>'+(running?'Батч выполняется…':'Запустить рой: следующий батч')+'</button><button class="btn" type="button" data-act="laya-refresh">Обновить результаты</button></div><p class="rc-hint">Банк бронирований содержит 200 запросов по восьми встроенным направлениям; каждый батч берёт 15 следующих. Стыковки с внешними паками проверяются отдельно и не попадают в обучение до появления маршрута.</p></section><section class="case-form-card" style="margin-top:16px"><h2>Стыковки с паками</h2><p class="rc-hint">Опубликованный или установленный пак ещё не означает доступный маршрут к его агенту. Эти шесть проверок показывают реальный ответ MiMo и целевой адресат.</p>'+seams+'</section><section class="case-form-card" style="margin-top:16px"><h2>Материалы с текстами запросов</h2><div class="cta-row">'+(materials||'<span class="rc-hint">Материалы появятся после первого батча.</span>')+'</div></section><div class="section-t" style="margin-top:20px">Запросы для проверки</div>'+(items||'<p class="rc-note">Пока нет запросов для разметки.</p>');
  }
  function nextActionOwnerName(owner){
    if(!owner)return "Ответственный не назначен";
    if(owner===activeReal.c.selected_agent_id)return assistantName(activeReal.c);
    const participant=(activeReal.c.participants||[]).find(item=>item.principal_id===owner);
    return participant?(participant.display_name||(owner===authState.principal?"Вы":"Участник")):owner;
  }
  const DATA_BOUNDARY_ESCALATION=/решени\S*\s+владельц/i;
  function actionNeedsDataBoundaryDecision(action){
    const text=((action.what||"")+" "+(action.waiting_for||"")).toLowerCase();
    return DATA_BOUNDARY_ESCALATION.test(text)&&/(соглас|исключ|срок хран|право удалить|кто видит пример)/i.test(text);
  }
  function isSelfdiagF7Action(caseId,action){return caseId===SELFDIAG_CASE_ID&&/^F7-\d{2}\b/.test(action.what||"");}
  function isSelfdiagQuestion(caseId,action){return caseId===SELFDIAG_CASE_ID&&/^СД-\d{2}\b/.test(action.what||"");}
  function selfdiagDecisionSummary(decision){
    if(!decision)return "";
    return '<div class="tstate"><b>Ответ владельца записан.</b><span>Решение: '+esc(decision.answer||"—")+'</span>'+(decision.reason?'<span>Основание: '+esc(decision.reason)+'</span>':'')+'<span>Пункт остаётся открытым до выполнения поручения или сознательного закрытия отклонённого запроса.</span></div>';
  }
  const DATA_BOUNDARY_VISIBILITY={owner_only:"только владелец дела",case_participants:"участники этого дела",authorized_team:"только назначенная команда",anonymized_reusable:"только обезличенный пример можно использовать повторно"};
  const DATA_BOUNDARY_DELETION={owner_only:"только владелец дела",owner_or_authorized_participant:"владелец или назначенный им участник",participant_may_request:"участник может потребовать удаления у владельца"};
  function dataBoundaryDecisionSummary(decision){
    if(!decision)return "";
    if(!decision.details_visible)return '<div class="tstate"><b>Ответ владельца записан.</b> Детали доступны только владельцу дела.</div>';
    return '<div class="tstate data-boundary-decision"><b>Границы данных утверждены.</b><span>Берём: '+esc(decision.allowed_requests||"—")+'</span><span>Исключаем: '+esc(decision.excluded_requests||"—")+'</span><span>Храним: '+esc(decision.retention_period||"—")+'</span><span>Примеры видят: '+esc(DATA_BOUNDARY_VISIBILITY[decision.sample_visibility]||"—")+'</span><span>Удалить пример: '+esc(DATA_BOUNDARY_DELETION[decision.deletion_right]||"—")+'</span>'+(decision.note?'<span>Примечание: '+esc(decision.note)+'</span>':'')+'</div>';
  }
  function suggestedPlanActions(){
    const event=(activeReal.events||[]).slice().reverse().find(item=>item.kind==="dialog"&&item.actor_kind==="agent"&&evText(item));
    if(!event)return [];
    const lines=String(evText(event)||"").replace(/\r\n?/g,"\n").split("\n"),actions=[]; let modules=false;
    for(const raw of lines){
      const line=raw.trim(),heading=line.match(/^#{1,4}\s*(.+)$/);
      if(heading){ const title=heading[1].replace(/[:：]\s*$/,"").trim(); if(modules&&!/модул/i.test(title))break; modules=/модул/i.test(title); continue; }
      if(!modules)continue;
      const item=line.match(/^\d+[.)]\s+(?:\*\*)?(.+?)(?:\*\*)?\s*:?[\s]*$/);
      if(item){ const title=item[1].replace(/\*\*/g,"").replace(/[:：]\s*$/,"").trim(); if(title&&!actions.includes(title))actions.push(title); }
    }
    return actions.slice(0,8);
  }
  function caseTimelineItems(){
    const calendar=(activeReal.calendarEvents||[]).map(event=>({kind:"calendar",id:event.id,title:event.title||"Событие",at:event.at,until:event.until||"",place:event.place||"",note:event.note||"",calendarKind:event.kind||"reminder"}));
    const plan=(activeReal.nextActions||[]).filter(action=>!action.done&&action.due).map(action=>({kind:"plan",id:action.id,title:action.what||"Шаг плана",at:action.due,until:"",place:"",note:(action.waiting_for?"Ждём: "+action.waiting_for:"")+((action.owner||"")?((action.waiting_for?" · ":"")+"Ответственный: "+nextActionOwnerName(action.owner)):""),calendarKind:"deadline"}));
    return calendar.concat(plan).sort((left,right)=>{ const a=new Date(left.at).getTime(),b=new Date(right.at).getTime(); return (Number.isFinite(a)?a:Number.MAX_SAFE_INTEGER)-(Number.isFinite(b)?b:Number.MAX_SAFE_INTEGER); });
  }
  function accountingUsnPipeline(c){
    if(!isAccountingUsnPackCase(c))return "";
    const drafts=activeReal.drafts||[],materials=(activeReal.materials||[]),rules=drafts.find(d=>d.kind==="accounting_usn_rules"),incomeRule=drafts.find(d=>d.kind==="accounting_usn_income_rule"),ops=drafts.find(d=>d.kind==="accounting_usn_ops_1pct"),decision=drafts.find(d=>d.kind==="accounting_usn_ops_1pct_decision"),quarterDrafts=drafts.filter(d=>d.kind==="accounting_usn_quarters"),deductionDraft=drafts.find(d=>d.kind==="accounting_usn_social_contribution_deduction"),hasQuarterIncome=d=>Array.from((d.body||"").matchAll(/(?:^|\n)\d квартал: доходы ([0-9]+(?:[.,][0-9]+)?)/g)).some(match=>Number(match[1].replace(",","."))>0),quarterDraft=quarterDrafts.find(hasQuarterIncome),emptyQuarterDraft=quarterDrafts.find(d=>!hasQuarterIncome(d)),ready=materials.filter(m=>m.sensitivity==="financial"&&m.extract_status==="ok"&&/\.(pdf|csv|xls|xlsx|zip)$/i.test(m.title||""));
    const row=(number,title,status,detail,action)=>'<div class="task"><span class="tstat '+(status==="готово"?"done":status==="ждёт вас"?"todo":"skip")+'" aria-hidden="true"></span><div class="tmain"><b>'+number+". "+esc(title)+'</b><span>'+esc(status)+" · "+esc(detail)+'</span></div>'+action+'</div>';
    const rateAction=rules?'<span class="task-actions"><button class="btn small" type="button" data-act="draft-preview" data-id="'+attr(rules.id)+'">Открыть правило</button></span>':'<span class="task-actions"><button class="btn small primary" type="button" data-act="rc-goto" data-tab="Диалог">Уточнить ставку</button></span>';
    const statementsAction='<span class="task-actions"><button class="btn small'+(ready.length?"":" primary")+'" type="button" data-act="rc-goto" data-tab="Документы">'+(ready.length?"Открыть выписки":"Загрузить выписки")+'</button></span>';
    const incomeRuleAction=incomeRule?'<span class="task-actions"><button class="btn small" type="button" data-act="draft-preview" data-id="'+attr(incomeRule.id)+'">Открыть правило</button></span>':(ready.length?'<span class="task-actions"><button class="btn small primary" type="button" data-act="usn-rent-only-rule">Только аренда</button></span>':'<span class="task-actions"><button class="btn small" type="button" disabled>Правило доступно после выписок</button></span>');
    let contributionAction="",contributionStatus="ожидает",contributionDetail="сначала нужны распознанные выписки";
    if(ops&&decision){ contributionStatus="готово"; contributionDetail="классификация поступлений сохранена"; contributionAction='<span class="task-actions"><button class="btn small" type="button" data-act="draft-preview" data-id="'+attr(decision.id)+'">Открыть решение</button></span>'; }
    else if(ops){ contributionStatus="ждёт вас"; contributionDetail="проверьте отмеченные поступления"; contributionAction='<span class="task-actions"><button class="btn small primary" type="button" data-act="usn-ops-review" data-id="'+attr(ops.id)+'">Проверить поступления</button></span>'; }
    else if(ready.length){ contributionStatus="ждёт вас"; contributionDetail="запустите контрольный прогон по выпискам"; contributionAction='<span class="task-actions"><button class="btn small primary" type="button" data-act="rc-goto" data-tab="Документы">Перейти к прогону</button></span>'; }
    const quartersStatus=quarterDraft?"готово":(decision?"ждёт вас":"заблокирован"),quartersDetail=quarterDraft?"предварительный расчёт сохранён для проверки":(emptyQuarterDraft?"предыдущий расчёт не нашёл поступлений — пересчитайте за нужный год":(decision?"рассчитайте квартальные авансы по принятым поступлениям":"откроется после проверки поступлений"));
    const quartersAction=quarterDraft?'<span class="task-actions"><button class="btn small" type="button" data-act="draft-preview" data-id="'+attr(quarterDraft.id)+'">Открыть расчёт</button><button class="btn small primary" type="button" data-act="usn-quarterly-calc">Пересчитать</button></span>':(decision?'<span class="task-actions"><button class="btn small primary" type="button" data-act="usn-quarterly-calc">Рассчитать кварталы</button></span>':'<span class="task-actions"><button class="btn small" type="button" disabled>Расчёт кварталов</button></span>');
    const reconciliationYear=((quarterDraft&&((quarterDraft.title||"").match(/20\d{2}/)||[])[0])||new Date().getFullYear()),reconciliationAction=quarterDraft?'<span class="task-actions"><button class="btn small primary" type="button" data-act="usn-reconciliation" data-year="'+attr(reconciliationYear)+'">Собрать XLSX</button></span>':'<span class="task-actions"><button class="btn small" type="button" disabled>Сверка появится после расчёта</button></span>',deductionAction=deductionDraft?'<span class="task-actions"><button class="btn small" type="button" data-act="draft-preview" data-id="'+attr(deductionDraft.id)+'">Открыть расчёт</button></span>':(quarterDraft?'<span class="task-actions"><button class="btn small primary" type="button" data-act="usn-social-contribution-deduction" data-year="'+attr(reconciliationYear)+'">Применить вычет</button></span>':'<span class="task-actions"><button class="btn small" type="button" disabled>Вычет доступен после расчёта</button></span>');
    return '<section class="case-document-section"><div class="case-document-section-head"><h3>Пайплайн «Бухгалтерия УСН»</h3><span>7 шагов</span></div><p class="rc-hint">Маршрут работы по этому делу. Следующий доступный шаг отмечен отдельно; расчёты не создают платёж или обращение в ФНС.</p><div class="stage">'+
      row("1","Ставка и режим",rules?"готово":"ждёт вас",rules?"правило расчёта зафиксировано":"уточните объект, регион и ставку",rateAction)+
      row("2","Выписки",ready.length?"готово":"ждёт вас",ready.length?"распознано финансовых материалов: "+ready.length+" · выписки разных банков за один период объединяются":"загрузите и распознайте выписки",statementsAction)+
      row("3","Правило поступлений",incomeRule?"готово":(ready.length?"ждёт вас":"заблокирован"),incomeRule?"в доход включается только аренда помещения":(ready.length?"зафиксируйте, что в доход включать":"откроется после выписок"),incomeRuleAction)+
      row("4","Дополнительный взнос 1%",contributionStatus,contributionDetail,contributionAction)+
      row("5","Расчёт кварталов",quartersStatus,quartersDetail,quartersAction)+
      row("6","Сверочная таблица Excel",quarterDraft?"ждёт вас":"заблокирован",quarterDraft?"проверьте включённые и исключённые операции перед уплатой":"откроется после предварительного расчёта",reconciliationAction)+
      row("7","Вычет платежа в Социальный фонд",deductionDraft?"готово":(quarterDraft?"ждёт вас":"заблокирован"),deductionDraft?"предварительное уменьшение сохранено для проверки":(quarterDraft?"укажите сумму, квартал и сведения о работниках":"откроется после предварительного расчёта"),deductionAction)+
      '</div></section>';
  }
  function realTabPanel(){
    const c=activeReal.c, canDecide=activeReal.canDecide, isOwner=activeReal.isOwner;
    if(realTab==="Обучение Лайи") return layaTrainingPanel();
    if(realTab==="Диалог") return realDialogPanel();
    if(realTab==="Обзор") return realOverviewPanel();
    if(realTab==="Журнал"){
      if(!activeReal.events.length) return emptyState("📓","Записей пока нет","Журнал наполнится, когда по делу пойдёт работа.","","");
      return '<div class="rc-hint">Что происходило по делу — новые записи сверху. Действия агентов помечены.</div>'+activeReal.events.slice().reverse().map(eventLine).join("");
    }
    if(realTab==="Школа") return schoolPanel();
    if(realTab==="План"){
      const actions=activeReal.nextActions||[];
      const suggestions=actions.length?[]:suggestedPlanActions();
      const skipKey=caseId=>{ try{ return JSON.parse(localStorage.getItem("fixar-v2-plan-skipped:"+(authState.principal||"guest")+":"+caseId)||"{}"); }catch(_){ return {}; } };
      const skipped=activeReal.c?skipKey(activeReal.c.id):{};
      const renderActionRow=action=>{
        const isF7=isSelfdiagF7Action(c.id,action),isSD=isSelfdiagQuestion(c.id,action),isSkip=!isF7&&!isSD&&!!skipped[action.id];
        const dot=isSkip?"skip":(action.done?"done":"todo");
        const stateNote=isSkip?'<div class="tstate"><b>Пропущено.</b> '+esc(skipped[action.id]||"Без пояснения.")+'</div>':"";
        const needsBoundaryDecision=actionNeedsDataBoundaryDecision(action),boundaryDecision=action.data_boundary_decision||null;
        const decisionNote=dataBoundaryDecisionSummary(boundaryDecision)+selfdiagDecisionSummary(action.escalation_decision)+selfdiagDecisionSummary(action.selfdiag_answer);
        let buttons=(canDecide&&!action.done&&!isSkip)?(needsBoundaryDecision&&!boundaryDecision?(isOwner?'<span class="task-actions"><button class="btn small primary" type="button" data-act="answer-data-boundary" data-id="'+attr(action.id)+'">Ответить по форме</button></span>':'<span class="done-mark">ждём ответ владельца</span>'):'<span class="task-actions"><button class="btn small" type="button" data-act="complete-action" data-id="'+attr(action.id)+'">Готово</button><button class="btn small" type="button" data-act="skip-action" data-id="'+attr(action.id)+'">Пропустить</button></span>'):(action.done?'<span class="done-mark">выполнено</span>':(isSkip?'<span class="task-actions"><span class="done-mark">пропущено</span><button class="btn small" type="button" data-act="unskip-action" data-id="'+attr(action.id)+'">Вернуть</button></span>':''));
        if(isF7&&!action.done){
          buttons=action.escalation_decision?(isOwner?'<span class="task-actions"><button class="btn small" type="button" data-act="complete-action" data-id="'+attr(action.id)+'">Закрыть эскалацию</button></span>':''):(isOwner?'<span class="task-actions"><button class="btn small primary" type="button" data-act="answer-selfdiag-f7" data-id="'+attr(action.id)+'">Ответить</button></span>':'<span class="done-mark">ждём ответ владельца</span>');
        }
        if(isSD&&!action.done){
          buttons=action.selfdiag_answer?(isOwner?'<span class="task-actions"><button class="btn small" type="button" data-act="complete-action" data-id="'+attr(action.id)+'">Закрыть вопрос</button></span>':''):(isOwner?'<span class="task-actions"><button class="btn small primary" type="button" data-act="answer-selfdiag-question" data-id="'+attr(action.id)+'">Ответить на вопрос</button></span>':'<span class="done-mark">ждём ответ владельца</span>');
        }
        const edit=canDecide&&c.id===LAYA_ROUTING_CASE_ID&&!action.done?'<button class="btn small" type="button" data-act="edit-action" data-id="'+attr(action.id)+'">Изменить</button>':'';
        return '<div class="task'+(isSkip?' task-skipped':'')+'"><span class="tstat '+dot+'" aria-hidden="true"></span><div class="tmain"><b>'+esc(action.what||"Шаг")+'</b><span>'+esc(nextActionOwnerName(action.owner))+(action.due?' · до '+esc(fmtWhen(action.due)):'')+(action.waiting_for?' · ждём: '+esc(action.waiting_for):'')+'</span>'+stateNote+decisionNote+'</div>'+buttons+edit+'</div>';
      };
      const f7Actions=actions.filter(action=>isSelfdiagF7Action(c.id,action));
      const actionRows=actions.filter(action=>!isSelfdiagF7Action(c.id,action)).map(renderActionRow).join("");
      const f7Rows=f7Actions.map(renderActionRow).join("");
      const ownerOptions='<option value="">Пока не назначен</option>'+(c.participants||[]).map(participant=>'<option value="'+attr(participant.principal_id)+'">'+esc(participant.display_name||(participant.principal_id===authState.principal?'Вы':'Участник'))+'</option>').join("")+(c.selected_agent_id?'<option value="'+attr(c.selected_agent_id)+'">'+esc(assistantName(c))+'</option>':'');
      const importOffer=suggestions.length?'<div class="case-form-note"><span>✦</span><p><b>Фиксар уже выделил '+suggestions.length+' модуля.</b><br>Проверьте сроки и перенесите их в настоящий план дела.</p></div><button class="btn primary case-form-submit" type="button" data-act="plan-from-dialog">Собрать план из ответа</button>':'';
      const actionForm=canDecide?'<aside class="case-form-card tone-blue"><p class="eyebrow">'+(suggestions.length?'ГОТОВАЯ СТРУКТУРА':'НОВЫЙ ПУНКТ ПЛАНА')+'</p><h2>'+(suggestions.length?'Перенести модули в план?':'Что нужно сделать?')+'</h2><p>'+(suggestions.length?'Ничего не нужно описывать повторно: модули взяты из последнего ответа Фиксара.':'Пункт сохранится в деле и будет виден участникам. Срок и ответственного можно оставить пустыми.')+'</p>'+importOffer+'<details'+(suggestions.length?'':' open')+' class="case-more-fields"><summary>Добавить один пункт вручную</summary><form class="pform case-modern-form" data-act="next-action"><label><span>Действие</span><textarea name="what" rows="3" maxlength="1000" required placeholder="Например, реализовать загрузку банковских выписок PDF и Excel"></textarea></label><div class="case-field-grid"><label><span>Ответственный</span><select name="owner">'+ownerOptions+'</select></label><label><span>Срок</span><input name="due" type="datetime-local"></label></div><label><span>Что ждём</span><input name="waiting_for" maxlength="255" placeholder="Например, тестовые выписки за квартал"></label><button class="btn primary case-form-submit" type="submit">Добавить пункт плана</button></form></details></aside>':'<aside class="case-form-card tone-muted"><p class="eyebrow">ПЛАН</p><h2>Изменения защищены</h2><p>Добавлять и завершать пункты может участник с правом «решения».</p></aside>';
      const steps=c.on_request_steps||[];
      let h=accountingUsnPipeline(c)+(f7Rows?'<div class="section-t">Эскалации F7 · '+f7Actions.filter(action=>!action.done).length+' открыто</div><p class="rc-hint">Здесь владелец выбирает направление работы. Ответ фиксируется в деле и журнале, но не запускает правку кода. Закрывайте пункт после проверки результата или осознанного отказа от работы.</p><div class="stage">'+f7Rows+'</div>':"");
      if(actionRows)h+='<div class="section-t">'+(c.id===SELFDIAG_CASE_ID?'Вопросы самодиагностики':'План реализации')+'</div>'+(c.id===SELFDIAG_CASE_ID?'<p class="rc-hint">На каждый вопрос СД ответьте через кнопку рядом с ним. Ответ сохранится в деле и журнале; пункт остаётся открытым, пока вы не закроете его отдельно.</p>':'')+'<div class="stage">'+actionRows+'</div>';
      if(c.self_steps) h+='<p class="rc-hint">Автоматических шагов: '+c.self_steps+'</p>';
      if(steps.length) h+='<div class="section-t">Шаги по запросу</div>'+steps.map(s=>'<div class="task"><span class="tstat todo" aria-hidden="true"></span><div class="tmain"><b>'+esc(s.title||s.step||"Шаг")+'</b><span>по запросу'+(s.min_assurance?' · нужен уровень '+s.min_assurance:'')+'</span></div></div>').join("");
      const runEv=activeReal.events.filter(e=>/^run\.|^patch\./.test(e.kind));
      if(runEv.length) h+='<div class="section-t">Ход работы</div>'+runEv.slice().reverse().map(eventLine).join("");
      if(!h) h=emptyState("🧭",suggestions.length?"Структура готова к сохранению":"План ещё не сложился",suggestions.length?"Фиксар выделил модули из диалога. Проверьте сроки в форме и подтвердите перенос.":"Добавьте первый реальный шаг в форме — он сразу сохранится в деле.","","");
      const runs=(activeReal.runs||[]).map(runCard).join("");
      const patches=(activeReal.patches||[]).map(patchCard).join("");
      let command='';
      if(canDecide && authState.assurance>=2 && c.selected_agent_id && c.template_version){
        command='<div class="section-t">Поручить агенту</div><p class="rc-hint">Агент возьмёт только закреплённый план этого дела. Существенные изменения всё равно появятся отдельным запросом на подтверждение.</p><button class="btn primary" data-act="grant-agent">Дать поручение агенту</button>';
      } else if(canDecide && c.selected_agent_id && !c.template_version) {
        command='<div class="rc-note">'+esc(assistantName(c))+' уже подключён. Пункты плана можно сохранить сейчас; запуск исполнения появится после закрепления '+(c.domain==="software"?'шаблона пака':'рабочего шаблона')+'.</div>';
      } else if(canDecide && !c.selected_agent_id) {
        command='<div class="rc-note">Собеседник ещё не назначен. Сохраните план сейчас или продолжите диалог — повторно описывать уже записанные требования не нужно.</div>';
      } else if(canDecide) {
        command='<div class="rc-note">Чтобы поручить работу агенту, подтвердите вход до уровня 2. Это защищает запуск, который может тратить кредиты и создавать предложения изменений.</div>';
      }
      return '<div class="case-form-layout case-plan-layout"><section class="case-form-main">'+h+(runs?'<div class="section-t">Запуски агента</div>'+runs:'')+(patches?'<div class="section-t">Ждут вашего слова</div>'+patches:'')+command+'</section>'+actionForm+'</div>';
    }
    if(realTab==="Сроки"){
      const timeline=caseTimelineItems(),undated=activeReal.nextActions.filter(action=>!action.done&&!action.due).length;
      const rows=timeline.map(item=>'<article class="case-time-item"><span class="case-time-icon" aria-hidden="true">'+(item.kind==="plan"?'→':item.calendarKind==="deadline"?'✓':item.calendarKind==="meeting"?'◎':item.calendarKind==="hearing"?'§':'◷')+'</span><div><p class="eyebrow">'+esc(item.kind==="plan"?"ПЛАН ДЕЛА":(CALENDAR_KIND[item.calendarKind]||item.calendarKind||"Событие"))+'</p><h3>'+esc(item.title)+'</h3><p>'+esc(fmtWhen(item.at))+(item.until?' — '+esc(fmtWhen(item.until)):'')+(item.place?' · '+esc(item.place):'')+'</p>'+(item.note?'<small>'+esc(item.note)+'</small>':'')+'</div>'+(item.kind==="plan"?'<button class="case-quiet-action" data-act="rc-goto" data-tab="План">Открыть в плане</button>':(isOwner?'<button class="case-quiet-action" data-act="calendar-cancel" data-id="'+attr(item.id)+'">Отменить</button>':''))+'</article>').join("")||(undated?'<div class="case-soft-empty"><span>→</span><div><h3>План есть, даты ещё не назначены</h3><p>Откройте план и задайте срок для '+undated+' '+plural(undated,["шага","шагов","шагов"])+'.</p></div></div>':'<div class="case-soft-empty"><span>◷</span><div><h3>Пока свободно</h3><p>Добавьте только ту дату, о которой действительно важно помнить.</p></div></div>');
      const calendarNotice=activeReal.calendarError?'<div class="rc-note">Личный календарь временно недоступен, но сроки из плана показаны ниже. <button class="btn small" data-act="calendar-retry">Повторить</button></div>':(!isOwner?'<p class="rc-note">Календарь пока принадлежит владельцу дела. Сроки плана доступны всем участникам.</p>':'');
      const dateForm=isOwner?'<aside class="case-form-card tone-blue"><p class="eyebrow">НОВАЯ ДАТА</p><h2>Что поставить на контроль?</h2><p>Достаточно названия и времени. Остальное можно уточнить позже.</p><form class="pform case-modern-form" data-act="calendar-create"><div class="case-field-grid"><label><span>Вид</span><select name="kind"><option value="deadline">Срок</option><option value="hearing">Заседание</option><option value="meeting">Встреча</option><option value="reminder">Напоминание</option></select></label><label><span>Когда</span><input name="at" type="datetime-local" required value="'+attr(calendarInputValue())+'"></label></div><label><span>Название</span><input name="title" required maxlength="500" placeholder="Например, подтвердить новое расписание"></label><details class="case-more-fields"><summary>Добавить место, окончание и заметку</summary><div class="case-field-grid"><label><span>Окончание</span><input name="until" type="datetime-local"></label><label><span>Место</span><input name="place" maxlength="500" placeholder="Школа, суд, онлайн"></label></div><label><span>Заметка</span><textarea name="note" rows="3" maxlength="4000" placeholder="Что подготовить или проверить"></textarea></label></details><div class="case-form-note"><span>◷</span><p>Для срока напомним за три дня, для заседания — за сутки.</p></div><button class="btn primary case-form-submit" type="submit">Добавить в календарь</button></form></aside>':'<aside class="case-form-card tone-muted"><p class="eyebrow">КАЛЕНДАРЬ ВЛАДЕЛЬЦА</p><h2>Сроки плана уже видны</h2><p>Добавлять личные напоминания может владелец дела. Общие даты работы берутся из плана.</p></aside>';
      return '<div class="case-form-layout"><section class="case-form-main"><div class="case-section-heading"><div><p class="eyebrow">СРОКИ И ВСТРЕЧИ</p><h2>Всё важное — по времени</h2></div><p>Даты календаря и сроки плана собраны в одной хронологии.</p></div>'+calendarNotice+'<div class="case-timeline">'+rows+'</div></section>'+dateForm+'</div>';
    }
    if(realTab==="Документы"){
      const defaultSensitivity=statementMaterialSensitivity(c,"","normal");
      const usnPackCase=isAccountingUsnPackCase(c), financialReady=(activeReal.materials||[]).filter(m=>m.sensitivity==="financial"&&m.extract_status==="ok"&&/\.(pdf|csv|xls|xlsx|zip)$/i.test(m.title||"")), canRunUsnTest=isOwner&&financialReady.length>0;
      const draftState=d=>d.state==="draft"?"черновик":(d.state==="accepted"?"принят":(d.state==="rejected"?"отклонён":(d.state||"черновик")));
      const draftKind=d=>({accounting_usn_test:"КОНТРОЛЬНЫЙ ПРОГОН",accounting_usn_rules:"ПРАВИЛА РАСЧЁТА УСН",accounting_usn_ops_1pct:"РАСЧЁТ ВЗНОСА 1%",accounting_usn_ops_1pct_decision:"РЕШЕНИЕ ВЛАДЕЛЬЦА",accounting_usn_quarters:"РАСЧЁТ УСН ПО КВАРТАЛАМ"})[d.kind]||"ДОКУМЕНТ";
      const docs=(activeReal.drafts||[]).map(d=>'<article class="case-document-card"><span class="case-document-icon" aria-hidden="true">≡</span><div class="case-document-copy"><p class="eyebrow">'+esc(draftKind(d))+'</p><h3>'+esc(d.title||draftKind(d))+'</h3><p>'+esc(draftState(d))+(d.shared?' · открыт участникам':' · виден только владельцу')+'</p></div>'+(isOwner?'<div class="case-document-actions"><button class="case-quiet-action" data-act="draft-preview" data-id="'+attr(d.id)+'">Посмотреть</button><button class="case-quiet-action" data-act="draft-pdf" data-id="'+attr(d.id)+'">PDF</button><button class="case-quiet-action" data-act="draft-docx" data-id="'+attr(d.id)+'">DOCX</button><button class="case-quiet-action" data-act="draft-share" data-id="'+attr(d.id)+'"'+(d.shared||d.state!=="accepted"?' disabled':'')+'>'+ (d.shared?'Открыто':'Открыть участникам')+'</button>'+(d.shared?'<button class="case-quiet-action" data-act="draft-external" data-id="'+attr(d.id)+'">Ссылка</button>':'')+'</div>':'')+'</article>').join("")||'<div class="case-soft-empty"><span>≡</span><div><h3>Совместных документов пока нет</h3><p>Создайте первый текст, когда участникам понадобится общий результат.</p></div></div>';
      const materialRows=(activeReal.materials||[]).map(m=>{ const mayChange=canDecide||m.uploaded_by===authState.principal, state=m.extract_status==="ok"?"готов к поиску":(m.extract_status==="failed"?"нужна проверка":"обрабатывается"), name=(m.title||"").toLowerCase(), icon=(m.mime||"").indexOf("image/")===0?"▧":((m.mime||"").indexOf("pdf")>=0||name.endsWith(".pdf")?"PDF":(name.endsWith(".xls")||name.endsWith(".xlsx")?"XLS":(name.endsWith(".zip")?"ZIP":"↥"))); return '<article class="case-document-card"><span class="case-document-icon material" aria-hidden="true">'+icon+'</span><div class="case-document-copy"><h3>'+esc(m.title||"Материал")+'</h3><p>'+esc(m.mime||m.kind||"файл")+' · '+esc(state)+'</p><span class="case-access-badge">'+esc(SEE_RU[m.sensitivity]||m.sensitivity||"обычные сведения")+'</span></div><div class="case-document-actions"><button class="case-quiet-action" data-act="material-download" data-id="'+attr(m.id)+'" data-name="'+attr(m.title||"material")+'">Скачать</button>'+(mayChange?'<button class="case-quiet-action" data-act="material-sensitivity" data-id="'+attr(m.id)+'" data-sensitivity="'+attr(m.sensitivity||"normal")+'">Доступ</button>':'')+'</div></article>'; }).join("")||'<div class="case-soft-empty"><span>↥</span><div><h3>Материалов пока нет</h3><p>Приложите PDF, Excel, CSV или ZIP — помощник разберёт текст и таблицы локально.</p></div></div>';
      const hidden=activeReal.hiddenMaterials?'<p class="rc-note">Ещё материалов скрыто вашим уровнем доступа: '+activeReal.hiddenMaterials+'. Их названия не раскрываются.</p>':'';
      // Разбор УЖЕ ЗАГРУЖЕННЫХ выписок уровня 2 не требует: шлюз просит у
      // POST /cases/{id}/materials/extract только право «комментарии». Поэтому
      // кнопка живёт отдельно от формы загрузки и остаётся на месте, пока вход
      // не подтверждён, — как было до переноса.
      const extractBtn=activeReal.canComment?'<button class="btn ghost case-form-submit" type="button" data-act="extract-statements">Разобрать загруженные выписки</button>':'';
      // Шлюз пускает POST /vault/documents и /cases/{id}/materials только с
      // уровнем входа 2: без него форма обещала бы загрузку, которая получит 403.
      const upload=activeReal.canComment&&authState.assurance<2?'<section class="case-document-tool tone-muted"><p class="eyebrow">ДОБАВИТЬ МАТЕРИАЛ</p><h2>Подтвердите вход</h2><p>Файлы попадают в приватное хранилище дела, поэтому загрузка доступна после подтверждения входа до уровня 2.</p><div class="cta-row"><button class="btn primary" type="button" data-my-day-account>Подтвердить вход</button>'+extractBtn+'</div></section>':activeReal.canComment?'<section class="case-document-tool tone-blue"><p class="eyebrow">ДОБАВИТЬ МАТЕРИАЛ</p><h2>Выписка или другой файл</h2><p>PDF, Excel, CSV и ZIP разбираются локально. Файлы остаются в приватном хранилище дела.</p><form class="pform case-modern-form" data-act="material-upload"><label class="case-file-picker"><input name="material" type="file" accept="'+attr(STATEMENT_ACCEPT)+'" required><span class="case-file-symbol">↥</span><span><b>Выбрать файл</b><small class="book-file-name">PDF, XLS/XLSX, CSV, ZIP · до 64 МБ</small></span></label><label><span>Какие сведения содержит файл</span><select name="sensitivity">'+SEE_ALL.map(s=>'<option value="'+s+'"'+(s===defaultSensitivity?' selected':'')+'>'+esc(SEE_RU[s])+'</option>').join("")+'</select></label><div class="case-form-note"><span>◎</span><p>Банковская выписка помечается как финансовая. Доступ можно изменить позже.</p></div><button class="btn primary case-form-submit" type="submit">Загрузить и распознать</button>'+extractBtn+'<div class="rc-hint" data-material-status aria-live="polite"></div></form></section>':'<section class="case-document-tool tone-muted"><p class="eyebrow">ДОСТУП</p><h2>Загрузка защищена</h2><p>Прикладывать материалы может участник с правом комментирования.</p></section>';
      const usnTest=usnPackCase?'<section class="case-document-tool tone-purple"><p class="eyebrow">ТЕСТ ПАКА · НАСТОЯЩИЕ ДАННЫЕ</p><h2>Прогнать «Бухгалтерию УСН»</h2><p>Исполнитель читает только распознанные финансовые материалы этого дела и сохраняет безопасный черновик проверки. Банк, ФНС, платежи и внешние модели не вызываются.</p><p class="rc-hint">Готово выписок: '+financialReady.length+'. Расчёт налога и декларация здесь не создаются.</p>'+(isOwner?'<label class="case-choice"><input type="checkbox" data-usn-test-confirm><span><b>Разрешаю локальный тест по выпискам этого дела</b><small>Результат — только черновик; данные не покидают контур дела.</small></span></label><button class="btn primary case-form-submit" type="button" data-act="run-usn-pack-test"'+(canRunUsnTest?'':' disabled')+'>Запустить контрольный прогон</button><div class="rc-hint" data-usn-test-status aria-live="polite">'+(canRunUsnTest?'':'Сначала дождитесь распознавания хотя бы одной финансовой выписки.')+'</div>':'<p class="rc-hint">Запуск доступен только владельцу дела после подтверждённого входа.</p>')+'</section>':'';
      const ops1pctDraft=(activeReal.drafts||[]).find(d=>d.kind==="accounting_usn_ops_1pct");
      const opsReview=ops1pctDraft&&isOwner?'<section class="case-document-tool tone-purple"><p class="eyebrow">СЛЕДУЮЩИЙ ШАГ · ВЗНОС 1%</p><h2>Проверьте отмеченные поступления</h2><p>Шесть операций ждут вашей классификации. Ответ сохранится в деле и не создаст платёж.</p><button class="btn primary case-form-submit" type="button" data-act="usn-ops-review" data-id="'+attr(ops1pctDraft.id)+'">Дальше: проверить поступления</button></section>':'';
      const editor=isOwner?'<section class="case-document-tool tone-purple"><p class="eyebrow">НОВЫЙ ДОКУМЕНТ</p><h2>Соберите общий результат</h2><p>Каждое сохранение создаёт версию. Затем документ можно открыть участникам или выдать внешнюю ссылку.</p><form class="pform case-modern-form" data-act="draft-create"><label><span>Название</span><input name="title" required placeholder="Например, новое расписание"></label><label><span>Текст документа</span><textarea name="body" required rows="9" placeholder="Начните писать — важное можно доработать вместе."></textarea></label><button class="btn primary case-form-submit" type="submit">Сохранить версию</button></form></section>':'<section class="case-document-tool tone-muted"><p class="eyebrow">СОВМЕСТНАЯ РАБОТА</p><h2>Документы доступны для чтения</h2><p>Новые версии создаёт владелец дела. Открытые документы можно скачать или просмотреть по выданной ссылке.</p></section>';
      return '<div class="case-documents-layout"><section class="case-documents-main"><div class="case-section-heading"><div><p class="eyebrow">МАТЕРИАЛЫ ДЕЛА</p><h2>Всё, на чём основана работа</h2></div><p>Файлы и совместные тексты остаются рядом с решениями, людьми и историей дела.</p></div><div class="case-document-section"><div class="case-document-section-head"><h3>Файлы и вложения</h3><span>'+activeReal.materials.length+'</span></div><div class="case-document-list">'+materialRows+'</div>'+hidden+'</div><div class="case-document-section"><div class="case-document-section-head"><h3>Совместные документы</h3><span>'+activeReal.drafts.length+'</span></div><div class="case-document-list">'+docs+'</div></div></section><aside class="case-document-tools">'+opsReview+usnTest+upload+editor+'</aside></div>';
    }
    if(realTab==="Участники"){
      const rows=(c.participants||[]).map(p=>{
        const rights=(p.rights&&p.rights.length?p.rights:["read"]).map(r=>'<span class="rtag">'+esc(RIGHT_RU[r]||r)+'</span>').join("");
        const sees=(p.may_see&&p.may_see.length?p.may_see:["normal"]).map(s=>'<span class="stag">'+esc(SEE_RU[s]||s)+'</span>').join("");
        const edit=canDecide?'<button class="case-quiet-action" data-act="edit-see" data-pid="'+attr(p.principal_id)+'">Настроить доступ</button>':'';
        const name=p.display_name||"Без имени",initial=(name.trim().charAt(0)||"•").toUpperCase();
        return '<article class="case-person-card"><div class="case-person-avatar" aria-hidden="true">'+esc(initial)+'</div><div class="case-person-copy"><div class="case-person-title"><h3>'+esc(name)+'</h3><span>'+esc(ROLE_RU[p.role]||p.role||"")+'</span></div>'+(p.engagement?'<p>'+esc(ENG_RU[p.engagement]||p.engagement)+'</p>':'')+'<div class="case-access-line"><b>Может</b><div>'+rights+'</div></div><div class="case-access-line"><b>Видит</b><div>'+sees+'</div></div></div>'+edit+'</article>';
      }).join("");
      const people=rows||'<div class="case-soft-empty"><span>☺</span><div><h3>Вы пока один</h3><p>Пригласите человека, когда будет понятно, чем он поможет.</p></div></div>';
      let invite='';
      if(canDecide){
        invite='<aside class="case-form-card tone-peach"><p class="eyebrow">НОВЫЙ УЧАСТНИК</p><h2>Кого позовём?</h2><p>Сначала выберите роль, затем оставьте только действительно нужные права.</p><form class="pform case-modern-form" data-act="invite"><div class="case-field-grid"><label><span>Роль в деле</span><select name="role">'+INVITE_ROLES.map(r=>'<option value="'+r+'">'+esc(ROLE_RU[r])+'</option>').join("")+'</select></label><label><span>Формат участия</span><select name="engagement"><option value="volunteer">добровольно</option><option value="partner">партнёр</option></select></label></div><fieldset class="case-choice-group"><legend>Что человек сможет делать</legend><p>Чтение включено всегда — без него участие невозможно.</p>'+["read","comment","decide"].map(r=>'<label class="case-choice"><input type="checkbox" name="right" value="'+r+'"'+(r==="read"?' checked disabled':'')+'><span><b>'+esc(RIGHT_RU[r])+'</b><small>'+(r==="read"?'Открывать дело и видеть разрешённые сведения':r==="comment"?'Писать в диалог и добавлять материалы':'Подтверждать решения и действия агента')+'</small></span></label>').join("")+'</fieldset><fieldset class="case-choice-group"><legend>Какие сведения открыть</legend><p>Обычные сведения включены всегда. Остальные категории добавляйте осознанно.</p>'+SEE_ALL.map(s=>'<label class="case-choice"><input type="checkbox" name="see" value="'+s+'"'+(s==="normal"?' checked disabled':'')+'><span><b>'+esc(SEE_RU[s])+'</b><small>'+(s==="normal"?'Ход дела без чувствительных данных':s==="pii"?'Имена, контакты и другие персональные сведения':s==="medical"?'Медицинские материалы дела':'Финансовые документы и суммы')+'</small></span></label>').join("")+'</fieldset><label><span>Заметка для приглашённого</span><input name="note" maxlength="300" placeholder="Например, нужно вместе подтвердить расписание"></label><button class="btn primary case-form-submit" type="submit">Создать приглашение</button><div id="inviteout"></div></form></aside>';
      } else {
        invite='<aside class="case-form-card tone-muted"><p class="eyebrow">ДОСТУП</p><h2>Изменения защищены</h2><p>Приглашать людей и менять их доступ может участник с правом «решения».</p></aside>';
      }
      return '<div class="case-form-layout"><section class="case-form-main"><div class="case-section-heading"><div><p class="eyebrow">ЛЮДИ И ДОСТУП</p><h2>Каждый видит только нужное</h2></div><p>Роль отвечает за место человека в деле, права — за действия, категории — за видимые сведения.</p></div><div class="case-people-grid">'+people+'</div></section>'+invite+'</div>'+domashkinParentInvitePanel();
    }
    if(realTab==="Настройки"){
      let s=""; const workSpace=caseSpaceName({scope:"pro",domain:c.domain,selected_agent_id:c.selected_agent_id}),workSpaceNote=workSpace==="Разработка"?"Проекты, паки и автоматизации":workSpace==="Проекты и исследования"?"Исследовательские дела и ворота":"Работа с профильным специалистом";
      if(canDecide){ s+='<section class="case-setting-panel tone-purple"><div class="case-setting-copy"><p class="eyebrow">СМЫСЛ ДЕЛА</p><h2>Название и результат</h2><p>Короткое название помогает найти дело, а цель объясняет помощнику, что считать готовым результатом.</p></div><form class="pform case-modern-form" data-act="case-details"><label><span>Название</span><input name="title" required maxlength="500" value="'+attr(c.title||"")+'"></label><label><span>Что должно получиться</span><textarea name="goal" rows="4" maxlength="4000" placeholder="Например, новое расписание согласовано со школой и семьёй">'+esc(c.goal||"")+'</textarea></label><button class="btn primary case-form-submit" type="submit">Сохранить</button></form></section>'; }
      if(isOwner){ s+='<section class="case-setting-panel tone-blue"><div class="case-setting-copy"><p class="eyebrow">ПРОСТРАНСТВО</p><h2>Где живёт это дело?</h2><p>Пространство меняет окружение и быстрые переходы, но не удаляет историю, людей или материалы.</p></div><form class="pform case-modern-form" data-act="scope"><fieldset class="case-space-choice">'+[["personal","Личное","Только ваши повседневные вопросы","●"],["home","Семья","Общие дела и согласованные решения","⌂"],["pro",workSpace,workSpaceNote,"§"]].map(x=>'<label><input type="radio" name="scope" value="'+x[0]+'"'+((c.scope||"")===x[0]?' checked':'')+'><span><i>'+x[3]+'</i><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></span></label>').join("")+'</fieldset><button class="btn case-form-submit" type="submit">Перенести дело</button></form></section>'; }
      if(canDecide){ s+='<section class="case-setting-panel tone-peach"><div class="case-setting-copy"><p class="eyebrow">СОСТОЯНИЕ</p><h2>Что сделать с делом?</h2><p>Завершённое дело остаётся в истории. Архив убирает его из активной работы. Любое из них можно возобновить.</p></div><div class="case-state-actions">'+
        (c.state!=="closed"?'<button class="btn" data-act="state" data-state="closed">Завершить</button>':'')+
        (c.state!=="archived"?'<button class="btn" data-act="state" data-state="archived">Архивировать</button>':'')+
        ((c.state==="closed"||c.state==="archived")?'<button class="btn primary" data-act="state" data-state="active">Возобновить</button>':'')+'</div></section>'; }
      if(!isOwner && !canDecide) s='<p class="rc-note">Изменять дело может владелец или участник с правом «решения».</p>';
      return '<div class="case-settings-grid">'+s+'</div>';
    }
    return "";
  }
  let dialogRecognition=null;
  function startDialogVoice(button,field,status){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){ status.textContent="В этом браузере голосовой ввод недоступен. Используйте микрофон клавиатуры или напишите сообщение."; return; }
    if(dialogRecognition){ dialogRecognition.stop(); return; }
    const recognition=new Recognition(), before=(field.value||"").trim(); dialogRecognition=recognition;
    recognition.lang=(window.FixarV2I18n&&window.FixarV2I18n.english)?"en-US":"ru-RU"; recognition.interimResults=true; recognition.continuous=false;
    button.classList.add("listening"); button.setAttribute("aria-pressed","true"); status.textContent="Слушаю… Нажмите микрофон ещё раз, чтобы остановить.";
    recognition.onresult=event=>{ let spoken=""; for(let i=event.resultIndex;i<event.results.length;i++)spoken+=event.results[i][0].transcript; field.value=(before?before+" ":"")+spoken.trim(); field.dispatchEvent(new Event("input",{bubbles:true})); };
    recognition.onerror=event=>{ status.textContent=event.error==="not-allowed"?"Браузер не дал доступ к микрофону. Разрешите его для agrigate.pro в настройках сайта.":"Не удалось распознать речь. Можно повторить или написать сообщение."; };
    recognition.onend=()=>{ dialogRecognition=null; button.classList.remove("listening"); button.setAttribute("aria-pressed","false"); if(status.textContent.indexOf("Слушаю")===0)status.textContent=field.value.trim()?"Голос записан — проверьте текст и отправьте.":"Голос не распознан. Попробуйте ещё раз."; };
    try{ recognition.start(); }catch(_){ recognition.onend(); }
  }
  function installVoiceControls(root){
    (root||document).querySelectorAll("form.my-day-composer").forEach(form=>{
      if(form.classList.contains("my-day-guest-composer"))return;
      if(form.querySelector('[data-act="voice-input"]'))return;
      const foot=form.querySelector(".my-day-composer-foot"),field=form.elements.message;
      if(!foot||!field)return;
      const button=document.createElement("button");
      button.className="chat-tool"; button.type="button"; button.dataset.act="voice-input";
      button.setAttribute("aria-label",uiText("Сказать голосом","Speak"));
      button.setAttribute("aria-pressed","false");
      button.innerHTML='<span class="tool-icon" aria-hidden="true">🎙</span><span>'+esc(uiText("Голос","Voice"))+'</span>';
      foot.insertBefore(button,foot.querySelector('button[type="submit"]'));
      if(!form.querySelector("[data-voice-status]")){
        const status=document.createElement("div"); status.className="chat-status";
        status.dataset.voiceStatus=""; status.setAttribute("role","status");
        status.setAttribute("aria-live","polite"); foot.after(status);
      }
    });
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest('[data-act="voice-input"]'); if(!button)return;
    event.preventDefault(); const form=button.closest("form"),field=form&&form.elements.message;
    if(!field)return; const status=form.querySelector("[data-voice-status],[data-chat-status]");
    startDialogVoice(button,field,status);
  });
  const voiceControlsObserver=new MutationObserver(()=>installVoiceControls(document.getElementById("vwrap")));
  voiceControlsObserver.observe(document.getElementById("vwrap"),{childList:true,subtree:true});
  function statementMaterialSensitivity(c,fileName,fallback="pii"){
    const context=[c&&c.title,c&&c.goal,fileName].filter(Boolean).join(" ").toLowerCase();
    return /бухгалтер|усн|налог|банк|выписк|statement|transaction|операци/.test(context)?"financial":fallback;
  }
  function isAccountingUsnPackCase(c){
    const context=[c&&c.title,c&&c.goal].filter(Boolean).join(" ").toLowerCase();
    return !!(c&&c.scope==="pro"&&c.selected_agent_id==="cabinet"&&/усн/.test(context)&&/бухгалтер/.test(context));
  }
  function caseRequestId(prefix="case"){
    const bytes=new Uint8Array(12); if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(bytes);
    const random=Array.from(bytes,value=>value.toString(16).padStart(2,"0")).join("")||Math.random().toString(36).slice(2);
    return "v2-"+prefix+"-"+Date.now().toString(36)+"-"+random;
  }
  async function caseRequestHash(payload){
    if(!(window.crypto&&crypto.subtle))throw new Error("Браузер не поддерживает безопасный повтор создания дела.");
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(payload)));
    return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,"0")).join("");
  }
  async function createCaseOnce(payload,requestId){
    const clean={...payload};
    return authFetch("POST","/cases",{...clean,client_message_id:requestId,client_request_hash:await caseRequestHash(clean)});
  }
  window.caseRequestId=caseRequestId;
  window.createCaseOnce=createCaseOnce;
  async function uploadCaseMaterial(c,file,sensitivity){
    if(!file)throw new Error("Выберите файл.");
    if(file.size>64*1024*1024)throw new Error("Файл больше 64 МБ.");
    const kind=(file.type||"").startsWith("image/")?"image":"file", content_b64=await fileAsBase64(file);
    const saved=await authFetch("POST","/vault/documents",{title:file.name||"Материал",content_b64,mime:file.type||"application/octet-stream",kind,sensitivity:sensitivity||"pii",source_case_id:c.id});
    const documentId=saved&&saved.document&&saved.document.id; if(!documentId)throw new Error("Хранилище не вернуло номер документа.");
    await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/materials",{kind,mime:file.type||"application/octet-stream",title:file.name||"Материал",storage_ref:"vault:"+documentId,sensitivity:sensitivity||"pii"});
    return {documentId,kind};
  }
  function bindRealPanel(scrollToBottom=true){
    const panel=document.getElementById("rcpanel"); if(!panel) return;
    const thread=panel.querySelector("#caseThread"); if(thread&&scrollToBottom)thread.scrollTop=thread.scrollHeight;
    panel.querySelectorAll("[data-chat-suggestion]").forEach(button=>button.onclick=()=>{ const field=panel.querySelector('.chat-composer textarea[name="message"]'); if(!field)return; field.value=button.dataset.chatSuggestion||""; field.dispatchEvent(new Event("input",{bubbles:true})); field.focus(); });
    panel.onkeydown=event=>{ const answer=event.target.closest('[data-act="read-agent-answer"]'); if(answer&&(event.key==="Enter"||event.key===" ")){ event.preventDefault(); answer.click(); } };
    const chatForm=panel.querySelector('.chat-composer[data-act="ask-agent"]');
    if(chatForm){
      const state=chatForm.querySelector("[data-chat-file-state]"), status=chatForm.querySelector("[data-chat-status]"), field=chatForm.message;
      field.onkeydown=event=>{ if(event.key==="Enter"&&!event.shiftKey){ event.preventDefault(); chatForm.requestSubmit(); } };
      [chatForm.camera,chatForm.attachment].forEach(input=>{ input.onchange=()=>{ const file=input.files&&input.files[0]; if(!file)return; const other=input===chatForm.camera?chatForm.attachment:chatForm.camera; other.value=""; state.hidden=false; state.textContent=(input===chatForm.camera?"Снимок: ":"Файл: ")+(file.name||"изображение"); status.textContent=input===chatForm.camera?"Снимок будет загружен в приватные материалы дела после отправки.":"Файл будет загружен в приватные материалы дела после отправки."; }; });
    }
    const materialInput=panel.querySelector('form[data-act="material-upload"] input[name="material"]');
    if(materialInput) materialInput.onchange=()=>{ const name=materialInput.files&&materialInput.files[0]&&materialInput.files[0].name,form=materialInput.form,select=form&&form.elements.sensitivity; const out=materialInput.closest("label").querySelector(".book-file-name"); if(out) out.textContent=name||"Файл не выбран"; if(select&&statementMaterialSensitivity(activeReal.c,name,select.value)==="financial")select.value="financial"; };
    const bookInput=panel.querySelector('form[data-act="textbook-upload"] input[name="book"]');
    if(bookInput) bookInput.onchange=()=>{ const name=bookInput.files&&bookInput.files[0]&&bookInput.files[0].name; const out=bookInput.closest("label").querySelector(".book-file-name"); if(out) out.textContent=name||"Файл не выбран"; };
    const shareInput=panel.querySelector('form[data-act="textbook-upload"] input[name="share"]');
    if(shareInput) shareInput.onchange=()=>{ const fields=shareInput.closest("fieldset").querySelector("[data-share-fields]"); fields.hidden=!shareInput.checked; };
    function usnSuggestedChoice(item){ return /перевод\s+собствен\w*\s+(?:средств|денег)|пополнен\w*\s+собствен\w*\s+(?:средств|сч[её]та)|вклад\s+собствен/i.test(item.purpose||"")?"exclude":"include"; }
    function usnChoiceControl(item){ const choice=usnSuggestedChoice(item),note=choice==="exclude"?'<small>Предвыбрано: перевод собственных средств обычно не является доходом УСН. Проверьте назначение.</small>':""; return '<select name="choice"><option value="include"'+(choice==="include"?" selected":"")+'>в доходе УСН</option><option value="exclude"'+(choice==="exclude"?" selected":"")+'>исключить из дохода</option></select>'+note; }
    function openUsnChecklist(source,items,year){
      const rows=items.map((item,index)=>'<fieldset class="case-choice" data-usn-item="'+attr(item.id)+'"><legend><b>Операция '+(index+1)+'</b> · '+esc(item.date)+' · '+esc(item.amount)+' ₽</legend><p>'+esc(item.purpose||"Назначение не распознано")+'</p><label>Учесть'+usnChoiceControl(item)+'</label><label>Причина<textarea name="reason" required rows="2" maxlength="500" placeholder="Почему так классифицируете"></textarea></label></fieldset>').join("");
      const html='<p class="lead">Проверьте поступления за '+esc(year)+'. Решение сохранится в деле; платёж не создаётся.</p><form id="usn-quarterly-checklist" class="pform">'+rows+'<div class="cta-row"><button class="btn primary" type="submit">Сохранить и рассчитать кварталы</button></div></form>';
      modalOpen("Чеклист поступлений · "+year,html,body=>{ const form=body.querySelector("#usn-quarterly-checklist"); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"); button.disabled=true; button.textContent="Сохраняю…"; const decisions=Array.from(form.querySelectorAll("[data-usn-item]")).map((row,index)=>({index:index+1,choice:row.querySelector("select").value,reason:row.querySelector("textarea").value.trim(),date:items[index].date,amount:items[index].amount,purpose:items[index].purpose})); const text=decisions.map(row=>"Операция "+row.index+" · "+row.date+" · "+row.amount+" ₽\nРешение: "+(row.choice==="include"?"учесть в доходе УСН":"исключить из дохода")+".\nПричина: "+row.reason).join("\n\n"); try{ const caseId=activeReal.c.id; await authFetch("POST","/cases/"+encodeURIComponent(caseId)+"/drafts",{title:"Решение владельца · чеклист поступлений УСН за "+year,body:"РЕШЕНИЕ ВЛАДЕЛЬЦА · чеклист поступлений УСН за "+year+"\n\n"+text+"\n\nОснование: "+(source.title||"Предварительный расчёт")+".\n\nГраница: платёж, декларация и обращение в ФНС не создаются.",basis:"чеклист владельца по расчёту УСН за "+year,kind:"accounting_usn_ops_1pct_decision"}); button.textContent="Считаю…"; await authFetch("POST","/cases/"+encodeURIComponent(caseId)+"/accounting-usn/quarterly-calculation",{year,confirmed:true}); modalClose(); realTab="План"; await renderRealCase(caseId); toast("Чеклист сохранён, предварительный квартальный расчёт готов."); }catch(error){ button.disabled=false; button.textContent="Сохранить и рассчитать кварталы"; toast((error&&error.message)||"Не удалось сохранить решение или рассчитать кварталы."); } }; });
    }
    panel.onclick=async e=>{
      const cp=e.target.closest("[data-copy]"); if(cp){ try{ await navigator.clipboard.writeText(cp.dataset.copy); toast("Ссылка скопирована"); }catch(_){ toast("Скопируйте ссылку вручную"); } return; }
      const share=e.target.closest("[data-share-link]"); if(share){ const link=share.dataset.shareLink; try{ if(navigator.share) await navigator.share({title:"Приглашение в Домашкина",text:"Подключайтесь к семейному делу Домашкина",url:link}); else { await navigator.clipboard.writeText(link); toast("Ссылка скопирована"); } }catch(error){ if(error&&error.name!=="AbortError") toast("Не удалось открыть отправку — скопируйте ссылку."); } return; }
      const b=e.target.closest("[data-act]"); if(!b) return; const c=activeReal.c; const act=b.dataset.act;
      if(act==="laya-open-training"){ realTab="Обучение Лайи"; drawRealCase(); return; }
      if(act==="laya-refresh"){ realTab="Обучение Лайи"; await renderRealCase(c.id); return; }
      if(act==="laya-show-material"){
        const material=(activeReal.materials||[]).find(item=>item.id===b.dataset.id);
        if(material&&material.extracted)modalOpen(material.title||"Материал Лайи",'<div style="white-space:pre-wrap;max-height:65vh;overflow:auto">'+esc(material.extracted)+'</div>');
        return;
      }
      if(act==="laya-next-batch"){
        if(c.id!==LAYA_ROUTING_CASE_ID||!activeReal.isOwner)return;
        b.disabled=true;
        try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/actions",{what:LAYA_BATCH_WHAT,owner:authState.principal,waiting_for:LAYA_BATCH_MARKER}); realTab="Обучение Лайи"; await renderRealCase(c.id); toast("Батч роя поставлен в очередь. Результаты появятся здесь."); }
        catch(error){ b.disabled=false; toast((error&&error.message)||"Не удалось запустить батч."); }
        return;
      }
      if(act==="laya-review-row"){
        if(c.id!==LAYA_ROUTING_CASE_ID||!activeReal.isOwner)return;
        const row=((activeReal.layaTable||{}).rows||[]).find(item=>item.id===b.dataset.id); if(!row)return;
        const current=layaCell(row,"gold_domain"),use=layaCell(row,"use_decision"),error=layaCell(row,"error_type"),savedNote=layaCell(row,"review_note"),humanNote=/^Текст в mat_/.test(savedNote)?"":savedNote;
        const option=(value,label,selected)=>'<option value="'+attr(value)+'"'+(value===selected?' selected':'')+'>'+esc(label)+'</option>';
        const seam=LAYA_PACK_SEAMS.find(item=>layaCell(row,"sample_key").endsWith(":"+item.topic));
        const labels=seam?[...LAYA_DOMAINS,seam.target]:LAYA_DOMAINS;
        const useOptions=seam?[["exclude_until_review","Пока исключить"],["eval","Допустить в оценку"],["exclude","Исключить"]]:[["exclude_until_review","Пока исключить"],["eval","Допустить в оценку"],["train","Допустить в обучение"],["exclude","Исключить"]];
        modalOpen("Разметка маршрута Лайи",'<p class="lead">'+esc(layaSampleText(row)||"Текст запроса отсутствует. Не размечайте этот образец до восстановления материала.")+'</p><p class="rc-hint">MiMo: '+esc(layaCell(row,"mimo_domain")||"воздержался")+' · квитанция SHA256 '+esc(layaCell(row,"receipt_hash")||"отсутствует")+'</p>'+(seam?'<p class="rc-hint">Целевой адресат: '+esc(seam.target)+'. '+esc(seam.state)+'. Пока целевой маршрут отсутствует, пример нельзя допустить в обучение.</p>':'')+'<form id="laya-review-form" class="pform"><label>Правильный адресат<select name="gold_domain" required>'+option("","Выберите метку",current)+labels.map(domain=>option(domain,domain, current)).join("")+'</select></label><label>Тип ошибки<select name="error_type">'+[["","Выберите тип"],["none","Совпало"],["wrong_domain","Неверное направление"],["abstain","MiMo воздержался"],["ambiguous","Неоднозначный запрос"],["out_of_scope","Вне направлений"]].map(pair=>option(pair[0],pair[1],error)).join("")+'</select></label><label>Использование<select name="use_decision">'+useOptions.map(pair=>option(pair[0],pair[1],use)).join("")+'</select></label><label>Комментарий к решению<textarea name="review_note" rows="3" maxlength="1000" placeholder="Почему выбрали эту метку?">'+esc(humanNote)+'</textarea></label><button class="btn primary" type="submit"'+(layaSampleText(row)?'':' disabled')+'>Сохранить разметку</button><p class="rc-hint" data-laya-status role="status"></p></form>',body=>{
          const form=body.querySelector("#laya-review-form"),status=body.querySelector("[data-laya-status]"),button=form.querySelector('button[type="submit"]');
          form.onsubmit=async event=>{event.preventDefault();button.disabled=true;status.textContent="Сохраняю…";
            const values={gold_domain:form.elements.gold_domain.value,error_type:form.elements.error_type.value,use_decision:form.elements.use_decision.value,review_note:form.elements.review_note.value.trim(),review_status:"reviewed",reviewer:authState.principal,reviewed_at:new Date().toISOString()};
            try{await saveLayaReview(c.id,row,values);modalClose();realTab="Обучение Лайи";await renderRealCase(c.id);toast("Разметка сохранена.");}
            catch(error){button.disabled=false;status.textContent=(error&&error.message)||"Не удалось сохранить разметку.";}
          };
        });return;
      }
      if(act==="read-agent-answer"){
        const dialogs=activeReal.events.filter(event=>event.kind==="dialog"&&evText(event)),fromReply=b.dataset.readerSource==="reply",event=fromReply?null:dialogs[Number(b.dataset.readerIndex)];
        openAgentAnswer(fromReply?activeReal.reply:evText(event),fromReply?assistantName(c):evActor(event)); return;
      }
      if(act==="open-questionnaire"){ openQuestionnaireDialog(); return; }
      if(act==="dialog-older"){ const before=thread?thread.scrollHeight:0,previousTop=thread?thread.scrollTop:0; activeReal.dialogHistoryShown=(Number(activeReal.dialogHistoryShown)||50)+100; panel.innerHTML=realTabPanel(); bindRealPanel(false); const expanded=panel.querySelector("#caseThread"); if(expanded)expanded.scrollTop=Math.max(0,expanded.scrollHeight-before+previousTop); return; }
      if(act==="rc-goto"){ realTab=b.dataset.tab; drawRealCase(); return; }
      if(act==="open-real-linked"){ realTab=defaultRealTab(); location.hash="#case/"+b.dataset.id; return; }
      if(act==="draft-preview"){ const draft=(activeReal.drafts||[]).find(item=>item.id===b.dataset.id); if(!draft)return; modalOpen(draft.title||"Черновик",'<div class="answer-reader" tabindex="0">'+esc(draft.body||"Текст черновика отсутствует.")+'</div>',null,true); return; }
      if(act==="usn-ops-review"){ const source=(activeReal.drafts||[]).find(item=>item.id===b.dataset.id); if(!source)return; b.disabled=true; try{ const review=await authFetch("GET","/cases/"+encodeURIComponent(c.id)+"/accounting-usn/ops-1pct-review"); const items=Array.isArray(review.items)?review.items:[]; if(!items.length)throw new Error("Не нашлось операций для проверки. Обновите расчёт."); const rows=items.map((item,index)=>'<fieldset class="case-choice" data-usn-item="'+attr(item.id)+'"><legend><b>Операция '+(index+1)+'</b> · '+esc(item.date)+' · '+esc(item.amount)+' ₽</legend><p>'+esc(item.purpose||"Назначение не распознано")+'</p><label>Учесть'+usnChoiceControl(item)+'</label><label>Причина<textarea name="reason" required rows="2" maxlength="500" placeholder="Почему так классифицируете"></textarea></label></fieldset>').join(""); const html='<p class="lead">Проверьте каждую операцию и укажите причину. Решение сохранится в деле; платёж не создаётся.</p><form id="usn-ops-checklist" class="pform">'+rows+'<div class="cta-row"><button class="btn primary" type="submit">Сохранить и перейти к пересчёту</button></div></form>'; modalOpen("Чеклист поступлений",html,body=>{ const form=body.querySelector("#usn-ops-checklist"); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"); button.disabled=true; const decisions=Array.from(form.querySelectorAll("[data-usn-item]")).map((row,index)=>({index:index+1,choice:row.querySelector("select").value,reason:row.querySelector("textarea").value.trim(),date:items[index].date,amount:items[index].amount,purpose:items[index].purpose})); const text=decisions.map(row=>"Операция "+row.index+" · "+row.date+" · "+row.amount+" ₽\nРешение: "+(row.choice==="include"?"учесть в доходе УСН":"исключить из дохода")+".\nПричина: "+row.reason).join("\n\n"); try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/drafts",{title:"Решение владельца · чеклист поступлений для взноса 1%",body:"РЕШЕНИЕ ВЛАДЕЛЬЦА · чеклист поступлений\n\n"+text+"\n\nОснование: "+(source.title||"Предварительный расчёт")+".\n\nГраница: платёж, декларация и обращение в ФНС не создаются.",basis:"чеклист владельца по черновику "+source.id,kind:"accounting_usn_ops_1pct_decision"}); modalClose(); await renderRealCase(c.id); toast("Решение сохранено. Дальше — запросите повторный расчёт."); }catch(error){ button.disabled=false; toast((error&&error.message)||"Не удалось сохранить решение."); } }; }); }catch(error){ toast((error&&error.message)||"Не удалось открыть чеклист."); }finally{b.disabled=false;} return; }
      if(act==="usn-reconciliation"){
        const defaultYear=Number(b.dataset.year)||new Date().getFullYear();
        const html='<p class="lead">Файл появится в «Документы» этого дела. В нём будут уникальные операции I–II кварталов, статус включения в базу и формульные итоги. Банк, ФНС и внешние сервисы не вызываются.</p><form id="usn-reconciliation-form" class="pform"><label>Год<input name="year" type="number" min="2020" max="2030" required value="'+attr(defaultYear)+'"></label><label>Последний квартал<select name="through_quarter"><option value="2" selected>II квартал</option><option value="1">I квартал</option><option value="3">III квартал</option><option value="4">IV квартал</option></select></label><label class="case-choice"><input name="confirmed" type="checkbox" required><span><b>Разрешаю создать приватную XLSX-сверку из выписок этого дела</b><small>Файл будет доступен в «Документы» только участникам с доступом к финансовым материалам.</small></span></label><div class="cta-row"><button class="btn primary" type="submit">Собрать XLSX</button></div></form>';
        modalOpen("Сверочная таблица УСН",html,body=>{ const form=body.querySelector("#usn-reconciliation-form"); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"),year=Number(form.year.value),through_quarter=Number(form.through_quarter.value); button.disabled=true; button.textContent="Собираю…"; try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/accounting-usn/reconciliation-xlsx",{year,through_quarter,confirmed:true}); modalClose(); realTab="Документы"; await renderRealCase(c.id); toast("XLSX-сверка добавлена в документы дела."); }catch(error){ button.disabled=false; button.textContent="Собрать XLSX"; toast((error&&error.message)||"Не удалось собрать XLSX-сверку."); } }; }); return;
      }
      if(act==="usn-rent-only-rule"){
        const html='<p class="lead">В предварительный расчёт попадут только строки, где назначение явно содержит оплату аренды помещения. Остальные поступления будут исключены до отдельного решения. Это правило действует только в этом деле.</p><form id="usn-rent-only-rule-form" class="pform"><label class="case-choice"><input name="confirmed" type="checkbox" required><span><b>Подтверждаю: в доходы УСН включать только оплату аренды помещения</b><small>Сервис сохранит правило и заново создаст предварительный квартальный расчёт. Банк, ФНС и платёжные сервисы не вызываются.</small></span></label><div class="cta-row"><button class="btn primary" type="submit">Сохранить правило и пересчитать</button></div></form>';
        modalOpen("Правило поступлений УСН",html,body=>{ const form=body.querySelector("#usn-rent-only-rule-form"); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"); button.disabled=true; button.textContent="Сохраняю…"; try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/accounting-usn/income-rule",{rule:"rent_premises_only",confirmed:true}); const year=Number(((activeReal.drafts||[]).find(d=>d.kind==="accounting_usn_quarters")?.title||"" ).match(/20\d{2}/)?.[0])||new Date().getFullYear(); button.textContent="Пересчитываю…"; await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/accounting-usn/quarterly-calculation",{year,confirmed:true}); modalClose(); realTab="План"; await renderRealCase(c.id); toast("Правило сохранено, новый предварительный расчёт готов."); }catch(error){ button.disabled=false; button.textContent="Сохранить правило и пересчитать"; toast((error&&error.message)||"Не удалось сохранить правило."); } }; }); return;
      }
      if(act==="usn-social-contribution-deduction"){
        const defaultYear=Number(b.dataset.year)||new Date().getFullYear();
        const html='<p class="lead">Этот шаг создаёт только предварительное уменьшение УСН. Он не подтверждает платёж в Социальный фонд, не создаёт платёж и не обращается в банк или ФНС.</p><form id="usn-social-contribution-form" class="pform"><label>Год<input name="year" type="number" min="2020" max="2030" required value="'+attr(defaultYear)+'"></label><label>Применить начиная с квартала<select name="apply_in_quarter"><option value="1">I квартал</option><option value="2" selected>II квартал</option><option value="3">III квартал</option><option value="4">IV квартал</option></select></label><label>Сумма, доступная для вычета, ₽<input name="contribution_amount" type="number" min="0.01" step="0.01" required placeholder="Например, 12000.00"></label><label class="case-choice"><input name="has_employees" type="checkbox"><span><b>В этом расчётном периоде были выплаты работникам</b><small>От этого зависит ограничение предварительного вычета. Подтвердите только если это верно.</small></span></label><label class="case-choice"><input name="payment_confirmed" type="checkbox" required><span><b>Подтверждаю сумму, период и право использовать взнос в предварительном расчёте</b><small>Проверка платёжного документа и права на вычет перед уплатой остаётся обязательной.</small></span></label><label class="case-choice"><input name="confirmed" type="checkbox" required><span><b>Разрешаю сохранить предварительный расчёт в этом деле</b></span></label><div class="cta-row"><button class="btn primary" type="submit">Применить вычет</button></div></form>';
        modalOpen("Применить вычет платежа в Социальный фонд",html,body=>{ const form=body.querySelector("#usn-social-contribution-form"); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"),year=Number(form.year.value),apply_in_quarter=Number(form.apply_in_quarter.value),contribution_amount=Number(form.contribution_amount.value); if(!Number.isFinite(contribution_amount)||contribution_amount<=0){ toast("Укажите сумму вычета больше нуля."); return; } button.disabled=true; button.textContent="Считаю…"; try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/accounting-usn/social-contribution-deduction",{year,apply_in_quarter,contribution_amount:contribution_amount.toFixed(2),has_employees:form.has_employees.checked,payment_confirmed:true,confirmed:true}); modalClose(); realTab="План"; await renderRealCase(c.id); toast("Предварительное уменьшение сохранено для проверки."); }catch(error){ button.disabled=false; button.textContent="Применить вычет"; toast((error&&error.message)||"Не удалось применить предварительный вычет."); } }; }); return;
      }
      if(act==="usn-quarterly-calc"){
        const html='<p class="lead">Расчёт сложит принятые поступления по кварталам и применит ставку из уже утверждённого правила. Он не уменьшает налог на взносы, не учитывает ранее уплаченные авансы и не создаёт платёж.</p><form id="usn-quarterly-form" class="pform"><label>Год<input name="year" type="number" min="2020" max="2030" required value="2025"></label><label class="case-choice"><input name="confirmed" type="checkbox" required><span><b>Разрешаю локальный предварительный расчёт по выпискам этого дела</b><small>Результат появится приватным черновиком для проверки.</small></span></label><div class="cta-row"><button class="btn primary" type="submit">Рассчитать кварталы</button></div></form>';
        modalOpen("Расчёт УСН по кварталам",html,body=>{ const form=body.querySelector("#usn-quarterly-form"); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"),year=Number(form.year.value); button.disabled=true; button.textContent="Проверяю…"; try{ const review=await authFetch("GET","/cases/"+encodeURIComponent(c.id)+"/accounting-usn/ops-1pct-review?year="+encodeURIComponent(year)); const items=Array.isArray(review.items)?review.items:[]; if(items.length){ modalClose(); openUsnChecklist({title:"Расчёт УСН по кварталам за "+year},items,year); return; } button.textContent="Считаю…"; await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/accounting-usn/quarterly-calculation",{year,confirmed:true}); modalClose(); realTab="План"; await renderRealCase(c.id); toast("Предварительный расчёт кварталов сохранён для проверки."); }catch(error){ button.disabled=false; button.textContent="Рассчитать кварталы"; toast((error&&error.message)||"Не удалось рассчитать кварталы."); } }; }); return;
      }
      if(act==="draft-docx"||act==="draft-pdf"){ const draft=(activeReal.drafts||[]).find(item=>item.id===b.dataset.id); if(!draft)return; b.disabled=true; try{ if(act==="draft-pdf")await exportDraftPdf(draft); else await exportDraftDocx(draft); }catch(err){ toast((err&&err.message)||"Не удалось собрать документ."); }finally{b.disabled=false;} return; }
      if(act==="draft-share"){ b.disabled=true; try{ await authFetch("POST","/drafts/"+encodeURIComponent(b.dataset.id)+"/share",{}); renderRealCase(c.id); }catch(err){ b.disabled=false; toast((err&&err.message)||"Не удалось выдать документ."); } return; }
      if(act==="draft-external"){ b.disabled=true; try{ const r=await authFetch("POST","/drafts/"+encodeURIComponent(b.dataset.id)+"/external-share",{}); const link=location.origin+"/document/"+encodeURIComponent(r.token); await navigator.clipboard.writeText(link); toast("Внешняя ссылка скопирована. Просмотр доступен 7 дней; редактирование — после регистрации и приглашения."); }catch(err){ b.disabled=false; toast((err&&err.message)||"Не удалось создать ссылку."); } return; }
      if(act==="extract-statements"){
        b.disabled=true; b.classList.add("thinking"); b.setAttribute("aria-busy","true"); b.textContent="Разбираю файлы…";
        try{
          const result=await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/materials/extract",isAccountingUsnPackCase(c)?{force:true}:{});
          const ready=(activeReal.materials||[]).some(material=>material.extract_status==="ok"&&/\.(pdf|csv|xls|xlsx|zip)$/i.test(material.title||""));
          if(!result.extracted&&!ready)throw new Error(result.failed?"Файлы не удалось прочитать. Проверьте их формат или текстовый слой PDF.":"В деле пока нет загруженных выписок для разбора.");
          if(isAccountingUsnPackCase(c)){ realTab="Документы"; await renderRealCase(c.id); toast("Распознавание выписок завершено. Теперь можно запустить контрольный прогон пака."); return; }
          b.textContent="Готовлю сводку…";
          await askCaseAgent("Разбери все загруженные банковские выписки в этом деле. Составь сводку поступлений и расходов по периодам, отметь возможные дубли и пробелы, отдельно перечисли операции, требующие бухгалтерской проверки, и честно назови файлы или данные, которых не хватает. Не придумывай суммы и реквизиты.");
          realTab="Диалог"; drawRealCase();
        }catch(err){ b.disabled=false; b.classList.remove("thinking"); b.removeAttribute("aria-busy"); b.textContent="Разобрать загруженные выписки"; toast((err&&err.message)||"Не удалось разобрать выписки."); }
        return;
      }
      if(act==="run-usn-pack-test"){
        const confirmation=panel.querySelector("[data-usn-test-confirm]"), status=panel.querySelector("[data-usn-test-status]");
        if(!confirmation||!confirmation.checked){ if(status)status.textContent="Подтвердите локальную обработку выписок в этом деле."; return; }
        b.disabled=true; b.classList.add("thinking"); b.textContent="Запускаю…"; if(status)status.textContent="Готовлю черновик без передачи данных наружу…";
        try{
          const result=await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/pack-tests/accounting-usn",{confirmed:true,pack_id:"accounting_usn"});
          realTab="Документы"; await renderRealCase(c.id);
          toast(result.status==="passed"?"Контрольный прогон завершён: черновик добавлен в дело.":"Прогон завершён: в черновике указано, что проверить в распознавании.");
        }catch(err){ b.disabled=false; b.classList.remove("thinking"); b.textContent="Запустить контрольный прогон"; if(status)status.textContent=(err&&err.message)||"Не удалось запустить прогон."; }
        return;
      }
      if(act==="material-download"){ b.disabled=true; try{ await authDownload("/cases/"+encodeURIComponent(c.id)+"/materials/"+encodeURIComponent(b.dataset.id)+"/content",b.dataset.name); }catch(err){ toast(err.status===403?"Для скачивания подтвердите вход до уровня 2.":((err&&err.message)||"Не удалось скачать файл.")); }finally{ b.disabled=false; } return; }
      if(act==="material-sensitivity"){ openMaterialSensitivity(c.id,b.dataset.id,b.dataset.sensitivity); return; }
      if(act==="calendar-retry"){ renderRealCase(c.id); return; }
      if(act==="school-retry"){ if(activeReal.school) loadSchoolDay(activeReal.school.childId,activeReal.school.date); else renderRealCase(c.id); return; }
      if(act==="school-date"){ const date=new Date(); date.setDate(date.getDate()+Number(b.dataset.offset||0)); const child=(activeReal.school&&activeReal.school.childId)||(activeReal.children[0]&&activeReal.children[0].id); if(child)loadSchoolDay(child,dateInputValue(date)); return; }
      if(act==="analyze-homework"){
        const agent=domashkinHomeworkAgent(); if(!agent){ toast("Сначала включите личного Домашкина."); return; }
        b.disabled=true; b.classList.add("thinking"); b.textContent="Разбираю…";
        try{ const result=await authFetch("POST","/homework/assignments/"+encodeURIComponent(b.dataset.id)+"/analyze",{personal_agent_id:agent.agent_id,case_id:c.id}); const assignment=(activeReal.school.assignments||[]).find(item=>item.id===b.dataset.id); if(assignment){Object.assign(assignment,result.assignment||{});assignment.summary=result.summary;} drawRealCase(); toast("Разбор готов и сохранён в материалах этого дела."); }
        catch(err){ b.disabled=false; b.classList.remove("thinking"); b.textContent="Разобрать"; toast((err&&err.message)||"Не удалось разобрать задание."); }
        return;
      }
      if(act==="save-homework-doc"){
        const assignment=((activeReal.school&&activeReal.school.assignments)||[]).find(item=>item.id===b.dataset.id); if(!assignment||!assignment.summary)return; b.disabled=true; b.textContent="Сохраняю…";
        try{ const draft=await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/drafts",{title:(assignment.lesson_date?assignment.lesson_date+" · ":"")+(assignment.subject||"Разбор Домашкина"),body:homeworkDocumentText(assignment),basis:"разбор Домашкина по заданию "+assignment.id,kind:"homework_analysis"}); activeReal.drafts.unshift(draft); b.textContent="Сохранено в документах"; toast("Разбор сохранён. PDF и DOCX доступны во вкладке «Документы»."); }
        catch(err){ b.disabled=false; b.textContent="Сохранить в документы дела"; toast((err&&err.message)||"Не удалось сохранить разбор."); }
        return;
      }
      if(act==="calendar-cancel"){ if(!window.confirm("Отменить это событие? Запись останется в истории календаря."))return; b.disabled=true; try{ await authFetch("POST","/calendar/"+encodeURIComponent(b.dataset.id)+"/cancel",{}); realTab="Сроки"; renderRealCase(c.id); }catch(err){ b.disabled=false; toast((err&&err.message)||"Не удалось отменить событие."); } return; }
      if(act==="edit-see"){ openMaySee(c.id,b.dataset.pid); return; }
      if(act==="commission-work"){
        const offer=(activeReal.workOffers||[]).find(item=>item.id===b.dataset.offer);
        if(!offer){ toast("Условия работы не загрузились — обновите дело."); return; }
        openWorkCommission(offer); return;
      }
      if(act==="match-specialists-direct"){
        openDirectProviderMatch(); return;
      }
      if(act==="grant-agent"){ openRunConsent(c.id); return; }
      if(act==="goto-patches"){ realTab="План"; drawRealCase(); setTimeout(()=>{ const el=vwrap.querySelector(".case-plan-layout .section-t"); if(el)el.scrollIntoView({block:"nearest"}); },60); return; }
      if(act==="plan-from-dialog"){ openPlanImport(c.id,suggestedPlanActions()); return; }
      if(act==="patch-approve"||act==="patch-reject"){ openPatchDecision(b.dataset.patch,act==="patch-approve"); return; }
      if(act==="edit-action"){ openEditNextAction(b.dataset.id); return; }
      if(act==="answer-data-boundary"){ openDataBoundaryDecision(b.dataset.id); return; }
      if(act==="answer-selfdiag-f7"){ openSelfdiagF7Decision(b.dataset.id); return; }
      if(act==="answer-selfdiag-question"){ openSelfdiagQuestionAnswer(b.dataset.id); return; }
      if(act==="complete-action"){
        const closing=(activeReal.nextActions||[]).find(action=>action.id===b.dataset.id);
        if(closing&&isSelfdiagF7Action(c.id,closing)&&!window.confirm("Закрыть эту F7-эскалацию? Убедитесь, что результат проверен или работа осознанно отклонена."))return;
        if(closing&&isSelfdiagQuestion(c.id,closing)&&!window.confirm("Закрыть этот вопрос самодиагностики? Ответ уже сохранён, а нужные действия выполнены или осознанно отклонены?"))return;
        b.disabled=true; b.textContent="Сохраняю…";
        try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/actions/"+encodeURIComponent(b.dataset.id)+"/complete",{}); realTab="План"; await renderRealCase(c.id); }
        catch(err){ b.disabled=false; b.textContent="Готово"; toast((err&&err.message)||"Не удалось завершить пункт плана."); }
        return;
      }
      if(act==="skip-action"){
        const reason=window.prompt("Почему пропускаем этот шаг? (видно только вам, в этом браузере)","Не хочу делать запросы");
        if(reason===null) return;
        try{ const key="fixar-v2-plan-skipped:"+(authState.principal||"guest")+":"+c.id; const map=JSON.parse(localStorage.getItem(key)||"{}"); map[b.dataset.id]=(reason||"").trim()||"Без пояснения."; localStorage.setItem(key,JSON.stringify(map)); }catch(_){ toast("Не удалось сохранить пропуск."); return; }
        realTab="План"; await renderRealCase(c.id); return;
      }
      if(act==="unskip-action"){
        try{ const key="fixar-v2-plan-skipped:"+(authState.principal||"guest")+":"+c.id; const map=JSON.parse(localStorage.getItem(key)||"{}"); delete map[b.dataset.id]; localStorage.setItem(key,JSON.stringify(map)); }catch(_){ toast("Не удалось вернуть шаг."); return; }
        realTab="План"; await renderRealCase(c.id); return;
      }
      if(act==="state"){ const st=b.dataset.state; const nm={closed:"завершить",archived:"архивировать",active:"возобновить"}; if(!window.confirm("Точно "+(nm[st]||st)+" это дело?")) return; b.disabled=true;
        try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/state",{target_state:st,reason:"смена статуса из предпросмотра v2"}); REAL.loaded=false; await loadRealCases(true); toast(st==="closed"?"Дело завершено и осталось в фильтре «Завершённые».":(st==="archived"?"Дело перенесено в архив.":"Дело снова активно.")); await renderRealCase(c.id); }
        catch(err){ b.disabled=false; toast((err&&err.message)||"Не удалось изменить статус."); } return; }
    };
    panel.onsubmit=async e=>{
      const f=e.target.closest("form[data-act]"); if(!f) return; e.preventDefault(); const c=activeReal.c;
      if(f.dataset.act==="invite-parent"){
        const rights=["read","comment"]; if(f.decide.checked) rights.push("decide");
        const may_see=["normal"]; if(f.pii.checked) may_see.push("pii");
        const btn=f.querySelector('button[type="submit"]'), out=f.querySelector("[data-parent-invite-out]"); btn.disabled=true; btn.textContent="Создаю…";
        try{ await authFetch("POST","/threads",{case_id:c.id,subject:"Семейное обсуждение Домашкина"}); const r=await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/invites",{role:"spouse",rights,may_see,engagement:"partner",note:"Семейное дело Домашкина: школа, задания и согласованные действия"});
          const link=location.origin+"/?invite="+encodeURIComponent(r.code);
          out.innerHTML='<div class="invite-box">Ссылка действует '+esc(String(r.expires_in_hours||72))+' ч. Второй родитель увидит условия до принятия.<code>'+esc(link)+'</code><div class="cta-row"><button class="btn small" type="button" data-copy="'+attr(link)+'">Копировать</button><button class="btn small" type="button" data-share-link="'+attr(link)+'">Отправить</button></div><p class="rc-hint">После принятия новые сообщения дела будут приходить через подключённые им каналы уведомлений.</p></div>';
          btn.disabled=false; btn.textContent="Создать новую ссылку";
        }catch(err){ btn.disabled=false; btn.textContent="Создать семейное приглашение"; toast((err&&err.message)||"Не удалось создать приглашение."); }
        return;
      }
      if(f.dataset.act==="family-message"){
        const btn=f.querySelector('button[type="submit"]'), message=(f.message.value||"").trim(); if(!message)return; btn.disabled=true; btn.classList.add("thinking"); btn.textContent="Отправляю…";
        try{ let threadId=activeReal.familyThread&&activeReal.familyThread.thread_id; if(!threadId){ const started=await authFetch("POST","/threads",{case_id:c.id,subject:"Семейное обсуждение Домашкина"}); threadId=started.thread_id; } const sent=await authFetch("POST","/threads/"+encodeURIComponent(threadId)+"/messages",{body:message,sensitivity:"normal"}); toast(sent.notified?"Сообщение отправлено, семья получит уведомление.":"Сообщение сохранено. Второй родитель ещё не подключён или отключил уведомления."); await renderRealCase(c.id); }
        catch(err){ btn.disabled=false; btn.classList.remove("thinking"); btn.textContent="Отправить семье"; toast((err&&err.message)||"Не удалось отправить сообщение семье."); }
        return;
      }
      if(f.dataset.act==="school-day"){ await loadSchoolDay(f.child.value,f.date.value); return; }
      if(f.dataset.act==="invite"){
        const rights=[...f.querySelectorAll('input[name="right"]:checked')].map(x=>x.value); if(rights.indexOf("read")<0) rights.unshift("read");
        const may_see=[...f.querySelectorAll('input[name="see"]:checked')].map(x=>x.value); if(may_see.indexOf("normal")<0) may_see.unshift("normal");
        const btn=f.querySelector('button[type="submit"]'); btn.disabled=true; btn.textContent="Создаю…";
        try{ const r=await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/invites",{role:f.role.value,rights,may_see,engagement:f.engagement.value,note:(f.note.value||"").trim()});
          const link=location.origin+"/?invite="+encodeURIComponent(r.code);
          document.getElementById("inviteout").innerHTML='<div class="invite-box">Приглашение готово ('+esc(String(r.expires_in_hours||72))+' ч). Отправьте ссылку человеку:<code>'+esc(link)+'</code><div class="cta-row"><button class="btn small" type="button" data-copy="'+attr(link)+'">Копировать</button></div></div>';
          btn.disabled=false; btn.textContent="Создать приглашение";
        }catch(err){ btn.disabled=false; btn.textContent="Создать приглашение"; toast((err&&err.message)||"Не удалось создать приглашение."); }
        return;
      }
      if(f.dataset.act==="scope"){ const v=f.querySelector('input[name="scope"]:checked'); if(!v) return; const btn=f.querySelector("button"); btn.disabled=true;
        try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/scope",{scope:v.value}); REAL.loaded=false; renderRealCase(c.id); }
        catch(err){ btn.disabled=false; toast((err&&err.message)||"Не удалось сменить пространство."); } return; }
      if(f.dataset.act==="case-details"){ const btn=f.querySelector("button"), title=(f.title.value||"").trim(), goal=(f.goal.value||"").trim(); if(!title)return; btn.disabled=true; btn.textContent="Сохраняю…";
        try{ await authFetch("PUT","/cases/"+encodeURIComponent(c.id)+"/details",{title,goal,expect_version:c.version}); REAL.loaded=false; realTab="Настройки"; renderRealCase(c.id); }
        catch(err){ btn.disabled=false; btn.textContent="Сохранить реквизиты"; toast(err.status===409?"Дело изменилось в другом окне. Обновите карточку и повторите.":((err&&err.message)||"Не удалось сохранить реквизиты.")); } return; }
      if(f.dataset.act==="next-action"){ const btn=f.querySelector("button"), due=f.due.value?new Date(f.due.value):null; if(due&&isNaN(due.getTime())){ toast("Проверьте срок пункта плана."); return; } btn.disabled=true; btn.textContent="Добавляю…";
        try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/actions",{what:(f.what.value||"").trim(),owner:f.owner.value||"",due:due?due.toISOString():null,waiting_for:(f.waiting_for.value||"").trim()}); realTab="План"; await renderRealCase(c.id); toast("Пункт добавлен в план дела."); }
        catch(err){ btn.disabled=false; btn.textContent="Добавить пункт плана"; toast((err&&err.message)||"Не удалось добавить пункт плана."); } return; }
      if(f.dataset.act==="calendar-create"){ const btn=f.querySelector("button"), at=new Date(f.at.value), until=f.until.value?new Date(f.until.value):null; if(isNaN(at.getTime())){ toast("Укажите дату и время события."); return; } if(until&&isNaN(until.getTime())){ toast("Проверьте время окончания."); return; } btn.disabled=true; btn.textContent="Добавляю…";
        try{ await authFetch("POST","/calendar",{case_id:c.id,kind:f.kind.value,title:(f.title.value||"").trim(),at:at.toISOString(),until:until?until.toISOString():null,place:(f.place.value||"").trim(),note:(f.note.value||"").trim(),basis:"добавлено владельцем в FixAR v2",source:"human"}); realTab="Сроки"; renderRealCase(c.id); }
        catch(err){ btn.disabled=false; btn.textContent="Добавить в календарь"; toast((err&&err.message)||"Не удалось добавить событие."); } return; }
      if(f.dataset.act==="draft-create"){ const btn=f.querySelector("button"); btn.disabled=true; btn.textContent="Сохраняю…";
        try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/drafts",{title:(f.title.value||"").trim(),body:(f.body.value||"").trim(),basis:"текст владельца из v2",kind:"document"}); realTab="Документы"; renderRealCase(c.id); }
        catch(err){ btn.disabled=false; btn.textContent="Сохранить версию"; toast((err&&err.message)||"Не удалось сохранить документ."); } return; }
      if(f.dataset.act==="material-upload"){
        const file=f.material.files&&f.material.files[0], btn=f.querySelector('button[type="submit"]'), status=f.querySelector("[data-material-status]");
        if(!file)return; if(file.size>64*1024*1024){ status.textContent="Файл больше 64 МБ."; return; }
        btn.disabled=true; btn.classList.add("thinking"); btn.textContent="Загружаю…"; status.textContent="Сохраняю файл в приватном хранилище…";
        try{ await uploadCaseMaterial(c,file,f.sensitivity.value); realTab="Документы"; renderRealCase(c.id); }
        catch(err){ status.textContent=(err&&err.message)||"Не удалось приложить файл."; btn.disabled=false; btn.classList.remove("thinking"); btn.textContent="Загрузить в дело"; }
        return;
      }
      if(f.dataset.act==="textbook-upload"){
        const file=f.book.files&&f.book.files[0], btn=f.querySelector('button[type="submit"]'), status=f.querySelector("[data-book-status]");
        if(!file)return; if(file.size>64*1024*1024){ status.textContent="Файл больше 64 МБ."; return; }
        if(f.share.checked && f.rights_basis.value==="open_license" && !f.license_url.value.trim()){ status.textContent="Укажите ссылку на открытую лицензию."; return; }
        btn.disabled=true; btn.classList.add("thinking"); btn.textContent="Загружаю…"; status.textContent="Книга сохраняется в приватном хранилище…";
        try{
          const content_b64=await fileAsBase64(file);
          const saved=await authFetch("POST","/vault/documents",{title:file.name||"Учебник",content_b64,mime:file.type||"application/pdf",kind:"file",sensitivity:"pii",source_case_id:c.id});
          const documentId=saved&&saved.document&&saved.document.id; if(!documentId)throw new Error("Хранилище не вернуло номер документа.");
          await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/materials",{kind:"file",mime:file.type||"application/pdf",title:file.name||"Учебник",storage_ref:"vault:"+documentId,sensitivity:"pii"});
          const textbook=await authFetch("POST","/homework/textbooks",{child_id:f.child.value,vault_document_id:documentId,subject:f.subject.value.trim(),title:file.name||"Учебник",sensitivity:"pii"});
          status.textContent="Извлекаю текст учебника…";
          const extracted=await authFetch("POST","/homework/textbooks/"+encodeURIComponent(textbook.id)+"/extract",{});
          let message=extracted.status==="ready"?"Учебник загружен и готов для разбора заданий.":"Учебник сохранён, но для этого PDF потребуется уточнение или распознавание.";
          if(f.share.checked){ await authFetch("POST","/homework/textbooks/"+encodeURIComponent(textbook.id)+"/share-proposals",{rights_basis:f.rights_basis.value,license_url:f.license_url.value.trim(),attested:true}); message+=" Заявка в общий корпус отправлена на проверку прав."; }
          activeReal.textbookStatus=message; status.textContent=message; f.reset(); const fields=f.querySelector("[data-share-fields]"); if(fields)fields.hidden=true; const name=f.querySelector(".book-file-name"); if(name)name.textContent="Файл не выбран";
        }catch(err){ status.textContent=(err&&err.message)||"Не удалось загрузить учебник."; }
        finally{ btn.disabled=false; btn.classList.remove("thinking"); btn.textContent="Загрузить и разобрать"; }
        return;
      }
      if(f.dataset.act==="ask-agent"){
        const input=f.querySelector('[name="message"]'), btn=f.querySelector('button[type="submit"]'), camera=f.querySelector('[name="camera"]'), attachment=f.querySelector('[name="attachment"]'), file=(camera&&camera.files&&camera.files[0])||(attachment&&attachment.files&&attachment.files[0]), status=f.querySelector("[data-chat-status]"), message=(input.value||"").trim(); if(!message&&!file)return; btn.disabled=true; btn.classList.add("thinking"); btn.setAttribute("aria-busy","true");
        try{ if(file){ if(status)status.textContent="Загружаю файл в приватные материалы дела…"; await uploadCaseMaterial(c,file,statementMaterialSensitivity(c,file.name)); if(camera)camera.value=""; if(attachment)attachment.value=""; const fileState=f.querySelector("[data-chat-file-state]"); if(fileState)fileState.hidden=true; } if(status)status.textContent="Агент изучает контекст дела…"; await askCaseAgent(message||(file&&file.type.startsWith("image/")?"Посмотри приложенное изображение и объясни, что на нём важно для этого дела.":"Посмотри приложенный файл и скажи, что важно для этого дела.")); input.value=""; drawRealCase(); }
        catch(err){ toast((err&&err.message)||"Агент пока не ответил. Повторите позже."); btn.disabled=false; btn.classList.remove("thinking"); btn.removeAttribute("aria-busy"); } return;
      }
    };
    if(activeReal.questionnaire&&activeReal.questionnaireAutoOpen)openQuestionnaireDialog();
  }
  function openMaterialSensitivity(caseId,materialId,current){
    modalOpen("Доступ к материалу",'<p class="lead">Выберите категорию сведений. Материал увидят только участники, которым разрешена эта категория.</p><form id="material-sensitivity" class="pform"><label>Категория<select name="sensitivity" style="width:100%">'+SEE_ALL.map(s=>'<option value="'+s+'"'+(s===current?' selected':'')+'>'+esc(SEE_RU[s])+'</option>').join("")+'</select></label><label style="display:block;margin-top:10px">Причина изменения<input name="reason" maxlength="300" placeholder="Например, документ содержит персональные данные" style="width:100%"></label><div class="cta-row"><button class="btn primary" type="submit">Сохранить</button></div></form>',body=>{ const form=body.querySelector("#material-sensitivity"); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"); button.disabled=true; button.textContent="Сохраняю…"; try{ await authFetch("PUT","/cases/"+encodeURIComponent(caseId)+"/materials/"+encodeURIComponent(materialId)+"/sensitivity",{sensitivity:form.sensitivity.value,reason:(form.reason.value||"").trim()}); modalClose(); realTab="Документы"; renderRealCase(caseId); }catch(error){ button.disabled=false; button.textContent="Сохранить"; toast((error&&error.message)||"Не удалось изменить доступ."); } }; });
  }
  function openMaySee(caseId,pid){
    const p=(activeReal.c.participants||[]).find(x=>x.principal_id===pid)||{}; const cur=p.may_see||["normal"];
    modalOpen("Что видит участник",
      '<p class="lead">'+esc(p.display_name||"Участник")+' · '+esc(ROLE_RU[p.role]||p.role||"")+'. Откройте только те категории, которые действительно нужны человеку для участия.</p><div class="case-permission-summary"><span>◎</span><p><b>Обычные сведения доступны всегда.</b><br>Скрытые категории не раскрывают даже названия недоступных материалов.</p></div>'+
      '<form id="msf" class="case-modern-form"><fieldset class="case-choice-group">'+SEE_ALL.map(s=>'<label class="case-choice"><input type="checkbox" name="see" value="'+s+'"'+((cur.indexOf(s)>=0||s==="normal")?' checked':'')+(s==="normal"?' disabled':'')+'><span><b>'+esc(SEE_RU[s])+'</b><small>'+(s==="normal"?'Основной ход дела':s==="pii"?'Персональные сведения':s==="medical"?'Медицинские материалы':'Финансовые сведения')+'</small></span></label>').join("")+'</fieldset><button class="btn primary case-form-submit" type="submit">Сохранить доступ</button></form>',
      body=>{ const f=body.querySelector("#msf"); f.onsubmit=async e=>{ e.preventDefault(); const see=[...f.querySelectorAll('input[name="see"]:checked')].map(x=>x.value); if(see.indexOf("normal")<0) see.unshift("normal"); const btn=f.querySelector("button"); btn.disabled=true; btn.textContent="Сохраняю…";
        try{ await authFetch("PUT","/cases/"+encodeURIComponent(caseId)+"/participants/"+encodeURIComponent(pid)+"/may-see",{may_see:see}); modalClose(); REAL.loaded=false; renderRealCase(caseId); }
        catch(err){ btn.disabled=false; btn.textContent="Сохранить"; toast((err&&err.message)||"Не удалось изменить доступ."); } }; });
  }
  function openPlanImport(caseId,actions){
    if(!actions.length){ toast("В последнем ответе не нашлось списка модулей."); return; }
    const rows=actions.map((what,index)=>{ const due=new Date(); due.setDate(due.getDate()+7*(index+1)); due.setHours(18,0,0,0); return '<label class="case-choice" data-plan-row data-what="'+attr(what)+'"><input type="checkbox" checked><span><b>'+esc(what)+'</b><small>Ответственный: '+esc(assistantName(activeReal.c))+'</small><input name="due" type="datetime-local" required value="'+attr(calendarInputValue(due))+'"></span></label>'; }).join("");
    modalOpen("План реализации из ответа Фиксара",'<p class="lead">Фиксар выделил модули из уже состоявшегося разговора. Проверьте названия и предложенные недельные сроки: запись произойдёт только после вашего подтверждения.</p><form id="planimport" class="case-modern-form"><fieldset class="case-choice-group"><legend>Пункты и сроки</legend>'+rows+'</fieldset><button class="btn primary case-form-submit" type="submit">Сохранить выбранные пункты</button><div class="rc-hint" data-plan-status aria-live="polite"></div></form>',body=>{ const form=body.querySelector("#planimport"),button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-plan-status]"); form.onsubmit=async event=>{ event.preventDefault(); const selected=[...form.querySelectorAll("[data-plan-row]")].filter(row=>{const check=row.querySelector('input[type="checkbox"]');return check.checked&&!check.disabled;}); if(!selected.length){status.textContent="Выберите хотя бы один пункт.";return;} button.disabled=true;button.textContent="Сохраняю…";try{for(const row of selected){const due=new Date(row.querySelector('[name="due"]').value);if(isNaN(due.getTime()))throw new Error("Проверьте сроки плана.");await authFetch("POST","/cases/"+encodeURIComponent(caseId)+"/actions",{what:row.dataset.what,owner:activeReal.c.selected_agent_id||"",due:due.toISOString(),waiting_for:""});const check=row.querySelector('input[type="checkbox"]');check.disabled=true;row.querySelector('[name="due"]').disabled=true;}modalClose();realTab="План";await renderRealCase(caseId);toast("План сохранён в деле.");}catch(error){button.disabled=false;button.textContent="Сохранить оставшиеся пункты";status.textContent=(error&&error.message)||"Не удалось сохранить план.";}};});
  }
  function openRunConsent(caseId){
    modalOpen("Поручить работу агенту",
      '<p class="lead">Опишите один понятный результат. Агент получит только инструменты и материалы этого дела.</p><div class="case-consent-guardrails"><div><span>1</span><p><b>Только это дело</b><small>Данные других пространств не открываются.</small></p></div><div><span>2</span><p><b>Риск — на подтверждение</b><small>Внешнее действие остановится перед выполнением.</small></p></div><div><span>3</span><p><b>Расход виден</b><small>Работа может использовать кредиты аккаунта.</small></p></div></div>'+
      '<form id="runf" class="pform case-modern-form"><label><span>Что должно быть сделано</span><textarea name="query" required rows="3" maxlength="2000" placeholder="Например, проверить изменение школьного расписания и подготовить вопрос классному руководителю"></textarea></label><label class="case-consent-check"><input name="consent" type="checkbox" required><span><b>Разрешаю начать работу</b><small>Поручение ограничено этим делом; значимые действия потребуют моего отдельного подтверждения.</small></span></label><button class="btn primary case-form-submit" type="submit">Поручить агенту</button></form>',
      body=>{ const f=body.querySelector("#runf"); f.query.focus(); f.onsubmit=async e=>{ e.preventDefault(); const btn=f.querySelector("button"); btn.disabled=true; btn.textContent="Поручаю…";
        try{ await authFetch("POST","/cases/"+encodeURIComponent(caseId)+"/runs",{idempotency_key:"v2-"+Date.now()+"-"+Math.random().toString(36).slice(2,10),kind:"case.execute",input:{query:(f.query.value||"").trim()}}); modalClose(); renderRealCase(caseId); }
        catch(err){ btn.disabled=false; btn.textContent="Поручить"; toast((err&&err.message)||"Не удалось поручить работу агенту."); } }; });
  }
  function applyAgentAction(action){
    if(!action||typeof action!=="object") return false;
    if(action.type==="switch_space" && SPACE_NODES[action.space]){ switchSpace(action.space); return true; }
    if(action.type==="open_create_case"){ openCreateCase(); return true; }
    if(!activeReal) return false;
    if(action.type==="questionnaire"){
      const questionnaire=normalizeQuestionnaire(action); if(!questionnaire)return false;
      activeReal.questionnaire=questionnaire;activeReal.questionnaireAutoOpen=true;rememberQuestionnaire(activeReal.c.id,questionnaire);realTab="Диалог";return true;
    }
    const allowed={open_plan:"План",open_participants:"Участники",open_journal:"Журнал",open_overview:"Обзор",open_deadlines:"Сроки",open_documents:"Документы",open_settings:"Настройки"};
    if(allowed[action.type]){ realTab=allowed[action.type]; rememberInteraction("open_tab",realTab); drawRealCase(); return true; }
    if(action.type==="open_case" && typeof action.case_id==="string" && action.case_id===activeReal.c.id){ location.hash="#case/"+action.case_id; return true; }
    return false;
  }
  async function askCaseAgent(message){
    await ensureSession(); rememberInteraction("agent_ask",activeReal?"case":"page"); await flushInteractions();
    const page_context=currentPageContext();
    if(!activeReal){
      if(window.FixarCommunity&&window.FixarCommunity.handlesGeneral()){
        const communityReply=await window.FixarCommunity.handleGeneralMessage(message);
        if(communityReply!==null){ loadCredits(true); return communityReply; }
      }
      const practice=currentSpace==="Практика"?selectedPractice():null;
      const talkKey="fixar-v2-page-talk:"+(practice?practice.id:currentSpace);
      let talk=store(talkKey);
      if(!talk){
        talk="talk_"+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
        put(talkKey,talk);
      }
      const generalBody={message,talk_id:talk,page_context};
      if(practice){
        generalBody.practice_id=practice.id;
        generalBody.domain=practice.domain;
        generalBody.agent_id=practice.agent;
      } else if(currentSpace==="Разработка"&&authState.assurance>=2){
        generalBody.domain="software";
        generalBody.agent_id="cabinet";
      }
      const general=await authFetch("POST","/dialog/general",generalBody);
      applyAgentAction(general.ui_action);
      loadCredits(true);
      return general.reply||"Фиксарик принял сообщение.";
    }
    const binding=practiceCaseBinding(activeReal.c); const body={case_id:activeReal.c.id,case_title:activeReal.c.title||"",message,client_message_id:"v2-"+Date.now()+"-"+Math.random().toString(36).slice(2,10),page_context};
    if(binding){ body.domain=binding.domain; body.agent=binding.agent; }
    const r=await authFetch("POST","/dialog",body);
    if(binding){ activeReal.c.domain=binding.domain; activeReal.c.selected_agent_id=binding.agent; try{localStorage.removeItem(practiceCaseStorageKey(activeReal.c.id));}catch(_){} }
    activeReal.reply=r.reply||"Агент принял сообщение."; applyAgentAction(r.ui_action); loadCredits(true); return activeReal.reply;
  }
  function openCreateProject(){
    if(!hasSession()){openAccount();return;}
    const requestId=caseRequestId("project");
    modalOpen("Новый проект или исследование",'<p class="lead">Это родительское дело в пространстве «Проекты и исследования». Внутри него можно заводить связанные ветки с собственными диалогами и материалами.</p><form id="newproject" class="pform"><label>Вид<select name="kind" required><option value="project">Проект</option><option value="research">Исследование</option></select></label><label>Название<input name="title" required maxlength="200" placeholder="Например, Разработка Домашкина"></label><label>Цель<textarea name="goal" rows="4" maxlength="2000" placeholder="Какой результат хотим получить?"></textarea></label><div class="cta-row"><button class="btn primary" type="submit">Создать проект</button></div><p class="rc-hint" data-project-status role="status"></p></form>',body=>{
      const form=body.querySelector("#newproject"),button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-project-status]");
      form.elements.kind.onchange=()=>{button.textContent=form.elements.kind.value==="research"?"Создать исследование":"Создать проект";};
      form.onsubmit=async event=>{event.preventDefault();button.disabled=true;status.textContent="Создаю…";
        try{
          await ensureSession();
          const created=await createCaseOnce({title:form.elements.title.value.trim(),goal:form.elements.goal.value.trim(),project_kind:form.elements.kind.value},requestId);
          await authFetch("POST","/cases/"+encodeURIComponent(created.id)+"/scope",{scope:"pro"});
          REAL.loaded=false;await loadRealCases(true);modalClose();currentSpace="Проекты и исследования";rebuildNav();realTab=defaultRealTab();location.hash="#case/"+created.id;await renderRealCase(created.id);
        }catch(error){button.disabled=false;status.textContent=(error&&error.message)||"Не удалось создать проект. Повтор сохранит тот же запрос, а не заведёт дубль.";}
      };
      form.elements.title.focus();
    });
  }
  window.openCreateProject=openCreateProject;

  function openDataBoundaryDecision(actionId){
    const context=activeReal,action=context&&(context.nextActions||[]).find(item=>item.id===actionId);
    if(!context||!context.isOwner||!action||action.done||!actionNeedsDataBoundaryDecision(action)){toast("Эта форма доступна только владельцу для открытой эскалации о границах данных.");return;}
    if(action.data_boundary_decision){toast("Ответ владельца уже записан в этой эскалации.");return;}
    modalOpen("Решение владельца · границы данных",
      '<p class="lead">Ответ закроет именно эту эскалацию и сохранится в журнале дела. Укажите реальную политику — без неё пункт нельзя отметить выполненным.</p>'+
      '<div class="case-form-note"><span>◎</span><p>Это решение не меняет задним числом доступ к уже загруженным материалам. Доступ к каждому материалу настраивается отдельно в «Документах».</p></div>'+
      '<form id="data-boundary-decision" class="pform case-modern-form">'+
      '<label><span>Какие обращения можно брать?</span><textarea name="allowed_requests" rows="3" maxlength="2000" required placeholder="Например: запросы на разработку и поддержку, где есть согласие на использование данных"></textarea></label>'+
      '<label><span>Что исключить?</span><textarea name="excluded_requests" rows="3" maxlength="2000" required placeholder="Например: медицинские сведения, чужие базы, обращения без согласия"></textarea></label>'+
      '<label><span>Сколько хранить?</span><input name="retention_period" maxlength="160" required placeholder="Например: до завершения задачи, но не более 30 дней"></label>'+
      '<label><span>Кто видит примеры?</span><select name="sample_visibility" required><option value="owner_only">Только владелец дела</option><option value="case_participants">Участники этого дела</option><option value="authorized_team">Только назначенная команда</option><option value="anonymized_reusable">Повторно — только обезличенный пример</option></select></label>'+
      '<label><span>Кто вправе удалить пример?</span><select name="deletion_right" required><option value="owner_only">Только владелец дела</option><option value="owner_or_authorized_participant">Владелец или назначенный им участник</option><option value="participant_may_request">Участник может потребовать удаления у владельца</option></select></label>'+
      '<label><span>Дополнительное условие (необязательно)</span><textarea name="note" rows="2" maxlength="2000" placeholder="Например: перед повторным использованием обязательно обезличить текст"></textarea></label>'+
      '<button class="btn primary case-form-submit" type="submit">Сохранить решение владельца</button><p class="rc-hint" data-decision-status role="status"></p></form>',
      body=>{const form=body.querySelector("#data-boundary-decision"),button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-decision-status]");form.elements.allowed_requests.focus();form.onsubmit=async event=>{event.preventDefault();button.disabled=true;button.textContent="Сохраняю…";status.textContent="";try{await authFetch("POST","/cases/"+encodeURIComponent(context.c.id)+"/actions/"+encodeURIComponent(action.id)+"/data-boundary-decision",{allowed_requests:form.elements.allowed_requests.value.trim(),excluded_requests:form.elements.excluded_requests.value.trim(),retention_period:form.elements.retention_period.value.trim(),sample_visibility:form.elements.sample_visibility.value,deletion_right:form.elements.deletion_right.value,note:form.elements.note.value.trim(),expected_what:action.what||"",expected_waiting_for:action.waiting_for||""});modalClose();realTab="План";await renderRealCase(context.c.id);toast("Решение владельца сохранено. Эскалацию теперь можно завершить.");}catch(error){button.disabled=false;button.textContent="Сохранить решение владельца";status.textContent=error&&error.status===409?"Эскалация изменилась или уже получила ответ. Обновите дело.":((error&&error.message)||"Не удалось сохранить решение.");}};});
  }

  function openSelfdiagF7Decision(actionId){
    const context=activeReal,action=context&&(context.nextActions||[]).find(item=>item.id===actionId);
    if(!context||!context.isOwner||!action||action.done||!isSelfdiagF7Action(context.c.id,action)){toast("Ответить на F7-эскалацию может только владелец дела «Самодиагностика».");return;}
    if(action.escalation_decision){toast("Решение уже записано. Для пересмотра заведите новый пункт.");return;}
    modalOpen("Ответить на "+String(action.what||"").split(" · ",1)[0],
      '<p class="lead">'+esc(action.what||"")+'</p><p class="rc-hint">Выбор сохранится в деле и журнале. Он не запускает исправление и не разрешает автоматическое применение кода.</p>'+
      '<form id="selfdiag-f7-decision" class="pform case-modern-form">'+
      '<label><span>Ваше решение или выбранный вариант</span><textarea name="answer" rows="3" maxlength="2000" required placeholder="Например: вариант б) — добавить сторож регрессии"></textarea></label>'+
      '<label><span>Условие или основание (необязательно)</span><textarea name="reason" rows="2" maxlength="2000" placeholder="Что проверить до закрытия эскалации"></textarea></label>'+
      '<button class="btn primary case-form-submit" type="submit">Записать решение</button><p class="rc-hint" data-decision-status role="status"></p></form>',
      body=>{const form=body.querySelector("#selfdiag-f7-decision"),button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-decision-status]");form.elements.answer.focus();form.onsubmit=async event=>{event.preventDefault();button.disabled=true;button.textContent="Сохраняю…";status.textContent="";try{await authFetch("POST","/cases/"+encodeURIComponent(context.c.id)+"/actions/"+encodeURIComponent(action.id)+"/escalation-decision",{answer:form.elements.answer.value.trim(),reason:form.elements.reason.value.trim(),expected_what:action.what||"",expected_waiting_for:action.waiting_for||""});modalClose();realTab="План";await renderRealCase(context.c.id);toast("Решение записано. Эскалация остаётся открытой до вашего закрытия.");}catch(error){button.disabled=false;button.textContent="Записать решение";status.textContent=error&&error.status===409?"Эскалация изменилась или уже получила ответ. Обновите дело.":((error&&error.message)||"Не удалось сохранить решение.");}};});
  }

  function openSelfdiagQuestionAnswer(actionId){
    const context=activeReal,action=context&&(context.nextActions||[]).find(item=>item.id===actionId);
    if(!context||!context.isOwner||!action||action.done||!isSelfdiagQuestion(context.c.id,action)){toast("Ответить на вопрос Самодиагностики может только владелец дела.");return;}
    if(action.selfdiag_answer){toast("Ответ уже записан. Для пересмотра заведите новый пункт.");return;}
    modalOpen("Ответить на "+String(action.what||"").split(" · ",1)[0],
      '<p class="lead">'+esc(action.what||"")+'</p><p class="rc-hint">Ваш ответ сохранится в деле и журнале. Он не выполняет настройки и не закрывает вопрос автоматически.</p>'+
      '<form id="selfdiag-question-answer" class="pform case-modern-form">'+
      '<label><span>Ваш ответ</span><textarea name="answer" rows="4" maxlength="2000" required placeholder="Укажите решение или сведения, которых ждёт этот вопрос"></textarea></label>'+
      '<label><span>Условие или пояснение (необязательно)</span><textarea name="reason" rows="2" maxlength="2000" placeholder="Что нужно проверить перед закрытием"></textarea></label>'+
      '<button class="btn primary case-form-submit" type="submit">Сохранить ответ</button><p class="rc-hint" data-decision-status role="status"></p></form>',
      body=>{const form=body.querySelector("#selfdiag-question-answer"),button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-decision-status]");form.elements.answer.focus();form.onsubmit=async event=>{event.preventDefault();button.disabled=true;button.textContent="Сохраняю…";status.textContent="";try{await authFetch("POST","/cases/"+encodeURIComponent(context.c.id)+"/actions/"+encodeURIComponent(action.id)+"/selfdiag-answer",{answer:form.elements.answer.value.trim(),reason:form.elements.reason.value.trim(),expected_what:action.what||"",expected_waiting_for:action.waiting_for||""});modalClose();realTab="План";await renderRealCase(context.c.id);toast("Ответ записан. Вопрос остаётся открытым до вашего закрытия.");}catch(error){button.disabled=false;button.textContent="Сохранить ответ";status.textContent=error&&error.status===409?"Вопрос изменился или уже получил ответ. Обновите дело.":((error&&error.message)||"Не удалось сохранить ответ.");}};});
  }

  function openEditNextAction(actionId){
    const context=activeReal, action=context&&(context.nextActions||[]).find(item=>item.id===actionId);
    if(!context||context.c.id!==LAYA_ROUTING_CASE_ID||!context.canDecide||!action||action.done){toast("Этот шаг нельзя изменить.");return;}
    const choices=[{id:"",name:"Пока не назначен"},...(context.c.participants||[]).map(item=>({id:item.principal_id,name:item.display_name||(item.principal_id===authState.principal?"Вы":"Участник")}))];
    if(context.c.selected_agent_id)choices.push({id:context.c.selected_agent_id,name:assistantName(context.c)});
    const due=action.due?calendarInputValue(new Date(action.due)):"";
    modalOpen("Изменить ступень Laya",'<p class="lead">Изменения сохранятся в плане дела. Завершённую ступень редактировать нельзя; если её изменили в другом окне, обновите дело.</p><form class="pform case-modern-form" data-act="edit-laya-step"><label>Ступень и результат<textarea name="what" rows="4" maxlength="1000" required>'+esc(action.what||"")+'</textarea></label><label>Критерий перехода / что ждём<input name="waiting_for" maxlength="255" value="'+attr(action.waiting_for||"")+'"></label><div class="case-field-grid"><label>Ответственный<select name="owner">'+choices.map(item=>'<option value="'+attr(item.id)+'"'+(item.id===(action.owner||"")?' selected':'')+'>'+esc(item.name)+'</option>').join("")+'</select></label><label>Срок<input name="due" type="datetime-local" value="'+attr(due)+'"></label></div><button class="btn primary" type="submit">Сохранить ступень</button><p class="rc-hint" data-edit-status role="status"></p></form>',body=>{
      const form=body.querySelector('[data-act="edit-laya-step"]'),button=form.querySelector('button[type="submit"]'),status=form.querySelector('[data-edit-status]');
      form.onsubmit=async event=>{event.preventDefault();const date=form.elements.due.value?new Date(form.elements.due.value):null;if(date&&isNaN(date.getTime())){status.textContent="Проверьте срок.";return;}button.disabled=true;status.textContent="Сохраняю…";
        try{await authFetch("PUT","/cases/"+encodeURIComponent(context.c.id)+"/actions/"+encodeURIComponent(action.id),{what:form.elements.what.value.trim(),owner:form.elements.owner.value,due:date?date.toISOString():null,waiting_for:form.elements.waiting_for.value.trim(),expected_what:action.what,expected_owner:action.owner||"",expected_due:action.due||null,expected_waiting_for:action.waiting_for||""});modalClose();realTab="План";await renderRealCase(context.c.id);toast("Ступень обновлена.");}
        catch(error){button.disabled=false;status.textContent=error&&error.status===409?"Ступень изменилась в другом окне. Обновите дело и откройте форму снова.":((error&&error.message)||"Не удалось сохранить ступень.");}
      };
      form.elements.what.focus();
    });
  }

  async function openProjectBranch(projectId){
    if(!hasSession()){openAccount();return;}
    let parent;
    try{parent=await authFetch("GET","/cases/"+encodeURIComponent(projectId));}
    catch(error){toast((error&&error.message)||"Не удалось открыть проект.");return;}
    if(!isProjectParent(parent)||parent.owner_id!==authState.principal){toast("Новую ветку может создать владелец проекта.");return;}
    const isFixar=parent.id===FIXAR_PROJECT_CASE_ID;
    modalOpen("Новая ветка · "+parent.title,'<p class="lead">Ветка останется частью этого проекта. У неё будут собственный диалог, материалы и ход работы; существующие ветви сохранятся.</p><form id="newbranch" class="pform"><label>Название ветки<input name="title" required maxlength="200" placeholder="'+attr(isFixar?"Рефакторинг Домашкина: архитектура, логика, интеграция":"Название нового направления")+'"></label><label>Задача и ожидаемый результат<textarea name="purpose" rows="4" maxlength="2000" placeholder="Что нужно сделать и по чему поймём, что готово?"></textarea></label><div class="cta-row"><button class="btn primary" type="submit">Создать ветку</button></div><p class="rc-hint" data-branch-status role="status"></p></form>',body=>{
      const form=body.querySelector("#newbranch"),button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-branch-status]");form.elements.title.focus();
      form.onsubmit=async event=>{event.preventDefault();button.disabled=true;status.textContent="Проверяю ветви проекта…";
        const title=form.elements.title.value.trim(),purpose=form.elements.purpose.value.trim(),root="/cases/"+encodeURIComponent(projectId);
        if(!title){button.disabled=false;status.textContent="Назовите ветку.";return;}
        let child;
        try{
          const [planEvents,startedEvents]=await Promise.all([
            authFetch("GET",root+"/events?kind=plan.branches&newest=true&limit=1"),
            authFetch("GET",root+"/events?kind=branch.started&newest=true&limit=200")
          ]);
          const started=(startedEvents||[]).map(event=>eventPayload(event)).find(link=>link.title===title&&link.child_case_id);
          if(started){child=await authFetch("GET","/cases/"+encodeURIComponent(started.child_case_id));}
          else{
            const plan=planEvents.length?eventPayload(planEvents[planEvents.length-1]).branches||[]:[];
            let ord=plan.findIndex(branch=>branch.title===title);
            if(ord<0){
              if(plan.length>=30)throw new Error("В проекте уже 30 ветвей — откройте новый проект.");
              ord=plan.length;
              await authFetch("POST",root+"/branches",{branches:plan.concat([{title,purpose}]),source:"Создано владельцем из карточки проекта"});
            }
            status.textContent="Создаю связанное дело…";
            child=await authFetch("POST",root+"/branches/"+ord+"/start",{expect_title:title});
          }
          await authFetch("POST","/cases/"+encodeURIComponent(child.id)+"/scope",{scope:"pro"});
          let routingWarning="";
          if(isFixar&&!(child.domain==="software"&&child.selected_agent_id==="cabinet")){
            try{await authFetch("PUT","/cases/"+encodeURIComponent(child.id)+"/routing",{domain:"software",selected_agent_id:"cabinet",reason:"Ветка проекта Разработка ФиксАР",expect_domain:child.domain||"",expect_selected_agent_id:child.selected_agent_id||""});}
            catch(error){routingWarning="Ветка создана, но помощник разработки пока не назначен: "+((error&&error.message)||"проверьте маршрут в деле.");}
          }
          PROJECT_LINKS.delete(projectId);REAL.loaded=false;await loadRealCases(true);modalClose();currentSpace="Проекты и исследования";rebuildNav();realTab=defaultRealTab();location.hash="#case/"+child.id;await renderRealCase(child.id);toast(routingWarning||"Ветка создана внутри проекта.");
        }catch(error){button.disabled=false;status.textContent=(child?"Ветка уже создана, но настройка не завершена. Повторите: будет открыто то же дело. ":"")+((error&&error.message)||"Не удалось создать ветку.");}
      };
    });
  }
  window.openProjectBranch=openProjectBranch;

  function openCreateCase(){
    const practice=currentSpace==="Практика"?selectedPractice():null;
    if(currentSpace==="Практика"&&!practice){ toast("Сначала выберите кабинет в разделе «Практика»."); return; }
    const isPractice=!!practice, isDevelopment=currentSpace==="Разработка", personal=currentSpace==="Личное", space=isDevelopment?"Разработка":(isPractice?"Практика":(personal?"Личное":"Семья")), defaultTitle=isDevelopment?"Новая задача разработки":(isPractice?"Новое дело кабинета":(personal?"Личное дело":"Семейное дело")), placeholder=isDevelopment?"Напр., Пак Бухгалтерия УСН":(isPractice?"Напр., Договор клиента":(personal?"Напр., Организовать переезд":"Напр., Переезд семьи")), requestId=caseRequestId("manual");
    modalOpen(isDevelopment?"Новое дело разработки":(isPractice?"Новое дело кабинета":(personal?"Новое личное дело":"Новое семейное дело")),
      '<p class="lead">Создаётся настоящее дело в пространстве «'+esc(space)+'». Вы — владелец; участников можно пригласить позже.'+(isPractice?' Агент и база знаний будут взяты из выбранного кабинета «'+esc(practiceTitle(practice))+'».':(isDevelopment?' Помощником сразу станет кабинет разработчика.':''))+'</p>'+
      '<form id="ccf" class="pform"><label style="display:block">Название<input name="title" required placeholder="'+esc(placeholder)+'" style="width:100%"></label>'+
      '<label style="display:block;margin-top:10px">Цель (необязательно)<input name="goal" placeholder="Чего хотим достичь" style="width:100%"></label>'+
      '<div class="cta-row" style="margin-top:16px"><button class="btn primary" type="submit">Создать дело</button></div></form>',
      body=>{ const f=body.querySelector("#ccf"); f.title.focus(); f.onsubmit=async e=>{ e.preventDefault(); const btn=f.querySelector("button"); btn.disabled=true; btn.textContent="Создаю…";
        try{ await ensureSession(); const c=await createCaseOnce({title:(f.title.value||"").trim()||defaultTitle,goal:(f.goal.value||"").trim(),...((isPractice||isDevelopment)?{side:"offer_help"}:{})},requestId);
          try{ await authFetch("POST","/cases/"+encodeURIComponent(c.id)+"/scope",{scope:(isPractice||isDevelopment)?"pro":(personal?"personal":"home")}); }catch(_){}
          if(isDevelopment) await authFetch("PUT","/cases/"+encodeURIComponent(c.id)+"/routing",{domain:"software",selected_agent_id:"cabinet",reason:"developer-cabinet:v1",expect_domain:"",expect_selected_agent_id:""});
          // Маршрут кабинета ставим сразу, как у разработчика: иначе он жил
          // только в localStorage до первого сообщения, и дело не попадало в
          // кабинет на другом устройстве. Если шлюз откажет — прежний путь
          // через первое сообщение остаётся запасным.
          if(isPractice){ let routed=false; if(practice.agent){ try{ await authFetch("PUT","/cases/"+encodeURIComponent(c.id)+"/routing",{domain:practice.domain,selected_agent_id:practice.agent,reason:"practice-cabinet:v1:"+practice.domain+"/"+(practice.kind||""),expect_domain:"",expect_selected_agent_id:""}); routed=true; }catch(_){} } if(!routed) rememberPracticeCase(c.id,practice); }
          REAL.loaded=false; modalClose(); realTab=defaultRealTab(); currentSpace=space; rebuildNav(); renderRealCase(c.id);
        }catch(err){ btn.disabled=false; btn.textContent="Создать дело"; toast((err&&err.message)||"Не удалось создать дело."); } }; });
  }
  window.openCreateCase=openCreateCase;
  function realDashStrip(){
    const rc=realCasesForSpace(currentSpace); const top=rc.slice(0,4);
    const rows=top.length?top.map(c=>'<div class="rc-row" data-id="'+attr(c.id)+'"><b>'+esc(c.title||"Без названия")+'</b>'+statusChip(statusNorm(RU_STATE[c.state]||"в работе"))+'<span class="when">'+esc(fmtWhen(c.updated_at))+'</span></div>').join("")
      :'<p class="rc-hint">У вас пока нет настоящих дел в этом пространстве.</p>';
    const fixar=(currentSpace==="Личное"||currentSpace==="Семья")?'<button class="btn" data-act="fixar-case">Начать с FixAR</button>':'';
    return '<div class="rc-strip"><h3>Ваши дела · '+esc(currentSpace)+' ('+rc.length+')</h3>'+rows+'<div class="cta-row" style="margin-top:10px"><button class="btn primary" data-act="create-case">Создать дело</button>'+fixar+'</div></div>';
  }
  function refreshCurrentView(){ const h=location.hash.slice(1); if(h.indexOf("case/")===0||h==="demo/states") return; if(h.indexOf("owner/")===0){ renderOwnerRoute(h.slice(6)); return; } const t=h.indexOf("~"); const id=t>=0?h.slice(0,t):h; const node=byId[id]; if(node) render(node); }
  function loadCasesThen(build,skel,after){
    const t=++loadToken; vwrap.innerHTML=skel; vwrap.parentElement.scrollTop=0;
    loadRealCases().then(()=>{ if(t!==loadToken)return; vwrap.innerHTML=build(); vwrap.parentElement.scrollTop=0; if(after)after(); });
  }

  /* ── Общий модальный лист (для создания дела и правки доступа) ── */
  let _m=null,_mReturn=null;
  function openAgentAnswer(text,assistant){
    const clean=agentPlainText(text); if(!clean)return;
    modalOpen("Ответ "+(assistant||"помощника"),'<div class="answer-reader" tabindex="0">'+esc(clean)+'</div><div class="answer-reader-actions"><button class="btn" type="button" data-answer-copy>Копировать текст</button></div>',body=>{
      const reader=body.querySelector(".answer-reader"),copy=body.querySelector("[data-answer-copy]"); reader.focus(); copy.onclick=async()=>{ try{ await navigator.clipboard.writeText(clean); copy.textContent="Скопировано"; }catch(_){ toast("Не удалось скопировать текст."); } };
    },true);
  }
  function modalOpen(title,html,onMount,reader=false){
    if(!_m){ _m=document.createElement("div"); _m.className="sheet"; _m.setAttribute("role","dialog"); _m.setAttribute("aria-modal","true");
      _m.innerHTML='<div class="sheet-bg" data-mx></div><div class="sheet-card"><button class="sheet-x" data-mx aria-label="Закрыть">✕</button><div id="mbody"></div></div>';
      document.body.appendChild(_m);
      _m.addEventListener("click",e=>{ if(e.target.hasAttribute("data-mx")) modalClose(); });
      document.addEventListener("keydown",e=>{ if(_m.classList.contains("open")&&e.key==="Escape"){ e.preventDefault(); modalClose(); } });
    }
    _mReturn=document.activeElement;
    _m.querySelector("#mbody").innerHTML='<h2>'+esc(title)+'</h2>'+html;
    _m.classList.toggle("reader-sheet",reader);
    _m.classList.add("open"); document.body.style.overflow="hidden";
    if(onMount) onMount(_m.querySelector("#mbody"));
  }
  function modalClose(){ if(_m){ _m.classList.remove("open"); document.body.style.overflow=""; } if(_mReturn&&_mReturn.focus) _mReturn.focus(); }

  /* ═══ ПРИГЛАШЕНИЕ В ДЕЛО: `/?invite=<код>` ═══
     Ссылку выдаёт «Люди и доступ» (и прежние оболочки) видом
     `https://agrigate.pro/?invite=<код>`. С 16.09.2026 корень — v2, а его
     переадресация на /v2/ теряла строку запроса: приглашение открывалось и
     молча не делало ничего. Замерено 26.09: с 16.09 создано 4, принято 0 (до
     того 4 из 4). Корень теперь несёт запрос сюда. Условия — до согласия и до
     входа, как на /start/: принять можно и гостем, сервер подставит субъекта
     из сессии. Название дела откроется только после согласия (см.
     case_service `read_invite`). */
  const CASE_INVITE_CODE=(()=>{ const m=/[?&]invite=([^&#]+)/.exec(location.search||""); if(!m)return ""; try{ return decodeURIComponent(m[1]); }catch(_){ return m[1]; } })();
  async function handleCaseInviteLink(){
    const code=CASE_INVITE_CODE; if(!code)return false;
    // Код одноразовый: снимаем его из адреса, чтобы обновление страницы не звало снова.
    try{ const url=new URL(location.href); url.searchParams.delete("invite"); history.replaceState(null,"",url.pathname+url.search+url.hash); }catch(_){}
    let inv;
    try{ inv=await authFetch("GET","/invites/"+encodeURIComponent(code)); }
    catch(e){ modalOpen("Вас зовут в дело",'<p class="lead">'+esc((e&&e.message)||"Приглашение не открылось.")+'</p><p class="rc-note">Попросите у позвавшего новую ссылку.</p>'); return true; }
    const until=inv.expires_at?new Date(inv.expires_at):null,cap=t=>{ t=String(t||""); return t.charAt(0).toUpperCase()+t.slice(1); };
    const rows=[["Кем зовут",ROLE_RU[inv.role]||inv.role],["Что можно",(inv.rights||[]).map(r=>RIGHT_RU[r]||r).join(", ")],["Что откроется",(inv.you_will_see||[]).map(s=>SEE_RU[s]||s).join(", ")],["Условия",inv.terms_note||""],
      ["Ссылка действует до",until&&!isNaN(until)?until.toLocaleString("ru-RU",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}):""]].filter(r=>r[1]);
    modalOpen("Вас зовут в дело",
      (inv.terms?'<p class="lead">'+esc(cap(inv.terms))+'.</p>':'')+
      (inv.note?'<p class="rc-note"><b>От позвавшего:</b> '+esc(inv.note)+'</p>':'')+
      rows.map(r=>'<div class="prow"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>').join("")+
      (inv.what_it_is?'<p class="sheet-note">'+esc(cap(inv.what_it_is))+'.</p>':'')+
      (inv.to_take_as_work?'<p class="sheet-note">'+esc(inv.to_take_as_work)+'</p>':'')+
      '<div class="cta-row"><button class="btn primary" type="button" data-invite-accept>Принять</button><button class="btn" type="button" data-invite-later>Не сейчас</button></div><p class="rc-note" data-invite-status role="status" aria-live="polite" hidden></p>',
      body=>{
        const yes=body.querySelector("[data-invite-accept]"),status=body.querySelector("[data-invite-status]");
        body.querySelector("[data-invite-later]").onclick=modalClose;
        yes.focus();
        yes.onclick=async()=>{
          yes.disabled=true; status.hidden=false; status.textContent="Принимаю…";
          try{
            await ensureSession();
            // Какое дело открылось — разницей списков: ответ приёма номера дела не несёт.
            await loadRealCases(true);
            const before=new Set((REAL.cases||[]).map(c=>c.id));
            await authFetch("POST","/invites/"+encodeURIComponent(code)+"/accept",{});
            await loadRealCases(true);
            const fresh=(REAL.cases||[]).find(c=>!before.has(c.id));
            modalClose();
            toast("Готово, вы в деле. Условия записаны в его журнал — их видно всем участникам.");
            if(fresh)location.hash="case/"+fresh.id; else if(typeof refreshCurrentView==="function")refreshCurrentView();
          }catch(e){ yes.disabled=false; status.textContent=(e&&e.message)||"Принять не вышло."; }
        };
      });
    return true;
  }

  async function submitQuestionnaire(form){
    const questionnaire=activeReal&&activeReal.questionnaire,button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-questionnaire-status]"); if(!questionnaire)return;
    const answer=questionnaireAnswer(questionnaire,form); if(answer.missing.length){ status.textContent="Заполните: "+answer.missing.join(", "); return; }
    button.disabled=true;button.classList.add("thinking");button.textContent="Передаю…";status.textContent="ФиксАР собирает требования из ответов…";
    try{ const caseId=activeReal.c.id;activeReal.questionnaire=null;activeReal.questionnaireAutoOpen=false;rememberQuestionnaire(caseId,null);await askCaseAgent(answer.message);modalClose();drawRealCase(); }
    catch(err){ activeReal.questionnaire=questionnaire;rememberQuestionnaire(activeReal.c.id,questionnaire);button.disabled=false;button.classList.remove("thinking");button.textContent=questionnaire.submit_label;status.textContent=(err&&err.message)||"Ответы не отправлены. Попробуйте ещё раз."; }
  }
  function openQuestionnaireDialog(){
    const questionnaire=activeReal&&activeReal.questionnaire; if(!questionnaire)return;
    activeReal.questionnaireAutoOpen=false;
    modalOpen("Анкета ФиксАР",questionnaireCard(questionnaire),body=>{ const form=body.querySelector('form[data-act="answer-questionnaire"]');if(form)form.onsubmit=event=>{event.preventDefault();submitQuestionnaire(form);}; },true);
  }

  function maybeOpenFixarikFunnel(){
    if(fixarikFunnelOpened||!authState.ready)return;
    const query=new URLSearchParams(location.search);
    if(query.get("from")!=="fixarik"||query.get("new_case")!=="1")return;
    if(!authState.token||!authState.principal){ openAccount(); return; }
    fixarikFunnelOpened=true;
    history.replaceState(null,"",location.pathname+location.hash);
    const channel=query.get("channel")==="tg"?"Telegram":"MAX", requestId=caseRequestId("fixarik");
    currentSpace="Личное"; rebuildNav();
    modalOpen("Первое дело с Фиксариком",
      '<p class="lead">Вход через '+channel+' завершён. Опишите реальную задачу — она станет защищённым личным делом, а Фиксарик сразу подготовит первый разбор.</p>'+
      '<form id="fixarikfunnel" class="pform"><label style="display:block">Название дела<input name="title" required maxlength="160" placeholder="Например, Организовать переезд" style="width:100%"></label>'+
      '<label style="display:block;margin-top:10px">Что нужно сделать<textarea name="problem" required rows="5" maxlength="6000" placeholder="Опишите результат, срок и важные ограничения" style="width:100%;resize:vertical"></textarea></label>'+
      '<p class="rc-note">До 10 000 стартовых кредитов сервер начислит при первом платном действии. Просмотр баланса ничего не начисляет.</p>'+
      '<label class="chk" style="display:flex;gap:9px;align-items:flex-start;margin-top:12px"><input name="consent" type="checkbox" required> <span>Создать личное дело и передать этот текст Фиксарику для первого разбора. Разбор может расходовать стартовые кредиты; внешние действия без отдельного подтверждения запрещены.</span></label>'+
      '<div class="cta-row" style="margin-top:16px"><button class="btn primary" type="submit">Создать дело и начать разбор</button></div></form>',
      body=>{ const form=body.querySelector("#fixarikfunnel"); form.title.focus(); form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector("button"), title=form.title.value.trim(), problem=form.problem.value.trim(); if(!title||!problem)return; button.disabled=true; button.classList.add("thinking"); button.textContent="Создаю дело…";
        let created=null;
        try{
          created=await createCaseOnce({title,goal:problem,side:"need_help"},requestId);
          try{ await authFetch("POST","/cases/"+encodeURIComponent(created.id)+"/scope",{scope:"personal"}); }catch(_){}
          REAL.loaded=false; modalClose(); realTab=defaultRealTab(); location.hash="#case/"+created.id;
          await renderRealCase(created.id);
          try{ await askCaseAgent(problem); drawRealCase(); }
          catch(error){ activeReal.reply="Дело создано, но первый разбор пока не получен: "+((error&&error.message)||"агент недоступен"); drawRealCase(); }
          await loadRealCases(true); loadCredits(true);
        }catch(error){ button.disabled=false; button.classList.remove("thinking"); button.textContent="Создать дело и начать разбор"; toast((error&&error.message)||"Не удалось создать дело."); }
      }; });
  }

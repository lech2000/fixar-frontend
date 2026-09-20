  "use strict";

  // Районный вход — локальная метка до явного согласия. Переход по ссылке не
  // зовёт /entry/anon и не создаёт principal. Источник и campaign браузер не
  // принимает вовсе: после согласия их разрешает identity по opaque ref.
  (function(){
    const PENDING_KEY="fixar.community.pending.v1";
    const ACTIVE_KEY="fixar.community.active.v1";
    const REF=/^[A-Za-z0-9_-]{12,32}$/;
    const TEXT_CONFIRM=/^\s*(?:(?:да|ага|подтверждаю)(?:[,\s:—-]*(?:создавай|заводи|начинай|запускай))?|(?:создай|заведи|открой|запусти|начни)\s+(?:это\s+)?дело|(?:запусти|начинай|создавай|заводи))\s*[.!]*\s*$/i;
    let pending=null, gate=null, decision=Promise.resolve(true), settleDecision=null;
    let proposal=null, historyTurns=[];

    function readJson(key){ try{return JSON.parse(localStorage.getItem(key)||"null");}catch(_){return null;} }
    function writeJson(key,value){ try{localStorage.setItem(key,JSON.stringify(value));}catch(_){} }
    function removeKey(key){ try{localStorage.removeItem(key);}catch(_){} }
    function active(){ const value=readJson(ACTIVE_KEY),accepted=Date.parse((value&&value.accepted_at)||""); if(!value||!REF.test(value.community_ref||"")||!Number.isFinite(accepted)||Date.now()-accepted>86400000){ if(value)removeKey(ACTIVE_KEY); return null; } return value; }
    // Общий чат ОДИН на все пространства: выбранный раздел меняет окружение,
    // но не превращает короткое «запусти» в новую задачу. Сначала всегда идём
    // через исполнимый intake: он возвращает подписанное предложение и только
    // после отдельного подтверждения заводит дело. Районная ссылка добавляет
    // атрибуцию, но не является условием рабочего цикла. Закреплённый
    // software/cabinet работает уже внутри дела и в специальных экранах
    // разработчика, а не подменяет общий вход.
    function handlesGeneral(){ return true; }
    function cleanQuery(){
      try{ const url=new URL(location.href); url.searchParams.delete("community"); history.replaceState(null,"",url.pathname+(url.search?url.search:"")+url.hash); }catch(_){}
    }
    function territoryName(data){ const territory=data&&data.territory||{}; return territory.name||data.community_title||"территория не названа"; }
    function closeGate(){ if(gate){ gate.hidden=true; gate.remove(); gate=null; } document.documentElement.classList.remove("community-consent-open"); }
    function finishDecision(value){ const finish=settleDecision; settleDecision=null; pending=null; removeKey(PENDING_KEY); cleanQuery(); closeGate(); if(finish)finish(value); }
    function makeGate(){
      if(gate)return gate;
      gate=document.createElement("section"); gate.className="community-gate"; gate.setAttribute("role","dialog"); gate.setAttribute("aria-modal","true"); gate.setAttribute("aria-labelledby","community-gate-title");
      gate.innerHTML='<div class="community-gate-card"><p class="community-eyebrow">Районный вход</p><h1 id="community-gate-title">Проверяю ссылку сообщества…</h1><p data-community-lead>Пока ничего личного не создаётся.</p><div data-community-body></div><p class="community-gate-status" data-community-status aria-live="polite"></p></div>';
      document.body.appendChild(gate); document.documentElement.classList.add("community-consent-open"); return gate;
    }
    function showInvalid(message){
      const root=makeGate(),card=root.querySelector(".community-gate-card");
      card.querySelector("h1").textContent="Ссылка не действует";
      card.querySelector("[data-community-lead]").textContent=message||"Попросите новую ссылку у администратора сообщества.";
      card.querySelector("[data-community-body]").innerHTML='<div class="community-gate-actions"><button class="btn primary" type="button" data-community-decline>Продолжить без сообщества</button></div>';
      card.querySelector("[data-community-decline]").onclick=()=>finishDecision(false);
    }
    function showConsent(data){
      const root=makeGate(),card=root.querySelector(".community-gate-card"),body=card.querySelector("[data-community-body]"),status=card.querySelector("[data-community-status]");
      card.querySelector("h1").textContent="Продолжить в личном ФиксАРе?";
      card.querySelector("[data-community-lead]").textContent="Ссылка перенесла только источник и территорию. Переписка общего чата сюда не передавалась.";
      body.innerHTML='<div class="community-facts"><div class="community-fact"><small>Источник</small><b>'+esc(data.source_label||data.chat_title||"Сообщество")+'</b></div><div class="community-fact"><small>Территория</small><b>'+esc(territoryName(data))+'</b></div></div><p class="community-consent">'+esc((data.consent||{}).text||"")+'</p><div class="community-gate-actions"><button class="btn primary" type="button" data-community-accept>Согласен, продолжить</button><button class="btn" type="button" data-community-decline>Нет, продолжить без связи</button></div>';
      const yes=body.querySelector("[data-community-accept]"),no=body.querySelector("[data-community-decline]");
      no.onclick=()=>finishDecision(false);
      yes.onclick=async()=>{
        yes.disabled=true; no.disabled=true; yes.classList.add("thinking"); status.textContent="Сохраняю ваше решение…";
        try{
          if(!authState.ready)await bootIdentity();
          let result;
          if(authState.token){
            result=await authFetch("POST","/community/referrals/accept",{community_ref:pending.ref,accepted:true});
          }else{
            const me=await authFetch("POST","/entry/anon",{label:"community",community_ref:pending.ref,community_consent:true});
            authState.token=me.token; authState.principal=me.principal_id; authState.assurance=me.assurance||0; authState.signed_in=false; put(AUTH_KEY,me.token); result=me.community; applyIdentity();
          }
          writeJson(ACTIVE_KEY,{community_ref:pending.ref,referral_id:(result&&result.referral_id)||"",community_title:(result&&result.community_title)||data.community_title||"",territory:territoryName(result||data),accepted_at:new Date().toISOString()});
          finishDecision(true); toast("Районный источник сохранён. Теперь опишите задачу — Фиксар сначала покажет план.");
        }catch(error){ yes.disabled=false; no.disabled=false; yes.classList.remove("thinking"); status.textContent=(error&&error.message)||"Не удалось сохранить согласие. Ничего нового не создано."; }
      };
      yes.focus();
    }
    async function init(){
      const query=new URLSearchParams(location.search),fromUrl=query.get("community")||"";
      let ref=REF.test(fromUrl)?fromUrl:"";
      if(ref){ removeKey(ACTIVE_KEY); pending={ref}; writeJson(PENDING_KEY,pending); }
      else{ const saved=readJson(PENDING_KEY); if(saved&&REF.test(saved.ref||""))ref=saved.ref; }
      if(!ref)return false;
      pending={ref}; decision=new Promise(resolve=>{settleDecision=resolve;}); makeGate();
      try{ const data=await authFetch("GET","/community/start/"+encodeURIComponent(ref)); showConsent(data); }
      catch(error){ removeKey(PENDING_KEY); showInvalid((error&&error.message)||"Ссылка сообщества не найдена."); }
      return decision;
    }
    function beforeSession(){ return decision; }
    function turnId(){ return "community_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10); }
    function talkId(){ let id=store("fixar-community-talk"); if(!id){id="talk_"+Date.now().toString(36)+Math.random().toString(36).slice(2,10);put("fixar-community-talk",id);}return id; }
    function assessmentText(value,routeKind,title){
      if(!value)return "";
      let summary=String(value.summary||"").trim();
      const internal=/^(?:человек|пользователь|сторона)(?:\s|$)/i.test(summary)||/(?:platform_fit|template_id|capability|контур)/i.test(summary);
      if(!summary||internal)summary=title?("Понял. Помогу с задачей: "+title+". Проведу по шагам."):"Понял вас. Помогу разобраться и организую работу по шагам.";
      const lines=[summary];
      if((value.gaps||[]).length&&routeKind!=="clarify_side")lines.push("","Сразу учту: "+value.gaps.join("; ")+".");
      if(value.next_question&&routeKind!=="clarify_side")lines.push("",value.next_question);
      return lines.join("\n");
    }
    async function generalAnswer(message){
      const general=await authFetch("POST","/dialog/general",{message,talk_id:talkId(),page_context:currentPageContext()});
      return general.reply||"Фиксар принял сообщение.";
    }
    function proposalSheet(route,res,sent,planText){
      proposal={route,res,sent,expires:Date.now()+Math.max(0,Number(res.proposal_expires_in||0))*1000};
      const side=(res.side_choices||[])[0],steps=((route.assessment||{}).plan||[]).map(step=>'<li><b>'+esc(step.order+". "+step.title)+'</b><span>'+esc(step.outcome)+'</span></li>').join("");
      modalOpen("План готов — завести дело?",'<p class="lead">'+esc((route.assessment||{}).summary||route.reason||"Фиксар сверил задачу с возможностями платформы.")+'</p>'+(steps?'<ol class="community-plan">'+steps+'</ol>':'')+'<p class="rc-note">'+esc(side?("Вы здесь — "+side.owner_is+"."):"Сторона обмена не названа.")+' Дела пока нет. Оно появится только после отдельного подтверждения.</p><div class="cta-row"><button class="btn primary" type="button" data-community-confirm>Завести дело</button><button class="btn" type="button" data-community-reject>Оставить в общем чате</button></div><p class="community-gate-status" data-community-proposal-status aria-live="polite"></p>',body=>{
        const yes=body.querySelector("[data-community-confirm]"),no=body.querySelector("[data-community-reject]"),status=body.querySelector("[data-community-proposal-status]");
        no.onclick=()=>{proposal=null;modalClose();toast("Дело не создано. Разговор остаётся общим.");};
        yes.onclick=async()=>{yes.disabled=true;no.disabled=true;status.textContent="Создаю дело по показанному плану…";try{const made=await confirmProposal(proposal);proposal=null;modalClose();toast("Дело создано: "+(made.title||route.proposed_title));}catch(error){yes.disabled=false;no.disabled=false;status.textContent=(error&&error.message)||"Не удалось подтвердить. Повтор безопасен: новое дело не дублируется.";}};
      });
      return planText+"\n\nДела ещё нет. Подтвердите его создание в открытой карточке или ответьте «да, создавай».";
    }
    async function confirmProposal(record){
      if(!record)throw new Error("Предложение уже закрыто.");
      if(record.expires&&Date.now()>record.expires)throw new Error("Предложение истекло — опишите задачу ещё раз.");
      const made=await authFetch("POST","/inbox/cases/confirm",{proposal_token:record.res.proposal_token,client_message_id:record.sent.id,parts:record.sent.parts,confirmed:true});
      removeKey(ACTIVE_KEY); REAL.loaded=false; await loadRealCases(true); currentSpace="Личное"; rebuildNav(); realTab=defaultRealTab(); location.hash="#case/"+made.case_id; return made;
    }
    function sideSheet(message,res){
      const choices=res.side_choices||[]; if(!choices.length)return;
      modalOpen(res.side_question||"Уточните вашу роль",'<p class="lead">От этого зависит, кого будет искать агент и кто оплачивает работу. Ответ ничего не создаёт.</p><div class="community-gate-actions">'+choices.map((choice,index)=>'<button class="btn" type="button" data-community-side="'+index+'"><b>'+esc(choice.button)+'</b><br><small>'+esc(choice.owner_is)+'</small></button>').join("")+'</div>',body=>{body.querySelectorAll("[data-community-side]").forEach(button=>{button.onclick=async()=>{const choice=choices[Number(button.dataset.communitySide)];body.querySelectorAll("button").forEach(item=>item.disabled=true);try{modalClose();const text=await inbox(message,choice.side);toast(agentPlainText(text).slice(0,180));}catch(error){toast((error&&error.message)||"Не удалось уточнить сторону.");}};});});
    }
    async function inbox(message,side){
      const sent={id:turnId(),parts:[{type:"text",value:message}]};
      const body={client_message_id:sent.id,parts:sent.parts,talk_id:talkId(),history:historyTurns.slice(-10),require_confirmation:true,community_context:!!active()}; if(side)body.side_hint=side;
      const res=await authFetch("POST","/inbox/messages",body),route=res.route||{},plan=assessmentText(route.assessment,route.kind,route.proposed_title||"");
      if(res.created_case){ const made=res.created_case; REAL.loaded=false; await loadRealCases(true); location.hash="#case/"+made.case_id; return "Дело создано: "+made.title; }
      if(route.kind==="propose_case"){ const text=proposalSheet(route,res,sent,plan||route.reason||"План подготовлен."); historyTurns.push({role:"user",text:message},{role:"assistant",text:text}); return text; }
      if(route.kind==="clarify_side"){ sideSheet(message,res); const text=(plan?plan+"\n\n":"")+(res.side_question||"Уточните, пожалуйста, вашу роль."); historyTurns.push({role:"user",text:message},{role:"assistant",text:text}); return text; }
      if(route.kind==="continue_case"&&route.case_id){ location.hash="#case/"+route.case_id; return "Нашёл подходящее действующее дело и открыл его. Новое дело не создавал."; }
      if(route.kind==="choose_case")return "Есть несколько подходящих действующих дел. Откройте нужное дело; новое я не создавал.";
      if(route.kind==="cannot_do")return (plan?plan+"\n\n":"")+(route.reason||"В текущих возможностях платформы эта задача не покрыта.");
      const answer=plan||await generalAnswer(message); historyTurns.push({role:"user",text:message},{role:"assistant",text:answer}); return answer;
    }
    async function handleGeneralMessage(message){
      if(!handlesGeneral())return null;
      if(proposal&&TEXT_CONFIRM.test(message||"")){ const record=proposal; proposal=null; modalClose(); const made=await confirmProposal(record); return "Завёл "+(made.kind_accusative||"дело")+" «"+(made.title||record.route.proposed_title||"без названия")+"». План уже лежит в деле."; }
      return inbox(message,"");
    }

    window.FixarCommunity={init,beforeSession,handlesGeneral,handleGeneralMessage,active};
  })();

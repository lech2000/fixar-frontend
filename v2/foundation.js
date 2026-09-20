  "use strict";
  // Базовый слой v2: дерево, хранилище, HTTP, личность и вход. Загружается
  // первым и не запускает интерфейс; следующие слои используют его объявления.
  const CORE = window.FixarCore;
  if (!CORE || !CORE.config || !CORE.http) {
    throw new Error("FixarCore config and http must load before v2/foundation.js");
  }
  const HTTP = CORE.http;
  // --- Разбор дерева из отступов (├ └ │) ---
  function parseTree(text){
    const root = { name: "__root__", depth: -1, children: [], parent: null };
    const stack = [root];
    for (const raw of text.split("\n")) {
      if (!raw.trim()) continue;
      const idx = raw.search(/[^\s│├└─]/u);
      if (idx < 0) continue;
      const depth = Math.round(idx / 3);
      const name = raw.slice(idx).trim();
      while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
      const parent = stack[stack.length - 1] || root;
      const node = { name, depth, children: [], parent };
      parent.children.push(node);
      stack.push(node);
    }
    return root.children[0];
  }

  const ROOT = parseTree(document.getElementById("ia").textContent);

  // id по пути индексов + карта; путь имён для крошек
  const byId = {};
  (function assign(node, path){
    node.id = path;
    byId[path] = node;
    node.children.forEach((c, i) => assign(c, path ? path + "-" + i : String(i)));
  })(ROOT, "0");

  function ancestors(node){ const a=[]; let n=node; while(n && n.parent && n.parent.name!=="__root__"){ a.unshift(n.parent); n=n.parent; } return a; }
  function esc(s){ return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
  function agentInline(value){
    return esc(value)
      .replace(/`([^`\n]+)`/g,"<code>$1</code>")
      .replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>")
      .replace(/__([^_\n]+)__/g,"<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g,"<em>$1</em>");
  }
  function agentRichText(value){
    const lines=String(value||"").replace(/\r\n?/g,"\n").split("\n"),out=[]; let list="",items=[],paragraph=[];
    const flushParagraph=()=>{ if(paragraph.length){out.push("<p>"+paragraph.map(agentInline).join("<br>")+"</p>");paragraph=[];} };
    const flushList=()=>{ if(list){out.push("<"+list+">"+items.map(item=>"<li>"+agentInline(item)+"</li>").join("")+"</"+list+">");list="";items=[];} };
    lines.forEach(raw=>{ const line=raw.trim(),heading=line.match(/^(#{1,4})\s+(.+)$/),unordered=line.match(/^[-*•]\s+(.+)$/),ordered=line.match(/^\d+[.)]\s+(.+)$/),quote=line.match(/^>\s?(.+)$/);
      if(!line){flushParagraph();flushList();return;}
      if(heading){flushParagraph();flushList();out.push("<"+(heading[1].length<3?"h3":"h4")+">"+agentInline(heading[2])+"</"+(heading[1].length<3?"h3":"h4")+">");return;}
      if(unordered||ordered){flushParagraph();const next=unordered?"ul":"ol";if(list&&list!==next)flushList();list=next;items.push((unordered||ordered)[1]);return;}
      if(quote){flushParagraph();flushList();out.push("<blockquote>"+agentInline(quote[1])+"</blockquote>");return;}
      flushList();paragraph.push(line);
    });
    flushParagraph();flushList();return '<div class="agent-rich">'+out.join("")+'</div>';
  }
  function agentPlainText(value){
    return String(value||"").replace(/\r\n?/g,"\n").replace(/^#{1,4}\s+/gm,"").replace(/^[-*]\s+/gm,"• ").replace(/\*\*([^*\n]+)\*\*/g,"$1").replace(/__([^_\n]+)__/g,"$1").replace(/`([^`\n]+)`/g,"$1").replace(/\*([^*\n]+)\*/g,"$1").trim();
  }

  /* ═══ ЛИЧНОСТЬ (Фаза 1) ═══════════════════════════════════════════════════
     v2 садится на ТОТ ЖЕ субъект, что оболочка и «Рабочая версия»: те же ключи
     хранилища, тот же порядок, та же ротация токена. Это и есть защита «один
     человек — одна учётка»: свой ключ, свой порядок — иначе на проде уже
     заводилась вторая запись на того же человека (см. start.js). Порт сделан
     с rabochaya/app.js дословно; расходиться им нельзя.
     ЧИТАЕМ на старте, но АНОНИМА НЕ ЗАВОДИМ — предпросмотр не должен плодить
     пустые учётки на каждый заход. Аноним заводится лениво, только когда
     человек сам нажал «Войти». */
  const AUTH_KEY   = "fixar.token";              // ключ оболочки — общий
  const AUTH_ROT   = "fixar.session.rotation";
  const AUTH_KEYS  = ["fixar.token","fixar.start.token","aios_token"];
  const AUTH_LOGIN_STATE = "fixar.login.state";  // одноразовая метка входа (CSRF)
  const AUTH_LOGIN_BACK  = "fixar.login.back";   // куда вернуть после входа
  const OWNER_YANDEX360_STATE = "fixar.owner.yandex360.state";
  const AUTH_REDIRECT = CORE.config.oauthRedirect;
  const AUTH_BACK     = "/v2/";                  // добавлен в белый список /auth/callback
  const BRAND = { google:{cls:"g",t:"Google"}, yandex:{cls:"y",t:"Яндекс"}, vk:{cls:"vk",t:"VK ID"},
                  sber:{cls:"s",t:"Сбер ID"}, tbank:{cls:"t",t:"Т-Банк"}, tg:{cls:"tg",t:"Телеграм"} };
  let authState = { token:null, principal:null, assurance:0, signed_in:false, providers:[], name:null, avatar:null, ready:false };
  let ownerTools = { principal:null, checked:false, allowed:false, checking:false };
  let creditState = { principal:null, loading:false, data:null, error:"" };
  let fixarikFunnelOpened = false;
  let interactionQueue = [], interactionTimer = null;

  const store = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const put   = (k,v) => { try { localStorage.setItem(k,v); } catch(e){} };
  const drop  = k => { try { localStorage.removeItem(k); } catch(e){} };
  const APPEARANCE_KEY = "fixar-v2-appearance";
  function safeHue(value){ const hue=Number(value); return Number.isFinite(hue)?((Math.round(hue)%360)+360)%360:275; }
  function safeBackgroundHue(value){ const hue=Number(value); return Number.isFinite(hue)?((Math.round(hue)%360)+360)%360:270; }
  function safeBackground(value){ const background=Number(value); return Number.isFinite(background)?Math.max(0,Math.min(100,Math.round(background))):62; }
  function holographicGlow(background){ return background<=62?.1+(background/62)*.77:.87+((background-62)/38)*.13; }
  function holographicVeilOpacity(background){ return .78-(background/100)*.68; }
  function readAppearance(){
    try{
      const value=JSON.parse(store(APPEARANCE_KEY)||"{}");
      const preset=value.preset||"fixar",legacyFixar=preset==="fixar"&&Number(value.hue)===155&&Number(value.backgroundHue)===145;
      return {mode:["system","light","dark"].includes(value.mode)?value.mode:"system",hue:legacyFixar?275:safeHue(value.hue),backgroundHue:legacyFixar?270:safeBackgroundHue(value.backgroundHue),background:safeBackground(value.background),preset,moodCaught:value.moodCaught===true};
    }catch(_){ return {mode:"system",hue:275,backgroundHue:270,background:62,preset:"fixar",moodCaught:false}; }
  }
  function applyAppearance(next,persist){
    const current=readAppearance(),value=Object.assign({},current,next||{});
    value.hue=safeHue(value.hue);
    value.backgroundHue=safeBackgroundHue(value.backgroundHue);
    value.background=safeBackground(value.background);
    const dark=value.mode==="dark"||(value.mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
    const lightness=dark?8.5+(value.background-50)*.08:96.5+(value.background-50)*.05;
    const backgroundColor=dark?"hsl("+value.backgroundHue+" 18% "+lightness+"%)":"hsl("+value.backgroundHue+" 22% "+lightness+"%)";
    document.documentElement.dataset.theme=dark?"dark":"light";
    document.documentElement.dataset.themeMode=value.mode;
    document.documentElement.style.setProperty("--accent-h",String(value.hue));
    document.documentElement.style.setProperty("--background-h",String(value.backgroundHue));
    document.documentElement.style.setProperty("--holo-glow",holographicGlow(value.background).toFixed(3));
    document.documentElement.style.setProperty("--holo-veil-opacity",holographicVeilOpacity(value.background).toFixed(3));
    document.documentElement.style.setProperty("--body-art",backgroundColor);
    const meta=document.querySelector('meta[name="theme-color"]'); if(meta)meta.content=backgroundColor;
    if(persist!==false)put(APPEARANCE_KEY,JSON.stringify(value));
    return value;
  }
  const systemTheme=window.matchMedia("(prefers-color-scheme: dark)");
  if(systemTheme.addEventListener)systemTheme.addEventListener("change",()=>{ if(readAppearance().mode==="system")applyAppearance({},false); });
  applyAppearance({},false);

  function interactionSession(){ let id=store("fixar-v2-interaction-session"); if(id)return id; id="web_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10); put("fixar-v2-interaction-session",id); return id; }
  function currentPageContext(){
    const hash=location.hash.slice(1), node=byId[hash.split("~",1)[0]], controls=[];
    document.querySelectorAll("#view button,#view a[href],#agentdock button").forEach(el=>{ if(el.offsetParent===null||el.disabled||controls.length>=30)return; const name=(el.dataset.act||el.id||el.getAttribute("href")||"действие").slice(0,60), label=(el.textContent||el.getAttribute("aria-label")||"").trim().replace(/\s+/g," ").slice(0,60); controls.push(label?(name+" — "+label):name); });
    return {space:currentSpace||"",screen:activeReal?"Дело":((node&&node.name)||"Главная"),tab:activeReal?realTab:"",route:hash.indexOf("case/")===0?"case/current":("screen/"+(hash||"home").replace(/[^A-Za-zА-Яа-яЁё0-9_.:/ -]/g,"")),language:(window.FixarV2I18n&&window.FixarV2I18n.code)||"ru",available_actions:controls};
  }
  function rememberInteraction(action,target){
    interactionQueue.push({event_id:"ui_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9),action,target:String(target||"").replace(/[^A-Za-zА-Яа-яЁё0-9_.:/ -]/g,"").slice(0,120),page:currentPageContext()});
    if(interactionQueue.length>60)interactionQueue=interactionQueue.slice(-60);
    clearTimeout(interactionTimer); interactionTimer=setTimeout(flushInteractions,700);
  }
  async function flushInteractions(){
    clearTimeout(interactionTimer); interactionTimer=null;
    if(!interactionQueue.length||!authState.token||!authState.principal)return;
    const events=interactionQueue.splice(0,20);
    try{ await authFetch("POST","/dialog/context/events",{session_id:interactionSession(),events}); }
    catch(_){ interactionQueue=events.concat(interactionQueue).slice(0,60); }
    if(interactionQueue.length)interactionTimer=setTimeout(flushInteractions,900);
  }

  function meName(){ return authState.signed_in ? (authState.name || (authState.providers||[]).map(p=>(BRAND[p]||{}).t||p).join(" + ") || "вы вошли") : "Гость"; }
  function meInitials(){ if(!authState.signed_in) return "Г"; const n=(authState.name||"").trim(); if(n){ const p=n.split(/\s+/); return ((p[0]||"")[0]||"")+((p[1]||"")[0]||"").toUpperCase(); } const p=(authState.providers||[])[0]; return ((BRAND[p]||{}).t||"В")[0].toUpperCase(); }
  function safeProfileAvatar(value){ try{ const url=new URL(String(value||"")); return url.protocol==="https:"?url.href:""; }catch(_){ return ""; } }
  function paintUserAvatar(node){ if(!node)return; node.textContent=meInitials(); const source=safeProfileAvatar(authState.avatar); if(!source)return; node.textContent=""; const image=document.createElement("img"); image.src=source; image.alt=""; image.referrerPolicy="no-referrer"; image.addEventListener("error",()=>{ node.textContent=meInitials(); },{once:true}); node.appendChild(image); }

  async function authFetch(method, path, body, token){
    const opts = { method, headers:{ "Content-Type":"application/json" } };
    const t = token || authState.token; if(t) opts.headers["Authorization"] = "Bearer " + t;
    if(body!==undefined) opts.body = JSON.stringify(body);
    const r = await HTTP.fetchApi(path, opts);
    const txt = await r.text(); let data=null; try{ data = txt?JSON.parse(txt):null; }catch(e){}
    if(!r.ok){ const e=new Error((data&&data.detail&&(data.detail.message||data.detail.reason))||(typeof (data&&data.detail)==="string"?data.detail:"отказ "+r.status)); e.status=r.status; throw e; }
    return data;
  }
  async function authDownload(path, filename, body){
    const headers={}; if(authState.token) headers.Authorization="Bearer "+authState.token;
    const options={method:body===undefined?"GET":"POST",headers};
    if(body!==undefined){ headers["Content-Type"]="application/json"; options.body=JSON.stringify(body); }
    const response=await HTTP.fetchApi(path,options);
    if(!response.ok){ let detail="отказ "+response.status; try{ const data=await response.json(); detail=(data&&data.detail&&(data.detail.message||data.detail.reason))||(data&&data.detail)||detail; }catch(_){} const error=new Error(String(detail)); error.status=response.status; throw error; }
    const blob=await response.blob(), url=URL.createObjectURL(blob), link=document.createElement("a");
    link.href=url; link.download=filename||"material"; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function downloadBlob(blob,filename){ const url=URL.createObjectURL(blob),link=document.createElement("a"); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000); }
  function safeDocumentName(title){ return window.FixARDocumentExport.safeFilename(title||"Разбор Домашкина"); }
  async function exportDraftDocx(draft){ const bytes=window.FixARDocumentExport.makeDocx(draft.title||"Разбор Домашкина",draft.body||""); downloadBlob(new Blob([bytes],{type:window.FixARDocumentExport.mime}),safeDocumentName(draft.title)+".docx"); }
  async function exportDraftPdf(draft){
    if(!(window.jspdf&&window.jspdf.jsPDF)){ await new Promise((resolve,reject)=>{ const script=document.createElement("script"); script.src="/vendor/jspdf.umd.min.js"; script.onload=resolve; script.onerror=reject; document.head.appendChild(script); }); }
    const response=await fetch("/vendor/PTSans-Regular.ttf"); if(!response.ok)throw new Error("Шрифт PDF недоступен"); const raw=new Uint8Array(await response.arrayBuffer()); let binary=""; for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode.apply(null,raw.subarray(i,i+8192));
    const Pdf=window.jspdf.jsPDF,doc=new Pdf({unit:"mm",format:"a4"}); doc.addFileToVFS("PTSans.ttf",btoa(binary)); doc.addFont("PTSans.ttf","PTSans","normal"); doc.setFont("PTSans"); const margin=20,width=doc.internal.pageSize.getWidth()-40,height=doc.internal.pageSize.getHeight()-20; let y=24; const line=(text,size)=>{doc.setFontSize(size);doc.splitTextToSize(String(text||""),width).forEach(value=>{if(y>height){doc.addPage();y=20;}doc.text(value,margin,y);y+=size*.5;});}; line(draft.title||"Разбор Домашкина",18); y+=4; String(draft.body||"").split(/\r?\n/).forEach(value=>{if(value)line(value,11);else y+=5;}); doc.save(safeDocumentName(draft.title)+".pdf");
  }
  function fileAsBase64(file){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onerror=()=>reject(new Error("Не удалось прочитать файл.")); reader.onload=()=>resolve(String(reader.result||"").split(",",2)[1]||""); reader.readAsDataURL(file); }); }
  function newSessionToken(){ if(typeof crypto==="undefined"||!crypto.getRandomValues) return ""; const b=new Uint8Array(32); crypto.getRandomValues(b); let s=""; for(let i=0;i<b.length;i++) s+=b[i].toString(16).padStart(2,"0"); return s; }
  function pendingRotation(old){ try{ const row=JSON.parse(store(AUTH_ROT)||"null"); return row&&row.old===old&&row.replacement?row:null; }catch(e){ return null; } }
  function saveRotation(row){ put(AUTH_ROT, JSON.stringify(row)); return pendingRotation(row.old); }
  function swapSession(old, nw){ AUTH_KEYS.forEach(k=>{ if(store(k)===old) put(k,nw); }); if(authState.token===old) authState.token=nw; }
  function finishRotation(old, nw){ swapSession(old,nw); const row=pendingRotation(old); if(row&&row.replacement===nw) drop(AUTH_ROT); }
  async function askSession(token){ const r=await HTTP.fetchApi("/entry/whoami",{ headers:{ "Authorization":"Bearer "+token } }); if(!r.ok) return null; const who=await r.json(); return who&&who.principal_id?who:null; }
  async function readSession(token, expect){
    if(!token) return null;
    let pending = pendingRotation(token);
    if(pending){ const rec=await askSession(pending.replacement); if(rec&&rec.principal_id===pending.principal_id){ finishRotation(token,pending.replacement); rec.session_token=pending.replacement; return rec; } }
    const who = await askSession(token); if(!who) return null;
    if(expect && who.principal_id!==expect) return null;
    if(who.session_rotation_required){
      pending = pending || saveRotation({ old:token, replacement:newSessionToken(), principal_id:who.principal_id });
      if(!pending||!pending.replacement){ who.session_token=token; return who; }
      let rr=null;
      try{ rr=await HTTP.fetchApi("/entry/session/rotate",{ method:"POST", headers:{ "Authorization":"Bearer "+token, "Content-Type":"application/json" }, body:JSON.stringify({replacement_token:pending.replacement}) }); }catch(e){}
      if(rr&&rr.ok){ const rot=await rr.json(); finishRotation(token,pending.replacement); token=pending.replacement; who.session_rotation_required=false; who.session_version=rot.session_version; }
      else { const done=await askSession(pending.replacement); if(done&&done.principal_id===who.principal_id){ finishRotation(token,pending.replacement); done.session_token=pending.replacement; return done; } }
      if(rr&&rr.status===404){ const nb=store(AUTH_KEY); if(!nb||nb===token) return null; return readSession(nb, who.principal_id); }
      if(rr&&rr.status===409){ drop(AUTH_ROT); }
    }
    who.session_token=token; return who;
  }
  function adopt(who){ authState.token=who.session_token||authState.token; authState.principal=who.principal_id; authState.assurance=who.assurance||0; authState.signed_in=!!who.signed_in; authState.providers=who.providers||[]; authState.name=(who.display_name||"").trim()||null; authState.avatar=safeProfileAvatar(who.avatar_url)||null; }

  /* Старт: только читаем существующий вход. Ничего не заводим. */
  async function bootIdentity(){
    const saved = store(AUTH_KEY);
    if(saved){ try{ const who=await readSession(saved); if(who&&who.principal_id){ authState.token=who.session_token||saved; adopt(who); } }catch(e){} }
    authState.ready=true; applyIdentity();
  }
  /* Лениво: анонимный вход под общим ключом — точь-в-точь как оболочка (шаг 3). */
  async function ensureSession(){
    if(window.FixarCommunity) await window.FixarCommunity.beforeSession();
    if(authState.token) return authState.token;
    const saved=store(AUTH_KEY);
    if(saved){ try{ const who=await readSession(saved); if(who&&who.principal_id){ authState.token=who.session_token||saved; adopt(who); return authState.token; } }catch(e){} }
    const me=await authFetch("POST","/entry/anon",{ label:"v2" });
    authState.token=me.token; authState.principal=me.principal_id; authState.assurance=me.assurance||0;
    put(AUTH_KEY, me.token);
    return authState.token;
  }
  let _providers=null;
  async function authProviders(){ if(_providers) return _providers; _providers=await authFetch("GET","/auth/providers"); return _providers; }

  async function startLogin(provider){
    /* Как в start.js (канонический новый экран): БЕЗ anon_token — это переход
       в существующую запись, а не неполное слияние. Токен для caller получаем
       лениво. Метку и адрес возврата кладём ДО ухода: без метки /auth/callback
       откажет (login CSRF), без адреса — вернёт на «/». */
    await ensureSession();
    const r = await authFetch("POST","/auth/start",{ provider, redirect_uri:AUTH_REDIRECT });
    try{ localStorage.setItem(AUTH_LOGIN_STATE, r.state); localStorage.setItem(AUTH_LOGIN_BACK, AUTH_BACK); }
    catch(e){ throw new Error("Браузер не даёт запомнить начатый вход (приватный режим?). Без этой проверки продолжать небезопасно."); }
    location.href = r.authorize_url || r.url;
  }
  async function logout(){
    try{ if(authState.token) await authFetch("POST","/entry/logout",{ token:authState.token }); }catch(e){}
    drop(AUTH_KEY); drop("fixar.start.token"); drop(AUTH_ROT);
    location.reload();
  }

  function applyIdentity(){
    [["acctav","acctnm"],["desktopacctav","desktopacctnm"]].forEach(ids=>{
      const av=document.getElementById(ids[0]),nm=document.getElementById(ids[1]);
      paintUserAvatar(av); if(nm)nm.textContent=meName();
    });
    const desktopMeta=document.getElementById("desktopacctmeta");
    if(desktopMeta)desktopMeta.textContent=authState.signed_in?"Личные настройки · уровень "+(authState.assurance||0):"Войти и сохранить дела";
    document.body.classList.toggle("guest-shell",!authState.signed_in);
    if(!authState.signed_in&&typeof closeNav==="function")closeNav();
    if(typeof renderSwitch==="function") renderSwitch();
    if(typeof renderFoot==="function") renderFoot();
    if(typeof loadRealCases==="function" && hasSession()){ loadRealCases(true).then(()=>{ if(typeof restoreLastActiveCase==="function"&&restoreLastActiveCase())return; if(typeof refreshCurrentView==="function") refreshCurrentView(); }); }
    loadCredits();
    maybeOpenFixarikFunnel();
    probeOwnerTools().then(()=>{ if(currentSpace==="Разработка" && typeof refreshCurrentView==="function") refreshCurrentView(); });
    flushInteractions();
  }

  function creditNumber(value){ return new Intl.NumberFormat("ru-RU").format(Number(value)||0); }
  function creditGiftAvailable(data){ return !!data && Number(data.gifts_count||0)<Number(data.gift_max_per_principal||0) && Number(data.gift_size||0)>0; }
  function renderCredits(){
    const nodes=[document.getElementById("sidecredits"),document.getElementById("mobilecredits")].filter(Boolean);
    nodes.forEach(node=>{
      node.hidden=!authState.signed_in||!authState.token||!authState.principal;
      if(node.hidden)return;
      node.textContent=creditState.loading?"кредиты …":creditState.data?("кредиты "+creditNumber(creditState.data.balance)):"кредиты —";
      node.title=creditState.data&&creditGiftAvailable(creditState.data)?("Стартовый подарок +"+creditNumber(creditState.data.gift_size)+" при первом платном действии"):"Открыть баланс кредитов";
      node.onclick=openCredits;
    });
  }
  async function loadCredits(force){
    if(!authState.signed_in||!authState.token||!authState.principal){ creditState={principal:null,loading:false,data:null,error:""}; renderCredits(); return; }
    if(creditState.loading||(!force&&creditState.principal===authState.principal&&creditState.data)){ renderCredits(); return; }
    creditState={principal:authState.principal,loading:true,data:creditState.principal===authState.principal?creditState.data:null,error:""}; renderCredits();
    try{ creditState.data=await authFetch("GET","/principals/"+encodeURIComponent(authState.principal)+"/credits"); }
    catch(error){ creditState.error=(error&&error.message)||"Баланс временно недоступен."; }
    creditState.loading=false; renderCredits();
  }
  function safePaymentUrl(value){
    try{ const url=new URL(String(value||"")); return url.protocol==="https:"?url.href:""; }
    catch(_){ return ""; }
  }
  function openCredits(){
    const data=creditState.data;
    if(!data){ toast(creditState.error||"Баланс загружается…"); loadCredits(true); return; }
    const gift=creditGiftAvailable(data)?'<p class="rc-note">До <b>'+creditNumber(data.gift_size)+'</b> стартовых кредитов сервер начислит при первом платном действии. Чтение баланса ничего не начисляет.</p>':'';
    const basic=Number(data.balance||0)<=0&&!creditGiftAvailable(data)?'<p class="rc-note">Кредиты закончились, но обслуживание продолжается в базовом режиме: младшая локальная модель и GigaChat, только если разрешения дела допускают российское облако.</p>':'';
    const topup=authState.signed_in?'<form id="credit-topup" class="pform"><h3>Пополнить</h3><div class="pf-row"><label>Количество кредитов<input name="credits" type="number" min="1000" step="100" value="1000" required inputmode="numeric"></label><label>Кто платит<select name="payer"><option value="person">Частное лицо — карта или СБП</option><option value="company">Организация или ИП</option></select></label></div><p class="rc-hint">1000 кредитов стоят 100 ₽. Для кассового чека в аккаунте должны быть почта или телефон.</p><div class="cta-row"><button class="btn primary" type="submit">Получить ссылку на оплату</button></div><div class="rc-note" id="credit-topup-result" aria-live="polite" hidden></div></form>':'<div class="cta-row"><button class="btn primary" id="credit-signin" type="button">Войти для пополнения</button></div>';
    modalOpen("Кредиты",'<p class="lead">Текущий остаток: <b>'+creditNumber(data.balance)+'</b></p>'+gift+basic+
      '<div class="prow"><span>Подарочные</span><b>'+creditNumber(data.gift_balance)+'</b></div><div class="prow"><span>Заработанные</span><b>'+creditNumber(data.earned_balance)+'</b></div><div class="prow"><span>Купленные</span><b>'+creditNumber(data.paid_balance)+'</b></div>'+topup,body=>{
      const signin=body.querySelector("#credit-signin"); if(signin) signin.onclick=()=>{ modalClose(); openAccount(); };
      const form=body.querySelector("#credit-topup"); if(!form)return;
      form.onsubmit=async event=>{
        event.preventDefault();
        const button=form.querySelector("button[type=submit]"),result=form.querySelector("#credit-topup-result"),credits=parseInt(form.credits.value,10);
        result.hidden=false;
        if(!(credits>=1000)){ result.textContent="Минимальное пополнение — 1000 кредитов."; form.credits.focus(); return; }
        button.disabled=true; button.textContent="Выставляю счёт…"; result.textContent="Связываюсь с кассой банка…";
        try{
          const answer=await authFetch("POST","/credits/topup",{credits,payer:form.payer.value});
          const paymentUrl=safePaymentUrl(answer.payment_url||answer.qr_payload);
          result.innerHTML='<b>Счёт выставлен на '+creditNumber(answer.credits)+' кредитов · '+esc(answer.roubles)+' ₽.</b>'+(paymentUrl?'<div class="cta-row"><a class="btn primary" target="_blank" rel="noopener" href="'+attr(paymentUrl)+'">Перейти к оплате</a></div>':'<p>Банк не вернул безопасную ссылку. Не переводите деньги вручную.</p>');
        }catch(error){ result.textContent="Пополнить не вышло: "+((error&&error.message)||"касса временно недоступна"); }
        finally{ button.disabled=false; button.textContent="Получить ссылку на оплату"; }
      };
    });
  }

  async function probeOwnerTools(){
    if(!authState.token||!authState.principal){ ownerTools={principal:null,checked:true,allowed:false,checking:false}; return; }
    if(ownerTools.checking||(ownerTools.checked&&ownerTools.principal===authState.principal))return;
    ownerTools={principal:authState.principal,checked:false,allowed:false,checking:true};
    try{ const response=await authFetch("GET","/ops/owner/settings"); ownerTools.allowed=!!(response&&response.settings); }
    catch(_){ ownerTools.allowed=false; }
    ownerTools.checked=true; ownerTools.checking=false;
  }

  /* ── Лист входа: реальные кнопки от /auth/providers, реальный /auth/start ── */
  let _sheet=null, _sheetReturn=null;
  function sheetEl(){
    if(_sheet) return _sheet;
    _sheet=document.createElement("div"); _sheet.className="sheet"; _sheet.setAttribute("role","dialog"); _sheet.setAttribute("aria-modal","true"); _sheet.setAttribute("aria-label","Аккаунт");
    _sheet.innerHTML='<div class="sheet-bg" data-x></div><div class="sheet-card" role="document"><button class="sheet-x" data-x aria-label="Закрыть">✕</button><div id="sheetbody"></div></div>';
    document.body.appendChild(_sheet);
    _sheet.addEventListener("click", e=>{ if(e.target.hasAttribute("data-x")) closeAccount(); });
    document.addEventListener("keydown", e=>{ if(!_sheet.classList.contains("open")) return;
      if(e.key==="Escape"){ e.preventDefault(); closeAccount(); return; }
      if(e.key==="Tab"){ const f=Array.from(_sheet.querySelectorAll('button,[href],input,[tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent!==null); if(!f.length) return; const a=f[0],b=f[f.length-1];
        if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); b.focus(); } else if(!e.shiftKey&&document.activeElement===b){ e.preventDefault(); a.focus(); } } });
    return _sheet;
  }
  function closeAccount(){ if(!_sheet) return; _sheet.classList.remove("open"); document.body.style.overflow=""; if(_sheetReturn&&_sheetReturn.focus) _sheetReturn.focus(); }
  async function openAccount(ev){
    _sheetReturn = (ev&&ev.currentTarget)||document.activeElement;
    const s=sheetEl(); const body=s.querySelector("#sheetbody");
    s.classList.add("open"); document.body.style.overflow="hidden";
    if(authState.signed_in){
      const via=(authState.providers||[]).map(p=>'<span class="prov-chip">'+esc((BRAND[p]||{}).t||p)+'</span>').join("");
      body.innerHTML='<h2>'+esc(meName())+'</h2><p class="lead">Вы вошли — это тот же аккаунт и те же дела во всех версиях ФиксАР.</p>'+
        (via?'<div class="prov-chips">'+via+'</div>':'')+
        '<span class="assure">Уровень подтверждения: '+(authState.assurance||0)+'</span>'+
        '<button class="account-personal-link" id="doAppearance" type="button" data-open-appearance><span class="account-appearance-orb" aria-hidden="true"><i></i></span><span><b>Оформление и настроение</b><small>Цвет, фон и личные настройки</small></span><span aria-hidden="true">›</span></button>'+
        '<button class="btn-out" id="doLogout">Выйти из аккаунта</button>';
      const appearance=body.querySelector("#doAppearance"),lo=body.querySelector("#doLogout");
      appearance.onclick=()=>{ closeAccount(); if(typeof window.go==="function"&&window.FixarV2AppearanceRoute)window.go(window.FixarV2AppearanceRoute); };
      appearance.focus();
      lo.onclick=()=>{ lo.disabled=true; lo.textContent="Выхожу…"; logout(); };
      return;
    }
    body.innerHTML='<h2>Войти в ФиксАР</h2><p class="lead">Вход привязывает канал к вашему субъекту: дела и переписка не потеряются. Пока вы гость — можно смотреть, но не подписывать обязательства и не звать людей в дело.</p><div id="oauths"><span class="sheet-note">Загружаю способы входа…</span></div>';
    let cfg=null; try{ cfg=await authProviders(); }catch(e){ body.querySelector("#oauths").innerHTML='<span class="sheet-note">Способы входа сейчас недоступны. Разговор при этом идёт — дело уже ваше.</span>'; return; }
    if(!s.classList.contains("open")) return;
    const ready=Object.keys(cfg.oauth||{}).filter(k=>cfg.oauth[k]&&BRAND[k]);
    const wrap=body.querySelector("#oauths"); wrap.innerHTML="";
    ready.forEach((k,i)=>{ const b=document.createElement("button"); b.className="oauth"; b.type="button";
      b.innerHTML='<i class="'+esc((BRAND[k]||{}).cls||"")+'">'+esc(((BRAND[k]||{}).t||k)[0])+'</i><span>Войти через '+esc((BRAND[k]||{}).t||k)+'</span>';
      b.onclick=async()=>{ Array.from(wrap.querySelectorAll("button")).forEach(x=>x.disabled=true); b.querySelector("span").textContent="минуту…";
        try{ await startLogin(k); }catch(e){ Array.from(wrap.querySelectorAll("button")).forEach(x=>x.disabled=false); b.querySelector("span").textContent="Войти через "+((BRAND[k]||{}).t||k); toast((e&&e.message)||"Вход сейчас не работает."); } };
      wrap.appendChild(b); if(i===0) b.focus(); });
    const other=[]; if(cfg.email) other.push("почта"); if(cfg.telegram) other.push("Телеграм"); if(cfg.phone) other.push("телефон"); if(cfg.max) other.push("MAX");
    if(other.length) wrap.insertAdjacentHTML("beforeend",'<a class="sheet-other" href="/start/">Другие способы: '+esc(other.join(", "))+' →</a>');
    if(!ready.length&&!other.length) wrap.innerHTML='<span class="sheet-note">Способы входа ещё не настроены на сервере.</span>';
  }
  function toast(msg){ const t=document.createElement("div"); t.className="auth-toast"; t.setAttribute("role","status"); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>{ if(t.parentNode) t.parentNode.removeChild(t); }, 5200); }

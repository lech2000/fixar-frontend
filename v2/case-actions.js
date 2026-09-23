"use strict";

// Модальные действия настоящего дела. Загружается после cases.js и до bootstrap.js.
function directMatchWhen(candidate){
  const free=candidate&&candidate.free||{},from=free.from?new Date(free.from):null,to=free.to?new Date(free.to):null;
  if(!from||isNaN(from.getTime()))return "Срок не указан";
  const fmt=value=>value.toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  return fmt(from)+(to&&!isNaN(to.getTime())?" — "+fmt(to):"");
}
function directMatchPrice(candidate){
  const offer=candidate&&candidate.offer||{},value=offer.price;
  if(value===undefined||value===null||value==="")return "Цена договорная";
  return "Цена из публикации: "+String(value)+(offer.currency?" "+String(offer.currency):"");
}
function directMatchResults(result){
  const candidates=Array.isArray(result&&result.candidates)?result.candidates:[];
  const head='<div class="case-form-note"><span>◎</span><p><b>'+(result&&result.nobody_found?'Подходящих публикаций пока нет.':'Подбор готов.')+'</b><br>'+esc(result&&result.reply||"")+'</p></div>';
  if(!candidates.length)return head;
  return head+'<div class="case-choice-group">'+candidates.map(candidate=>{ const why=(candidate.why||[]).join("; "),warning=(candidate.unverified||[])[0]||"Исполнитель ещё не подтвердил заказ"; return '<article class="case-choice"><span><b>'+esc(candidate.title||"Свободное окно")+'</b><small>'+esc(directMatchWhen(candidate))+' · '+esc(directMatchPrice(candidate))+'</small><small>'+(why?'Совпало: '+esc(why)+'. ':'')+esc(warning)+'.</small></span></article>'; }).join("")+'</div><p class="rc-hint">Подбор показывает опубликованные окна. Заявка исполнителю и бронирование — отдельный подтверждаемый шаг.</p>';
}
function openDirectProviderMatch(){
  const c=activeReal.c,request=c.goal||c.title||"";
  modalOpen("Специалисты без платного разбора",
    '<p class="lead">Фиксар сразу проверит опубликованные свободные окна по словам задачи. Модель не вызывается, AI-run не создаётся, кредиты не списываются.</p><form id="directmatchf" class="pform case-modern-form"><label><span>Что требуется</span><textarea name="request" required minlength="4" maxlength="2000" rows="3">'+esc(request)+'</textarea></label><button class="btn primary case-form-submit" type="submit">Подобрать специалистов</button></form><div data-direct-match-results aria-live="polite"></div>',
    body=>{ const form=body.querySelector("#directmatchf"),button=form.querySelector('button[type="submit"]'),output=body.querySelector("[data-direct-match-results]"); form.onsubmit=async event=>{ event.preventDefault(); button.disabled=true;button.textContent="Ищу опубликованные окна…";output.innerHTML='<p class="rc-note">Поиск идёт по направлению этого дела и словам задачи.</p>'; try{ const result=await authFetch("POST","/dialog/providers/match",{case_id:c.id,request:(form.request.value||"").trim()}); activeReal.reply=result.reply||""; output.innerHTML=directMatchResults(result); button.textContent="Подобрать заново"; }catch(error){ output.innerHTML='<p class="case-attention">'+esc((error&&error.message)||"Подбор сейчас недоступен.")+'</p>'; button.textContent="Повторить подбор"; }finally{ button.disabled=false; } }; });
}
function openWorkCommission(offer){
  const c=activeReal.c,price=String(offer.price).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" "+(offer.currency||"CREDITS"),already=!!c.tariff_id;
  modalOpen(already?"Продолжить запуск":"Подтвердить работу",
    '<p class="lead"><b>'+esc(offer.title)+' — '+esc(price)+'</b></p><p>'+esc(offer.deliverable)+'</p><div class="case-consent-guardrails"><div><span>1</span><p><b>Одно существующее дело</b><small>Нового дубля не появится.</small></p></div><div><span>2</span><p><b>Фиксированная цена</b><small>'+(offer.charge_on==="acceptance"?'Списание после вашей приёмки.':'Списание при подтверждении.')+'</small></p></div><div><span>3</span><p><b>Результат в деле</b><small>Агент работает по закреплённому плану; опасные действия подтверждаются отдельно.</small></p></div></div><p class="rc-hint"><b>Не входит:</b> '+esc((offer.excludes||[]).join("; "))+'.</p>'+
    '<form id="commissionf" class="pform case-modern-form"><label class="case-consent-check"><input name="consent" type="checkbox" required><span><b>'+(already?'Подтверждаю продолжение запуска':'Подтверждаю работу за '+esc(price))+'</b><small>Это отдельное согласие на платную работу, не подтверждение создания дела.</small></span></label><button class="btn primary case-form-submit" type="submit">'+(already?'Продолжить запуск':'Списать и запустить')+'</button></form><div class="case-form-note"><span>→</span><p><b>Разбор не нужен?</b><br>Можно сразу посмотреть опубликованных специалистов — бесплатно и без запуска модели.</p></div><button class="btn case-form-submit" type="button" data-direct-match>Сразу подобрать специалистов</button><div class="rc-hint" data-commission-status aria-live="polite"></div>',
    body=>{ const form=body.querySelector("#commissionf"),direct=body.querySelector("[data-direct-match]"),status=body.querySelector("[data-commission-status]"); direct.onclick=()=>{modalClose();openDirectProviderMatch();}; form.onsubmit=async event=>{ event.preventDefault(); const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent=already?"Продолжаю…":"Запускаю…";status.textContent="";
      try{ const result=await authFetch("POST","/dialog/work/commission",{case_id:c.id,domain:offer.domain,tariff_id:offer.id,request:c.goal||c.title||offer.title,confirmed:true}); modalClose(); realTab="План"; await renderRealCase(c.id); toast((result.charged?"Списано "+price+". ":"")+"Агент начал работу в этом деле."); }
      catch(error){ button.disabled=false;button.textContent=already?"Продолжить запуск":"Списать и запустить";status.textContent=error&&error.status===402?"Кредитов недостаточно. Прямой подбор ниже остаётся доступен без списания.":((error&&error.message)||"Не удалось запустить работу."); if(error&&error.status===402)direct.focus(); else toast(status.textContent); }
    }; });
}
function openPatchDecision(patchId,approve){
  const action=approve?"подтвердить":"отклонить";
  modalOpen((approve?"Подтвердить":"Отклонить")+" изменение",
    '<p class="lead">Вы собираетесь '+action+' предложение агента. Это решение будет записано в журнал дела; после подтверждения связанный шаг продолжится или завершится.</p><div class="cta-row"><button class="btn '+(approve?"primary":"")+'" id="patchdecision">'+(approve?'Подтвердить изменение':'Отклонить изменение')+'</button></div>',
    body=>{ const btn=body.querySelector("#patchdecision"); btn.focus(); btn.onclick=async()=>{ btn.disabled=true; btn.textContent="Сохраняю…";
      try{ await authFetch("POST","/patches/"+encodeURIComponent(patchId)+(approve?"/approve":"/reject"),{}); const caseId=activeReal.c.id; modalClose(); renderRealCase(caseId); }
      catch(err){ btn.disabled=false; btn.textContent=approve?"Подтвердить изменение":"Отклонить изменение"; toast((err&&err.message)||"Не удалось сохранить решение."); } }; });
}

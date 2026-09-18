(function(){
  "use strict";
  var ticket=new URLSearchParams(location.search).get("ticket")||"";
  var button=document.getElementById("openApp"),status=document.getElementById("status");
  if(!/^[A-Za-z0-9_-]{43}$/.test(ticket)){
    button.setAttribute("aria-disabled","true");
    status.textContent="Ссылка повреждена. Вернитесь в настройки и создайте новую.";
    return;
  }
  button.href="fixar://pair?ticket="+encodeURIComponent(ticket);
  status.textContent="Ссылка готова. Она одноразовая и скоро истечёт.";
}());

/* Окно входа в школьный дневник с телефона.
 *
 * БИЛЕТ ЖИВЁТ ТОЛЬКО В ПАМЯТИ ВКЛАДКИ. Это право управлять чужим браузером;
 * в localStorage он пережил бы вкладку и остался бы на общем телефоне.
 *
 * КАДР — ЭТО КАРТИНКА, А НЕ СТРАНИЦА. Чужой разметки мы не вставляем: со
 * страницы входа к нам приходит только JPEG, а обратно уходят координаты
 * нажатия и набранный текст.
 */
(function () {
  "use strict";

  var API = "https://api.agrigate.pro";
  var КЛЮЧ_ОБОЛОЧКИ = "fixar.token";
  var ЧАСТОТА_МС = 1500;

  var состояние = { token: "", ticket: "", ширина: 390, высота: 844, тик: 0 };

  var э = {
    весть: document.getElementById("весть"),
    открыть: document.getElementById("открыть"),
    начало: document.getElementById("начало"),
    рабочее: document.getElementById("рабочее"),
    окно: document.getElementById("окно"),
    набор: document.getElementById("набор"),
    ввести: document.getElementById("ввести"),
    энтер: document.getElementById("энтер"),
    назад: document.getElementById("назад"),
    готово: document.getElementById("готово"),
    закрыть: document.getElementById("закрыть"),
    состояние: document.getElementById("состояние"),
    итог: document.getElementById("итог")
  };

  function токен() {
    try { return localStorage.getItem(КЛЮЧ_ОБОЛОЧКИ) || ""; } catch (e) { return ""; }
  }

  function сказать(текст, беда) {
    э.состояние.textContent = текст;
    э.состояние.className = беда ? "тихо беда" : "тихо";
  }

  function спросить(путь, тело) {
    return fetch(API + путь, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + состояние.token
      },
      body: JSON.stringify(тело || {})
    }).then(function (ответ) {
      return ответ.json().catch(function () { return {}; }).then(function (д) {
        if (!ответ.ok) {
          /* Отказ двери бывает и строкой, и объектом: у неё в `detail` лежит
             {message, reason, …}, у проверки тела — список полей. Показать
             объект как есть — это «[object Object]» на экране человека. */
          var д1 = д.detail;
          var слова = typeof д1 === "string" ? д1
            : (д1 && typeof д1.message === "string") ? д1.message
            : ("не получилось (ошибка " + ответ.status + ")");
          var беда = new Error(слова);
          беда.статус = ответ.status;
          throw беда;
        }
        return д;
      });
    });
  }

  function показать(кадр) {
    if (!кадр || !кадр.jpeg_b64) { return; }
    состояние.ширина = кадр.width || состояние.ширина;
    состояние.высота = кадр.height || состояние.высота;
    э.окно.src = "data:image/jpeg;base64," + кадр.jpeg_b64;
  }

  function кадр() {
    if (!состояние.ticket) { return Promise.resolve(); }
    return спросить("/browser/login-window/frame", {
      ticket: состояние.ticket
    }).then(показать).catch(function (беда) {
      if (беда.статус === 404 || беда.статус === 403) {
        остановить();
        сказать("Окно закрылось или кончилось. Откройте новое.", true);
      }
    });
  }

  function запустить() {
    состояние.тик = setInterval(кадр, ЧАСТОТА_МС);
  }

  function остановить() {
    if (состояние.тик) { clearInterval(состояние.тик); состояние.тик = 0; }
    состояние.ticket = "";
  }

  function ход(тело) {
    тело.ticket = состояние.ticket;
    return спросить("/browser/login-window/input", тело)
      .then(показать)
      .catch(function (беда) { сказать(беда.message, true); });
  }

  э.открыть.addEventListener("click", function () {
    э.открыть.disabled = true;
    сказать("Открываем окно…");
    спросить("/browser/login-window", {}).then(function (кадр0) {
      состояние.ticket = кадр0.ticket;
      э.начало.hidden = true;
      э.рабочее.hidden = false;
      показать(кадр0);
      запустить();
      сказать("Тапайте прямо по картинке — это живая страница.");
    }).catch(function (беда) {
      э.открыть.disabled = false;
      э.весть.textContent = беда.message;
      э.весть.className = "беда";
    });
  });

  э.окно.addEventListener("click", function (событие) {
    var рамка = э.окно.getBoundingClientRect();
    if (!рамка.width) { return; }
    var x = Math.round((событие.clientX - рамка.left) * состояние.ширина / рамка.width);
    var y = Math.round((событие.clientY - рамка.top) * состояние.высота / рамка.height);
    ход({ kind: "click", x: x, y: y });
  });

  э.ввести.addEventListener("click", function () {
    var текст = э.набор.value;
    if (!текст) { return; }
    // Поле чистим СРАЗУ: набранное — это чужой пароль, и держать его в
    // разметке дольше нужного незачем.
    э.набор.value = "";
    ход({ kind: "type", text: текст });
  });

  э.энтер.addEventListener("click", function () { ход({ kind: "key", key: "Enter" }); });
  э.назад.addEventListener("click", function () { ход({ kind: "back" }); });

  э.готово.addEventListener("click", function () {
    э.готово.disabled = true;
    сказать("Забираем ключи…");
    спросить("/browser/login-window/finish", { ticket: состояние.ticket })
      .then(function (итог) {
        остановить();
        э.рабочее.hidden = true;
        э.итог.hidden = false;
        э.итог.innerHTML = "<p>Ключи дневника приняты. У нас лежат только они:</p>"
          + "<p><code>" + (итог.cookie_names || []).join(", ") + "</code><br>"
          + "<code>" + (итог.origins || []).join(", ") + "</code></p>"
          + ((итог.resumed_loops || []).length
            ? "<p>Выгрузка дневника, ждавшая входа, снова включена — "
              + "первая проверка пройдёт в ближайшие минуты.</p>"
            : "")
          + "<p class=\"тихо\">Отозвать их можно в любой момент — и тогда "
          + "дневник перестанет читаться до следующего входа.</p>";
      })
      .catch(function (беда) {
        э.готово.disabled = false;
        сказать(беда.статус === 409
          ? "Вход ещё не завершён: ключей дневника пока нет. Доведите вход и нажмите снова."
          : беда.message, true);
      });
  });

  э.закрыть.addEventListener("click", function () {
    var билет = состояние.ticket;
    остановить();
    э.рабочее.hidden = true;
    э.начало.hidden = false;
    э.открыть.disabled = false;
    спросить("/browser/login-window/close", { ticket: билет }).catch(function () {});
  });

  состояние.token = токен();
  if (состояние.token) {
    э.весть.textContent = "Вы вошли в Фиксар. Можно открывать окно дневника.";
    э.открыть.disabled = false;
  } else {
    э.весть.innerHTML = "Сначала войдите в Фиксар: <a href=\"/vhod/\">страница входа</a>.";
  }
})();

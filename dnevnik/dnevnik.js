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

  var состояние = {
    token: "", ticket: "", ширина: 390, высота: 844, тик: 0,
    поле: "", отправлено: "", очередь: Promise.resolve(), занято: false
  };

  var э = {
    весть: document.getElementById("весть"),
    открыть: document.getElementById("открыть"),
    начало: document.getElementById("начало"),
    рабочее: document.getElementById("рабочее"),
    браузер: document.getElementById("браузер"),
    окно: document.getElementById("окно"),
    прямойВвод: document.getElementById("прямойВвод"),
    энтер: document.getElementById("энтер"),
    назад: document.getElementById("назад"),
    ниже: document.getElementById("ниже"),
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
    размерБраузера();
    показатьПоле(кадр.focus || null);
  }

  function размерБраузера() {
    var доступнаяВысота = Math.max(320, window.innerHeight - 105);
    var ширина = Math.min(window.innerWidth, доступнаяВысота * состояние.ширина / состояние.высота);
    э.браузер.style.width = Math.round(ширина) + "px";
    э.браузер.style.height = Math.round(ширина * состояние.высота / состояние.ширина) + "px";
  }

  function показатьПоле(поле) {
    var ввод = э.прямойВвод;
    if (!поле) {
      состояние.поле = "";
      состояние.отправлено = "";
      ввод.value = "";
      ввод.hidden = true;
      return;
    }
    var ключ = [поле.x, поле.y, поле.width, поле.height, поле.type].join(":");
    var новый = состояние.поле !== ключ;
    состояние.поле = ключ;
    ввод.type = поле.type === "password" ? "password" : "text";
    ввод.autocomplete = поле.autocomplete || (ввод.type === "password" ? "current-password" : "username");
    ввод.style.left = (100 * поле.x / состояние.ширина) + "%";
    ввод.style.top = (100 * поле.y / состояние.высота) + "%";
    ввод.style.width = (100 * поле.width / состояние.ширина) + "%";
    ввод.style.height = (100 * поле.height / состояние.высота) + "%";
    ввод.hidden = false;
    if (новый) {
      ввод.value = "";
      состояние.отправлено = "";
      ввод.focus({ preventScroll: true });
    }
  }

  function кадр() {
    if (!состояние.ticket || состояние.занято || document.activeElement === э.прямойВвод) {
      return Promise.resolve();
    }
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
    состояние.очередь = состояние.очередь.then(function () {
      состояние.занято = true;
      return спросить("/browser/login-window/input", тело)
        .then(показать)
        .catch(function (беда) { сказать(беда.message, true); })
        .finally(function () { состояние.занято = false; });
    });
    return состояние.очередь;
  }

  function синхронизироватьВвод() {
    var новое = э.прямойВвод.value;
    var старое = состояние.отправлено;
    if (новое === старое) { return состояние.очередь; }
    if (новое.indexOf(старое) === 0) {
      состояние.отправлено = новое;
      return ход({ kind: "type", text: новое.slice(старое.length) });
    }
    if (старое.indexOf(новое) === 0) {
      состояние.отправлено = новое;
      var сколько = старое.length - новое.length;
      while (сколько > 0) { ход({ kind: "key", key: "Backspace" }); сколько -= 1; }
      return состояние.очередь;
    }
    состояние.отправлено = новое;
    ход({ kind: "key", key: "Control+A" });
    return ход({ kind: "type", text: новое });
  }

  э.открыть.addEventListener("click", function () {
    э.открыть.disabled = true;
    сказать("Открываем окно…");
    var ширина = Math.max(320, Math.min(1200, Math.round(window.innerWidth)));
    var высота = Math.max(480, Math.min(1200, Math.round(window.innerHeight - 96)));
    спросить("/browser/login-window", { width: ширина, height: высота }).then(function (кадр0) {
      состояние.ticket = кадр0.ticket;
      э.начало.hidden = true;
      э.рабочее.hidden = false;
      document.body.classList.add("вход-идёт");
      показать(кадр0);
      запустить();
      сказать("Нажимайте и вводите данные прямо на странице.");
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

  var касание = null;
  э.окно.addEventListener("touchstart", function (событие) {
    var точка = событие.touches && событие.touches[0];
    касание = точка ? точка.clientY : null;
  }, { passive: true });
  э.окно.addEventListener("touchend", function (событие) {
    var точка = событие.changedTouches && событие.changedTouches[0];
    if (касание === null || !точка) { return; }
    var сдвиг = касание - точка.clientY;
    касание = null;
    if (Math.abs(сдвиг) < 35) { return; }
    событие.preventDefault();
    ход({ kind: "scroll", y: Math.round(сдвиг * 2) });
  }, { passive: false });

  э.прямойВвод.addEventListener("input", синхронизироватьВвод);
  э.прямойВвод.addEventListener("keydown", function (событие) {
    if (событие.key !== "Enter") { return; }
    событие.preventDefault();
    синхронизироватьВвод().then(function () { return ход({ kind: "key", key: "Enter" }); });
  });

  э.энтер.addEventListener("click", function () { ход({ kind: "key", key: "Enter" }); });
  э.назад.addEventListener("click", function () { ход({ kind: "back" }); });
  э.ниже.addEventListener("click", function () { ход({ kind: "key", key: "PageDown" }); });

  э.готово.addEventListener("click", function () {
    э.готово.disabled = true;
    сказать("Забираем ключи…");
    спросить("/browser/login-window/finish", { ticket: состояние.ticket })
      .then(function (итог) {
        остановить();
        document.body.classList.remove("вход-идёт");
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
    document.body.classList.remove("вход-идёт");
    э.открыть.disabled = false;
    спросить("/browser/login-window/close", { ticket: билет }).catch(function () {});
  });

  window.addEventListener("resize", размерБраузера);

  состояние.token = токен();
  if (состояние.token) {
    э.весть.textContent = "Вы вошли в Фиксар. Можно открывать окно дневника.";
    э.открыть.disabled = false;
  } else {
    э.весть.innerHTML = "Сначала войдите в Фиксар: <a href=\"/vhod/\">страница входа</a>.";
  }
})();

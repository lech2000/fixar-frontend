/* ФиксАР — единая конфигурация браузерной оболочки.
 *
 * Этот файл загружается до экранов и не знает ни о DOM, ни о сессии. Адреса
 * нельзя размазывать по app.js/start.js: при смене двери одна забытая строка
 * превращается в частично работающий сайт. Объект заморожен, чтобы функция из
 * чужого пака не могла незаметно перенаправить запросы или OAuth-возврат.
 */
(function (root) {
  "use strict";

  var core = root.FixarCore || {};
  Object.defineProperty(core, "config", {
    value: Object.freeze({
      apiOrigin: "https://api.agrigate.pro",
      siteOrigin: "https://agrigate.pro",
      oauthRedirect: "https://agrigate.pro/auth/callback"
    }),
    enumerable: true,
    writable: false,
    configurable: false
  });
  root.FixarCore = core;
})(window);

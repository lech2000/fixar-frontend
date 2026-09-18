/* ФиксАР — транспорт до публичного шлюза.
 *
 * Здесь только граница сети: построить безопасный адрес и вызвать fetch.
 * Разбор предметных отказов, обновление сессии и решение о повторе остаются в
 * оболочке — это поведение продукта, а не свойство HTTP.
 */
(function (root) {
  "use strict";

  var core = root.FixarCore;
  if (!core || !core.config) {
    throw new Error("FixarCore.config must be loaded before FixarCore.http");
  }

  function apiUrl(path) {
    if (typeof path !== "string" || path.charAt(0) !== "/" ||
        path.indexOf("//") === 0) {
      throw new TypeError("API path must start with one slash");
    }
    return core.config.apiOrigin + path;
  }

  function fetchApi(path, options) {
    return root.fetch(apiUrl(path), options);
  }

  Object.defineProperty(core, "http", {
    value: Object.freeze({
      apiUrl: apiUrl,
      fetchApi: fetchApi
    }),
    enumerable: true,
    writable: false,
    configurable: false
  });
  // Пространство имён намеренно остаётся расширяемым: следующие небольшие
  // модули смогут зарегистрироваться рядом с http. Уже опубликованные границы
  // config/http при этом заменить нельзя.
  Object.defineProperty(root, "FixarCore", {
    value: core,
    enumerable: true,
    writable: false,
    configurable: false
  });
})(window);

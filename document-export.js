/* ФиксАР — чистая сборка переносимого документа.
 *
 * DOCX собирается здесь, в браузере, без отправки текста третьей стороне и
 * без зависимости от CDN. Архив намеренно без сжатия: для обычного текста
 * разница мала, зато формат можно проверить и воспроизвести без ещё одной
 * библиотеки. Функции не знают DOM и поэтому проверяются отдельно в node.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FixARDocumentExport = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function безопасноеИмя(имя) {
    var готово = String(имя || "Документ")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ").trim().replace(/[. ]+$/g, "");
    return (готово || "Документ").slice(0, 96);
  }

  function xml(значение) {
    return String(значение == null ? "" : значение)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function абзац(текст, стиль) {
    if (!текст) return "<w:p/>";
    return "<w:p>" + (стиль
      ? '<w:pPr><w:pStyle w:val="' + стиль + '"/></w:pPr>' : "") +
      '<w:r><w:t xml:space="preserve">' + xml(текст) + "</w:t></w:r></w:p>";
  }

  function частиDocx(заголовок, текст) {
    var строки = String(текст || "").replace(/\r\n?/g, "\n").split("\n");
    var тело = абзац(String(заголовок || "Документ"), "Title") +
      строки.map(function (строка) { return абзац(строка, ""); }).join("");
    return {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '</Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
      "word/_rels/document.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
      "word/document.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' + тело +
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>' +
        '</w:body></w:document>',
      "word/styles.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>' +
        '<w:rPr><w:rFonts w:ascii="PT Sans" w:hAnsi="PT Sans" w:cs="PT Sans"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/>' +
        '<w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>' +
        '</w:styles>'
    };
  }

  var таблицаCrc = null;
  function crc32(байты) {
    if (!таблицаCrc) {
      таблицаCrc = [];
      for (var n = 0; n < 256; n += 1) {
        var c = n;
        for (var k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        таблицаCrc[n] = c >>> 0;
      }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < байты.length; i += 1) crc = таблицаCrc[(crc ^ байты[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(n) { return [n & 255, (n >>> 8) & 255]; }
  function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
  function соединить(куски) {
    var длина = куски.reduce(function (n, кусок) { return n + кусок.length; }, 0);
    var всё = new Uint8Array(длина), смещение = 0;
    куски.forEach(function (кусок) { всё.set(кусок, смещение); смещение += кусок.length; });
    return всё;
  }
  function байты(значение) {
    return значение instanceof Uint8Array ? значение : new TextEncoder().encode(String(значение));
  }

  function zip(файлы, дата) {
    var локальные = [], центральные = [], смещение = 0;
    var d = дата instanceof Date ? дата : new Date();
    var время = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    var день = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    Object.keys(файлы).forEach(function (имя) {
      var название = байты(имя), данные = байты(файлы[имя]), crc = crc32(данные);
      var местнаяШапка = new Uint8Array([].concat(
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(время), u16(день),
        u32(crc), u32(данные.length), u32(данные.length), u16(название.length), u16(0)));
      var запись = соединить([местнаяШапка, название, данные]);
      локальные.push(запись);
      var главнаяШапка = new Uint8Array([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(время), u16(день),
        u32(crc), u32(данные.length), u32(данные.length), u16(название.length),
        u16(0), u16(0), u16(0), u16(0), u32(0), u32(смещение)));
      центральные.push(соединить([главнаяШапка, название]));
      смещение += запись.length;
    });
    var центр = соединить(центральные);
    var конец = new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0), u16(центральные.length), u16(центральные.length),
      u32(центр.length), u32(смещение), u16(0)));
    return соединить(локальные.concat([центр, конец]));
  }

  function docx(заголовок, текст, дата) { return zip(частиDocx(заголовок, текст), дата); }

  return {
    safeFilename: безопасноеИмя,
    docxParts: частиDocx,
    makeDocx: docx,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };
});

/* ФиксАР — светлый редактируемый холст первого экрана.
 *
 * Самостоятельный текст остаётся в памяти вкладки, пока человек не сохранит
 * файл; проект из дела получает явную серверную кнопку от оболочки дела.
 * Содержание не кладётся в localStorage: общий компьютер не должен вернуть
 * следующему человеку чужой договор. PDF и DOCX собираются на устройстве.
 */
(function () {
  "use strict";

  var box = document.getElementById("documentcanvas");
  if (!box) return;
  var title = document.getElementById("doctitle");
  var body = document.getElementById("docbody");
  var status = document.getElementById("docstatus");
  var kind = document.getElementById("dockind");
  var meta = document.getElementById("docmeta");
  var note = document.getElementById("docnote");
  var back = document.getElementById("docback");
  var save = document.getElementById("docsave");
  var more = document.getElementById("docmore");
  var actions = document.getElementById("docactions");
  var pdf = document.getElementById("docpdf");
  var word = document.getElementById("docword");
  var T = (window.ЯЗЫК && window.ЯЗЫК.T) || function (s) { return s; };
  var dirty = false, pdfClass = null, pdfFont = null, busy = false;
  var current = {sourceKey:"", onSave:null, actions:[], readOnly:false, loaded:false};

  function message(ru, en) {
    status.textContent = (window.ЯЗЫК && window.ЯЗЫК.английский && en) ? en : ru;
  }
  function messageValue(value) {
    if (!value) return;
    if (typeof value === "object") {
      message(String(value.ru || value.en || ""), String(value.en || value.ru || ""));
      return;
    }
    status.textContent = String(value);
  }
  function resize() {
    body.style.height = "auto";
    body.style.height = Math.max(860, body.scrollHeight) + "px";
  }
  function markDirty() {
    dirty = true;
    if (current.onSave) message("Правка не сохранена в дело", "Revision not saved to the case");
    else message("Не сохранено в файл", "Not saved to a file");
    resize();
  }
  function setBusy(value) {
    busy = value;
    pdf.disabled = word.disabled = value;
    save.disabled = value;
    Array.prototype.forEach.call(actions.querySelectorAll("button"), function (button) {
      button.disabled = value || button.dataset.done === "1";
    });
  }
  function screen(name, focus) {
    var next = name === "document" ? "document" : "dialog";
    document.body.setAttribute("data-fixar-screen", next);
    if (next === "document") {
      box.hidden = false;
      requestAnimationFrame(function () { if (focus !== false) (title.value ? body : title).focus(); });
    } else if (focus !== false) {
      var say = document.getElementById("say");
      if (say) requestAnimationFrame(function () { say.focus(); });
    }
  }

  function renderActions(items) {
    actions.textContent = "";
    items = Array.isArray(items) ? items : [];
    more.hidden = !items.length;
    more.open = false;
    items.forEach(function (item) {
      if (!item || typeof item.run !== "function") return;
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = String(item.label || T("Действие"));
      button.addEventListener("click", async function () {
        if (busy) return;
        setBusy(true);
        try {
          var result = await item.run({
            title:title.value, text:body.value,
            dirty:dirty,
            message:messageValue,
            close:function () { screen("dialog"); }
          });
          if (result && result.cancelled) return;
          if (result && result.message) messageValue(result.message);
          if (result && result.disable) button.dataset.done = "1";
          if (result && result.close) screen("dialog");
          more.open = false;
        } catch (error) {
          messageValue((error && (error.сказ || error.message)) || T("Действие не выполнилось."));
        } finally {
          setBusy(false);
        }
      });
      actions.appendChild(button);
    });
    more.hidden = !actions.children.length;
  }

  function openDocument(value) {
    value = value || {};
    var sourceKey = String(value.sourceKey || "");
    if (current.loaded && sourceKey && sourceKey === current.sourceKey && value.replace !== true) {
      screen("document", value.focus !== false);
      return true;
    }
    if (dirty && !window.confirm(
        (window.ЯЗЫК && window.ЯЗЫК.английский)
          ? "The unsaved edit will be replaced. Open another document?"
          : "Несохранённая правка заменится. Открыть другой документ?")) return false;

    if (Object.prototype.hasOwnProperty.call(value, "title")) title.value = String(value.title || "");
    if (Object.prototype.hasOwnProperty.call(value, "text")) body.value = String(value.text || "");
    current = {
      sourceKey:sourceKey,
      onSave:typeof value.onSave === "function" ? value.onSave : null,
      actions:Array.isArray(value.actions) ? value.actions : [],
      readOnly:!!value.readOnly,
      loaded:true
    };
    title.readOnly = current.readOnly || !!value.lockTitle;
    body.readOnly = current.readOnly;
    box.classList.toggle("is-readonly", current.readOnly);
    kind.textContent = value.kind || (current.readOnly ? T("Документ только для чтения") : T("Редактируемый документ"));
    meta.textContent = Array.isArray(value.meta) ? value.meta.filter(Boolean).join("\n") : String(value.meta || "");
    meta.hidden = !meta.textContent;
    save.hidden = !current.onSave;
    renderActions(current.actions);
    note.textContent = value.note || (current.onSave
      ? T("Правка сохраняется в дело только по кнопке")
      : T("Черновик остаётся в этой вкладке, пока вы не сохраните файл"));
    dirty = Object.prototype.hasOwnProperty.call(value, "dirty")
      ? !!value.dirty : !!(title.value || body.value);
    if (value.status) messageValue(value.status);
    else if (dirty) markDirty();
    else message(title.value || body.value ? "Готово к работе" : "Новый документ",
                 title.value || body.value ? "Ready to work" : "New document");
    resize(); screen("document", value.focus !== false);
    return true;
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function arrayToBase64(buffer) {
    var all = "", bytes = new Uint8Array(buffer);
    for (var i = 0; i < bytes.length; i += 8192) {
      all += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(all);
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var present = document.querySelector('script[data-fixar-pdf="1"]');
      if (present) {
        if (present.getAttribute("data-ready") === "1") resolve();
        else { present.addEventListener("load", resolve, {once:true}); present.addEventListener("error", reject, {once:true}); }
        return;
      }
      var script = document.createElement("script");
      script.src = src; script.setAttribute("data-fixar-pdf", "1");
      script.onload = function () { script.setAttribute("data-ready", "1"); resolve(); };
      script.onerror = function () { reject(new Error("PDF library did not load")); };
      document.head.appendChild(script);
    });
  }
  async function pdfReady() {
    if (!pdfClass) {
      await loadScript("/vendor/jspdf.umd.min.js");
      pdfClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!pdfClass) throw new Error("PDF library is unavailable");
    }
    if (!pdfFont) {
      var response = await fetch("/vendor/PTSans-Regular.ttf");
      if (!response.ok) throw new Error("font HTTP " + response.status);
      pdfFont = arrayToBase64(await response.arrayBuffer());
    }
  }
  function filename(ext) {
    return window.FixARDocumentExport.safeFilename(title.value || T("Документ")) + "." + ext;
  }
  function exported(label) {
    if (current.onSave && dirty) {
      message(label + " сохранён · правка ещё не сохранена в дело",
              label + " saved · revision is not saved to the case yet");
    } else {
      dirty = false;
      message(label + " сохранён", label + " saved");
    }
  }
  async function savePdf() {
    if (busy) return;
    setBusy(true);
    message("Собираю PDF…", "Building PDF…");
    try {
      await pdfReady();
      var doc = new pdfClass({unit:"mm", format:"a4"});
      doc.addFileToVFS("PTSans.ttf", pdfFont); doc.addFont("PTSans.ttf", "PTSans", "normal");
      doc.setFont("PTSans");
      var width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight();
      var margin = 20, y = 24;
      function page(need) { if (y + need > height - margin) { doc.addPage(); y = margin; } }
      doc.setTextColor(28); doc.setFontSize(18);
      var headings = doc.splitTextToSize(title.value.trim() || T("Документ"), width - margin * 2);
      headings.forEach(function (line) { page(9); doc.text(line, margin, y); y += 9; });
      y += 4; doc.setFontSize(11);
      String(body.value || "").replace(/\r\n?/g,"\n").split("\n").forEach(function (paragraph) {
        if (!paragraph) { page(5.6); y += 5.6; return; }
        doc.splitTextToSize(paragraph, width - margin * 2).forEach(function (line) {
          page(5.6); doc.text(line, margin, y); y += 5.6;
        });
      });
      doc.save(filename("pdf"));
      exported("PDF");
    } catch (error) {
      message("PDF не собрался — текст остался на холсте", "PDF failed — the text is still on the canvas");
    } finally {
      setBusy(false);
    }
  }
  function saveWord() {
    if (busy) return;
    setBusy(true);
    try {
      var bytes = window.FixARDocumentExport.makeDocx(title.value || T("Документ"), body.value || "");
      download(new Blob([bytes], {type:window.FixARDocumentExport.mime}), filename("docx"));
      exported("DOCX");
    } catch (error) {
      message("DOCX не собрался — текст остался на холсте", "DOCX failed — the text is still on the canvas");
    } finally {
      setBusy(false);
    }
  }

  async function saveSource() {
    if (busy || !current.onSave) return;
    if (!body.value.trim()) {
      message("Пустой документ не сохраняю", "An empty document is not saved");
      return;
    }
    setBusy(true);
    message("Сохраняю правку…", "Saving revision…");
    try {
      var result = await current.onSave({title:title.value, text:body.value});
      dirty = false;
      messageValue(result && result.message ? result.message : {
        ru:"Правка сохранена в дело", en:"Revision saved to the case"
      });
      if (result && result.close) screen("dialog");
    } catch (error) {
      messageValue((error && (error.сказ || error.message)) || T("Правка не сохранилась."));
    } finally {
      setBusy(false);
    }
  }

  title.addEventListener("input", markDirty);
  body.addEventListener("input", markDirty);
  back.addEventListener("click", function () { screen("dialog"); });
  save.addEventListener("click", saveSource);
  pdf.addEventListener("click", savePdf);
  word.addEventListener("click", saveWord);
  document.addEventListener("fixar:navigate-screen", function (event) {
    screen(event.detail && event.detail.screen);
  });
  window.addEventListener("fixar:open-document", function (event) { openDocument(event.detail); });
  window.addEventListener("beforeunload", function (event) {
    if (!dirty) return;
    event.preventDefault(); event.returnValue = ""; return "";
  });
  window.FixARDocument = {
    open:openDocument,
    show:function () { screen("document"); },
    close:function () { screen("dialog"); },
    state:function () { return {dirty:dirty, sourceKey:current.sourceKey, readOnly:current.readOnly}; }
  };
  resize();
})();

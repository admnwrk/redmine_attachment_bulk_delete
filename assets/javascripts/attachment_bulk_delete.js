/*
 * redmine_attachment_bulk_delete
 * -----------------------------------------------------------------------------
 * Reichert vorhandene Anhang-Tabellen um Checkboxen + "Auswahl loeschen" an.
 * Zwei Kontexte werden erkannt:
 *
 *   A) edit_all-Seite   URL: .../attachments/<type>/<id>/edit
 *                       DOM: div.box.attachments > table   (Umbenennen-Formular)
 *                       -> Checkbox-Spalte, "Alle", "Auswahl loeschen"
 *                          + Papierkorb pro Zeile.
 *
 *   B) Container-Ansicht (Issue etc.)
 *                       DOM: div.attachments mit .contextual a[href$="/edit"]
 *                            (der Edit-Link existiert genau dann, wenn der
 *                            Benutzer bearbeiten/loeschen darf -> fail-closed)
 *                       -> Checkbox-Spalte + "Auswahl loeschen" in .contextual.
 *
 * Serverseitig entscheidet der Controller endgueltig ueber Berechtigungen;
 * dieses JS ist reines UI.
 */
(function () {
  "use strict";

  // --- Texte (deutsch; hier zentral aenderbar) ------------------------------
  var T = {
    deleteSelected: "Auswahl löschen",
    selectAll:      "Alle auswählen",
    rowDelete:      "Diesen Anhang löschen",
    confirmMany:    function (n) {
      return n + (n === 1 ? " Anhang" : " Anhänge") + " unwiderruflich löschen?";
    },
    confirmOne:     "Diesen Anhang unwiderruflich löschen?",
    nothingSel:     "Bitte zuerst mindestens einen Anhang auswählen."
  };

  // --- Helfer ---------------------------------------------------------------

  function csrfToken() {
    var m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.getAttribute("content") : "";
  }

  // Aus einem Attachments-Basispfad (".../attachments/...") den Endpunkt
  // ".../attachments/bulk_destroy" ableiten. Beruecksichtigt relative_url_root.
  function deriveBulkPath(hrefWithAttachments) {
    var marker = "/attachments/";
    var idx = hrefWithAttachments.indexOf(marker);
    if (idx === -1) return "/attachments/bulk_destroy";
    // Pfadanteil ohne Origin verwenden
    var a = document.createElement("a");
    a.href = hrefWithAttachments;
    var path = a.pathname;
    var i2 = path.indexOf(marker);
    if (i2 === -1) return "/attachments/bulk_destroy";
    return path.substring(0, i2) + marker + "bulk_destroy";
  }

  // Baut ein verstecktes POST-Formular und schickt es ab (normale Navigation,
  // CSRF-Token als Hidden-Feld -> redirect_back durch den Controller).
  function submitBulkDelete(bulkPath, objectType, objectId, ids) {
    if (!ids.length) { alert(T.nothingSel); return; }

    var form = document.createElement("form");
    form.method = "post";
    form.action = bulkPath;
    form.style.display = "none";

    function hidden(name, value) {
      var i = document.createElement("input");
      i.type = "hidden";
      i.name = name;
      i.value = value;
      form.appendChild(i);
    }

    hidden("authenticity_token", csrfToken());
    hidden("object_type", objectType);
    hidden("object_id", objectId);
    hidden("back_url", window.location.href);
    ids.forEach(function (id) { hidden("ids[]", id); });

    document.body.appendChild(form);
    form.submit();
  }

  function makeCheckbox(id) {
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "abd-cb";
    cb.value = String(id);
    return cb;
  }

  function selectedIds(scope) {
    return Array.prototype.slice
      .call(scope.querySelectorAll("input.abd-cb:checked"))
      .map(function (cb) { return cb.value; });
  }

  // Toolbar (Alle-Auswaehlen + Auswahl-loeschen). scope = Element mit .abd-cb.
  function buildToolbar(scope, bulkPath, objectType, objectId, opts) {
    opts = opts || {};
    var bar = document.createElement("span");
    bar.className = "abd-toolbar";

    if (opts.withSelectAll) {
      var lbl = document.createElement("label");
      lbl.className = "abd-selectall";
      var all = document.createElement("input");
      all.type = "checkbox";
      all.addEventListener("change", function () {
        scope.querySelectorAll("input.abd-cb").forEach(function (cb) {
          cb.checked = all.checked;
        });
      });
      lbl.appendChild(all);
      lbl.appendChild(document.createTextNode(" " + T.selectAll));
      bar.appendChild(lbl);
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "abd-del-btn";
    btn.textContent = T.deleteSelected;
    btn.addEventListener("click", function () {
      var ids = selectedIds(scope);
      if (!ids.length) { alert(T.nothingSel); return; }
      if (window.confirm(T.confirmMany(ids.length))) {
        submitBulkDelete(bulkPath, objectType, objectId, ids);
      }
    });
    bar.appendChild(btn);
    return bar;
  }

  // --- Kontext A: edit_all-Seite -------------------------------------------

  function enhanceEditAll() {
    var m = window.location.pathname.match(/\/attachments\/([^\/]+)\/(\d+)\/edit\/?$/);
    if (!m) return;
    var objectType = m[1];
    var objectId = m[2];
    var bulkPath = deriveBulkPath(window.location.pathname);

    var table = document.querySelector("div.box.attachments table");
    if (!table || table.getAttribute("data-abd") === "1") return;
    table.setAttribute("data-abd", "1");

    // Zeilen mit id="attachment-<id>" tragen die eigentlichen Felder.
    var fieldRows = table.querySelectorAll('tr[id^="attachment-"]');
    fieldRows.forEach(function (row) {
      var idm = row.id.match(/^attachment-(\d+)$/);
      if (!idm) return;
      var attId = idm[1];

      // Die "Kopfzeile" (Dateiname/Groesse/Autor) steht direkt VOR der Feldzeile.
      var headRow = row.previousElementSibling;
      if (!headRow) return;

      // Checkbox + Papierkorb in eine neue erste Zelle der Kopfzeile packen.
      var ctrlCell = document.createElement("td");
      ctrlCell.className = "abd-ctrl";
      ctrlCell.rowSpan = 2;

      ctrlCell.appendChild(makeCheckbox(attId));

      var del = document.createElement("button");
      del.type = "button";
      del.className = "abd-row-del icon icon-del";
      del.title = T.rowDelete;
      del.setAttribute("aria-label", T.rowDelete);
      del.addEventListener("click", function () {
        if (window.confirm(T.confirmOne)) {
          submitBulkDelete(bulkPath, objectType, objectId, [attId]);
        }
      });
      ctrlCell.appendChild(del);

      headRow.insertBefore(ctrlCell, headRow.firstChild);
    });

    // Toolbar unter die Box haengen (ausserhalb des Umbenennen-Buttons).
    var box = table.closest("div.box.attachments");
    var bar = buildToolbar(table, bulkPath, objectType, objectId, { withSelectAll: true });
    bar.classList.add("abd-toolbar-block");
    box.parentNode.insertBefore(bar, box.nextSibling);
  }

  // --- Kontext B: Container-Ansicht (Issue etc.) ---------------------------

  function enhanceContainerViews() {
    var blocks = document.querySelectorAll("#content div.attachments");
    blocks.forEach(function (block) {
      if (block.getAttribute("data-abd") === "1") return;

      // Edit-Link liefert Typ/ID und signalisiert die Berechtigung.
      var editLink = block.querySelector('.contextual a[href*="/attachments/"][href*="/edit"]');
      if (!editLink) return; // keine Berechtigung -> nicht anreichern
      var lm = editLink.getAttribute("href").match(/\/attachments\/([^\/]+)\/(\d+)\/edit\/?$/);
      if (!lm) return;
      var objectType = lm[1];
      var objectId = lm[2];
      var bulkPath = deriveBulkPath(editLink.href);

      var table = block.querySelector("table");
      if (!table) return;
      block.setAttribute("data-abd", "1");

      var rows = table.querySelectorAll("tr");
      var any = false;
      rows.forEach(function (row) {
        // Anhang-ID bevorzugt aus dem Papierkorb-Link (nur dann loeschbar),
        // sonst aus dem Download-Link.
        var attId = null;
        var delLink = row.querySelector('a[href*="/attachments/"][data-method="delete"]');
        if (delLink) {
          var dm = delLink.getAttribute("href").match(/\/attachments\/(\d+)(?:\?|$)/);
          if (dm) attId = dm[1];
        }
        if (!attId) {
          var dl = row.querySelector('a[href*="/attachments/download/"]');
          if (dl) {
            var dm2 = dl.getAttribute("href").match(/\/attachments\/download\/(\d+)/);
            if (dm2) attId = dm2[1];
          }
        }
        if (!attId) return; // Zeile ohne Anhang -> ueberspringen

        var cell = document.createElement("td");
        cell.className = "abd-ctrl";
        cell.appendChild(makeCheckbox(attId));
        row.insertBefore(cell, row.firstChild);
        any = true;
      });

      if (!any) return;

      // Toolbar in .contextual (rechts oben) einfuegen.
      var ctx = block.querySelector(".contextual");
      var bar = buildToolbar(table, bulkPath, objectType, objectId, { withSelectAll: true });
      if (ctx) {
        ctx.appendChild(bar);
      } else {
        block.insertBefore(bar, block.firstChild);
      }
    });
  }

  // --- Start ----------------------------------------------------------------

  function init() {
    try { enhanceEditAll(); } catch (e) { if (window.console) console.warn("[ABD] editAll", e); }
    try { enhanceContainerViews(); } catch (e) { if (window.console) console.warn("[ABD] views", e); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

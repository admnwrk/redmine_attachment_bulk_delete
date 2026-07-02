# redmine_attachment_bulk_delete

Einzel- und Mehrfach-Löschen von Anhängen in Redmine 6.1.x – an zwei Stellen:

1. **Issue-Ansicht, Bereich „Anhänge"** – Checkboxen pro Anhang + Button
   **„Auswahl löschen"** (Einzel-Papierkorb war hier schon vorhanden).
2. **Anhang-Bearbeiten-Seite** `/attachments/<type>/<id>/edit` – bisher nur
   Umbenennen; jetzt zusätzlich Checkboxen, **„Auswahl löschen"** und ein
   **Papierkorb pro Zeile**.

Funktioniert generisch auch für Wiki-Seiten, Foren, Dokumente, Projekte,
Versionen und News (überall dort, wo Redmine Anhänge und den „Bearbeiten"-Link
anbietet).

## Wie es funktioniert (kurz)

- **Kein Core-Override.** Das Plugin bringt nur einen eigenen Controller
  (`AttachmentBulkController`) + eine Route (`POST /attachments/bulk_destroy`)
  mit und reichert die bestehenden Views per JavaScript an
  (`view_layouts_base_html_head`-Hook). Damit upgrade-sicher.
- **Berechtigungen** werden serverseitig final geprüft:
  - Issues über den regulären Redmine-Weg
    (`safe_attributes = {'deleted_attachment_ids' => ...}` + `save`), also
    identisch zum normalen Bearbeiten-Formular. Erfordert `edit_issues`
    (bzw. `edit_own_issues` als Autor).
  - andere Container über `attachment.deletable?`.
- **History bleibt korrekt:** pro Löschvorgang **ein** Journaleintrag mit je
  einem „Datei gelöscht"-Detail pro Anhang.
- Das JavaScript blendet die Buttons nur dort ein, wo der „Bearbeiten"-Link
  vorhanden ist (= Berechtigung besteht) – fail-closed.

## Installation

```bash
# im Redmine-Root
cd plugins
# ZIP entpacken -> plugins/redmine_attachment_bulk_delete/
cd ..
# Neustart genügt (keine Migration nötig – keine DB-Änderungen)
```

Im Docker-Compose-Setup: Ordner ins Plugins-Volume legen und den
`hitredmine`-Container neu starten. Es gibt **keine Migration**.

Assets werden von Redmine beim Start automatisch nach
`public/plugin_assets/redmine_attachment_bulk_delete/` kopiert.

## Konfiguration / Anpassung

- UI-Texte (deutsch) stehen zentral im Objekt `T` oben in
  `assets/javascripts/attachment_bulk_delete.js`.
- Erlaubte Container-Typen: Konstante `ALLOWED_CONTAINERS` im Controller.

## Version

1.0.0

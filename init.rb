# frozen_string_literal: true

require 'redmine'

Redmine::Plugin.register :redmine_attachment_bulk_delete do
  name 'Attachment Bulk Delete'
  author 'admnwrk'
  description 'Fuegt Einzel- und Mehrfach-Loeschen von Anhaengen hinzu: ' \
              'Checkboxen + "Auswahl loeschen" in der Issue-Ansicht (Bereich Anhaenge) ' \
              'und auf der Anhang-Bearbeiten-Seite (/attachments/<type>/<id>/edit).'
  version '1.0.0'
  url 'https://github.com/admnwrk/redmine_attachment_bulk_delete'
  requires_redmine version_or_higher: '6.0.0'
end

# View-Hook laden (injiziert JS/CSS in den <head>).
require File.expand_path('lib/redmine_attachment_bulk_delete/hooks', __dir__)

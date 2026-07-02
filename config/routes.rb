# frozen_string_literal: true

# Wird von Redmine im Router-Draw-Kontext ausgewertet -> keine
# Rails.application.routes.draw-Umklammerung noetig.
#
# Ein einziger Endpunkt fuer beide Views (Issue-Ansicht + edit_all).
# object_type / object_id / ids[] kommen als POST-Parameter.
post 'attachments/bulk_destroy',
     to: 'attachment_bulk#destroy',
     as: 'bulk_destroy_attachments'

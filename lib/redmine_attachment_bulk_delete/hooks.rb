# frozen_string_literal: true

module RedmineAttachmentBulkDelete
  # Injiziert CSS + JS in den <head> aller Seiten. Das JS erkennt selbst,
  # ob es sich auf einer Issue-Ansicht oder der edit_all-Seite befindet,
  # und reichert nur dort die vorhandenen Anhang-Tabellen an.
  class Hooks < Redmine::Hook::ViewListener
    def view_layouts_base_html_head(_context = {})
      stylesheet_link_tag('attachment_bulk_delete', plugin: 'redmine_attachment_bulk_delete') +
        javascript_include_tag('attachment_bulk_delete', plugin: 'redmine_attachment_bulk_delete')
    end
  end
end

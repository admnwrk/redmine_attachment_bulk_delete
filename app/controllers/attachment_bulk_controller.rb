# frozen_string_literal: true

# Eigenstaendiger Controller fuer das Sammel-/Einzel-Loeschen von Anhaengen.
# Bewusst KEIN Patch des Core-AttachmentsController (upgrade-sicher).
#
# Sicherheit:
#   * Login erforderlich.
#   * object_type gegen Whitelist geprueft (kein constantize auf beliebigen Input).
#   * Container muss fuer den Benutzer sichtbar sein.
#   * Loeschberechtigung wird serverseitig final geprueft:
#       - Issue:   ueber safe_attributes (deleted_attachment_ids ist per
#                  attachments_deletable? geschuetzt) -> reiner Redmine-Weg.
#       - sonst:   pro Anhang ueber attachment.deletable?.
#   * Journalisierung ("Datei geloescht") bleibt korrekt (ein Journal, N Details).
class AttachmentBulkController < ApplicationController
  before_action :require_login
  before_action :find_container

  # Erlaubte Container-Typen (Wert = Pfad-Segment aus object_attachments_edit_path,
  # also class.name.underscore.pluralize).
  ALLOWED_CONTAINERS = %w[issues wiki_pages messages documents projects versions news].freeze

  def destroy
    ids = normalized_ids(params[:ids])
    if ids.empty?
      flash[:warning] = l(:notice_no_selection_for_delete, default: 'Keine Anhaenge ausgewaehlt.')
      return redirect_back_or_default(container_redirect_path)
    end

    deleted = delete_attachments(ids)

    if deleted.positive?
      flash[:notice] = l(:notice_successful_delete)
    else
      flash[:warning] = l(:notice_nothing_deleted,
                          default: 'Es wurden keine Anhaenge geloescht (Berechtigung?).')
    end

    redirect_back_or_default(container_redirect_path)
  end

  private

  # -- Loeschlogik --------------------------------------------------------

  def delete_attachments(ids)
    if @container.is_a?(Issue)
      delete_via_issue(ids)
    else
      delete_generic(ids)
    end
  end

  # Gesegneter Redmine-Weg fuer Issues: ein init_journal, safe_attributes,
  # ein save -> ein Journaleintrag mit N "Datei geloescht"-Details.
  def delete_via_issue(ids)
    before = @container.attachments.count
    @container.init_journal(User.current)
    @container.safe_attributes = { 'deleted_attachment_ids' => ids }
    return 0 unless @container.save

    before - @container.attachments.reload.count
  end

  # Generischer Weg (Wiki, Forum, Dokument, Projekt, Version, News):
  # spiegelt den Core-AttachmentsController#destroy, aber fuer mehrere.
  def delete_generic(ids)
    targets = @container.attachments.where(id: ids).select { |a| a.deletable?(User.current) }
    return 0 if targets.empty?

    @container.init_journal(User.current) if @container.respond_to?(:init_journal)
    targets.each { |att| @container.attachments.delete(att) }
    @container.save if @container.respond_to?(:save) && @container.changed?
    targets.size
  end

  # -- Helfer -------------------------------------------------------------

  def normalized_ids(raw)
    Array(raw).flatten
              .map(&:to_s)
              .select { |s| s.match?(/\A\d+\z/) }
              .map(&:to_i)
              .uniq
  end

  def find_container
    object_type = params[:object_type].to_s
    return render_404 unless ALLOWED_CONTAINERS.include?(object_type)

    klass = object_type.singularize.classify.constantize
    return render_404 unless klass.is_a?(Class) && klass < ActiveRecord::Base

    @container = klass.find(params[:object_id])

    unless @container.respond_to?(:attachments) &&
           @container.respond_to?(:attachments_visible?) &&
           @container.attachments_visible?(User.current)
      return render_403
    end

    @project = @container.project if @container.respond_to?(:project)
  rescue NameError, ActiveRecord::RecordNotFound
    render_404
  end

  # Sinnvolles Redirect-Ziel, falls kein back_url gesetzt ist.
  def container_redirect_path
    case @container
    when Issue   then issue_path(@container)
    when Message then url_for(@container.event_url)
    else
      begin
        url_for(@container)
      rescue StandardError
        home_path
      end
    end
  end
end

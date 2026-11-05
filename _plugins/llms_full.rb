# frozen_string_literal: true

# Writes /llms-full.txt: the full markdown text of every published patient
# page (conditions, treatments, comparisons, life stages), one after another,
# for LLM crawlers that want the corpus in one fetch. /llms.txt is the index;
# this is the companion the llms.txt convention calls llms-full.txt.
#
# It runs as a generator, so page.content is still the raw markdown source
# (front matter already stripped, Liquid not yet rendered). Liquid tags,
# kramdown attribute lines, and HTML comments are removed because they mean
# nothing outside the Jekyll build.
module RSCom
  class LlmsFullGenerator < Jekyll::Generator
    safe true
    priority :lowest

    SECTIONS = %w[/conditions /treatments /life-stages].freeze

    def generate(site)
      pages = site.pages.select do |p|
        p.data["title"] &&
          p.data["sitemap"] != false &&
          p.data["redirect_to"].nil? &&
          %w[.md .markdown].include?(p.ext) &&
          SECTIONS.any? { |s| p.url.start_with?(s) }
      end
      pages.sort_by!(&:url)

      out = +"# Ryan Stewart, DO — patient education, full text\n\n"
      out << "> Full text of every condition, treatment, comparison, and life-stage page on #{site.config['url']}. "
      out << "Written for patients by Dr. Ryan Stewart, a board-certified urogynecologist in Green Bay, Wisconsin. "
      out << "Educational only; not a substitute for a consultation. Index: #{site.config['url']}/llms.txt\n"

      pages.each do |p|
        url = "#{site.config['url']}#{p.url}"
        out << "\n---\n\n# #{p.data['title']}\n\n"
        out << "URL: #{url}\n"
        out << "Summary: #{p.data['description'].to_s.strip}\n" if p.data["description"]
        if p.data["last_evidence_review"]
          out << "Last evidence review: #{p.data['last_evidence_review']}\n"
        end
        out << "\n" << clean(p.content) << "\n"
      end

      file = Jekyll::PageWithoutAFile.new(site, site.source, "", "llms-full.txt")
      file.content = out
      file.data["layout"] = nil
      file.data["sitemap"] = false
      file.data["render_with_liquid"] = false
      site.pages << file
    end

    private

    def clean(text)
      text.to_s
          .gsub(/\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}/m, "")
          .gsub(/\{%-?.*?-?%\}/m, "")
          .gsub(/\{\{.*?\}\}/m, "")
          .gsub(/<!--.*?-->/m, "")
          .gsub(/^\{:[^}]*\}\s*$/, "")
          .gsub(/\n{3,}/, "\n\n")
          .strip
    end
  end
end

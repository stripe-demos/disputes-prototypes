import { Icon } from '../../icons/SailIcons';
import DocsTOC from './DocsTOC';
import MarkdocRenderer, { useMarkdocFrontmatter, useMarkdocToc } from '../markdoc/MarkdocRenderer';

export default function DocsPage({ content }) {
  const frontmatter = useMarkdocFrontmatter(content);
  const tocItems = useMarkdocToc(content);
  const breadcrumbs = frontmatter.breadcrumbs || [];

  return (
    <div className="flex gap-16">
      {/* Main content */}
      <div className="flex-1 min-w-0 max-w-[1000px] text-default">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-label-medium text-subdued mb-5">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                <a href={crumb.href} className="hover:text-default transition-colors">{crumb.label}</a>
                /
              </span>
            ))}
            <span>{frontmatter.title}</span>
          </nav>
        )}

        {/* Title */}
        <h1 className="text-display-small text-default mb-3">
          {frontmatter.title}
        </h1>

        {/* Subtitle */}
        {frontmatter.subtitle && (
          <p className="text-heading-large-subdued text-default mb-5">
            {frontmatter.subtitle}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-7 text-label-small-emphasized text-subdued mb-6 pb-3 border-b border-border">
          <span className="flex items-center gap-1.5 cursor-pointer hover:text-default transition-colors">
            <Icon name="sparkle" size="xsmall" />
            Ask about this page
          </span>
          <span className="flex items-center gap-1.5 cursor-pointer hover:text-default transition-colors">
            <Icon name="clipboard" size="xsmall" />
            Copy for LLM
          </span>
        </div>

        {/* Markdoc body */}
        <div className="text-body-medium text-default">
          <MarkdocRenderer content={content} />
        </div>
      </div>

      {/* Right TOC */}
      <DocsTOC items={tocItems} />
    </div>
  );
}

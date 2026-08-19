import React from 'react';
import Markdoc from '@markdoc/markdoc';
import yaml from 'js-yaml';
import config from './config';
import components from './components.jsx';

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  return { frontmatter: yaml.load(match[1]) || {}, body: match[2] };
}

function extractHeadings(node, headings = []) {
  if (node.type === 'heading' && node.attributes?.id) {
    const text = node.children
      .flatMap(function getTextNodes(child) {
        if (child.type === 'text') return [child.attributes?.content || ''];
        if (child.children) return child.children.flatMap(getTextNodes);
        return [];
      })
      .join('')
      .trim();
    headings.push({
      id: node.attributes.id,
      label: text,
      depth: node.attributes.level,
    });
  } else if (node.type === 'tag' && node.tag === 'section' && node.attributes?.title) {
    headings.push({
      id: node.attributes.id || slugify(node.attributes.title),
      label: node.attributes.title,
      depth: 3,
    });
  }
  if (node.children) {
    for (const child of node.children) {
      extractHeadings(child, headings);
    }
  }
  return headings;
}

function parseContent(content) {
  const { frontmatter, body } = parseFrontmatter(content);
  const ast = Markdoc.parse(body);
  const toc = extractHeadings(ast);
  return { frontmatter, ast, toc };
}

export default function MarkdocRenderer({ content }) {
  const { ast } = parseContent(content);
  const transformed = Markdoc.transform(ast, config);
  return Markdoc.renderers.react(transformed, React, { components });
}

export function useMarkdocFrontmatter(content) {
  return parseFrontmatter(content).frontmatter;
}

export function useMarkdocToc(content) {
  return parseContent(content).toc;
}

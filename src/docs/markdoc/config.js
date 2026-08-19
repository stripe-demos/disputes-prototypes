import Markdoc from '@markdoc/markdoc';

const config = {
  nodes: {
    heading: {
      render: 'Heading',
      attributes: {
        id: { type: String },
        level: { type: Number, required: true },
      },
    },
    paragraph: {
      render: 'Paragraph',
    },
    list: {
      render: 'List',
      attributes: {
        ordered: { type: Boolean, default: false },
      },
    },
    item: {
      render: 'ListItem',
    },
    link: {
      render: 'DocLink',
      attributes: {
        href: { type: String, default: '#' },
      },
    },
    strong: {
      render: 'Strong',
    },
    code: {
      render: 'InlineCode',
      attributes: {
        content: { type: String },
      },
    },
    fence: {
      render: 'CodeBlock',
      attributes: {
        language: { type: String },
        content: { type: String },
      },
    },
  },
  tags: {
    callout: {
      render: 'InfoCallout',
      attributes: {
        type: { type: String, default: 'note' },
        title: { type: String },
      },
      children: Markdoc.nodes.document.children,
    },
    link: {
      render: 'DocLink',
      attributes: {
        href: { type: String, default: '#' },
      },
      children: ['inline'],
    },
    tooltip: {
      render: 'Tooltip',
      attributes: {
        label: { type: String, required: true },
      },
      children: ['inline'],
    },
    'resource-card': {
      render: 'ResourceCard',
      selfClosing: true,
      attributes: {
        title: { type: String, required: true },
        description: { type: String, required: true },
        tag: { type: String },
        icon: { type: String, required: true },
      },
    },
    'resource-cards': {
      render: 'ResourceCards',
      children: ['resource-card'],
    },
    badge: {
      render: 'Badge',
      attributes: {
        tone: { type: String, default: 'default' },
      },
      children: ['inline'],
    },
    section: {
      render: 'Section',
      attributes: {
        id: { type: String },
        number: { type: String },
        title: { type: String, required: true },
        defaultOpen: { type: Boolean, default: true },
        preview: { type: Boolean, default: false },
        badge: { type: String },
        collapsable: { type: Boolean, default: true },
      },
      children: Markdoc.nodes.document.children,
    },
  },
};

export default config;

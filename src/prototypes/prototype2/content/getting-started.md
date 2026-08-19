---
title: Prototype overview
subtitle: Learn how to use the docs template to prototype quickly.
breadcrumbs:
  - label: Home
---

This is a sample documentation page built with {% link %}Markdoc{% /link %}. Edit this file at `src/prototypes/prototype2/content/getting-started.md` to add your own content.

{% callout %}
This prototype uses the **stripe-docs** template, which includes a docs header, sidebar navigation, table of contents, and Markdoc rendering. Sidebar navigation is defined in `content/sidebar.yaml`.
{% /callout %}

## Getting started {% #getting-started %}

The docs template provides several features out of the box:

- **Markdoc rendering** with support for custom tags like callouts and links
- **Sidebar navigation** driven by a YAML configuration file

### Custom tags {% #custom-tags %}

You can use custom tags throughout your content. These include:

- `{% callout %}` for info boxes
- `{% link %}` for styled documentation links

### Adding pages {% #adding-pages %}

To add a new page:

1. Create a `.md` file in `content/`
2. Add `content: your-file.md` to a sidebar item in `content/sidebar.yaml`
3. That's it — routing is automatic

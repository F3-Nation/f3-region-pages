import type { CSSProperties, ReactNode } from 'react';

const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const LINK_STYLE: CSSProperties = {
  color: '#60a5fa',
  textDecoration: 'underline',
};
const TEXT_NODE_TYPE = 3;
const ELEMENT_NODE_TYPE = 1;

const serverSanitize = (html: string): ReactNode[] => {
  // Strip script and style blocks first
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  const nodes: ReactNode[] = [];
  // Match tags or text between tags
  const tokenRegex = /(<a\s[^>]*>[\s\S]*?<\/a>|<br\s*\/?>|<[^>]*>)/gi;
  let lastIndex = 0;
  let keyIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    // Text before this tag
    if (match.index > lastIndex) {
      const text = cleaned.slice(lastIndex, match.index);
      if (text) nodes.push(text);
    }

    const token = match[0];

    if (/^<a\s/i.test(token)) {
      // Extract href
      const hrefMatch = token.match(/href=["']([^"']*)["']/i);
      const href = hrefMatch?.[1] ?? '';
      // Extract inner text (strip any nested tags)
      const innerMatch = token.match(/^<a\s[^>]*>([\s\S]*?)<\/a>$/i);
      const innerHtml = innerMatch?.[1] ?? '';
      const innerText = innerHtml.replace(/<[^>]*>/g, '');

      if (isSafeHref(href)) {
        const safeHref = href.trim();
        nodes.push(
          <a
            key={`server-${keyIndex++}`}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            style={LINK_STYLE}
          >
            {innerText || safeHref}
          </a>
        );
      } else {
        if (innerText) nodes.push(innerText);
      }
    } else if (/^<br\s*\/?>/i.test(token)) {
      nodes.push(<br key={`server-${keyIndex++}`} />);
    }
    // All other tags are stripped (content between open/close handled as text)

    lastIndex = tokenRegex.lastIndex;
  }

  // Remaining text after last tag
  if (lastIndex < cleaned.length) {
    const text = cleaned.slice(lastIndex);
    if (text) nodes.push(text);
  }

  return nodes;
};

const sanitizeChildNodes = (
  nodes: NodeListOf<ChildNode> | ChildNode[],
  keyPrefix: string
): ReactNode[] => {
  const safeNodes: ReactNode[] = [];

  Array.from(nodes).forEach((child, index) => {
    safeNodes.push(...sanitizeNode(child, `${keyPrefix}-${index}`));
  });

  return safeNodes;
};

const isSafeHref = (href: string): boolean => {
  const trimmed = href.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed, 'https://example.com');
    return ALLOWED_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

const sanitizeNode = (node: ChildNode, key: string): ReactNode[] => {
  if (node.nodeType === TEXT_NODE_TYPE) {
    const text = node.textContent ?? '';
    return text ? [text] : [];
  }

  if (node.nodeType === ELEMENT_NODE_TYPE) {
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'script' || tag === 'style') {
      return [];
    }

    if (tag === 'br') {
      return [<br key={key} />];
    }

    if (tag === 'a') {
      const href = element.getAttribute('href') ?? '';
      if (!isSafeHref(href)) {
        return sanitizeChildNodes(element.childNodes, key);
      }

      const childContent = sanitizeChildNodes(
        element.childNodes,
        `${key}-child`
      );
      const safeHref = href.trim();

      return [
        <a
          key={key}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          style={LINK_STYLE}
        >
          {childContent.length > 0 ? childContent : safeHref}
        </a>,
      ];
    }

    return sanitizeChildNodes(element.childNodes, `${key}-child`);
  }

  return [];
};

export const sanitizeHtmlToReactNodes = (
  html: string | null | undefined
): ReactNode[] => {
  if (!html) return [];

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return serverSanitize(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  if (doc.querySelector('parsererror')) {
    return serverSanitize(html);
  }

  return sanitizeChildNodes(doc.body.childNodes, 'safe-html');
};

/**
 * @jest-environment node
 */
import { sanitizeHtmlToReactNodes } from './safeHtml';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// In Node.js test environment, window/DOMParser are undefined,
// so sanitizeHtmlToReactNodes uses the server-side regex parser.

const render = (html: string) => {
  const nodes = sanitizeHtmlToReactNodes(html);
  // Wrap in a fragment to render
  return renderToStaticMarkup(createElement('div', null, ...nodes));
};

describe('sanitizeHtmlToReactNodes (server-side)', () => {
  it('renders anchor tags with safe hrefs', () => {
    const result = render('<a href="https://example.com">Click here</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('style="color:#60a5fa;text-decoration:underline"');
    expect(result).toContain('Click here');
  });

  it('renders mailto links', () => {
    const result = render('<a href="mailto:test@example.com">Email</a>');
    expect(result).toContain('href="mailto:test@example.com"');
    expect(result).toContain('Email');
  });

  it('strips javascript: hrefs but keeps text', () => {
    const result = render('<a href="javascript:alert(1)">Bad link</a>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('<a');
    expect(result).toContain('Bad link');
  });

  it('strips script tags entirely', () => {
    const result = render('Hello<script>alert("xss")</script> World');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('strips style tags entirely', () => {
    const result = render('Hello<style>body{display:none}</style> World');
    expect(result).not.toContain('style');
    expect(result).not.toContain('display');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('renders br tags', () => {
    const result = render('Line 1<br>Line 2<br/>Line 3');
    expect(result).toContain('Line 1');
    expect(result).toContain('<br/>');
    expect(result).toContain('Line 2');
    expect(result).toContain('Line 3');
  });

  it('strips other HTML tags but keeps text', () => {
    const result = render('<p>Hello <strong>world</strong></p>');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<strong>');
  });

  it('handles mixed content with links and text', () => {
    const result = render(
      'Visit <a href="https://f3nation.com">F3 Nation</a> for more info.'
    );
    expect(result).toContain('Visit');
    expect(result).toContain('href="https://f3nation.com"');
    expect(result).toContain('F3 Nation');
    expect(result).toContain('for more info.');
  });

  it('returns empty array for null/undefined/empty', () => {
    expect(sanitizeHtmlToReactNodes(null)).toEqual([]);
    expect(sanitizeHtmlToReactNodes(undefined)).toEqual([]);
    expect(sanitizeHtmlToReactNodes('')).toEqual([]);
  });

  it('uses href as text when anchor has no inner text', () => {
    const result = render('<a href="https://example.com"></a>');
    expect(result).toContain('>https://example.com</a>');
  });
});

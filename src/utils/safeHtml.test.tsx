// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, enrichEmailsInHtml } from './safeHtml';

describe('sanitizeHtml', () => {
  it('allows safe anchor tags with href', () => {
    const result = sanitizeHtml('<a href="https://example.com">Click</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('Click');
  });

  it('allows mailto links', () => {
    const result = sanitizeHtml('<a href="mailto:test@example.com">Email</a>');
    expect(result).toContain('href="mailto:test@example.com"');
  });

  it('strips javascript: hrefs', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">Bad</a>');
    expect(result).not.toContain('javascript:');
    expect(result).toContain('Bad');
  });

  it('strips script tags entirely', () => {
    const result = sanitizeHtml('Hello<script>alert("xss")</script> World');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('strips style tags', () => {
    const result = sanitizeHtml('Hello<style>body{display:none}</style> World');
    expect(result).not.toContain('style');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('preserves br tags', () => {
    const result = sanitizeHtml('Line 1<br>Line 2');
    expect(result).toContain('Line 1');
    expect(result).toContain('<br>');
    expect(result).toContain('Line 2');
  });

  it('allows basic formatting tags', () => {
    const result = sanitizeHtml(
      '<p>Hello <strong>world</strong> <em>italic</em></p>'
    );
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('allows list tags', () => {
    const result = sanitizeHtml('<ul><li>Item 1</li><li>Item 2</li></ul>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('strips event handlers', () => {
    const result = sanitizeHtml(
      '<a href="https://ok.com" onclick="alert(1)">Link</a>'
    );
    expect(result).not.toContain('onclick');
    expect(result).toContain('href="https://ok.com"');
  });

  it('strips data: URIs', () => {
    const result = sanitizeHtml(
      '<a href="data:text/html,<script>alert(1)</script>">Bad</a>'
    );
    expect(result).not.toContain('data:');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('strips img tags (not in allowlist)', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
  });
});

describe('enrichEmailsInHtml', () => {
  it('wraps email addresses in mailto links', () => {
    const result = enrichEmailsInHtml('Contact test@example.com for info');
    expect(result).toContain(
      '<a href="mailto:test@example.com">test@example.com</a>'
    );
  });

  it('handles multiple emails', () => {
    const result = enrichEmailsInHtml('a@b.com and c@d.com');
    expect(result).toContain('mailto:a@b.com');
    expect(result).toContain('mailto:c@d.com');
  });

  it('preserves non-email text', () => {
    const result = enrichEmailsInHtml('No emails here');
    expect(result).toBe('No emails here');
  });
});

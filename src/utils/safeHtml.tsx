import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'br',
  'b',
  'i',
  'em',
  'strong',
  'p',
  'ul',
  'ol',
  'li',
];
const ALLOWED_ATTR = ['href'];
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):)/i;

// Hook: force target="_blank" and rel="noopener noreferrer" on all <a> tags
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
  });
};

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

export const enrichEmailsInHtml = (html: string): string => {
  return html.replace(EMAIL_REGEX, '<a href="mailto:$1">$1</a>');
};

import sanitizeHtmlLib from 'sanitize-html';

export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return sanitizeHtmlLib(dirty, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'span', 'h3', 'h4'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}

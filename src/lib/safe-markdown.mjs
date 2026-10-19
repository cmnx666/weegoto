import { marked } from 'marked';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sanitizeHtml = require('sanitize-html');

/** Guest content never passes through Astro's trusted HTML renderer. */
export function renderGuestMarkdown(body) {
  return sanitizeHtml(marked.parse(body ?? '', { async: false, gfm: true }), {
    allowedTags: sanitizeHtml.defaults.allowedTags,
    allowedAttributes: { a: ['href', 'title'], code: ['class'], th: ['align'], td: ['align'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow ugc noopener noreferrer' }),
    },
  });
}

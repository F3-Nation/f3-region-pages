'use client';

import { sanitizeHtml, enrichEmailsInHtml } from '@/utils/safeHtml';

/**
 * @see http://localhost:3000/anaheim
 * @see https://github.com/F3-Nation/f3-region-pages/issues/35
 * @todo "Click here for detailed AO maps"
 **/
export const WorkoutNotes = ({ notes }: { notes: string | null }) => {
  if (!notes) return null;

  const enriched = enrichEmailsInHtml(notes);
  const sanitized = sanitizeHtml(enriched);

  if (!sanitized.trim()) return null;

  return (
    <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
      <div className="font-medium mb-1">Notes:</div>
      <div
        className="[&_a]:text-blue-400 [&_a]:underline [&_a]:hover:text-blue-300"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  );
};

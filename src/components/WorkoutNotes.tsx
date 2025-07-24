/**
 * @see http://localhost:3000/anaheim
 * @see https://github.com/F3-Nation/f3-region-pages/issues/35
 * @todo "Click here for detailed AO maps"
 **/
export const WorkoutNotes = ({ notes }: { notes: string | null }) => {
  if (!notes) return null;

  const sanitizedNotes: string = sanitizeNotes(notes);
  const enrichedNotes = enrichEmails(sanitizedNotes);

  return (
    <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
      <div className="font-medium mb-1">Notes:</div>
      {enrichedNotes}
    </div>
  );
};

const sanitizeNotes = (notes: string) => {
  return notes.replace(/<[^>]*>?/g, '');
};

const enrichEmails = (notes: string) => {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  return notes.split(emailRegex).map((part, idx) => {
    if (emailRegex.test(part)) {
      return (
        <a key={idx} href={`mailto:${part}`}>
          {part}
        </a>
      );
    }
    return part;
  });
};

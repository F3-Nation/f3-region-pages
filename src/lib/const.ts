export const ALL_LETTERS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
);
export const cacheTtl = 3600; // revalidate every hour

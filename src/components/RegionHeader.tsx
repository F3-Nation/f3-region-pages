interface RegionHeaderProps {
  regionName: string;
  website?: string;
}

export function RegionHeader({ regionName, website }: RegionHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-6">F3 {regionName}</h1>

      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          Visit Region Website
        </a>
      )}
    </div>
  );
}

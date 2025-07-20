interface RegionHeaderProps {
  regionName: string;
  website?: string;
}

export function RegionHeader({ regionName, website }: RegionHeaderProps) {
  return (
    <div className="mb-8">
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          title={`F3 ${regionName}`}
        >
          Visit Region Website
        </a>
      )}
    </div>
  );
}

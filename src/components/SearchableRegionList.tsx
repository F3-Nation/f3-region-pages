'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  KeyboardEvent,
  useMemo,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ALL_LETTERS } from '@/lib/const';
import { Region } from '@/types/Workout';

interface Props {
  regions: Omit<Region, 'id'>[];
  currentLetter: string;
  regionsByLetter: Record<string, Omit<Region, 'id'>[]>;
}

export default function SearchableRegionList({
  regions = [],
  currentLetter = ALL_LETTERS[0] || 'A',
  regionsByLetter = {},
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter regions based on search query
  const filteredRegions = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return regions.filter((region) => {
      // Search in name, city, state, zip, and country
      const searchableFields = [
        region.name,
        region.city,
        region.state,
        region.zip,
        region.country,
      ].filter(Boolean); // Remove undefined/null values

      return searchableFields.some((field) =>
        field?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, regions]);

  // Determine which regions to display
  const displayRegions = useMemo(() => {
    if (searchQuery) return filteredRegions;
    return regionsByLetter[currentLetter];
  }, [searchQuery, filteredRegions, regionsByLetter, currentLetter]);

  const handleLetterChange = useCallback(
    (letter: string) => {
      setSearchQuery('');
      setSelectedIndex(-1);
      router.push(`/regions?letter=${letter.toLowerCase()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [router]
  );

  useEffect(() => {
    if (filteredRegions.length === 1) setSelectedIndex(0);
  }, [filteredRegions]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!searchQuery) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredRegions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > -1 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredRegions.length) {
            const { slug } = filteredRegions[selectedIndex];
            if (slug) {
              setIsLoading(true);
              router.push(`/regions/${slug}`);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSearchQuery('');
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [searchQuery, filteredRegions, selectedIndex, router]
  );

  const handleSuggestionClick = useCallback(
    (slug: string | null) => {
      if (slug) {
        setIsLoading(true);
        router.push(`/regions/${slug}`);
      }
    },
    [router]
  );

  return (
    <div className="w-full">
      <div className="relative mb-6">
        <div className="relative">
          <div
            role="combobox"
            aria-expanded={searchQuery.length > 0}
            aria-controls="search-suggestions"
            aria-haspopup="listbox"
          >
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(-1);
                if (!e.target.value) {
                  router.push(`/regions?letter=${currentLetter.toLowerCase()}`);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search regions..."
              className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-700 
                bg-white dark:bg-gray-800 
                text-gray-900 dark:text-gray-100
                focus:border-gray-300 dark:focus:border-gray-600 
                focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 
                outline-none transition-all
                placeholder-gray-500 dark:placeholder-gray-400
                disabled:opacity-50"
              aria-label="Search regions"
              aria-activedescendant={
                selectedIndex >= 0
                  ? `suggestion-${filteredRegions[selectedIndex]}`
                  : undefined
              }
              aria-autocomplete="list"
              disabled={isLoading}
            />
          </div>
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-gray-100" />
            </div>
          )}
        </div>

        {searchQuery && filteredRegions.length > 0 && (
          <div
            ref={listRef}
            id="search-suggestions"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-1 
              bg-white dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700 
              rounded-lg shadow-lg max-h-60 overflow-y-auto z-10"
          >
            {filteredRegions.map((region, index) => (
              <button
                key={`suggestion-${region.slug}`}
                id={`suggestion-${region.slug}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSuggestionClick(region.slug)}
                className={`w-full text-left px-4 py-2 
                  text-gray-900 dark:text-gray-100
                  hover:bg-gray-50 dark:hover:bg-gray-700 
                  focus:bg-gray-50 dark:focus:bg-gray-700 
                  focus:outline-none capitalize
                  ${
                    index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
              >
                <div>
                  <div className="font-medium">{region.name}</div>
                  {(region.city ||
                    region.state ||
                    region.zip ||
                    region.country) && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {[region.city, region.state, region.zip]
                        .filter(Boolean)
                        .join(', ')}
                      {region.country && (
                        <div className="mt-1">{region.country}</div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {!searchQuery && (
        <nav className="mb-8" aria-label="Alphabetical navigation">
          <div className="flex flex-col items-center gap-2">
            {/* First row: A-G */}
            <div className="flex gap-2">
              {ALL_LETTERS.slice(0, 7).map((letter) => {
                const hasRegions = (regionsByLetter[letter]?.length || 0) > 0;
                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterChange(letter)}
                    disabled={letter === currentLetter}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border
                      ${
                        letter === currentLetter
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      ${!hasRegions ? 'opacity-50' : ''}
                      transition-colors`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            {/* Second row: H-N */}
            <div className="flex gap-2">
              {ALL_LETTERS.slice(7, 14).map((letter) => {
                const hasRegions = (regionsByLetter[letter]?.length || 0) > 0;
                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterChange(letter)}
                    disabled={letter === currentLetter}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border
                      ${
                        letter === currentLetter
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      ${!hasRegions ? 'opacity-50' : ''}
                      transition-colors`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            {/* Third row: O-U */}
            <div className="flex gap-2">
              {ALL_LETTERS.slice(14, 21).map((letter) => {
                const hasRegions = (regionsByLetter[letter]?.length || 0) > 0;
                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterChange(letter)}
                    disabled={letter === currentLetter}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border
                      ${
                        letter === currentLetter
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      ${!hasRegions ? 'opacity-50' : ''}
                      transition-colors`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            {/* Fourth row: V-Z */}
            <div className="flex gap-2">
              {ALL_LETTERS.slice(21).map((letter) => {
                const hasRegions = (regionsByLetter[letter]?.length || 0) > 0;
                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterChange(letter)}
                    disabled={letter === currentLetter}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border
                      ${
                        letter === currentLetter
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      ${!hasRegions ? 'opacity-50' : ''}
                      transition-colors`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {searchQuery
          ? `Found ${filteredRegions.length} matching regions`
          : regionsByLetter[currentLetter].length > 0
          ? `Showing ${regionsByLetter[currentLetter].length} regions starting with "${currentLetter}"`
          : `No regions found starting with "${currentLetter}"`}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayRegions.map((region) => (
          <li key={region.slug}>
            <Link
              href={`/regions/${region.slug}`}
              className="block p-4 rounded-lg 
                border border-gray-200 dark:border-gray-700 
                hover:border-gray-300 dark:hover:border-gray-600 
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-lg capitalize">{region.name}</span>
                  {(region.city ||
                    region.state ||
                    region.zip ||
                    region.country) && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {[region.city, region.state, region.zip]
                        .filter(Boolean)
                        .join(', ')}
                      {region.country && (
                        <div className="mt-1">{region.country}</div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-gray-500 dark:text-gray-400">→</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filteredRegions.length === 0 && searchQuery && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No regions found matching &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}

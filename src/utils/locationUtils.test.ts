import { describe, it, expect } from 'vitest';
import { extractCityAndState } from './locationUtils';

describe('extractCityAndState', () => {
  it('extracts city and state from US address', () => {
    expect(
      extractCityAndState('123 Main St, Springfield, IL 62701, United States')
    ).toBe('Springfield, IL');
  });

  it('handles address without zip code', () => {
    expect(extractCityAndState('456 Oak Ave, Austin, TX')).toBe('Austin, TX');
  });

  it('handles address with zip and country', () => {
    expect(
      extractCityAndState(
        '26721 Hawks Prairie Blvd, Katy, TX, 77494, United States'
      )
    ).toBe('Katy, TX');
  });

  it('returns full string when no commas', () => {
    expect(extractCityAndState('Downtown Park')).toBe('Downtown Park');
  });

  it('returns empty string for empty input', () => {
    expect(extractCityAndState('')).toBe('');
  });

  it('handles international address with country code', () => {
    expect(extractCityAndState('10 Downing St, London, GB')).toBe('London, GB');
  });

  it('handles city and state only', () => {
    expect(extractCityAndState('Murrieta, CA')).toBe('Murrieta, CA');
  });

  it('handles address ending with US', () => {
    expect(extractCityAndState('100 Broadway, New York, NY 10001, US')).toBe(
      'New York, NY'
    );
  });
});

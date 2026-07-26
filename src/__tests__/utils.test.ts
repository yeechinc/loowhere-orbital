// @ts-nocheck

describe('getDistance', () => {
  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
  }

  test('returns meters when distance is less than 1km', () => {
    const result = getDistance(1.3521, 103.8198, 1.3530, 103.8200);
    expect(result).toMatch(/m$/);
    expect(result).not.toMatch(/km$/);
  });

  test('returns km when distance is more than 1km', () => {
    const result = getDistance(1.3521, 103.8198, 1.4000, 103.9000);
    expect(result).toMatch(/km$/);
  });

  test('returns 0m for same coordinates', () => {
    const result = getDistance(1.3521, 103.8198, 1.3521, 103.8198);
    expect(result).toBe('0m');
  });
});

describe('getMarkerColor', () => {
  function getMarkerColor(toilet: any): string {
    return toilet.has_paper ? "#1a56db" : "red";
  }

  test('returns blue when toilet has paper', () => {
    expect(getMarkerColor({ has_paper: true })).toBe("#1a56db");
  });

  test('returns red when toilet has no paper', () => {
    expect(getMarkerColor({ has_paper: false })).toBe("red");
  });

  test('returns red when has_paper is null', () => {
    expect(getMarkerColor({ has_paper: null })).toBe("red");
  });
});

describe('cleanAddress', () => {
  function cleanAddress(address: string): string {
    return address?.replace(/NIL/g, '').replace(/\s+/g, ' ').trim() || 'No address available';
  }

  test('removes NIL from address', () => {
    expect(cleanAddress('NIL YISHUN AVENUE 1 Singapore NIL')).toBe('YISHUN AVENUE 1 Singapore');
  });

  test('returns fallback for empty address', () => {
    expect(cleanAddress('')).toBe('No address available');
  });

  test('returns clean address unchanged', () => {
    expect(cleanAddress('2 Orchard Turn Singapore 238801')).toBe('2 Orchard Turn Singapore 238801');
  });
});

describe('getRankTitle', () => {
  function getRankTitle(points: number): string {
    if (points >= 200) return '👑 Loo King';
    if (points >= 101) return '🏆 Loo Legend';
    if (points >= 51) return '⭐ Loo Master';
    if (points >= 21) return '🔍 Loo Amateur';
    return '🚽 Loo Seeker';
  }

  test('returns Loo King for 200+ points', () => {
    expect(getRankTitle(200)).toBe('👑 Loo King');
    expect(getRankTitle(350)).toBe('👑 Loo King');
  });

  test('returns Loo Legend for 101-199 points', () => {
    expect(getRankTitle(101)).toBe('🏆 Loo Legend');
    expect(getRankTitle(199)).toBe('🏆 Loo Legend');
  });

  test('returns Loo Master for 51-100 points', () => {
    expect(getRankTitle(51)).toBe('⭐ Loo Master');
    expect(getRankTitle(100)).toBe('⭐ Loo Master');
  });

  test('returns Loo Amateur for 21-50 points', () => {
    expect(getRankTitle(21)).toBe('🔍 Loo Amateur');
    expect(getRankTitle(50)).toBe('🔍 Loo Amateur');
  });

  test('returns Loo Seeker for below 21 points', () => {
    expect(getRankTitle(0)).toBe('🚽 Loo Seeker');
    expect(getRankTitle(20)).toBe('🚽 Loo Seeker');
  });

  test('handles exact rank boundaries correctly', () => {
    expect(getRankTitle(50)).toBe('🔍 Loo Amateur');
    expect(getRankTitle(51)).toBe('⭐ Loo Master');
  });
});

describe('filterToilets', () => {
  const toilets = [
    { name: 'Toilet A', has_bidet: true, has_paper: true, handicapped_access: false },
    { name: 'Toilet B', has_bidet: false, has_paper: true, handicapped_access: true },
    { name: 'Toilet C', has_bidet: true, has_paper: false, handicapped_access: true },
    { name: 'Toilet D', has_bidet: false, has_paper: false, handicapped_access: false },
  ];

  function filterToilets(toilets: any[], filters: { bidet: boolean; paper: boolean; handicap: boolean }) {
    return toilets.filter((t) => {
      if (filters.bidet && !t.has_bidet) return false;
      if (filters.handicap && !t.handicapped_access) return false;
      if (filters.paper && !t.has_paper) return false;
      return true;
    });
  }

  test('returns all toilets when no filters active', () => {
    const result = filterToilets(toilets, { bidet: false, paper: false, handicap: false });
    expect(result.length).toBe(4);
  });

  test('filters by bidet only', () => {
    const result = filterToilets(toilets, { bidet: true, paper: false, handicap: false });
    expect(result.length).toBe(2);
    expect(result.map(t => t.name)).toEqual(['Toilet A', 'Toilet C']);
  });

  test('filters by paper only', () => {
    const result = filterToilets(toilets, { bidet: false, paper: true, handicap: false });
    expect(result.length).toBe(2);
  });

  test('filters by handicap only', () => {
    const result = filterToilets(toilets, { bidet: false, paper: false, handicap: true });
    expect(result.length).toBe(2);
  });

  test('filters by multiple criteria combined', () => {
    const result = filterToilets(toilets, { bidet: true, paper: false, handicap: true });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Toilet C');
  });

  test('returns empty when no toilets match all filters', () => {
    const result = filterToilets(toilets, { bidet: true, paper: true, handicap: true });
    expect(result.length).toBe(0);
  });
});

describe('calculateAverageRating', () => {
  function calculateAverageRating(reviews: { rating: number }[]): number {
    if (reviews.length === 0) return 0;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return Math.round(avg * 10) / 10;
  }

  test('returns 0 for no reviews', () => {
    expect(calculateAverageRating([])).toBe(0);
  });

  test('calculates average correctly', () => {
    expect(calculateAverageRating([{ rating: 4 }, { rating: 5 }, { rating: 3 }])).toBe(4);
  });

  test('rounds to one decimal place', () => {
    expect(calculateAverageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toBe(4.3);
  });

  test('handles single review', () => {
    expect(calculateAverageRating([{ rating: 5 }])).toBe(5);
  });
});

describe('searchToilets', () => {
  const toilets = [
    { name: 'Orchard MRT Toilet' },
    { name: 'Bugis Junction Toilet' },
    { name: 'ION Orchard B2' },
  ];

  function searchToilets(toilets: any[], query: string) {
    return toilets.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  test('finds toilets by partial name', () => {
    const result = searchToilets(toilets, 'orchard');
    expect(result.length).toBe(2);
  });

  test('is case insensitive', () => {
    const result = searchToilets(toilets, 'BUGIS');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Bugis Junction Toilet');
  });

  test('returns empty for no match', () => {
    const result = searchToilets(toilets, 'xyz');
    expect(result.length).toBe(0);
  });

  test('returns all toilets for empty query', () => {
    const result = searchToilets(toilets, '');
    expect(result.length).toBe(3);
  });
});
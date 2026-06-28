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

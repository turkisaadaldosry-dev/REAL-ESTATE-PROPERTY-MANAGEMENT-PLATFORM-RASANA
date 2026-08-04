import Papa from 'papaparse';

export async function fetchCsvText(sheetUrl: string): Promise<string> {
  const timestamp = Date.now();
  const cacheBusterUrl = sheetUrl.includes('?')
    ? `${sheetUrl}&_t=${timestamp}`
    : `${sheetUrl}?_t=${timestamp}`;

  // 1. Try server proxy endpoint first
  try {
    const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(cacheBusterUrl)}`;
    const res = await fetch(proxyUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Proxy fetch failed, attempting direct fetch fallback:', err);
  }

  // 2. Direct fetch fallback
  try {
    const res = await fetch(cacheBusterUrl, { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Direct fetch failed, trying PapaParse download fallback:', err);
  }

  // 3. PapaParse download fallback
  return new Promise((resolve, reject) => {
    Papa.parse(cacheBusterUrl, {
      download: true,
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data) {
          resolve(Papa.unparse(results.data));
        } else {
          reject(new Error('No data returned from CSV download'));
        }
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}

export async function parseCsvSheet(sheetUrl: string): Promise<string[][]> {
  const csvText = await fetchCsvText(sheetUrl);
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  return parsed.data || [];
}

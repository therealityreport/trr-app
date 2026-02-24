export interface PaginatedGalleryFetchOptions<T> {
  pageSize?: number;
  maxPages?: number;
  fetchPage: (offset: number, limit: number) => Promise<T[]>;
}

export interface PaginatedGalleryFetchResult<T> {
  rows: T[];
  truncated: boolean;
  pagesFetched: number;
  rowsFetched: number;
}

export async function fetchAllPaginatedGalleryRowsWithMeta<T>({
  pageSize = 500,
  maxPages = 40,
  fetchPage,
}: PaginatedGalleryFetchOptions<T>): Promise<PaginatedGalleryFetchResult<T>> {
  const effectivePageSize = Math.max(1, Math.floor(pageSize));
  const effectiveMaxPages = Math.max(1, Math.floor(maxPages));
  const rows: T[] = [];
  let offset = 0;
  let pagesFetched = 0;

  for (let page = 0; page < effectiveMaxPages; page += 1) {
    const pageRows = await fetchPage(offset, effectivePageSize);
    rows.push(...pageRows);
    pagesFetched += 1;
    if (pageRows.length < effectivePageSize) {
      return {
        rows,
        truncated: false,
        pagesFetched,
        rowsFetched: rows.length,
      };
    }
    offset += effectivePageSize;
  }

  return {
    rows,
    truncated: true,
    pagesFetched,
    rowsFetched: rows.length,
  };
}

export async function fetchAllPaginatedGalleryRows<T>({
  pageSize = 500,
  maxPages = 40,
  fetchPage,
}: PaginatedGalleryFetchOptions<T>): Promise<T[]> {
  const result = await fetchAllPaginatedGalleryRowsWithMeta({
    pageSize,
    maxPages,
    fetchPage,
  });
  if (result.truncated) {
    throw new Error("Gallery pagination exceeded safety limit.");
  }
  return result.rows;
}

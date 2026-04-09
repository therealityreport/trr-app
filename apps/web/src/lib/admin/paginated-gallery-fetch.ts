export interface PaginatedGalleryFetchOptions<T> {
  pageSize?: number;
  fetchPage: (
    cursor: string | null,
    limit: number,
  ) => Promise<{ rows: T[]; nextCursor: string | null }>;
}

export interface PaginatedGalleryFetchResult<T> {
  rows: T[];
  truncated: boolean;
  pagesFetched: number;
  rowsFetched: number;
}

export async function fetchAllPaginatedGalleryRowsWithMeta<T>({
  pageSize = 48,
  fetchPage,
}: PaginatedGalleryFetchOptions<T>): Promise<PaginatedGalleryFetchResult<T>> {
  const effectivePageSize = Math.max(1, Math.floor(pageSize));
  const rows: T[] = [];
  let pagesFetched = 0;
  let cursor: string | null = null;
  const seenCursors = new Set<string>();

  while (true) {
    const { rows: pageRows, nextCursor } = await fetchPage(cursor, effectivePageSize);
    rows.push(...pageRows);
    pagesFetched += 1;
    if (!nextCursor) {
      return {
        rows,
        truncated: false,
        pagesFetched,
        rowsFetched: rows.length,
      };
    }

    if (seenCursors.has(nextCursor)) {
      throw new Error("Gallery pagination cursor loop detected.");
    }

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
}

export async function fetchAllPaginatedGalleryRows<T>({
  pageSize = 48,
  fetchPage,
}: PaginatedGalleryFetchOptions<T>): Promise<T[]> {
  const result = await fetchAllPaginatedGalleryRowsWithMeta({
    pageSize,
    fetchPage,
  });
  return result.rows;
}

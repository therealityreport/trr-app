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

export interface GalleryInputConcurrencyOptions<TInput, TResult> {
  inputs: readonly TInput[];
  concurrency?: number;
  fetchInput: (input: TInput, index: number) => Promise<TResult>;
}

export async function mapGalleryInputsWithConcurrency<TInput, TResult>({
  inputs,
  concurrency = 2,
  fetchInput,
}: GalleryInputConcurrencyOptions<TInput, TResult>): Promise<TResult[]> {
  if (inputs.length === 0) return [];

  const effectiveConcurrency = Math.max(1, Math.floor(concurrency));
  const workerCount = Math.min(effectiveConcurrency, inputs.length);
  const results = new Array<TResult>(inputs.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= inputs.length) return;
        results[index] = await fetchInput(inputs[index], index);
      }
    })
  );

  return results;
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

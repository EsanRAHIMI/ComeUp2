const MIN_IMAGE_BYTES = 512;

export async function isReachableImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-2047' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });
    if (!(res.ok || res.status === 206)) return false;

    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!type.startsWith('image/')) return false;

    const bytes = await res.arrayBuffer();
    return bytes.byteLength >= MIN_IMAGE_BYTES;
  } catch {
    return false;
  }
}

export async function filterReachableCandidates<T extends { url: string }>(
  items: T[],
  limit = 12,
): Promise<T[]> {
  const verified: T[] = [];
  const queue = [...items];

  while (queue.length && verified.length < limit) {
    const batch = queue.splice(0, 4);
    const checks = await Promise.all(
      batch.map(async (item) => ({ item, ok: await isReachableImageUrl(item.url) })),
    );
    for (const check of checks) {
      if (check.ok) verified.push(check.item);
      if (verified.length >= limit) break;
    }
  }

  return verified;
}

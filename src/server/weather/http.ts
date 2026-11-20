/** Fixed public errors never carry upstream text, URLs, coordinates or binding values. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', ...extra },
  });
}

/** One deadline owns fetch AND body consumption; abort also cancels a stalled reader. */
export async function withDeadline<T>(
  milliseconds: number,
  work: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort = () => {};
  const deadline = new Promise<never>((_resolve, reject) => {
    const stop = (error: ApiError) => {
      controller.abort();
      reject(error);
    };
    onAbort = () => stop(new ApiError('WEATHER_UNAVAILABLE', 503));
    timer = setTimeout(() => stop(new ApiError('UPSTREAM_TIMEOUT', 504)), milliseconds);
    parent?.addEventListener('abort', onAbort, { once: true });
  });
  try {
    if (parent?.aborted) throw new ApiError('WEATHER_UNAVAILABLE', 503);
    return await Promise.race([work(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', onAbort);
  }
}

/** Bounded UTF-8 JSON only; callers put this read inside their request deadline. */
export async function readJson(source: Request | Response, limit: number, signal: AbortSignal): Promise<unknown> {
  const invalid = () => new ApiError('UPSTREAM_INVALID', 502);
  const length = source.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) {
    await source.body?.cancel().catch(() => {});
    throw invalid();
  }
  if (!source.body) throw invalid();
  const reader = source.body.getReader();
  let cancellation: Promise<void> | undefined;
  // Cancellation is cleanup only; its rejection must never replace the fixed public error.
  const cancel = () => {
    cancellation ??= reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    signal.throwIfAborted();
    for (;;) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        cancel();
        throw invalid();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    cancel();
    if (signal.aborted) throw error;
    throw invalid();
  } finally {
    signal.removeEventListener('abort', cancel);
    if (cancellation) await cancellation;
    reader.releaseLock();
  }
}

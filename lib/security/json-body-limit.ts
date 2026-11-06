/** Read JSON with a max raw byte size (mitigates huge POST bodies). */
export async function readJsonWithLimit<T>(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const clone = request.clone();
  const buf = await clone.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    return { ok: false, error: "Request body too large." };
  }
  try {
    const text = new TextDecoder().decode(buf);
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
}

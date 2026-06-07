/*
 * SPAZEHAUS — client-side upload validation
 *
 * The `accept` attribute on <input type="file"> is advisory only (drag/drop,
 * mobile pickers, and renamed files bypass it), and the bucket's stated limits
 * aren't enforced until the upload fails late. These checks reject bad files
 * early with a clear message. Server/bucket-side limits should still back this.
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Returns an error message if the file is invalid, or null if it's acceptable.
 * `allowed` accepts exact MIME types ("application/pdf") or wildcards ("image/*").
 */
export function validateUploadFile(
  file: File,
  allowed: string[],
  maxBytes: number = MAX_UPLOAD_BYTES,
): string | null {
  const typeOk = allowed.some((a) =>
    a.endsWith("/*") ? file.type.startsWith(a.slice(0, -1)) : a === file.type,
  );
  if (!typeOk) {
    const human = allowed.map((a) => a.replace("/*", "").split("/").pop()).join(", ");
    return `Unsupported file type. Allowed: ${human}.`;
  }
  if (file.size > maxBytes) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${Math.floor(maxBytes / 1024 / 1024)} MB.`;
  }
  return null;
}

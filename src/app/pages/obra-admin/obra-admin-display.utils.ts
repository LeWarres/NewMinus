export function buildObraImageUrl(
  siteUrl: string,
  path?: string | null,
  fallback: string = '/obras/paleta/portada.png'
): string {
  const finalPath = path || fallback;

  if (finalPath.startsWith('http')) {
    return finalPath;
  }

  if (finalPath.startsWith('/')) {
    return finalPath;
  }

  return `${siteUrl}/${finalPath}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

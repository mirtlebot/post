export function getImageFileFromClipboard(clipboardData) {
  if (!clipboardData) {
    return null;
  }

  const clipboardItems = Array.from(clipboardData.items || []);
  for (const item of clipboardItems) {
    if (item.kind !== 'file' || !item.type?.startsWith('image/')) {
      continue;
    }

    const file = item.getAsFile?.() || null;
    if (file) {
      return file;
    }
  }

  const clipboardFiles = Array.from(clipboardData.files || []);
  return clipboardFiles.find((file) => file.type?.startsWith('image/')) || null;
}

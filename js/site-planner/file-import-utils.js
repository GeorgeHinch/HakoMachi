export function isLikelyHakoBuildingFile(file) {
  return /\.(hako|hakoseed|hakoplan|json)$/i.test(file?.name || '');
}

export function isSitePlanFile(file) {
  return /\.hako-site\.json$/i.test(file?.name || '');
}

export function hakoFileFromDataTransfer(dataTransfer) {
  const files = Array.from(dataTransfer?.files || []);
  return files.find(isLikelyHakoBuildingFile) || null;
}

export function pageHakoImportFileFromDataTransfer(dataTransfer) {
  const files = Array.from(dataTransfer?.files || []);
  return files.find(file => isLikelyHakoBuildingFile(file) && !isSitePlanFile(file)) || null;
}

export function dataTransferHasFile(dataTransfer) {
  const items = Array.from(dataTransfer?.items || []);
  return items.some(item => item.kind === 'file') || (dataTransfer?.files?.length || 0) > 0;
}

export function isSupportedImageFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return type.startsWith('image/') || /\.(png|jpe?g|svg|webp)$/i.test(name);
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image file.'));
    reader.onload = ev => resolve(ev.target.result);
    reader.readAsDataURL(file);
  });
}

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

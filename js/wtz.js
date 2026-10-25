// .wtz file format: ZIP containing state.json + original.png
// Cross-compatible with the Wenztitch desktop app

async function saveWtz(appState, filename) {
  if (!filename) filename = 'pattern.wtz';
  if (!filename.endsWith('.wtz')) filename += '.wtz';

  const zip = new JSZip();

  const stateData = {
    grid_pixels: appState.gridPixels,
    palette: appState.palette,
    overrides: appState.overrides,
    symbol_map: appState.symbolMap,
    grid_w: appState.gridW,
    grid_h: appState.gridH,
    color_n: appState.colorN,
    circular: appState.circular,
    aspect: appState.aspect,
    aida_count: appState.aidaCount,
    view: appState.view,
    cloth_color: appState.clothColor,
    stitched: appState.stitched,   // web extension; desktop ignores it
  };

  zip.file('state.json', JSON.stringify(stateData));

  if (appState.origDataUrl) {
    const base64 = appState.origDataUrl.split(',')[1];
    zip.file('original.png', base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerDownload(blob, filename);
}

async function loadWtz(file) {
  const zip = await JSZip.loadAsync(file);

  const stateJson = await zip.file('state.json').async('text');
  const stateData = JSON.parse(stateJson);

  let origDataUrl = null;
  const pngFile = zip.file('original.png');
  if (pngFile) {
    const base64 = await pngFile.async('base64');
    origDataUrl = `data:image/png;base64,${base64}`;
  }

  // Normalise keys that may differ between desktop and web versions
  const s = {
    gridPixels:  stateData.grid_pixels ?? null,
    palette:     stateData.palette     ?? [],
    overrides:   stateData.overrides   ?? {},
    symbolMap:   stateData.symbol_map  ?? {},
    gridW:       stateData.grid_w      ?? 60,
    gridH:       stateData.grid_h      ?? 60,
    colorN:      stateData.color_n     ?? 10,
    circular:    stateData.circular    ?? false,
    aspect:      stateData.aspect      ?? true,
    aidaCount:   stateData.aida_count  ?? 14,
    view:        stateData.view        ?? 'both',
    clothColor:  stateData.cloth_color ?? '#F5F0E8',
    stitched:    stateData.stitched    ?? {},
    origDataUrl,
  };

  return s;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

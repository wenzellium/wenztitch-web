// Median-cut color quantization for image → cross-stitch grid conversion

function medianCutQuantize(pixels, numColors) {
  if (pixels.length === 0) return Array.from({ length: numColors }, () => [128, 128, 128]);

  function range(bucket) {
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (const [r, g, b] of bucket) {
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (g < minG) minG = g; if (g > maxG) maxG = g;
      if (b < minB) minB = b; if (b > maxB) maxB = b;
    }
    const rR = maxR - minR, rG = maxG - minG, rB = maxB - minB;
    const ch = rR >= rG && rR >= rB ? 0 : rG >= rB ? 1 : 2;
    return { span: Math.max(rR, rG, rB), ch };
  }

  function avg(bucket) {
    let r = 0, g = 0, b = 0;
    for (const p of bucket) { r += p[0]; g += p[1]; b += p[2]; }
    const n = bucket.length;
    return [r / n | 0, g / n | 0, b / n | 0];
  }

  let buckets = [pixels.slice()];

  while (buckets.length < numColors) {
    let maxSpan = -1, maxIdx = 0;
    for (let i = 0; i < buckets.length; i++) {
      const { span } = range(buckets[i]);
      if (span > maxSpan) { maxSpan = span; maxIdx = i; }
    }
    if (maxSpan === 0) break;

    const bucket = buckets.splice(maxIdx, 1)[0];
    const { ch } = range(bucket);
    bucket.sort((a, b) => a[ch] - b[ch]);
    const mid = Math.ceil(bucket.length / 2);
    buckets.push(bucket.slice(0, mid), bucket.slice(mid));
  }

  return buckets.map(avg);
}

function nearestPaletteIdx(r, g, b, palette) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Main entry point: draw image to an offscreen canvas at W×H, quantize
// Returns { palette: [[r,g,b],...], gridPixels: [[idx,...],...] }
async function processImageToGrid(imgSrc, W, H, numColors, aspectLock, circular) {
  const img = await loadImage(imgSrc);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  if (aspectLock) {
    const scale = Math.min(W / img.width, H / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const scale = Math.max(W / img.width, H / img.height);
    const sw = W / scale, sh = H / scale;
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  }

  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;

  // Collect non-transparent pixels for quantization
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 127) pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const rawPalette = medianCutQuantize(pixels, numColors);

  // Build gridPixels: map each pixel to nearest palette entry
  const gridPixels = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] <= 127) {
        row.push(-1);
      } else {
        row.push(nearestPaletteIdx(data[i], data[i + 1], data[i + 2], rawPalette));
      }
    }
    gridPixels.push(row);
  }

  // Map each raw palette color to nearest DMC
  const palette = rawPalette.map(([r, g, b]) => findNearestDmc(r, g, b));

  // Deduplicate: if two raw palette entries map to same DMC, merge their pixels
  // (keep first occurrence; remap others to it)
  const codeToIdx = {};
  const remapTable = {};
  const finalPalette = [];
  for (let i = 0; i < palette.length; i++) {
    const code = palette[i][0];
    if (code in codeToIdx) {
      remapTable[i] = codeToIdx[code];
    } else {
      codeToIdx[code] = finalPalette.length;
      remapTable[i] = finalPalette.length;
      finalPalette.push(palette[i]);
    }
  }

  // Apply remap
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (gridPixels[y][x] >= 0) gridPixels[y][x] = remapTable[gridPixels[y][x]];
    }
  }

  return { palette: finalPalette, gridPixels };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

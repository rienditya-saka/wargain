const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = 'C:\\Users\\rienditya.firmansyah\\.gemini\\antigravity-ide\\brain\\5576faff-8126-4c41-b663-8eb54d54e19a\\.user_uploaded\\media_1789796304931.jpg';
const outputDir = path.join(__dirname, '..', 'public', 'images');
const outputPath = path.join(outputDir, 'logo.png');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function removeBackground() {
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  // info has width, height, channels (3 for RGB, 4 for RGBA)
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // Create RGBA buffer
  const rgbaData = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];

    rgbaData[i * 4] = r;
    rgbaData[i * 4 + 1] = g;
    rgbaData[i * 4 + 2] = b;

    // Check if pixel is white / light background (R, G, B all > 230)
    // Smooth threshold anti-aliasing for natural transparent edge
    if (r > 240 && g > 240 && b > 240) {
      rgbaData[i * 4 + 3] = 0; // Fully transparent
    } else if (r > 220 && g > 220 && b > 220) {
      // Semi-transparent edge smoothing
      const maxVal = Math.max(r, g, b);
      const alpha = Math.round((255 - maxVal) / 35 * 255);
      rgbaData[i * 4 + 3] = Math.max(0, Math.min(255, alpha));
    } else {
      rgbaData[i * 4 + 3] = 255; // Fully opaque
    }
  }

  await sharp(rgbaData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);

  console.log(`Successfully processed logo to transparent PNG: ${outputPath}`);
}

removeBackground().catch(err => {
  console.error('Error removing background:', err);
});

#!/usr/bin/env node

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

// Use createRequire to load sharp from root node_modules
const require = createRequire(import.meta.url);
const sharp = require('/home/user/routine-app/node_modules/sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../');
const logoPath = join(projectRoot, 'public/images/logo-icon-dark-theme.png');
const resPath = join(projectRoot, 'mobile/android/app/src/main/res');

// Background color for dark theme
const bgColor = '#0E1011';
const bgColorRGB = { r: 14, g: 16, b: 17 }; // #0E1011 in RGB

// Launcher icon configurations: name -> size in pixels
const launcherIconSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

// Adaptive icon foreground configurations (with safe zone ~60%)
const adaptiveIconSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

// Splash screen configurations: { portrait: WxH, landscape: WxH }
const splashScreenSizes = {
  mdpi: { portrait: [320, 480], landscape: [480, 320] },
  hdpi: { portrait: [480, 800], landscape: [800, 480] },
  xhdpi: { portrait: [720, 1280], landscape: [1280, 720] },
  xxhdpi: { portrait: [960, 1600], landscape: [1600, 960] },
  xxxhdpi: { portrait: [1280, 1920], landscape: [1920, 1280] },
};

/**
 * Create a rounded icon with #0E1011 background (Android handles rounding)
 */
async function createRoundedIcon(inputBuffer, size) {
  // Resize logo to ~70% of canvas without padding
  const logoSize = Math.round(size * 0.7);

  const logoResized = await sharp(inputBuffer)
    .resize(logoSize, logoSize, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Create dark background icon (same as square but for rounded system use)
  // Android's adaptive icon system will apply the shape
  const icon = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: bgColorRGB,
    },
  })
    .composite([
      {
        input: logoResized,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  return icon;
}

/**
 * Create adaptive icon foreground with transparent background (no padding)
 */
async function createAdaptiveIconForeground(inputBuffer, size) {
  // Scale logo to ~60% of the canvas size for safe zone
  const logoSize = Math.round(size * 0.6);

  // Resize logo without padding (fit: 'inside')
  const logoResized = await sharp(inputBuffer)
    .resize(logoSize, logoSize, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Create transparent canvas and composite logo centered
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent
    },
  })
    .composite([
      {
        input: logoResized,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();
}

/**
 * Create a splash screen with logo centered (~25% width on dark background)
 */
async function createSplashScreen(inputBuffer, width, height) {
  // Calculate logo size: ~25% of screen width
  const logoWidth = Math.round(width * 0.25);

  // Resize logo without padding (fit: 'inside')
  const logoResized = await sharp(inputBuffer)
    .resize(logoWidth, logoWidth, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Create dark background with logo centered
  const splash = await sharp({
    create: {
      width: width,
      height: height,
      channels: 3,
      background: bgColorRGB,
    },
  })
    .composite([
      {
        input: logoResized,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  return splash;
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Main generation function
 */
async function generateAssets() {
  console.log('🎨 Generating Android assets...\n');

  // Read logo
  let logoBuffer;
  try {
    logoBuffer = await sharp(logoPath).png().toBuffer();
    console.log(`✓ Loaded logo from ${logoPath}`);
  } catch (err) {
    console.error(`✗ Failed to load logo: ${err.message}`);
    process.exit(1);
  }

  try {
    // 1. Generate launcher icons (square with dark background)
    console.log('\n📱 Generating launcher icons...');
    for (const [density, size] of Object.entries(launcherIconSizes)) {
      const dir = join(resPath, `mipmap-${density}`);
      ensureDir(dir);

      // Resize logo to ~70% of canvas without padding
      const logoSize = Math.round(size * 0.7);
      const logoResized = await sharp(logoBuffer)
        .resize(logoSize, logoSize, { fit: 'inside', withoutEnlargement: true })
        .ensureAlpha()
        .toBuffer();

      // Create dark background and composite logo
      const bg = await sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: bgColorRGB,
        },
      })
        .png()
        .toBuffer();

      const icon = await sharp(bg)
        .composite([
          {
            input: logoResized,
            gravity: 'center',
          },
        ])
        .png()
        .toBuffer();

      const iconPath = join(dir, 'ic_launcher.png');
      writeFileSync(iconPath, icon);
      console.log(`  ✓ ${density}: ${size}x${size} (70% centered on #0E1011) → ${iconPath}`);
    }

    // 2. Generate launcher icons (rounded)
    console.log('\n🎯 Generating rounded launcher icons...');
    for (const [density, size] of Object.entries(launcherIconSizes)) {
      const dir = join(resPath, `mipmap-${density}`);
      ensureDir(dir);

      const rounded = await createRoundedIcon(logoBuffer, size);
      const iconPath = join(dir, 'ic_launcher_round.png');
      writeFileSync(iconPath, rounded);
      console.log(`  ✓ ${density}: ${size}x${size} (circular on #0E1011) → ${iconPath}`);
    }

    // 3. Generate adaptive icon foreground
    console.log('\n🔲 Generating adaptive icon foreground...');
    for (const [density, size] of Object.entries(adaptiveIconSizes)) {
      const dir = join(resPath, `mipmap-${density}`);
      ensureDir(dir);

      const result = await createAdaptiveIconForeground(logoBuffer, size);

      const iconPath = join(dir, 'ic_launcher_foreground.png');
      writeFileSync(iconPath, result);
      console.log(`  ✓ ${density}: ${size}x${size} (60% safe zone, transparent) → ${iconPath}`);
    }

    // 4. Generate splash screens (portrait and landscape)
    console.log('\n🌅 Generating splash screens...');
    for (const [density, sizes] of Object.entries(splashScreenSizes)) {
      // Portrait
      const portDir = join(resPath, `drawable-port-${density}`);
      ensureDir(portDir);
      const [portW, portH] = sizes.portrait;
      const portSplash = await createSplashScreen(logoBuffer, portW, portH);
      const portPath = join(portDir, 'splash.png');
      writeFileSync(portPath, portSplash);
      console.log(`  ✓ ${density} portrait: ${portW}x${portH} → ${portPath}`);

      // Landscape
      const landDir = join(resPath, `drawable-land-${density}`);
      ensureDir(landDir);
      const [landW, landH] = sizes.landscape;
      const landSplash = await createSplashScreen(logoBuffer, landW, landH);
      const landPath = join(landDir, 'splash.png');
      writeFileSync(landPath, landSplash);
      console.log(`  ✓ ${density} landscape: ${landW}x${landH} → ${landPath}`);
    }

    // 5. Update background color XML
    console.log('\n🎨 Updating launcher background color...');
    const valuesDir = join(resPath, 'values');
    ensureDir(valuesDir);
    const bgColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${bgColor}</color>
</resources>`;
    const bgPath = join(valuesDir, 'ic_launcher_background.xml');
    writeFileSync(bgPath, bgColorXml);
    console.log(`  ✓ Background color set to ${bgColor} → ${bgPath}`);

    console.log('\n✅ All Android assets generated successfully!\n');
    console.log('📋 Summary:');
    console.log('  • 10 launcher icons (square): mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi');
    console.log('  • 10 rounded launcher icons: mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi');
    console.log('  • 10 adaptive icon foregrounds: mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi');
    console.log('  • 10 splash screens (5 portrait + 5 landscape)');
    console.log('  • 1 launcher background color XML');

  } catch (err) {
    console.error(`\n✗ Error generating assets: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

generateAssets();

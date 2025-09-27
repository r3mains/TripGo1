const fs = require("fs");
const path = require("path");

// Create a simple base64 encoded PNG icon (1x1 pixel colored square)
// This is a minimal valid PNG that browsers will accept
const createMinimalPNG = (size, color = "#667eea") => {
  // Minimal PNG data for a colored square - this is a valid 1x1 PNG
  const pngData =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8jnAAAAABJRU5ErkJggg==";
  return Buffer.from(pngData, "base64");
};

// Icon sizes required for PWA
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

console.log("Creating valid PNG icons for PWA...");

iconSizes.forEach((size) => {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(__dirname, filename);

  // Create minimal valid PNG
  const pngBuffer = createMinimalPNG(size);

  try {
    fs.writeFileSync(filepath, pngBuffer);
    console.log(`✅ Created ${filename} (${pngBuffer.length} bytes)`);
  } catch (error) {
    console.error(`❌ Failed to create ${filename}:`, error.message);
  }
});

console.log("✅ Icon generation complete! All icons are now valid PNG files.");
console.log(
  "📝 Note: These are minimal placeholder icons. Replace with proper branded icons for production."
);

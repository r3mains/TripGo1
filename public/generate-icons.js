const fs = require("fs");
const path = require("path");

// Simple icon generator for TripGo PWA
// This creates basic placeholder icons - replace with proper icon generation in production

const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = __dirname;

// Base64 encoded minimal PNG icon (32x32)
const basePNG =
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVFiFtZdNaFxVFIC/8+bNm5dJJpNMkqZJ2rRp0/6ktFBaEGvBhYILF4ILV7pwIbhx4cKFC0UXLly4cOHChQsXLly4cOHChQsXLhTBhQuFQrHSWtpSaZu0TZs0aZrJZDJv3pu5y4J5b94kk8kE7oE798f3nfPu/e69IiJcSbIsm2VZxnEcx3Ecx3Ecx3EcJwAArbWllLKUUpZSylJKWUopSyllKaUspZSllLKUUpZSylJKWUopC0Arpayltbbc3NzMzMzMzMzMzMzMzMzMzMzMzMxaW0trbblcruE4DuM4juM4juM4juM4juM4juM4juM4jmOMKYuxmLGYiyle38VcSSlFwlj3v+3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3frm/Xt+vb9e36dn27vl3f";

// Create icon files
iconSizes.forEach((size) => {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(publicDir, filename);

  // Create a simple colored square as placeholder
  const canvas = createCanvas(size);
  const ctx = canvas.getContext("2d");

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#667eea");
  gradient.addColorStop(1, "#764ba2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add car emoji or simple icon
  ctx.fillStyle = "white";
  ctx.font = `${size * 0.5}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🚗", size / 2, size / 2);

  // Save as PNG
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filepath, buffer);

  console.log(`Created ${filename}`);
});

function createCanvas(size) {
  // Simple canvas implementation for generating icons
  // In a real implementation, use node-canvas or similar
  return {
    width: size,
    height: size,
    getContext: () => ({
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      fillRect: () => {},
      fillText: () => {},
      set fillStyle(value) {},
      set font(value) {},
      set textAlign(value) {},
      set textBaseline(value) {},
    }),
    toBuffer: () => Buffer.from(basePNG, "base64"),
  };
}

console.log("Icon generation complete!");

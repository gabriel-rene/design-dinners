// Gmail does not render SVG, so emails use a PNG copy of the mascot.
// Run: node scripts/make-mascot-email.mjs
import sharp from "sharp";

await sharp("public/brand/mascot-full-color.svg", { density: 400 })
  .rotate(7, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize({ width: 192 })
  .png({ compressionLevel: 9 })
  .toFile("public/brand/mascot-email.png");
console.log("Wrote public/brand/mascot-email.png");

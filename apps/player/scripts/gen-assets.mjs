// Generates PWA icons + Phase 0 spike test assets into public/.
// Run: pnpm gen-assets   (uses sharp, already a devDep of this package)
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const spike = join(pub, "spike");
const icons = join(pub, "icons");
await mkdir(spike, { recursive: true });
await mkdir(icons, { recursive: true });

// ---- WAV writer (16-bit PCM mono 22050 Hz) ---------------------------------
function wav(samples, rate = 22050) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function tone(freq, seconds, rate = 22050) {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    // gentle attack/release envelope to avoid clicks
    const env = Math.min(1, t / 0.01, (seconds - t) / 0.05);
    out[i] = Math.sin(2 * Math.PI * freq * t) * 0.6 * Math.max(0, env);
  }
  return out;
}

// ---- icons ------------------------------------------------------------------
const iconSvg = (size, pad = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#4f7cff"/>
<g transform="translate(${size * 0.5},${size * 0.52})">
  <path d="M ${-size * 0.26} ${-size * 0.18} q ${size * 0.26} ${-size * 0.14} ${size * 0.26} 0 q ${size * 0.26} ${-size * 0.14} ${size * 0.26} ${size * 0.18} l 0 ${size * 0.3} q ${-size * 0.26} ${-size * 0.32} ${-size * 0.26} ${-size * 0.18} q ${-size * 0.26} ${-size * 0.14} ${-size * 0.26} ${-size * 0.18} z" fill="#fff" transform="translate(${-size * 0.26}, ${size * 0.08}) scale(1)"/>
  <circle cx="${size * 0.13}" cy="${-size * 0.24}" r="${size * 0.05}" fill="#ffd94f"/>
  <path d="M ${size * 0.13} ${-size * 0.24} l ${size * 0.09} ${-size * 0.1} M ${size * 0.13} ${-size * 0.24} l ${size * 0.14} ${size * 0.02} M ${size * 0.13} ${-size * 0.24} l ${size * 0.02} ${-size * 0.15}" stroke="#ffd94f" stroke-width="${size * 0.028}" stroke-linecap="round"/>
  <path d="M ${-size * 0.26} ${-size * 0.1} v ${size * 0.34}" stroke="#4f7cff" stroke-width="${size * 0.02}" transform="translate(${size * 0.0},0)"/>
</g>
<text x="${size * 0.5}" y="${size * 0.86}" font-family="Arial" font-weight="bold" font-size="${size * 0.14}" fill="#fff" text-anchor="middle">PB</text>
</svg>`;

const maskableSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
<rect width="${size}" height="${size}" fill="#4f7cff"/>
<text x="${size * 0.5}" y="${size * 0.58}" font-family="Arial" font-weight="bold" font-size="${size * 0.42}" fill="#fff" text-anchor="middle">PB</text>
</svg>`;

await sharp(Buffer.from(iconSvg(512))).png().toFile(join(icons, "icon-512.png"));
await sharp(Buffer.from(iconSvg(192))).png().toFile(join(icons, "icon-192.png"));
await sharp(Buffer.from(iconSvg(180))).png().toFile(join(icons, "apple-touch-icon.png"));
await sharp(Buffer.from(maskableSvg(512))).png().toFile(join(icons, "icon-512-maskable.png"));

// ---- spike assets ------------------------------------------------------------
// 6 beeps rising in pitch for the unlock/sequence test (test 2)
for (let i = 1; i <= 6; i++) {
  await writeFile(join(spike, `beep-${i}.wav`), wav(tone(330 + i * 80, 0.7)));
}

// 30 numbered images (test 10)
for (let i = 1; i <= 30; i++) {
  const n = String(i).padStart(2, "0");
  const hue = (i * 37) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" rx="24" fill="hsl(${hue} 65% 55%)"/>
    <text x="100" y="118" font-family="Arial" font-weight="bold" font-size="64" fill="#fff" text-anchor="middle">${i}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(spike, `img-${n}.png`));
}

// 100 short audio clips (test 10) — varied tones so decode is realistic
for (let i = 1; i <= 100; i++) {
  const n = String(i).padStart(3, "0");
  const f = 220 + ((i * 53) % 660);
  await writeFile(join(spike, `snd-${n}.wav`), wav(tone(f, 0.5 + (i % 4) * 0.2)));
}

console.log("generated: 4 icons, 6 beeps, 30 images, 100 clips");

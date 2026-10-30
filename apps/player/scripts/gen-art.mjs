// Generates app art via the local ComfyUI (FLUX schnell GGUF + flat-vector
// LoRA), downloads results, and resizes into public/art/.
// Requires ComfyUI running on 127.0.0.1:8188 (start-comfyui.bat).
// Run: pnpm gen-art
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const COMFY = "http://127.0.0.1:8188";
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "art");
mkdirSync(outDir, { recursive: true });

const STYLE =
  ", flat vector illustration, cute children's book style, simple rounded shapes, soft pastel colors, plain solid cream background (#fdf6ec), no text, no words, friendly and warm";

const JOBS = [
  {
    file: "mascot.png",
    prompt:
      "adorable little fox cub sitting and reading a big open picture book, tail curled around, big kind eyes" + STYLE,
  },
  {
    file: "mascot-wave.png",
    prompt:
      "adorable little fox cub standing and waving one paw hello, big happy smile" + STYLE,
  },
  {
    file: "sticker-star.png",
    prompt:
      "golden star reward badge with a happy smiling face, sparkle accents" + STYLE,
  },
  {
    file: "sticker-chest.png",
    prompt:
      "cute wooden treasure chest overflowing with gold coins and a glowing star" + STYLE,
  },
  {
    file: "sticker-rocket.png",
    prompt:
      "cute round rocket ship flying upward with soft puffy smoke trail" + STYLE,
  },
  {
    file: "vocab-nugget.png",
    prompt:
      "a shiny gold nugget with sparkle highlights on a small pile of river stones" + STYLE,
  },
  {
    file: "vocab-pan.png",
    prompt:
      "a shallow round gold-panning pan with tiny gold flecks inside, river water splashing" + STYLE,
  },
  {
    file: "vocab-steer.png",
    prompt:
      "a cute brown young steer cow with small horns standing in a prairie field" + STYLE,
  },
  {
    file: "vocab-sunrise.png",
    prompt:
      "cheerful yellow sun rising over green hills saying good morning, soft rays" + STYLE,
  },
];

const workflow = (prompt, seed, prefix) => ({
  "1": {
    class_type: "UnetLoaderGGUF",
    inputs: { unet_name: "flux1-schnell-Q4_K_S.gguf" },
  },
  "2": {
    class_type: "DualCLIPLoader",
    inputs: {
      clip_name1: "clip_l.safetensors",
      clip_name2: "t5xxl_fp8_e4m3fn.safetensors",
      type: "flux",
    },
  },
  "3": { class_type: "VAELoader", inputs: { vae_name: "ae.safetensors" } },
  "4": {
    class_type: "LoraLoader",
    inputs: {
      lora_name: "Flat vector shapes_000003000.safetensors",
      strength_model: 0.85,
      strength_clip: 0.85,
      model: ["1", 0],
      clip: ["2", 0],
    },
  },
  "5": {
    class_type: "CLIPTextEncode",
    inputs: { text: prompt, clip: ["4", 1] },
  },
  "6": {
    class_type: "CLIPTextEncode",
    inputs: { text: "blurry, text, watermark, photorealistic", clip: ["4", 1] },
  },
  "7": {
    class_type: "EmptyLatentImage",
    inputs: { width: 768, height: 768, batch_size: 1 },
  },
  "8": {
    class_type: "KSampler",
    inputs: {
      seed,
      steps: 4,
      cfg: 1,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1,
      model: ["4", 0],
      positive: ["5", 0],
      negative: ["6", 0],
      latent_image: ["7", 0],
    },
  },
  "9": {
    class_type: "VAEDecode",
    inputs: { samples: ["8", 0], vae: ["3", 0] },
  },
  "10": {
    class_type: "SaveImage",
    inputs: { filename_prefix: prefix, images: ["9", 0] },
  },
});

async function queue(prompt, seed, prefix) {
  const res = await fetch(`${COMFY}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow(prompt, seed, prefix) }),
  });
  if (!res.ok) throw new Error(`queue failed: ${res.status} ${await res.text()}`);
  return (await res.json()).prompt_id;
}

async function waitForImage(promptId, timeoutMs = 300000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const h = await fetch(`${COMFY}/history/${promptId}`).then((r) => r.json());
    const entry = h[promptId];
    if (entry?.status?.completed || entry?.outputs) {
      const imgs = entry.outputs?.["10"]?.images;
      if (imgs?.length) return imgs[0];
      if (entry?.status?.status_str === "error")
        throw new Error(JSON.stringify(entry.status.messages ?? entry.status));
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("timeout waiting for image");
}

for (const [i, job] of JOBS.entries()) {
  const prefix = `pagebuddy/${job.file.replace(".png", "")}`;
  process.stdout.write(`${job.file}: queuing… `);
  const id = await queue(job.prompt, 4200 + i * 137, prefix);
  const img = await waitForImage(id);
  const buf = Buffer.from(
    await (
      await fetch(
        `${COMFY}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${img.type}`,
      )
    ).arrayBuffer(),
  );
  await sharp(buf).resize(512, 512).png().toFile(join(outDir, job.file));
  console.log(`done (${(buf.length / 1024).toFixed(0)}KB → 512px)`);
}
console.log(`art complete → ${outDir}`);

// Generates app art via the local ComfyUI (FLUX schnell GGUF + flat-vector
// LoRA), downloads results, and resizes into public/art/.
// Requires ComfyUI running on 127.0.0.1:8188 (start-comfyui.bat).
// Run: pnpm gen-art
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
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
  // ---- Arabic unit-1 vocab art (Dealing with Others) ----
  {
    file: "ar-karim.png",
    prompt:
      "happy little boy in white thobe giving a wrapped gift to his friend, generous sharing" + STYLE,
  },
  {
    file: "ar-taawun.png",
    prompt:
      "two smiling children carrying a cardboard box together, teamwork cooperation" + STYLE,
  },
  {
    file: "ar-sadiq.png",
    prompt:
      "honest little boy raising his hand to tell the truth, sincere happy face" + STYLE,
  },
  {
    file: "ar-rahim.png",
    prompt:
      "kind boy gently helping an elderly man carry his grocery bag, compassion" + STYLE,
  },
  {
    file: "ar-muhadhdhab.png",
    prompt:
      "polite boy in white thobe greeting an adult with a respectful handshake and smile" + STYLE,
  },
  {
    file: "ar-amin.png",
    prompt:
      "honest boy returning a dropped wallet to a thankful man, trustworthiness" + STYLE,
  },
  {
    file: "ar-iqlaaq.png",
    prompt:
      "big passenger airplane taking off into a bright sky, runway below, takeoff" + STYLE,
  },
  {
    file: "ar-mudhif.png",
    prompt:
      "friendly smiling flight attendant in uniform welcoming passengers inside airplane cabin" + STYLE,
  },
  {
    file: "ar-dajij.png",
    prompt:
      "noisy children shouting and running in airplane aisle, a boy covering his ears, commotion" + STYLE,
  },
  {
    file: "ar-yutali.png",
    prompt:
      "boy sitting in an airplane seat happily reading a colorful magazine" + STYLE,
  },
  // app icon — mascot face, centered, works small
  {
    file: "icon-art.png",
    prompt:
      "cute fox cub face head icon, centered symmetrical portrait, big friendly eyes, warm orange fur, simple bold app-icon style, cream background" + STYLE,
  },
  // ---- English ch01 remaining vocab (Gold Rush lesson) ----
  {
    file: "vocab-panned.png",
    prompt:
      "young boy kneeling by a river panning for gold with a round pan, water swirling" + STYLE,
  },
  {
    file: "vocab-bolted.png",
    prompt:
      "two twin boys sitting bolt upright in a bed, startled wide awake, morning light" + STYLE,
  },
  {
    file: "vocab-washedaway.png",
    prompt:
      "river current washing away small pebbles and dirt downstream, swirling water" + STYLE,
  },
  {
    file: "vocab-headed.png",
    prompt:
      "line of pioneer families with wagons walking toward a small mountain town in the distance" + STYLE,
  },
  {
    file: "vocab-strike.png",
    prompt:
      "excited prospector holding up a shiny gold nugget triumphantly, strike gold moment" + STYLE,
  },
  // ---- Arabic bad-trait vignettes (book teaches them as what NOT to be) ----
  {
    file: "ar-mubadhdhir.png",
    prompt:
      "boy leaving the water tap running wastefully, water overflowing from sink" + STYLE,
  },
  {
    file: "ar-tammaa.png",
    prompt:
      "greedy little boy grabbing a whole plate of sweets for himself, other kid watching sadly" + STYLE,
  },
  {
    file: "ar-kadhdhab.png",
    prompt:
      "boy hiding a broken vase behind his back looking guilty, telling a fib" + STYLE,
  },
  {
    file: "ar-ghashshash.png",
    prompt:
      "boy peeking at a classmate's exam paper trying to cheat, school desk" + STYLE,
  },
  {
    file: "ar-dhalim.png",
    prompt:
      "bigger boy snatching a toy away from a smaller sad child, unfair bullying" + STYLE,
  },
  {
    file: "ar-bakhil.png",
    prompt:
      "stingy boy hugging all his toys to his chest refusing to share, other kid reaching" + STYLE,
  },
  {
    file: "ar-musharrifa.png",
    prompt:
      "kind female supervisor in hijab with a clipboard organizing children in a line" + STYLE,
  },
  {
    file: "ar-hady.png",
    prompt:
      "glowing lantern lighting a winding path at dusk, guidance light" + STYLE,
  },
  {
    file: "ar-nammam.png",
    prompt:
      "two kids whispering and pointing behind another child's back, gossiping" + STYLE,
  },
  {
    file: "ar-muallim.png",
    prompt:
      "friendly teacher standing at a classroom whiteboard pointing at a lesson, students at desks" + STYLE,
  },
  {
    file: "ar-ibtidai.png",
    prompt:
      "cheerful elementary school building with a gate and flag, children walking in" + STYLE,
  },
  {
    file: "ar-yuarrifu.png",
    prompt:
      "two schoolboys shaking hands and introducing themselves to each other, smiling" + STYLE,
  },
  // ---- Arabic-world mascot variant ----
  {
    file: "mascot-ar.png",
    prompt:
      "adorable little fox cub wearing a small white keffiyeh head scarf, waving hello, big kind eyes" + STYLE,
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

const force = process.argv.includes("--force");
for (const [i, job] of JOBS.entries()) {
  if (!force && existsSync(join(outDir, job.file))) {
    console.log(`${job.file}: exists — skipped (use --force to regenerate)`);
    continue;
  }
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

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";

// Renders each PDF page to a PNG using pdfjs + @napi-rs/canvas.
// Output names: pNNN.png (1-based, zero-padded) so files sort in reading order.
export async function pdfToImages(
  pdfPath: string,
  outDir: string,
  scale = 2.0,
): Promise<number> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerPort = null;
  const doc = await pdfjs.getDocument({ url: pdfPath }).promise;
  await mkdir(outDir, { recursive: true });

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const jpg = await canvas.encode("jpeg", 85);
    const stem = `p${String(i).padStart(3, "0")}`;
    await writeFile(join(outDir, `${stem}.jpg`), jpg);
    process.stdout.write(`rendered page ${i}/${doc.numPages}\r`);
    page.cleanup();
  }
  console.log(`\npdf2img: ${doc.numPages} pages → ${outDir}`);
  return doc.numPages;
}

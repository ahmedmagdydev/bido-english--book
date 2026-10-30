import { join } from "node:path";
import { fileURLToPath } from "node:url";

// <repo>/tools/pipeline/src -> <repo>
export const REPO_ROOT = join(fileURLToPath(import.meta.url), "../../../..");
export const CONTENT = join(REPO_ROOT, "content");

export const photosDir = (section: string) => join(CONTENT, "photos", section);
export const workDir = (section: string) => join(CONTENT, "work", section);
export const packDir = (packId: string) => join(CONTENT, "packs", packId);

export const rawPath = (section: string, stem: string) =>
  join(workDir(section), `${stem}.raw.json`);
export const reviewedPath = (section: string, stem: string) =>
  join(workDir(section), `${stem}.reviewed.json`);

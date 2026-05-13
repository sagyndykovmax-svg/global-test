import { promises as fs } from "node:fs";
import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? "./storage";

export async function saveDocx(applicationId: string, suffix: string, buffer: Buffer): Promise<string> {
  const dir = path.resolve(STORAGE_DIR, applicationId);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${suffix}.docx`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return path.join(applicationId, filename);
}

export async function readDocx(relativePath: string): Promise<Buffer> {
  return fs.readFile(path.resolve(STORAGE_DIR, relativePath));
}

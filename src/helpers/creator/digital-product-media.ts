import fs from "fs";
import os from "os";
import path from "path";

const imageSource = "src/test-data/assets/claude.png";
const videoSource = "src/test-data/assets/video.mp4";

/** Media formats the Digital Download Media card advertises (images and videos). */
export const digitalMediaImageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"] as const;
export const digitalMediaVideoExtensions = ["mp4", "mov", "avi", "webm", "ogv"] as const;
/** Document formats the Digital Files card advertises. */
export const digitalFileExtensions = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "zip"] as const;

/**
 * Temp copies of real image/video bytes under every advertised extension, plus document stubs
 * and one unsupported file. The upload lists judge files by extension, which is what the TCs test.
 */
export function createDigitalProductUploadFixtures() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yapp-digital-product-"));
  const write = (name: string, source?: string) => {
    const file = path.join(directory, name);
    if (source) fs.copyFileSync(source, file);
    else fs.writeFileSync(file, `Yapp digital product fixture: ${name}\n`);
    return file;
  };
  const images = digitalMediaImageExtensions.map((ext) => write(`media-image.${ext}`, imageSource));
  const videos = digitalMediaVideoExtensions.map((ext) => write(`media-video.${ext}`, videoSource));
  const files = digitalFileExtensions.map((ext) => write(`lesson-file.${ext}`));
  const unsupported = write("unsupported-notes.txt");
  return {
    images,
    videos,
    videoNames: videos.map((v) => path.basename(v)),
    files,
    fileNames: files.map((f) => path.basename(f)),
    unsupported,
    unsupportedName: path.basename(unsupported),
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

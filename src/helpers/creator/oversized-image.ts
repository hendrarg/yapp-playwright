import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { consultationMediaData } from "@test-data/creator/consultation.media.data";

/** Creates a sparse-ish temp file larger than the consultation hero size limit. */
export function createOversizedImageFixture(): { filePath: string; cleanup: () => void } {
  const filePath = path.join(
    os.tmpdir(),
    `${consultationMediaData.oversizedFileName.replace(".png", "")}-${Date.now()}.png`,
  );
  const fd = fs.openSync(filePath, "w");
  fs.writeSync(fd, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  fs.ftruncateSync(fd, consultationMediaData.oversizedBytes + 1);
  fs.closeSync(fd);
  return {
    filePath,
    cleanup: () => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup failures
      }
    },
  };
}

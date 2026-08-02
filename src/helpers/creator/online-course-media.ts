import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const lessonFileNames = [
  "lesson.pdf",
  "lesson.docx",
  "lesson.xlsx",
  "lesson.csv",
  "lesson.mp3",
  "lesson.wav",
  "lesson.zip",
] as const;

export function createOnlineCourseLessonFixtures() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yapp-online-course-"));
  const filePaths = lessonFileNames.map((fileName) => {
    const filePath = path.join(directory, fileName);
    fs.writeFileSync(filePath, `Yapp lesson fixture: ${fileName}\n`);
    return filePath;
  });

  return {
    filePaths,
    fileNames: [...lessonFileNames],
    cleanup: () => {
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

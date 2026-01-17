export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await Bun.file(filePath).text();
    return true;
  } catch {
    return false;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await Bun.write(filePath, content);
}

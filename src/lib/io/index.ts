export async function confirmOverwrite(filePath: string): Promise<boolean> {
  const readline = (await import("node:readline")).createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => {
      readline.question(prompt, (answer) => {
        resolve(answer);
      });
    });

  try {
    const response = await question(`${filePath} already exists. Overwrite? [y/N]: `);
    const normalized = response.trim().toLowerCase();
    return normalized === "y";
  } finally {
    readline.close();
  }
}

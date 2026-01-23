/**
 * Prompts user for yes/no confirmation
 *
 * @param message - The prompt message to display
 * @returns true if user confirms (y/yes), false otherwise
 */
export async function promptYesNo(message: string): Promise<boolean> {
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
    const response = await question(message);
    const normalized = response.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    readline.close();
  }
}

export async function confirmOverwrite(filePath: string): Promise<boolean> {
  return promptYesNo(`${filePath} already exists. Overwrite? [y/N]: `);
}

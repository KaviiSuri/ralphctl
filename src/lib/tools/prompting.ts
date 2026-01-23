/**
 * User prompting for CLI tool selection when tools are not detected
 */

/**
 * Tool choice options for command infrastructure setup
 */
export type ToolChoice = "claude" | "opencode" | "both";

/**
 * Tool selector function type for dependency injection in tests
 */
export type ToolSelector = (
  message: string,
  options: string[]
) => Promise<string>;

/**
 * Default tool selector using readline interface
 */
const defaultSelector: ToolSelector = async (
  message: string,
  _options: string[]
): Promise<string> => {
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
    return response;
  } finally {
    readline.close();
  }
};

/**
 * Parse user input into a valid tool choice
 *
 * @param input - Raw user input string
 * @returns ToolChoice if input is valid, null otherwise
 *
 * @example
 * ```typescript
 * parseToolChoice("1") // returns "claude"
 * parseToolChoice("Claude Code") // returns "claude"
 * parseToolChoice("opencode") // returns "opencode"
 * parseToolChoice("BOTH") // returns "both"
 * parseToolChoice("invalid") // returns null
 * ```
 */
export function parseToolChoice(input: string): ToolChoice | null {
  const normalized = input.trim().toLowerCase();

  // Claude Code options
  if (["1", "claude", "claude code"].includes(normalized)) {
    return "claude";
  }

  // OpenCode options
  if (["2", "opencode"].includes(normalized)) {
    return "opencode";
  }

  // Both options
  if (["3", "both"].includes(normalized)) {
    return "both";
  }

  return null;
}

/**
 * Display tool selection prompt UI
 *
 * @returns The formatted prompt message to show the user
 */
function formatPromptMessage(): string {
  return `
⚠️  No CLI tools detected in PATH

Neither 'claude' nor 'opencode' commands were found.
You can still set up command files for manual installation.

Which tool(s) do you want to set up?
  1. Claude Code only
  2. OpenCode only
  3. Both

Enter your choice (1-3): `;
}

/**
 * Prompt user to select which CLI tool(s) to set up when none are detected
 *
 * @param selector - Optional tool selector for testing (defaults to readline)
 * @param maxAttempts - Maximum number of retry attempts (default: 3)
 * @returns Promise resolving to the user's tool choice
 * @throws Error if max attempts exceeded or user cancels (Ctrl+C)
 *
 * @example
 * ```typescript
 * try {
 *   const choice = await promptToolSelection();
 *   console.log(`User selected: ${choice}`);
 *   // Proceed with folder creation based on choice
 * } catch (error) {
 *   console.error('Setup cancelled');
 * }
 * ```
 */
export async function promptToolSelection(
  selector: ToolSelector = defaultSelector,
  maxAttempts: number = 3
): Promise<ToolChoice> {
  const options = ["1", "2", "3"];
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const promptMessage =
        attempts === 0
          ? formatPromptMessage()
          : `\n❌ Invalid choice. Please enter 1, 2, or 3: `;

      const input = await selector(promptMessage, options);
      const choice = parseToolChoice(input);

      if (choice !== null) {
        // Show confirmation message
        const toolName =
          choice === "claude"
            ? "Claude Code"
            : choice === "opencode"
              ? "OpenCode"
              : "Both";
        console.log(`\n✓ Setting up commands for: ${toolName}`);

        if (choice === "both") {
          console.log(`\nCreating command files in:`);
          console.log(`  - .claude/commands/`);
          console.log(`  - .opencode/commands/`);
        } else if (choice === "claude") {
          console.log(`\nCreating command files in:`);
          console.log(`  - .claude/commands/`);
        } else {
          console.log(`\nCreating command files in:`);
          console.log(`  - .opencode/commands/`);
        }

        return choice;
      }

      attempts++;
    } catch (error) {
      // Handle Ctrl+C or other interruptions
      console.log("\n\nSetup cancelled");
      throw new Error("Setup cancelled by user");
    }
  }

  // Max attempts exceeded
  throw new Error(
    `Maximum retry attempts (${maxAttempts}) exceeded. Please run the command again with a valid choice (1-3).`
  );
}

/**
 * Determine tool choice by combining detection result and user prompt if needed
 *
 * This is the main integration function that combines tool detection with user prompting.
 * It returns a tool choice that can be used by downstream folder creation tasks.
 *
 * @param detectionResult - Result from detectAvailableTools()
 * @param selector - Optional tool selector for testing
 * @returns Promise resolving to tool choice (claude, opencode, or both)
 *
 * Logic:
 * - If both tools detected: return "both"
 * - If only claude detected: return "claude"
 * - If only opencode detected: return "opencode"
 * - If neither detected: prompt user for choice
 *
 * @example
 * ```typescript
 * import { detectAvailableTools } from './detection';
 * import { determineToolChoice } from './prompting';
 *
 * const detection = detectAvailableTools();
 * const choice = await determineToolChoice(detection);
 * // Use choice to create appropriate folders
 * ```
 */
export async function determineToolChoice(
  detectionResult: { claude: boolean; opencode: boolean },
  selector?: ToolSelector
): Promise<ToolChoice> {
  // Both detected
  if (detectionResult.claude && detectionResult.opencode) {
    return "both";
  }

  // Only Claude detected
  if (detectionResult.claude) {
    return "claude";
  }

  // Only OpenCode detected
  if (detectionResult.opencode) {
    return "opencode";
  }

  // Neither detected - prompt user
  return promptToolSelection(selector);
}

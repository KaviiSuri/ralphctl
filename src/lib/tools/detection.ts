/**
 * CLI tool detection utilities for detecting available AI coding assistants
 */

import { execSync } from "child_process";

/**
 * Result of tool detection indicating which AI coding assistants are available
 */
export interface ToolDetectionResult {
  claude: boolean;
  opencode: boolean;
  hasAny: boolean;
  hasBoth: boolean;
}

/**
 * Command executor function type for dependency injection in tests
 */
export type CommandExecutor = (command: string) => void;

/**
 * Default command executor using child_process.execSync
 */
const defaultExecutor: CommandExecutor = (command: string) => {
  execSync(command, {
    stdio: "pipe", // Suppress output
    timeout: 1000, // 1 second timeout
  });
};

/**
 * Checks if a command is available in the system PATH
 *
 * @param command - The command name to check (e.g., 'claude', 'opencode')
 * @param executor - Optional command executor for testing (defaults to execSync)
 * @returns true if the command is available and executable, false otherwise
 */
export function isCommandAvailable(
  command: string,
  executor: CommandExecutor = defaultExecutor
): boolean {
  try {
    // Use 'which' on Unix-like systems, 'where' on Windows
    const whichCommand = process.platform === "win32" ? "where" : "which";

    // Execute the which/where command
    // If the command is not found, execSync will throw an error
    executor(`${whichCommand} ${command}`);

    return true;
  } catch (error) {
    // Command not found, not executable, or timeout
    return false;
  }
}

/**
 * Detects which AI coding assistant CLI tools are available in the system
 *
 * Checks for:
 * - `claude` - Claude Code CLI
 * - `opencode` - OpenCode CLI
 *
 * @param executor - Optional command executor for testing
 * @returns ToolDetectionResult indicating which tools are available
 *
 * @example
 * ```typescript
 * const tools = detectAvailableTools();
 *
 * if (tools.hasBoth) {
 *   console.log('Both Claude Code and OpenCode detected');
 * } else if (tools.claude) {
 *   console.log('Only Claude Code detected');
 * } else if (tools.opencode) {
 *   console.log('Only OpenCode detected');
 * } else {
 *   console.log('No tools detected');
 * }
 * ```
 */
export function detectAvailableTools(
  executor?: CommandExecutor
): ToolDetectionResult {
  const claude = isCommandAvailable("claude", executor);
  const opencode = isCommandAvailable("opencode", executor);

  return {
    claude,
    opencode,
    hasAny: claude || opencode,
    hasBoth: claude && opencode,
  };
}

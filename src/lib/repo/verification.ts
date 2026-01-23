/**
 * Git repository verification utilities for ensuring commands run at repo root
 */

import { execSync } from "child_process";
import * as path from "path";

/**
 * Result of repository verification
 */
export interface VerificationResult {
  /** True if current directory is the repository root */
  isRepoRoot: boolean;
  /** Absolute path to repository root, or null if not in a repo */
  repoRootPath: string | null;
  /** True if user bypassed warning and confirmed proceeding */
  userConfirmed: boolean;
  /** True if warning was shown to user */
  needsWarning: boolean;
}

/**
 * Command executor function type for dependency injection in tests
 */
export type GitCommandExecutor = (command: string) => string;

/**
 * User prompter function type for dependency injection in tests
 */
export type UserPrompter = (message: string) => Promise<boolean>;

/**
 * Default git command executor using child_process.execSync
 */
const defaultGitExecutor: GitCommandExecutor = (command: string) => {
  return execSync(command, {
    stdio: "pipe",
    encoding: "utf-8",
    timeout: 5000, // 5 second timeout
  }).toString().trim();
};

/**
 * Default user prompter using readline
 */
const defaultPrompter: UserPrompter = async (message: string): Promise<boolean> => {
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
};

/**
 * Checks if current directory is a git repository
 *
 * @param executor - Optional git command executor for testing
 * @returns true if current directory is in a git repository
 */
export function isGitRepository(executor: GitCommandExecutor = defaultGitExecutor): boolean {
  try {
    executor("git rev-parse --git-dir");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the absolute path to the git repository root
 *
 * @param executor - Optional git command executor for testing
 * @returns Absolute path to repo root, or null if not in a repo
 */
export function getRepoRoot(executor: GitCommandExecutor = defaultGitExecutor): string | null {
  try {
    return executor("git rev-parse --show-toplevel");
  } catch (error) {
    return null;
  }
}

/**
 * Verifies that current directory is a git repository root.
 * If not, warns user and prompts for confirmation.
 *
 * @param executor - Optional git command executor for testing
 * @param prompter - Optional user prompter for testing
 * @returns VerificationResult with status and user confirmation
 *
 * @example
 * ```typescript
 * const result = await verifyRepoRoot();
 *
 * if (!result.isRepoRoot && !result.userConfirmed) {
 *   console.error('Aborted: Not at repository root');
 *   process.exit(1);
 * }
 *
 * // Proceed with operation
 * ```
 */
export async function verifyRepoRoot(
  executor: GitCommandExecutor = defaultGitExecutor,
  prompter: UserPrompter = defaultPrompter
): Promise<VerificationResult> {
  const cwd = process.cwd();

  // Check if in a git repository
  if (!isGitRepository(executor)) {
    // Not in a git repository
    console.warn("\n⚠️  Current directory is not a git repository.");
    console.warn("Command folders (.claude/, .opencode/) are typically created at repository roots.\n");
    console.warn(`Current directory: ${cwd}\n`);

    const confirmed = await prompter("Do you want to proceed anyway? (y/N): ");

    return {
      isRepoRoot: false,
      repoRootPath: null,
      userConfirmed: confirmed,
      needsWarning: true,
    };
  }

  // Get the repository root
  const repoRoot = getRepoRoot(executor);

  if (!repoRoot) {
    // Unexpected: isGitRepository returned true but getRepoRoot failed
    // Treat as non-repo scenario
    const confirmed = await prompter("Do you want to proceed anyway? (y/N): ");

    return {
      isRepoRoot: false,
      repoRootPath: null,
      userConfirmed: confirmed,
      needsWarning: true,
    };
  }

  // Normalize paths for comparison (handle symlinks, trailing slashes, etc.)
  const normalizedCwd = path.resolve(cwd);
  const normalizedRepoRoot = path.resolve(repoRoot);

  if (normalizedCwd !== normalizedRepoRoot) {
    // In a repo but not at root
    console.warn("\n⚠️  Current directory is not the repository root.");
    console.warn("Command folders should be created at the repo root for visibility.\n");
    console.warn(`Current directory: ${normalizedCwd}`);
    console.warn(`Repository root:   ${normalizedRepoRoot}\n`);

    const confirmed = await prompter("Do you want to proceed anyway? (y/N): ");

    return {
      isRepoRoot: false,
      repoRootPath: normalizedRepoRoot,
      userConfirmed: confirmed,
      needsWarning: true,
    };
  }

  // At repo root - silent success
  return {
    isRepoRoot: true,
    repoRootPath: normalizedRepoRoot,
    userConfirmed: false,
    needsWarning: false,
  };
}

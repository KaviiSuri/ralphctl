/**
 * Command infrastructure for creating local .claude/commands/ and .opencode/commands/ folders
 *
 * This module creates project-local command directories for Claude Code and OpenCode,
 * enabling project-specific commands that are version-controlled and isolated from
 * global configuration.
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import type { ToolChoice } from "./tools/prompting.js";

/**
 * Directory creator function type for dependency injection in tests
 */
export type DirectoryCreator = (dirPath: string, options?: { recursive?: boolean }) => Promise<void>;

/**
 * File system checker function type for dependency injection in tests
 */
export type FileSystemChecker = (filePath: string) => boolean;

/**
 * Default directory creator using fs/promises
 */
const defaultDirectoryCreator: DirectoryCreator = async (dirPath: string, options?: { recursive?: boolean }) => {
  const fs = await import("fs/promises");
  await fs.mkdir(dirPath, options);
};

/**
 * Default file system checker using fs.existsSync
 */
const defaultFileSystemChecker: FileSystemChecker = (filePath: string): boolean => {
  return existsSync(filePath);
};

/**
 * Result of command folder creation operation
 */
export interface CommandFolderResult {
  claudeCreated: boolean;
  opencodeCreated: boolean;
  claudePath?: string;
  opencodePath?: string;
}

/**
 * Create .claude/commands/ folder at repository root
 *
 * @param repoRoot - Absolute path to repository root
 * @param dirCreator - Optional directory creator for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @returns Promise resolving to the created directory path or null if skipped
 *
 * @example
 * ```typescript
 * const path = await createClaudeCommandsFolder('/path/to/repo');
 * if (path) {
 *   console.log(`Created: ${path}`);
 * }
 * ```
 */
export async function createClaudeCommandsFolder(
  repoRoot: string,
  dirCreator: DirectoryCreator = defaultDirectoryCreator,
  fsChecker: FileSystemChecker = defaultFileSystemChecker
): Promise<string | null> {
  const commandsPath = path.join(repoRoot, ".claude", "commands");

  // Check if already exists (idempotent)
  if (fsChecker(commandsPath)) {
    console.log("  .claude/commands/ already exists");
    return commandsPath;
  }

  try {
    // Create directory recursively (handles parent .claude/ creation)
    await dirCreator(commandsPath, { recursive: true });
    console.log("  Created .claude/commands/");
    return commandsPath;
  } catch (error: any) {
    if (error.code === "EACCES" || error.code === "EPERM") {
      throw new Error(
        `Permission denied creating .claude/commands/ at ${repoRoot}. ` +
        `Run: chmod +w "${repoRoot}" or check directory permissions.`
      );
    }
    if (error.code === "ENOSPC") {
      throw new Error(`Insufficient disk space to create .claude/commands/ at ${repoRoot}`);
    }
    throw new Error(`Failed to create .claude/commands/: ${error.message}`);
  }
}

/**
 * Create .opencode/commands/ folder at repository root
 *
 * @param repoRoot - Absolute path to repository root
 * @param dirCreator - Optional directory creator for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @returns Promise resolving to the created directory path or null if skipped
 *
 * @example
 * ```typescript
 * const path = await createOpenCodeCommandsFolder('/path/to/repo');
 * if (path) {
 *   console.log(`Created: ${path}`);
 * }
 * ```
 */
export async function createOpenCodeCommandsFolder(
  repoRoot: string,
  dirCreator: DirectoryCreator = defaultDirectoryCreator,
  fsChecker: FileSystemChecker = defaultFileSystemChecker
): Promise<string | null> {
  const commandsPath = path.join(repoRoot, ".opencode", "commands");

  // Check if already exists (idempotent)
  if (fsChecker(commandsPath)) {
    console.log("  .opencode/commands/ already exists");
    return commandsPath;
  }

  try {
    // Create directory recursively (handles parent .opencode/ creation)
    await dirCreator(commandsPath, { recursive: true });
    console.log("  Created .opencode/commands/");
    return commandsPath;
  } catch (error: any) {
    if (error.code === "EACCES" || error.code === "EPERM") {
      throw new Error(
        `Permission denied creating .opencode/commands/ at ${repoRoot}. ` +
        `Run: chmod +w "${repoRoot}" or check directory permissions.`
      );
    }
    if (error.code === "ENOSPC") {
      throw new Error(`Insufficient disk space to create .opencode/commands/ at ${repoRoot}`);
    }
    throw new Error(`Failed to create .opencode/commands/: ${error.message}`);
  }
}

/**
 * Create command folders based on tool choice
 *
 * This is the main integration function that creates appropriate folders
 * based on detected or user-selected tools.
 *
 * @param toolChoice - Which tools to create folders for (claude, opencode, or both)
 * @param repoRoot - Absolute path to repository root (default: process.cwd())
 * @param dirCreator - Optional directory creator for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @returns Promise resolving to CommandFolderResult with creation status
 *
 * @example
 * ```typescript
 * import { detectAvailableTools } from './tools/detection';
 * import { determineToolChoice } from './tools/prompting';
 * import { createCommandFolders } from './command-infrastructure';
 *
 * const detection = detectAvailableTools();
 * const choice = await determineToolChoice(detection);
 * const result = await createCommandFolders(choice);
 *
 * if (result.claudeCreated) {
 *   console.log(`Claude commands: ${result.claudePath}`);
 * }
 * if (result.opencodeCreated) {
 *   console.log(`OpenCode commands: ${result.opencodePath}`);
 * }
 * ```
 */
export async function createCommandFolders(
  toolChoice: ToolChoice,
  repoRoot: string = process.cwd(),
  dirCreator?: DirectoryCreator,
  fsChecker?: FileSystemChecker
): Promise<CommandFolderResult> {
  const result: CommandFolderResult = {
    claudeCreated: false,
    opencodeCreated: false,
  };

  console.log("\nCreating command folders...");

  // Create Claude Code folder if needed
  if (toolChoice === "claude" || toolChoice === "both") {
    const claudePath = await createClaudeCommandsFolder(repoRoot, dirCreator, fsChecker);
    if (claudePath) {
      result.claudeCreated = true;
      result.claudePath = claudePath;
    }
  }

  // Create OpenCode folder if needed
  if (toolChoice === "opencode" || toolChoice === "both") {
    const opencodePath = await createOpenCodeCommandsFolder(repoRoot, dirCreator, fsChecker);
    if (opencodePath) {
      result.opencodeCreated = true;
      result.opencodePath = opencodePath;
    }
  }

  return result;
}

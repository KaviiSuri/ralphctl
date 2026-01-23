/**
 * Command infrastructure for creating local .claude/commands/ and .opencode/commands/ folders
 *
 * This module creates project-local command directories for Claude Code and OpenCode,
 * enabling project-specific commands that are version-controlled and isolated from
 * global configuration.
 */

import { existsSync, statSync, constants } from "node:fs";
import { access, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { ToolChoice } from "./tools/prompting.js";
import { COMMAND_FILES } from "./templates/commands.js";

/**
 * Directory creator function type for dependency injection in tests
 */
export type DirectoryCreator = (dirPath: string, options?: { recursive?: boolean }) => Promise<void>;

/**
 * File system checker function type for dependency injection in tests
 */
export type FileSystemChecker = (filePath: string) => boolean;

/**
 * File stat checker function type for dependency injection in tests
 */
export type FileStatChecker = (filePath: string) => { isDirectory: () => boolean };

/**
 * Writability checker function type for dependency injection in tests
 */
export type WritabilityChecker = (filePath: string, mode: number) => Promise<void>;

/**
 * File writer function type for dependency injection in tests
 */
export type FileWriter = (filePath: string, content: string, encoding: BufferEncoding) => Promise<void>;

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
 * Default file stat checker using fs.statSync
 */
const defaultFileStatChecker: FileStatChecker = (filePath: string) => {
  return statSync(filePath);
};

/**
 * Default writability checker using fs/promises.access
 */
const defaultWritabilityChecker: WritabilityChecker = async (filePath: string, mode: number) => {
  await access(filePath, mode);
};

/**
 * Default file writer using fs/promises.writeFile
 */
const defaultFileWriter: FileWriter = async (filePath: string, content: string, encoding: BufferEncoding) => {
  await writeFile(filePath, content, encoding);
};

/**
 * Result of command folder creation operation
 */
export interface CommandFolderResult {
  claudeReady: boolean;
  opencodeReady: boolean;
  claudePath?: string;
  opencodePath?: string;
}

/**
 * Generic command folder creation for both Claude Code and OpenCode
 *
 * @param toolName - Tool name ("claude" or "opencode")
 * @param repoRoot - Absolute path to repository root
 * @param dirCreator - Optional directory creator for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @param statChecker - Optional file stat checker for testing
 * @param writabilityChecker - Optional writability checker for testing
 * @returns Promise resolving to the created directory path or null if skipped
 *
 * @throws Error if parent directory exists as a file instead of directory
 * @throws Error if permission denied or disk space insufficient
 * @throws Error if created directory is not writable
 */
async function createCommandsFolder(
  toolName: "claude" | "opencode",
  repoRoot: string,
  dirCreator: DirectoryCreator = defaultDirectoryCreator,
  fsChecker: FileSystemChecker = defaultFileSystemChecker,
  statChecker: FileStatChecker = defaultFileStatChecker,
  writabilityChecker: WritabilityChecker = defaultWritabilityChecker
): Promise<string | null> {
  const toolDir = `.${toolName}`;
  const commandsPath = path.join(repoRoot, toolDir, "commands");
  const parentPath = path.join(repoRoot, toolDir);

  // Check if already exists (idempotent)
  if (fsChecker(commandsPath)) {
    console.log(`  ${toolDir}/commands/ already exists`);
    return commandsPath;
  }

  // Check if parent exists as a file instead of directory
  if (fsChecker(parentPath)) {
    try {
      const stats = statChecker(parentPath);
      if (!stats.isDirectory()) {
        throw new Error(
          `${toolDir} exists as a file, not a directory. Please remove or rename it before running this command.`
        );
      }
    } catch (error: any) {
      if (error.message.includes("exists as a file")) {
        throw error;
      }
      // Ignore stat errors, let mkdir handle them
    }
  }

  try {
    // Create directory recursively (handles parent directory creation)
    await dirCreator(commandsPath, { recursive: true });

    // Verify writability after creation
    try {
      await writabilityChecker(commandsPath, constants.W_OK);
    } catch (error: any) {
      throw new Error(
        `Created ${toolDir}/commands/ but directory is not writable. ` +
        `Run: chmod +w "${commandsPath}" to fix permissions.`
      );
    }

    console.log(`  Created ${toolDir}/commands/`);
    return commandsPath;
  } catch (error: any) {
    // Handle writability check errors that were re-thrown
    if (error.message.includes("not writable")) {
      throw error;
    }

    if (error.code === "EACCES" || error.code === "EPERM") {
      throw new Error(
        `Permission denied creating ${toolDir}/commands/ at ${repoRoot}. ` +
        `Run: chmod +w "${repoRoot}" or check directory permissions.`
      );
    }
    if (error.code === "ENOSPC") {
      throw new Error(`Insufficient disk space to create ${toolDir}/commands/ at ${repoRoot}`);
    }
    if (error.code === "EEXIST" && error.message.includes("file already exists")) {
      throw new Error(
        `${toolDir}/commands exists as a file, not a directory. Please remove or rename it before running this command.`
      );
    }
    throw new Error(`Failed to create ${toolDir}/commands/: ${error.message}`);
  }
}

/**
 * Create .claude/commands/ folder at repository root
 *
 * @param repoRoot - Absolute path to repository root
 * @param dirCreator - Optional directory creator for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @param statChecker - Optional file stat checker for testing
 * @param writabilityChecker - Optional writability checker for testing
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
  dirCreator?: DirectoryCreator,
  fsChecker?: FileSystemChecker,
  statChecker?: FileStatChecker,
  writabilityChecker?: WritabilityChecker
): Promise<string | null> {
  return createCommandsFolder("claude", repoRoot, dirCreator, fsChecker, statChecker, writabilityChecker);
}

/**
 * Create .opencode/commands/ folder at repository root
 *
 * @param repoRoot - Absolute path to repository root
 * @param dirCreator - Optional directory creator for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @param statChecker - Optional file stat checker for testing
 * @param writabilityChecker - Optional writability checker for testing
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
  dirCreator?: DirectoryCreator,
  fsChecker?: FileSystemChecker,
  statChecker?: FileStatChecker,
  writabilityChecker?: WritabilityChecker
): Promise<string | null> {
  return createCommandsFolder("opencode", repoRoot, dirCreator, fsChecker, statChecker, writabilityChecker);
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
 * @param statChecker - Optional file stat checker for testing
 * @param writabilityChecker - Optional writability checker for testing
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
 * if (result.claudeReady) {
 *   console.log(`Claude commands: ${result.claudePath}`);
 * }
 * if (result.opencodeReady) {
 *   console.log(`OpenCode commands: ${result.opencodePath}`);
 * }
 * ```
 */
export async function createCommandFolders(
  toolChoice: ToolChoice,
  repoRoot: string = process.cwd(),
  dirCreator?: DirectoryCreator,
  fsChecker?: FileSystemChecker,
  statChecker?: FileStatChecker,
  writabilityChecker?: WritabilityChecker
): Promise<CommandFolderResult> {
  const result: CommandFolderResult = {
    claudeReady: false,
    opencodeReady: false,
  };

  console.log("\nCreating command folders...");

  // Create Claude Code folder if needed
  if (toolChoice === "claude" || toolChoice === "both") {
    const claudePath = await createClaudeCommandsFolder(
      repoRoot,
      dirCreator,
      fsChecker,
      statChecker,
      writabilityChecker
    );
    if (claudePath) {
      result.claudeReady = true;
      result.claudePath = claudePath;
    }
  }

  // Create OpenCode folder if needed
  if (toolChoice === "opencode" || toolChoice === "both") {
    const opencodePath = await createOpenCodeCommandsFolder(
      repoRoot,
      dirCreator,
      fsChecker,
      statChecker,
      writabilityChecker
    );
    if (opencodePath) {
      result.opencodeReady = true;
      result.opencodePath = opencodePath;
    }
  }

  return result;
}

/**
 * Result of command file installation operation
 */
export interface InstallCommandFilesResult {
  claudeInstalled: number;
  opencodeInstalled: number;
  claudePath?: string;
  opencodePath?: string;
  errors: string[];
}

/**
 * Install command files to a specific target directory
 *
 * @param targetPath - Absolute path to the commands directory (e.g., .claude/commands)
 * @param toolName - Tool name for logging ("claude" or "opencode")
 * @param fileWriter - Optional file writer for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @returns Promise resolving to number of files installed
 * @throws Error if target directory doesn't exist or isn't writable
 *
 * @example
 * ```typescript
 * const count = await installCommandFilesToTarget('/path/to/.claude/commands', 'claude');
 * console.log(`Installed ${count} commands`);
 * ```
 */
async function installCommandFilesToTarget(
  targetPath: string,
  toolName: "claude" | "opencode",
  fileWriter: FileWriter = defaultFileWriter,
  fsChecker: FileSystemChecker = defaultFileSystemChecker
): Promise<number> {
  // Verify target directory exists
  if (!fsChecker(targetPath)) {
    throw new Error(
      `Command directory does not exist: ${targetPath}. ` +
      `Run folder creation first.`
    );
  }

  let installedCount = 0;
  const errors: string[] = [];

  for (const { name, content } of COMMAND_FILES) {
    const filePath = path.join(targetPath, name);
    try {
      await fileWriter(filePath, content, "utf-8");
      installedCount++;
    } catch (error: any) {
      const errorMsg = `Failed to write ${name}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`  ✗ ${errorMsg}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to install ${errors.length} command file(s) to ${toolName}. Errors:\n` +
      errors.join("\n")
    );
  }

  console.log(`  ✓ Installed ${installedCount} commands to .${toolName}/commands/`);
  return installedCount;
}

/**
 * Install command files to appropriate directories based on CommandFolderResult
 *
 * This function installs all 7 project command files to the directories that were
 * successfully created by createCommandFolders().
 *
 * @param folderResult - Result from createCommandFolders() indicating which directories are ready
 * @param fileWriter - Optional file writer for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @returns Promise resolving to InstallCommandFilesResult with installation details
 *
 * @example
 * ```typescript
 * import { createCommandFolders, installCommandFiles } from './command-infrastructure';
 *
 * const folderResult = await createCommandFolders('both');
 * const installResult = await installCommandFiles(folderResult);
 *
 * console.log(`Claude: ${installResult.claudeInstalled} commands`);
 * console.log(`OpenCode: ${installResult.opencodeInstalled} commands`);
 * ```
 */
export async function installCommandFiles(
  folderResult: CommandFolderResult,
  fileWriter?: FileWriter,
  fsChecker?: FileSystemChecker
): Promise<InstallCommandFilesResult> {
  const result: InstallCommandFilesResult = {
    claudeInstalled: 0,
    opencodeInstalled: 0,
    errors: [],
  };

  console.log("\nInstalling command files...");

  // Install to Claude Code if directory is ready
  if (folderResult.claudeReady && folderResult.claudePath) {
    try {
      result.claudeInstalled = await installCommandFilesToTarget(
        folderResult.claudePath,
        "claude",
        fileWriter,
        fsChecker
      );
      result.claudePath = folderResult.claudePath;
    } catch (error: any) {
      result.errors.push(`Claude Code: ${error.message}`);
    }
  }

  // Install to OpenCode if directory is ready
  if (folderResult.opencodeReady && folderResult.opencodePath) {
    try {
      result.opencodeInstalled = await installCommandFilesToTarget(
        folderResult.opencodePath,
        "opencode",
        fileWriter,
        fsChecker
      );
      result.opencodePath = folderResult.opencodePath;
    } catch (error: any) {
      result.errors.push(`OpenCode: ${error.message}`);
    }
  }

  // Handle case where no directories were ready
  if (!folderResult.claudeReady && !folderResult.opencodeReady) {
    const errorMsg = "No command directories found. Run folder creation first.";
    result.errors.push(errorMsg);
    throw new Error(errorMsg);
  }

  // Throw if there were any errors during installation
  if (result.errors.length > 0) {
    throw new Error(
      `Command installation failed:\n${result.errors.join("\n")}`
    );
  }

  return result;
}

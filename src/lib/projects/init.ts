/**
 * Project initialization utilities for creating project-scoped Ralph loop structures
 *
 * This module implements the foundational folder structure for project-scoped Ralph loops.
 * When a user runs `/project:new <name>`, the system creates a dedicated `projects/<name>/`
 * directory with a `specs/` subfolder.
 */

import { existsSync, statSync, constants } from "node:fs";
import { access } from "node:fs/promises";
import * as path from "node:path";

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
 * Result of project structure creation
 */
export interface ProjectStructureResult {
  /** Absolute path to created project directory */
  projectPath: string;
  /** Absolute path to specs subdirectory */
  specsPath: string;
  /** Whether this was a new creation (true) or completion of partial structure (false) */
  isNew: boolean;
}

/**
 * Validates project name according to basic safety rules
 *
 * Rules:
 * - Cannot be empty string
 * - Cannot contain path separators (/, \)
 * - Cannot be . or ..
 * - Cannot start with . (prevents hidden folders)
 *
 * @param name - Project name to validate
 * @returns true if valid, false otherwise
 */
export function isValidProjectName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  if (name === "." || name === "..") return false;
  if (name.startsWith(".")) return false;
  return true;
}

/**
 * Creates project folder structure: projects/<name>/specs/
 *
 * This function:
 * - Validates the project name
 * - Creates projects/ directory if needed (idempotent)
 * - Errors if projects/<name>/ already exists as a complete project
 * - Completes partial structures (e.g., if folder exists but specs/ doesn't)
 * - Verifies all created directories are writable
 *
 * @param name - Project name (validated for safety)
 * @param repoRoot - Repository root directory (defaults to process.cwd())
 * @param dirCreator - Optional directory creator for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @param statChecker - Optional file stat checker for testing
 * @param writabilityChecker - Optional writability checker for testing
 * @returns Promise resolving to ProjectStructureResult with created paths
 *
 * @throws Error if project name is invalid
 * @throws Error if project already exists with complete structure
 * @throws Error if parent directory exists as a file instead of directory
 * @throws Error if permission denied or disk space insufficient
 * @throws Error if created directory is not writable
 *
 * @example
 * ```typescript
 * // Create new project
 * const result = await createProjectStructure("my-feature");
 * console.log(`Created project at: ${result.projectPath}`);
 * console.log(`Specs directory: ${result.specsPath}`);
 * ```
 */
export async function createProjectStructure(
  name: string,
  repoRoot: string = process.cwd(),
  dirCreator: DirectoryCreator = defaultDirectoryCreator,
  fsChecker: FileSystemChecker = defaultFileSystemChecker,
  statChecker: FileStatChecker = defaultFileStatChecker,
  writabilityChecker: WritabilityChecker = defaultWritabilityChecker
): Promise<ProjectStructureResult> {
  // Validate project name
  if (!isValidProjectName(name)) {
    const reasons: string[] = [];

    if (!name || name.trim().length === 0) {
      reasons.push("cannot be empty");
    }
    if (name.includes("/") || name.includes("\\")) {
      reasons.push("cannot contain path separators");
    }
    if (name === "." || name === "..") {
      reasons.push("cannot be '.' or '..'");
    }
    if (name.startsWith(".")) {
      reasons.push("cannot start with '.'");
    }

    throw new Error(`Invalid project name "${name}": ${reasons.join(", ")}`);
  }

  // Resolve paths
  const projectsDir = path.join(repoRoot, "projects");
  const projectPath = path.join(projectsDir, name);
  const specsPath = path.join(projectPath, "specs");

  // Check if projects/ parent exists as a file (would block mkdir)
  if (fsChecker(projectsDir)) {
    try {
      const stats = statChecker(projectsDir);
      if (!stats.isDirectory()) {
        throw new Error(`Cannot create projects directory: ${projectsDir} exists as a file`);
      }
    } catch (error: unknown) {
      // If statSync fails, let the mkdir attempt proceed
      if (error instanceof Error && error.message.includes("exists as a file")) {
        throw error;
      }
    }
  }

  // Check if project already exists with complete structure
  const projectExists = fsChecker(projectPath);
  const specsExists = fsChecker(specsPath);

  if (projectExists && specsExists) {
    // Complete project already exists
    throw new Error(`Project '${name}' already exists at ${projectPath}`);
  }

  let isNew = !projectExists;

  // Create directory structure
  // Use recursive: true to handle creating projects/ and projects/<name>/ in one call
  try {
    await dirCreator(specsPath, { recursive: true });
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;

    // Provide user-friendly error messages
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new Error(`Permission denied: cannot create project at ${projectPath}`);
    }
    if (err.code === "ENOSPC") {
      throw new Error(`Insufficient disk space to create project at ${projectPath}`);
    }

    // Re-throw other errors with context
    throw new Error(`Failed to create project structure at ${projectPath}: ${err.message}`);
  }

  // Verify directories are writable
  try {
    await writabilityChecker(projectsDir, constants.W_OK);
    await writabilityChecker(projectPath, constants.W_OK);
    await writabilityChecker(specsPath, constants.W_OK);
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    throw new Error(`Created project directory is not writable: ${err.message}`);
  }

  return {
    projectPath,
    specsPath,
    isNew,
  };
}

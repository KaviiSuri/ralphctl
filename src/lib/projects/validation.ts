/**
 * Project validation utilities for project-scoped Ralph loops
 */

import { existsSync } from "fs";
import { join } from "path";

/**
 * Result of project validation
 */
export interface ProjectValidationResult {
  valid: boolean;
  projectPath?: string;
  specsPath?: string;
  implementationPlanPath?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Validates project name format
 * Only kebab-case names allowed: lowercase letters, numbers, and hyphens
 */
export function isValidProjectName(name: string): boolean {
  const pattern = /^[a-z0-9-]+$/;
  return pattern.test(name);
}

/**
 * Validates that a project exists and has the required structure
 *
 * @param projectName - The name of the project to validate
 * @param repoRoot - The repository root directory (defaults to process.cwd())
 * @returns Validation result with paths and any errors/warnings
 */
export function validateProject(
  projectName: string,
  repoRoot: string = process.cwd()
): ProjectValidationResult {
  const warnings: string[] = [];

  // Validate project name format
  if (!isValidProjectName(projectName)) {
    return {
      valid: false,
      error: `Invalid project name "${projectName}". Project names must use kebab-case (lowercase letters, numbers, and hyphens only).`,
    };
  }

  // Check for path traversal attempts
  if (projectName.includes("/") || projectName.includes("\\")) {
    return {
      valid: false,
      error: `Invalid project name "${projectName}". Project names cannot contain path separators.`,
    };
  }

  // Resolve project path
  const projectPath = join(repoRoot, "projects", projectName);

  // Check if project folder exists
  if (!existsSync(projectPath)) {
    return {
      valid: false,
      error: `Project "${projectName}" not found at ${projectPath}.\n\nDid you mean to create it first? Run: ralphctl init --project ${projectName}`,
    };
  }

  // Check if specs folder exists
  const specsPath = join(projectPath, "specs");
  if (!existsSync(specsPath)) {
    warnings.push(`Specs folder not found at ${specsPath}. Agents may not have any specifications to work with.`);
  }

  // Resolve implementation plan path
  const implementationPlanPath = join(projectPath, "IMPLEMENTATION_PLAN.md");

  // Note: We don't check if implementation plan exists here
  // The run command will auto-create it if missing

  return {
    valid: true,
    projectPath,
    specsPath,
    implementationPlanPath,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Resolves paths for project-scoped or global execution
 *
 * @param projectName - Optional project name for scoped execution
 * @param repoRoot - The repository root directory (defaults to process.cwd())
 * @returns Object with resolved paths for specs and implementation plan
 */
export function resolveProjectPaths(
  projectName: string | undefined,
  repoRoot: string = process.cwd()
): { specsPath: string; implementationPlanPath: string; projectName?: string } {
  if (!projectName) {
    // Global mode - use root paths
    return {
      specsPath: join(repoRoot, "specs"),
      implementationPlanPath: join(repoRoot, "IMPLEMENTATION_PLAN.md"),
    };
  }

  // Project mode - validate and use project paths
  const validation = validateProject(projectName, repoRoot);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    specsPath: validation.specsPath!,
    implementationPlanPath: validation.implementationPlanPath!,
    projectName,
  };
}

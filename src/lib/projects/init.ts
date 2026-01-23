/**
 * Project initialization utilities for creating project-scoped Ralph loop structures
 *
 * This module implements the foundational folder structure for project-scoped Ralph loops.
 * When a user runs `/project:new <name>`, the system creates a dedicated `projects/<name>/`
 * directory with a `specs/` subfolder.
 */

import { existsSync, statSync, constants } from "node:fs";
import { access, writeFile } from "node:fs/promises";
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

/**
 * Template content for 01-research.md
 */
const RESEARCH_TEMPLATE = `# Research: [Project Name]

This document captures the initial research for this project.

---

## Problem Statement

[Describe the problem you're solving. Why does it matter? What pain points exist?]

---

## Research Sources

[List existing solutions, documentation, tools, or references you reviewed]

- Source 1: [Description]
- Source 2: [Description]

---

## Key Decisions

[Document any early decisions made during research]

- Decision 1: [What was decided and why]
- Decision 2: [What was decided and why]

---

## Constraints

[Technical limitations, business requirements, timeline constraints]

- Constraint 1: [Description]
- Constraint 2: [Description]

---

## Open Questions

[What's still unclear or needs investigation?]

- Question 1: [Description]
- Question 2: [Description]

---

**Next step**: Run \`/project:prd <project-name>\` to create the PRD.
`;

/**
 * Template content for 02-prd.md
 */
const PRD_TEMPLATE = `# PRD: [Project Name]

Product Requirements Document for this project.

---

## Overview

[Brief description of what this project delivers and why]

---

## Goals

[What are we trying to achieve?]

- Goal 1: [Description]
- Goal 2: [Description]

---

## Non-Goals

[What is explicitly out of scope?]

- Non-Goal 1: [Description]
- Non-Goal 2: [Description]

---

## User Stories

User stories with acceptance criteria:

### Story 1: [Title]

**As a** [user type]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

### Story 2: [Title]

**As a** [user type]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

---

## Technical Approach

[High-level technical approach, if known]

---

## Risks and Mitigations

[What could go wrong? How do we address it?]

- **Risk**: [Description]
  **Mitigation**: [How to handle]

---

## Success Metrics

[How do we measure success?]

- Metric 1: [Description]
- Metric 2: [Description]

---

**Next step**: Run \`/project:jtbd <project-name>\` to break this into jobs to be done.
`;

/**
 * Template content for 03-jtbd.md
 */
const JTBD_TEMPLATE = `# Jobs To Be Done: [Project Name]

Break down the PRD into high-level jobs to be done (JTBDs).

---

## What are JTBDs?

Jobs To Be Done are high-level capabilities or features that need to be built. Each JTBD:
- Represents a distinct piece of value delivery
- Can be broken down into multiple granular tasks
- Has clear success criteria
- May have dependencies on other JTBDs

---

## JTBD-001: [Job Title]

**Job Statement**: [What needs to be done]

**Context**: [Why this job is needed, which user stories it supports]

**Success Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

---

## JTBD-002: [Job Title]

**Job Statement**: [What needs to be done]

**Context**: [Why this job is needed, which user stories it supports]

**Success Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

---

## JTBD-003: [Job Title]

**Job Statement**: [What needs to be done]

**Context**: [Why this job is needed, which user stories it supports]

**Success Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

---

**Next step**: Run \`/project:tasks <project-name>\` to decompose JTBDs into granular tasks.
`;

/**
 * Template content for 04-tasks.md
 */
const TASKS_TEMPLATE = `# Tasks: [Project Name]

Granular task breakdown with dependency analysis and implementation order.

---

## Task Breakdown

### JTBD-001: [Job Title]

#### Task 001-001: [Task description in one sentence without 'and']
- **Dependencies**: None
- **Acceptance**: [How to verify completion]

#### Task 001-002: [Task description in one sentence without 'and']
- **Dependencies**: Task 001-001
- **Acceptance**: [How to verify completion]

### JTBD-002: [Job Title]

#### Task 002-001: [Task description in one sentence without 'and']
- **Dependencies**: None
- **Acceptance**: [How to verify completion]

---

## Dependency Graph (ASCII)

\`\`\`
001-001
  └─> 001-002
      └─> 002-001

002-001
  └─> 002-002
\`\`\`

---

## Dependency Matrix

| Task    | Depends On        |
|---------|-------------------|
| 001-001 | None              |
| 001-002 | 001-001           |
| 002-001 | 001-002           |
| 002-002 | 002-001           |

---

## Linearized Implementation Order (Waves)

**Wave 1** (can be done in parallel):
- Task 001-001

**Wave 2** (depends on Wave 1):
- Task 001-002

**Wave 3** (depends on Wave 2):
- Task 002-001

**Wave 4** (depends on Wave 3):
- Task 002-002

---

**Next step**: Run \`/project:hld <project-name>\` (optional) for high-level design, or \`/project:specs <project-name>\` to generate specs.
`;

/**
 * Template content for 05-hld.md
 */
const HLD_TEMPLATE = `# High-Level Design: [Project Name]

**(OPTIONAL)** High-level design documentation for complex projects.

---

## Components

[List major components/modules and their responsibilities]

### Component 1: [Name]
- **Responsibility**: [What it does]
- **Interfaces**: [APIs, events, contracts]
- **Dependencies**: [Other components it depends on]

### Component 2: [Name]
- **Responsibility**: [What it does]
- **Interfaces**: [APIs, events, contracts]
- **Dependencies**: [Other components it depends on]

---

## Data Flow

[Describe how data moves through the system]

\`\`\`
User Input -> Component 1 -> Component 2 -> Output
\`\`\`

---

## Interfaces

[Define key interfaces, APIs, or contracts]

### Interface 1: [Name]
\`\`\`typescript
interface Example {
  field: string;
}
\`\`\`

---

## Technology Decisions

[Document key technology choices and why]

- **Technology 1**: [Why chosen, alternatives considered]
- **Technology 2**: [Why chosen, alternatives considered]

---

## Integration Points

[External systems, APIs, or services this integrates with]

- Integration 1: [Description]
- Integration 2: [Description]

---

**Next step**: Run \`/project:specs <project-name>\` to generate implementation specs.
`;

/**
 * Template content for IMPLEMENTATION_PLAN.md
 */
const IMPLEMENTATION_PLAN_TEMPLATE = `# Implementation Plan: [Project Name]

This file tracks the implementation progress for this project. Ralph loops will update this file as work progresses.

---

## Current Focus

- [ ] [Current task being worked on]

---

## Completed Tasks

- [x] Project initialized with folder structure
- [x] Template files created

---

## Pending Tasks

- [ ] [Future task 1]
- [ ] [Future task 2]

---

## Blocked Tasks

[No blocked tasks currently]

---

**Last Updated**: [Date]
`;

/**
 * Result of template generation operation
 */
export interface TemplateGenerationResult {
  /** Absolute path to project directory */
  projectPath: string;
  /** Files that were created */
  created: string[];
  /** Files that were skipped (already existed) */
  skipped: string[];
}

/**
 * Template file definition
 */
interface TemplateFile {
  /** Filename (e.g., "01-research.md") */
  filename: string;
  /** Template content */
  content: string;
}

/**
 * All template files to generate
 */
const TEMPLATE_FILES: readonly TemplateFile[] = [
  { filename: "01-research.md", content: RESEARCH_TEMPLATE },
  { filename: "02-prd.md", content: PRD_TEMPLATE },
  { filename: "03-jtbd.md", content: JTBD_TEMPLATE },
  { filename: "04-tasks.md", content: TASKS_TEMPLATE },
  { filename: "05-hld.md", content: HLD_TEMPLATE },
  { filename: "IMPLEMENTATION_PLAN.md", content: IMPLEMENTATION_PLAN_TEMPLATE },
] as const;

/**
 * Output printer function type for dependency injection in tests
 */
export type OutputPrinter = (message: string) => void;

/**
 * Default output printer using console.log
 */
const defaultOutputPrinter: OutputPrinter = (message: string) => {
  console.log(message);
};

/**
 * Result of initialization summary printing
 */
export interface InitializationSummaryResult {
  /** Project name */
  projectName: string;
  /** Relative path to project from repo root */
  projectPath: string;
  /** List of files in the summary */
  files: string[];
  /** Next command to run */
  nextCommand: string;
}

/**
 * Prints initialization summary after project creation
 *
 * This function displays:
 * - Success message with project name
 * - Folder structure tree showing created files
 * - Next step guidance with exact command to run
 *
 * @param name - Project name
 * @param templateResult - Result from generateTemplates with created/skipped files
 * @param repoRoot - Repository root directory (defaults to process.cwd())
 * @param printer - Optional output printer for testing
 * @returns InitializationSummaryResult with summary details
 *
 * @example
 * ```typescript
 * const templateResult = await generateTemplates("my-feature");
 * printInitializationSummary("my-feature", templateResult);
 * // Prints:
 * // ✓ Project 'my-feature' created successfully!
 * //
 * // Structure:
 * // projects/my-feature/
 * // ├── 01-research.md
 * // ...
 * ```
 */
export function printInitializationSummary(
  name: string,
  templateResult: TemplateGenerationResult,
  repoRoot: string = process.cwd(),
  printer: OutputPrinter = defaultOutputPrinter
): InitializationSummaryResult {
  const relativePath = path.relative(repoRoot, templateResult.projectPath);
  const displayPath = relativePath || "projects/" + name;

  // Success header
  printer(`\n✓ Project '${name}' created successfully!\n`);

  // Structure section
  printer("Structure:");
  printer(`${displayPath}/`);

  // Sort files: numbered files first (01-05), then IMPLEMENTATION_PLAN.md, then specs/
  const allFiles = [...templateResult.created, ...templateResult.skipped];
  const sortedFiles = allFiles.sort((a, b) => {
    // Extract numbers from filenames like "01-research.md"
    const aNum = parseInt(a.match(/^(\d+)-/)?.[1] || "999");
    const bNum = parseInt(b.match(/^(\d+)-/)?.[1] || "999");

    if (aNum !== bNum) return aNum - bNum;

    // IMPLEMENTATION_PLAN.md comes after numbered files
    if (a === "IMPLEMENTATION_PLAN.md") return 1;
    if (b === "IMPLEMENTATION_PLAN.md") return -1;

    return a.localeCompare(b);
  });

  // Print files with tree characters
  for (let i = 0; i < sortedFiles.length; i++) {
    const isLast = i === sortedFiles.length - 1;
    const treeChar = isLast ? "└──" : "├──";
    printer(`${treeChar} ${sortedFiles[i]}`);
  }

  // Always show specs/ directory at the end
  printer("└── specs/\n");

  // Next step guidance
  printer("Next step:");
  printer("Run the following command to begin research:\n");
  printer(`  /project:research ${name}\n`);
  printer("This will guide you through capturing the problem statement,");
  printer("existing solutions, constraints, and open questions.");

  return {
    projectName: name,
    projectPath: displayPath,
    files: sortedFiles,
    nextCommand: `/project:research ${name}`,
  };
}

/**
 * Generates template files for a project
 *
 * This function creates all planning template files (01-research.md through 05-hld.md
 * and IMPLEMENTATION_PLAN.md) in the project directory. Files that already exist are
 * skipped to prevent data loss.
 *
 * @param name - Project name (must match existing project folder)
 * @param repoRoot - Repository root directory (defaults to process.cwd())
 * @param fileWriter - Optional file writer for testing
 * @param fsChecker - Optional filesystem checker for testing
 * @returns Promise resolving to TemplateGenerationResult with created/skipped file lists
 *
 * @throws Error if project folder doesn't exist
 * @throws Error if file write fails due to permissions or disk space
 *
 * @example
 * ```typescript
 * // Generate templates for existing project
 * const result = await generateTemplates("my-feature");
 * console.log(`Created ${result.created.length} files`);
 * console.log(`Skipped ${result.skipped.length} existing files`);
 * ```
 */
export async function generateTemplates(
  name: string,
  repoRoot: string = process.cwd(),
  fileWriter: FileWriter = defaultFileWriter,
  fsChecker: FileSystemChecker = defaultFileSystemChecker
): Promise<TemplateGenerationResult> {
  // Resolve project path
  const projectPath = path.join(repoRoot, "projects", name);

  // Verify project folder exists
  if (!fsChecker(projectPath)) {
    throw new Error(
      `Project folder not found at ${projectPath}. Create the project structure first (Task 001-001).`
    );
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  // Attempt to create each template file
  for (const template of TEMPLATE_FILES) {
    const filePath = path.join(projectPath, template.filename);

    // Skip if file already exists
    if (fsChecker(filePath)) {
      skipped.push(template.filename);
      continue;
    }

    // Attempt to write file
    try {
      await fileWriter(filePath, template.content, "utf-8");
      created.push(template.filename);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;

      // Collect errors instead of failing immediately (for atomic-like behavior)
      if (err.code === "EACCES" || err.code === "EPERM") {
        errors.push({
          file: template.filename,
          error: `Permission denied: cannot write to ${filePath}`,
        });
      } else if (err.code === "ENOSPC") {
        errors.push({
          file: template.filename,
          error: `Insufficient disk space to write ${filePath}`,
        });
      } else {
        errors.push({
          file: template.filename,
          error: `Failed to write ${filePath}: ${err.message}`,
        });
      }
    }
  }

  // If any errors occurred, throw aggregated error
  if (errors.length > 0) {
    const errorMessages = errors.map((e) => `  - ${e.file}: ${e.error}`).join("\n");
    throw new Error(`Failed to create template files:\n${errorMessages}`);
  }

  return {
    projectPath,
    created,
    skipped,
  };
}

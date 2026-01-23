import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import {
  isValidProjectName,
  createProjectStructure,
  generateTemplates,
  printInitializationSummary,
  type DirectoryCreator,
  type FileSystemChecker,
  type FileStatChecker,
  type WritabilityChecker,
  type FileWriter,
  type OutputPrinter,
} from "../src/lib/projects/init.js";

describe("Project Initialization", () => {
  const testRoot = join(process.cwd(), "test-project-init-temp");

  beforeEach(() => {
    // Create test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe("isValidProjectName", () => {
    it("should accept valid project names", () => {
      expect(isValidProjectName("my-project")).toBe(true);
      expect(isValidProjectName("project123")).toBe(true);
      expect(isValidProjectName("test")).toBe(true);
      expect(isValidProjectName("a-b-c")).toBe(true);
    });

    it("should reject empty string", () => {
      expect(isValidProjectName("")).toBe(false);
      expect(isValidProjectName("   ")).toBe(false);
    });

    it("should reject names with forward slashes", () => {
      expect(isValidProjectName("my/project")).toBe(false);
      expect(isValidProjectName("project/test")).toBe(false);
    });

    it("should reject names with backslashes", () => {
      expect(isValidProjectName("my\\project")).toBe(false);
      expect(isValidProjectName("project\\test")).toBe(false);
    });

    it("should reject dot and double-dot", () => {
      expect(isValidProjectName(".")).toBe(false);
      expect(isValidProjectName("..")).toBe(false);
    });

    it("should reject names starting with dot", () => {
      expect(isValidProjectName(".hidden")).toBe(false);
      expect(isValidProjectName(".myproject")).toBe(false);
    });

    it("should accept names with dots in middle", () => {
      expect(isValidProjectName("my.project")).toBe(true);
      expect(isValidProjectName("v1.0.0")).toBe(true);
    });
  });

  describe("createProjectStructure", () => {
    it("should create complete project structure", async () => {
      const result = await createProjectStructure("test-project", testRoot);

      expect(result.projectPath).toBe(join(testRoot, "projects", "test-project"));
      expect(result.specsPath).toBe(join(testRoot, "projects", "test-project", "specs"));
      expect(result.isNew).toBe(true);

      // Verify folders exist
      expect(existsSync(join(testRoot, "projects"))).toBe(true);
      expect(existsSync(result.projectPath)).toBe(true);
      expect(existsSync(result.specsPath)).toBe(true);
    });

    it("should create projects directory if it doesn't exist", async () => {
      await createProjectStructure("first-project", testRoot);

      expect(existsSync(join(testRoot, "projects"))).toBe(true);
    });

    it("should reuse existing projects directory", async () => {
      // Create projects directory manually
      mkdirSync(join(testRoot, "projects"), { recursive: true });

      const result = await createProjectStructure("test-project", testRoot);

      expect(existsSync(result.projectPath)).toBe(true);
      expect(existsSync(result.specsPath)).toBe(true);
    });

    it("should error if project already exists with complete structure", async () => {
      // Create complete project structure
      const projectPath = join(testRoot, "projects", "existing-project");
      const specsPath = join(projectPath, "specs");
      mkdirSync(specsPath, { recursive: true });

      await expect(
        createProjectStructure("existing-project", testRoot)
      ).rejects.toThrow("already exists");
    });

    it("should complete partial structure (project folder but no specs)", async () => {
      // Create project folder without specs
      const projectPath = join(testRoot, "projects", "partial-project");
      mkdirSync(projectPath, { recursive: true });

      const result = await createProjectStructure("partial-project", testRoot);

      expect(result.isNew).toBe(false);
      expect(existsSync(result.specsPath)).toBe(true);
    });

    it("should reject empty project name", async () => {
      await expect(createProjectStructure("", testRoot)).rejects.toThrow(
        "Invalid project name"
      );
    });

    it("should reject project name with forward slash", async () => {
      await expect(createProjectStructure("my/project", testRoot)).rejects.toThrow(
        "Invalid project name"
      );
    });

    it("should reject project name with backslash", async () => {
      await expect(createProjectStructure("my\\project", testRoot)).rejects.toThrow(
        "Invalid project name"
      );
    });

    it("should reject project name starting with dot", async () => {
      await expect(createProjectStructure(".hidden", testRoot)).rejects.toThrow(
        "Invalid project name"
      );
    });

    it("should reject dot as project name", async () => {
      await expect(createProjectStructure(".", testRoot)).rejects.toThrow(
        "Invalid project name"
      );
    });

    it("should reject double-dot as project name", async () => {
      await expect(createProjectStructure("..", testRoot)).rejects.toThrow(
        "Invalid project name"
      );
    });

    it("should error if projects exists as a file", async () => {
      // Create 'projects' as a file instead of directory
      writeFileSync(join(testRoot, "projects"), "not a directory");

      await expect(createProjectStructure("test", testRoot)).rejects.toThrow(
        "exists as a file"
      );
    });

    it("should handle permission errors gracefully with dependency injection", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: NodeJS.ErrnoException = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      await expect(
        createProjectStructure(
          "test",
          testRoot,
          mockDirCreator,
          existsSync,
          undefined as any,
          undefined as any
        )
      ).rejects.toThrow("Permission denied");
    });

    it("should handle disk space errors gracefully with dependency injection", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: NodeJS.ErrnoException = new Error("No space left");
        error.code = "ENOSPC";
        throw error;
      };

      await expect(
        createProjectStructure(
          "test",
          testRoot,
          mockDirCreator,
          existsSync,
          undefined as any,
          undefined as any
        )
      ).rejects.toThrow("Insufficient disk space");
    });

    it("should verify directory writability after creation", async () => {
      const mockWritabilityChecker: WritabilityChecker = async () => {
        const error: NodeJS.ErrnoException = new Error("Not writable");
        error.code = "EACCES";
        throw error;
      };

      await expect(
        createProjectStructure(
          "test",
          testRoot,
          undefined as any,
          existsSync,
          undefined as any,
          mockWritabilityChecker
        )
      ).rejects.toThrow("not writable");
    });

    it("should create multiple projects independently", async () => {
      await createProjectStructure("project-one", testRoot);
      await createProjectStructure("project-two", testRoot);

      expect(existsSync(join(testRoot, "projects", "project-one", "specs"))).toBe(true);
      expect(existsSync(join(testRoot, "projects", "project-two", "specs"))).toBe(true);
    });

    it("should return correct paths with nested repo root", async () => {
      const nestedRoot = join(testRoot, "nested", "repo");
      mkdirSync(nestedRoot, { recursive: true });

      const result = await createProjectStructure("test", nestedRoot);

      expect(result.projectPath).toBe(join(nestedRoot, "projects", "test"));
      expect(result.specsPath).toBe(join(nestedRoot, "projects", "test", "specs"));
    });

    it("should handle project names with special allowed characters", async () => {
      const result = await createProjectStructure("my-project_123.test", testRoot);

      expect(existsSync(result.projectPath)).toBe(true);
      expect(existsSync(result.specsPath)).toBe(true);
    });

    it("should validate and provide detailed error message for invalid names", async () => {
      try {
        await createProjectStructure("/invalid", testRoot);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Invalid project name");
        expect((error as Error).message).toContain("cannot contain path separators");
      }
    });
  });

  describe("generateTemplates", () => {
    it("should generate all 6 template files", async () => {
      // First create project structure
      await createProjectStructure("template-test", testRoot);

      // Generate templates
      const result = await generateTemplates("template-test", testRoot);

      expect(result.created.length).toBe(6);
      expect(result.skipped.length).toBe(0);
      expect(result.created).toContain("01-research.md");
      expect(result.created).toContain("02-prd.md");
      expect(result.created).toContain("03-jtbd.md");
      expect(result.created).toContain("04-tasks.md");
      expect(result.created).toContain("05-hld.md");
      expect(result.created).toContain("IMPLEMENTATION_PLAN.md");

      // Verify files exist on disk
      const projectPath = join(testRoot, "projects", "template-test");
      expect(existsSync(join(projectPath, "01-research.md"))).toBe(true);
      expect(existsSync(join(projectPath, "02-prd.md"))).toBe(true);
      expect(existsSync(join(projectPath, "03-jtbd.md"))).toBe(true);
      expect(existsSync(join(projectPath, "04-tasks.md"))).toBe(true);
      expect(existsSync(join(projectPath, "05-hld.md"))).toBe(true);
      expect(existsSync(join(projectPath, "IMPLEMENTATION_PLAN.md"))).toBe(true);
    });

    it("should not overwrite existing template files", async () => {
      // Create project structure
      await createProjectStructure("existing-templates", testRoot);

      // Create some existing files
      const projectPath = join(testRoot, "projects", "existing-templates");
      writeFileSync(join(projectPath, "01-research.md"), "Existing content");
      writeFileSync(join(projectPath, "02-prd.md"), "Existing PRD");

      // Generate templates
      const result = await generateTemplates("existing-templates", testRoot);

      expect(result.created.length).toBe(4);
      expect(result.skipped.length).toBe(2);
      expect(result.skipped).toContain("01-research.md");
      expect(result.skipped).toContain("02-prd.md");

      // Verify existing files weren't overwritten
      const researchContent = readFileSync(join(projectPath, "01-research.md"), "utf-8");
      expect(researchContent).toBe("Existing content");

      const prdContent = readFileSync(join(projectPath, "02-prd.md"), "utf-8");
      expect(prdContent).toBe("Existing PRD");

      // Verify new files were created
      expect(existsSync(join(projectPath, "03-jtbd.md"))).toBe(true);
      expect(existsSync(join(projectPath, "04-tasks.md"))).toBe(true);
    });

    it("should be idempotent (running twice doesn't change anything)", async () => {
      // Create project and generate templates
      await createProjectStructure("idempotent-test", testRoot);
      const firstRun = await generateTemplates("idempotent-test", testRoot);

      expect(firstRun.created.length).toBe(6);
      expect(firstRun.skipped.length).toBe(0);

      // Run again
      const secondRun = await generateTemplates("idempotent-test", testRoot);

      expect(secondRun.created.length).toBe(0);
      expect(secondRun.skipped.length).toBe(6);
    });

    it("should error if project folder doesn't exist", async () => {
      await expect(
        generateTemplates("non-existent-project", testRoot)
      ).rejects.toThrow("Project folder not found");
    });

    it("should include proper markdown structure in templates", async () => {
      await createProjectStructure("markdown-test", testRoot);
      await generateTemplates("markdown-test", testRoot);

      const projectPath = join(testRoot, "projects", "markdown-test");

      // Check research template
      const researchContent = readFileSync(join(projectPath, "01-research.md"), "utf-8");
      expect(researchContent).toContain("# Research:");
      expect(researchContent).toContain("## Problem Statement");
      expect(researchContent).toContain("**Next step**:");

      // Check PRD template
      const prdContent = readFileSync(join(projectPath, "02-prd.md"), "utf-8");
      expect(prdContent).toContain("# PRD:");
      expect(prdContent).toContain("## User Stories");
      expect(prdContent).toContain("**As a**");
      expect(prdContent).toContain("**I want to**");
      expect(prdContent).toContain("**So that**");

      // Check JTBD template
      const jtbdContent = readFileSync(join(projectPath, "03-jtbd.md"), "utf-8");
      expect(jtbdContent).toContain("# Jobs To Be Done:");
      expect(jtbdContent).toContain("## JTBD-001:");
      expect(jtbdContent).toContain("**Job Statement**:");

      // Check tasks template
      const tasksContent = readFileSync(join(projectPath, "04-tasks.md"), "utf-8");
      expect(tasksContent).toContain("# Tasks:");
      expect(tasksContent).toContain("## Dependency Graph");
      expect(tasksContent).toContain("## Linearized Implementation Order");

      // Check HLD template
      const hldContent = readFileSync(join(projectPath, "05-hld.md"), "utf-8");
      expect(hldContent).toContain("# High-Level Design:");
      expect(hldContent).toContain("**(OPTIONAL)**");
      expect(hldContent).toContain("## Components");

      // Check implementation plan template
      const planContent = readFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "utf-8");
      expect(planContent).toContain("# Implementation Plan:");
      expect(planContent).toContain("## Current Focus");
      expect(planContent).toContain("## Completed Tasks");
      expect(planContent).toContain("## Pending Tasks");
    });

    it("should handle permission errors gracefully with dependency injection", async () => {
      await createProjectStructure("permission-test", testRoot);

      const mockFileWriter: FileWriter = async () => {
        const error: NodeJS.ErrnoException = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      await expect(
        generateTemplates("permission-test", testRoot, mockFileWriter)
      ).rejects.toThrow("Permission denied");
    });

    it("should handle disk space errors gracefully with dependency injection", async () => {
      await createProjectStructure("diskspace-test", testRoot);

      const mockFileWriter: FileWriter = async () => {
        const error: NodeJS.ErrnoException = new Error("No space left");
        error.code = "ENOSPC";
        throw error;
      };

      await expect(
        generateTemplates("diskspace-test", testRoot, mockFileWriter)
      ).rejects.toThrow("Insufficient disk space");
    });

    it("should aggregate errors when multiple files fail", async () => {
      await createProjectStructure("multi-error-test", testRoot);

      let callCount = 0;
      const mockFileWriter: FileWriter = async (filePath: string) => {
        callCount++;
        // Fail on first two files
        if (callCount <= 2) {
          const error: NodeJS.ErrnoException = new Error("Write failed");
          error.code = "EACCES";
          throw error;
        }
      };

      try {
        await generateTemplates("multi-error-test", testRoot, mockFileWriter);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain("Failed to create template files");
        // Should list multiple failures
        expect(message).toContain("01-research.md");
        expect(message).toContain("02-prd.md");
      }
    });

    it("should return correct project path in result", async () => {
      await createProjectStructure("path-test", testRoot);
      const result = await generateTemplates("path-test", testRoot);

      expect(result.projectPath).toBe(join(testRoot, "projects", "path-test"));
    });

    it("should handle partial existing files correctly", async () => {
      await createProjectStructure("partial-test", testRoot);

      // Create only some files
      const projectPath = join(testRoot, "projects", "partial-test");
      writeFileSync(join(projectPath, "01-research.md"), "Research done");
      writeFileSync(join(projectPath, "03-jtbd.md"), "JTBDs done");
      writeFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "Plan done");

      const result = await generateTemplates("partial-test", testRoot);

      expect(result.created.length).toBe(3);
      expect(result.skipped.length).toBe(3);
      expect(result.created).toContain("02-prd.md");
      expect(result.created).toContain("04-tasks.md");
      expect(result.created).toContain("05-hld.md");
      expect(result.skipped).toContain("01-research.md");
      expect(result.skipped).toContain("03-jtbd.md");
      expect(result.skipped).toContain("IMPLEMENTATION_PLAN.md");
    });

    it("should write files with UTF-8 encoding", async () => {
      await createProjectStructure("encoding-test", testRoot);

      const writtenFiles: Map<string, { content: string; encoding: BufferEncoding }> = new Map();

      const mockFileWriter: FileWriter = async (
        filePath: string,
        content: string,
        encoding: BufferEncoding
      ) => {
        writtenFiles.set(filePath, { content, encoding });
      };

      await generateTemplates("encoding-test", testRoot, mockFileWriter);

      // Verify all files were written with UTF-8
      for (const [, fileInfo] of writtenFiles) {
        expect(fileInfo.encoding).toBe("utf-8");
      }

      expect(writtenFiles.size).toBe(6);
    });

    it("should create templates with placeholder content", async () => {
      await createProjectStructure("placeholder-test", testRoot);
      await generateTemplates("placeholder-test", testRoot);

      const projectPath = join(testRoot, "projects", "placeholder-test");

      // Research should have placeholder sections
      const researchContent = readFileSync(join(projectPath, "01-research.md"), "utf-8");
      expect(researchContent).toContain("[Describe the problem");
      expect(researchContent).toContain("[List existing solutions");

      // PRD should have example user story format
      const prdContent = readFileSync(join(projectPath, "02-prd.md"), "utf-8");
      expect(prdContent).toContain("[user type]");
      expect(prdContent).toContain("[action]");
      expect(prdContent).toContain("[benefit]");

      // Tasks should have example format
      const tasksContent = readFileSync(join(projectPath, "04-tasks.md"), "utf-8");
      expect(tasksContent).toContain("Task 001-001:");
      expect(tasksContent).toContain("**Dependencies**:");
      expect(tasksContent).toContain("**Acceptance**:");
    });

    it("should include next step instructions in templates", async () => {
      await createProjectStructure("nextstep-test", testRoot);
      await generateTemplates("nextstep-test", testRoot);

      const projectPath = join(testRoot, "projects", "nextstep-test");

      const researchContent = readFileSync(join(projectPath, "01-research.md"), "utf-8");
      expect(researchContent).toContain("/project:prd");

      const prdContent = readFileSync(join(projectPath, "02-prd.md"), "utf-8");
      expect(prdContent).toContain("/project:jtbd");

      const jtbdContent = readFileSync(join(projectPath, "03-jtbd.md"), "utf-8");
      expect(jtbdContent).toContain("/project:tasks");

      const tasksContent = readFileSync(join(projectPath, "04-tasks.md"), "utf-8");
      expect(tasksContent).toContain("/project:hld");
      expect(tasksContent).toContain("/project:specs");

      const hldContent = readFileSync(join(projectPath, "05-hld.md"), "utf-8");
      expect(hldContent).toContain("/project:specs");
    });

    it("should work with nested repo roots", async () => {
      const nestedRoot = join(testRoot, "nested", "repo");
      mkdirSync(nestedRoot, { recursive: true });

      await createProjectStructure("nested-test", nestedRoot);
      const result = await generateTemplates("nested-test", nestedRoot);

      expect(result.created.length).toBe(6);
      expect(result.projectPath).toBe(join(nestedRoot, "projects", "nested-test"));

      // Verify files exist
      expect(existsSync(join(nestedRoot, "projects", "nested-test", "01-research.md"))).toBe(
        true
      );
    });

    it("should generate all templates even if some are skipped", async () => {
      await createProjectStructure("mixed-test", testRoot);

      const projectPath = join(testRoot, "projects", "mixed-test");

      // Pre-create alternating files
      writeFileSync(join(projectPath, "01-research.md"), "Existing");
      writeFileSync(join(projectPath, "03-jtbd.md"), "Existing");
      writeFileSync(join(projectPath, "05-hld.md"), "Existing");

      const result = await generateTemplates("mixed-test", testRoot);

      expect(result.created.length).toBe(3);
      expect(result.skipped.length).toBe(3);

      // Verify all 6 files exist now
      expect(existsSync(join(projectPath, "01-research.md"))).toBe(true);
      expect(existsSync(join(projectPath, "02-prd.md"))).toBe(true);
      expect(existsSync(join(projectPath, "03-jtbd.md"))).toBe(true);
      expect(existsSync(join(projectPath, "04-tasks.md"))).toBe(true);
      expect(existsSync(join(projectPath, "05-hld.md"))).toBe(true);
      expect(existsSync(join(projectPath, "IMPLEMENTATION_PLAN.md"))).toBe(true);
    });
  });

  describe("printInitializationSummary", () => {
    it("should print success message with project name", async () => {
      await createProjectStructure("summary-test", testRoot);
      const templateResult = await generateTemplates("summary-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      const result = printInitializationSummary(
        "summary-test",
        templateResult,
        testRoot,
        mockPrinter
      );

      const fullOutput = output.join("\n");
      expect(fullOutput).toContain("✓ Project 'summary-test' created successfully!");
      expect(result.projectName).toBe("summary-test");
    });

    it("should display folder structure with tree characters", async () => {
      await createProjectStructure("tree-test", testRoot);
      const templateResult = await generateTemplates("tree-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      printInitializationSummary("tree-test", templateResult, testRoot, mockPrinter);

      const fullOutput = output.join("\n");
      expect(fullOutput).toContain("projects/tree-test/");
      expect(fullOutput).toContain("├──");
      expect(fullOutput).toContain("└──");
      expect(fullOutput).toContain("specs/");
    });

    it("should list all template files in sorted order", async () => {
      await createProjectStructure("sorted-test", testRoot);
      const templateResult = await generateTemplates("sorted-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      const result = printInitializationSummary(
        "sorted-test",
        templateResult,
        testRoot,
        mockPrinter
      );

      // Check files are in result
      expect(result.files).toContain("01-research.md");
      expect(result.files).toContain("02-prd.md");
      expect(result.files).toContain("03-jtbd.md");
      expect(result.files).toContain("04-tasks.md");
      expect(result.files).toContain("05-hld.md");
      expect(result.files).toContain("IMPLEMENTATION_PLAN.md");

      // Check ordering: numbered files first, then IMPLEMENTATION_PLAN.md
      const implementationPlanIndex = result.files.indexOf("IMPLEMENTATION_PLAN.md");
      const researchIndex = result.files.indexOf("01-research.md");
      const hldIndex = result.files.indexOf("05-hld.md");

      expect(researchIndex).toBeLessThan(implementationPlanIndex);
      expect(hldIndex).toBeLessThan(implementationPlanIndex);
    });

    it("should include next step command", async () => {
      await createProjectStructure("nextstep-test", testRoot);
      const templateResult = await generateTemplates("nextstep-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      const result = printInitializationSummary(
        "nextstep-test",
        templateResult,
        testRoot,
        mockPrinter
      );

      const fullOutput = output.join("\n");
      expect(fullOutput).toContain("/project:research nextstep-test");
      expect(fullOutput).toContain("Next step:");
      expect(fullOutput).toContain("problem statement");
      expect(result.nextCommand).toBe("/project:research nextstep-test");
    });

    it("should handle projects with both created and skipped files", async () => {
      await createProjectStructure("mixed-test", testRoot);

      // Create some files manually
      const projectPath = join(testRoot, "projects", "mixed-test");
      writeFileSync(join(projectPath, "01-research.md"), "Existing");
      writeFileSync(join(projectPath, "03-jtbd.md"), "Existing");

      const templateResult = await generateTemplates("mixed-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      const result = printInitializationSummary(
        "mixed-test",
        templateResult,
        testRoot,
        mockPrinter
      );

      // Should show all files (both created and skipped)
      expect(result.files.length).toBe(6);
      expect(result.files).toContain("01-research.md");
      expect(result.files).toContain("02-prd.md");
      expect(result.files).toContain("03-jtbd.md");
    });

    it("should display correct relative path from repo root", async () => {
      await createProjectStructure("path-test", testRoot);
      const templateResult = await generateTemplates("path-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      const result = printInitializationSummary("path-test", templateResult, testRoot, mockPrinter);

      expect(result.projectPath).toBe("projects/path-test");

      const fullOutput = output.join("\n");
      expect(fullOutput).toContain("projects/path-test/");
    });

    it("should handle project names with special characters", async () => {
      const projectName = "my-feature_v2.0";
      await createProjectStructure(projectName, testRoot);
      const templateResult = await generateTemplates(projectName, testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      const result = printInitializationSummary(
        projectName,
        templateResult,
        testRoot,
        mockPrinter
      );

      const fullOutput = output.join("\n");
      expect(fullOutput).toContain(`✓ Project '${projectName}' created successfully!`);
      expect(fullOutput).toContain(`/project:research ${projectName}`);
      expect(result.nextCommand).toBe(`/project:research ${projectName}`);
    });

    it("should include all required sections in output", async () => {
      await createProjectStructure("sections-test", testRoot);
      const templateResult = await generateTemplates("sections-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      printInitializationSummary("sections-test", templateResult, testRoot, mockPrinter);

      const fullOutput = output.join("\n");

      // AC1: Success message
      expect(fullOutput).toContain("✓ Project 'sections-test' created successfully!");

      // AC2: Folder structure
      expect(fullOutput).toContain("Structure:");
      expect(fullOutput).toContain("projects/sections-test/");

      // AC3: Next step guidance
      expect(fullOutput).toContain("Next step:");
      expect(fullOutput).toContain("Run the following command");
      expect(fullOutput).toContain("/project:research sections-test");
    });

    it("should display specs/ directory at the end", async () => {
      await createProjectStructure("specs-last-test", testRoot);
      const templateResult = await generateTemplates("specs-last-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      printInitializationSummary("specs-last-test", templateResult, testRoot, mockPrinter);

      const fullOutput = output.join("\n");

      // Find the line with specs/
      const lines = fullOutput.split("\n");
      const specsLineIndex = lines.findIndex((line) => line.includes("specs/"));
      const implementationPlanLineIndex = lines.findIndex((line) =>
        line.includes("IMPLEMENTATION_PLAN.md")
      );

      // specs/ should come after IMPLEMENTATION_PLAN.md
      expect(specsLineIndex).toBeGreaterThan(implementationPlanLineIndex);

      // specs/ should use └── (last item)
      expect(lines[specsLineIndex]).toContain("└──");
    });

    it("should return all required fields in result object", async () => {
      await createProjectStructure("result-test", testRoot);
      const templateResult = await generateTemplates("result-test", testRoot);

      const output: string[] = [];
      const mockPrinter: OutputPrinter = (message: string) => {
        output.push(message);
      };

      const result = printInitializationSummary(
        "result-test",
        templateResult,
        testRoot,
        mockPrinter
      );

      expect(result.projectName).toBe("result-test");
      expect(result.projectPath).toBe("projects/result-test");
      expect(result.files).toHaveLength(6);
      expect(result.nextCommand).toBe("/project:research result-test");
    });

    it("should work with default printer (console.log)", async () => {
      await createProjectStructure("default-printer-test", testRoot);
      const templateResult = await generateTemplates("default-printer-test", testRoot);

      // This should not throw - using default printer
      expect(() => {
        printInitializationSummary("default-printer-test", templateResult, testRoot);
      }).not.toThrow();
    });
  });
});

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
    it("should generate IMPLEMENTATION_PLAN.md and AGENTS.md", async () => {
      // First create project structure
      await createProjectStructure("template-test", testRoot);

      // Generate templates
      const result = await generateTemplates("template-test", testRoot);

      expect(result.created.length).toBe(2);
      expect(result.skipped.length).toBe(0);
      expect(result.created).toContain("IMPLEMENTATION_PLAN.md");
      expect(result.created).toContain("AGENTS.md");

      // Verify files exist on disk
      const projectPath = join(testRoot, "projects", "template-test");
      expect(existsSync(join(projectPath, "IMPLEMENTATION_PLAN.md"))).toBe(true);
      expect(existsSync(join(projectPath, "AGENTS.md"))).toBe(true);

      // Verify 01-05 files are NOT created
      expect(existsSync(join(projectPath, "01-research.md"))).toBe(false);
      expect(existsSync(join(projectPath, "02-prd.md"))).toBe(false);
      expect(existsSync(join(projectPath, "03-jtbd.md"))).toBe(false);
      expect(existsSync(join(projectPath, "04-tasks.md"))).toBe(false);
      expect(existsSync(join(projectPath, "05-hld.md"))).toBe(false);
    });

    it("should not overwrite existing template files", async () => {
      // Create project structure
      await createProjectStructure("existing-templates", testRoot);

      // Create existing files
      const projectPath = join(testRoot, "projects", "existing-templates");
      writeFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "Existing plan content");
      writeFileSync(join(projectPath, "AGENTS.md"), "Existing agents content");

      // Generate templates
      const result = await generateTemplates("existing-templates", testRoot);

      expect(result.created.length).toBe(0);
      expect(result.skipped.length).toBe(2);
      expect(result.skipped).toContain("IMPLEMENTATION_PLAN.md");
      expect(result.skipped).toContain("AGENTS.md");

      // Verify existing files weren't overwritten
      const planContent = readFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "utf-8");
      expect(planContent).toBe("Existing plan content");

      const agentsContent = readFileSync(join(projectPath, "AGENTS.md"), "utf-8");
      expect(agentsContent).toBe("Existing agents content");
    });

    it("should be idempotent (running twice doesn't change anything)", async () => {
      // Create project and generate templates
      await createProjectStructure("idempotent-test", testRoot);
      const firstRun = await generateTemplates("idempotent-test", testRoot);

      expect(firstRun.created.length).toBe(2);
      expect(firstRun.skipped.length).toBe(0);

      // Run again
      const secondRun = await generateTemplates("idempotent-test", testRoot);

      expect(secondRun.created.length).toBe(0);
      expect(secondRun.skipped.length).toBe(2);
    });

    it("should error if project folder doesn't exist", async () => {
      await expect(
        generateTemplates("non-existent-project", testRoot)
      ).rejects.toThrow("Project folder not found");
    });

    it("should include proper markdown structure in IMPLEMENTATION_PLAN.md", async () => {
      await createProjectStructure("markdown-test", testRoot);
      await generateTemplates("markdown-test", testRoot);

      const projectPath = join(testRoot, "projects", "markdown-test");

      // Check implementation plan template
      const planContent = readFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "utf-8");
      expect(planContent).toContain("# Implementation Plan:");
      expect(planContent).toContain("## Current Focus");
      expect(planContent).toContain("## Completed Tasks");
      expect(planContent).toContain("## Pending Tasks");
      expect(planContent).toContain("## Blocked Tasks");
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
        expect(message).toContain("IMPLEMENTATION_PLAN.md");
      }
    });

    it("should return correct project path in result", async () => {
      await createProjectStructure("path-test", testRoot);
      const result = await generateTemplates("path-test", testRoot);

      expect(result.projectPath).toBe(join(testRoot, "projects", "path-test"));
    });

    it("should skip existing files and create missing ones", async () => {
      await createProjectStructure("partial-test", testRoot);

      // Create only IMPLEMENTATION_PLAN.md
      const projectPath = join(testRoot, "projects", "partial-test");
      writeFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "Plan done");

      const result = await generateTemplates("partial-test", testRoot);

      expect(result.created.length).toBe(1);
      expect(result.skipped.length).toBe(1);
      expect(result.created).toContain("AGENTS.md");
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

      // Verify both files were written with UTF-8
      for (const [, fileInfo] of writtenFiles) {
        expect(fileInfo.encoding).toBe("utf-8");
      }

      expect(writtenFiles.size).toBe(2);
    });

    it("should create template files with expected content", async () => {
      await createProjectStructure("placeholder-test", testRoot);
      await generateTemplates("placeholder-test", testRoot);

      const projectPath = join(testRoot, "projects", "placeholder-test");

      // Implementation plan should have standard sections
      const planContent = readFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "utf-8");
      expect(planContent).toContain("## Current Focus");
      expect(planContent).toContain("## Completed Tasks");
      expect(planContent).toContain("## Pending Tasks");
      expect(planContent).toContain("## Blocked Tasks");

      // AGENTS.md should have expected sections
      const agentsContent = readFileSync(join(projectPath, "AGENTS.md"), "utf-8");
      expect(agentsContent).toContain("## Feedback Loops and Verifiabilty");
      expect(agentsContent).toContain("# Learnings");
    });

    it("should create IMPLEMENTATION_PLAN.md with Last Updated section", async () => {
      await createProjectStructure("nextstep-test", testRoot);
      await generateTemplates("nextstep-test", testRoot);

      const projectPath = join(testRoot, "projects", "nextstep-test");

      const planContent = readFileSync(join(projectPath, "IMPLEMENTATION_PLAN.md"), "utf-8");
      expect(planContent).toContain("**Last Updated**:");
    });

    it("should work with nested repo roots", async () => {
      const nestedRoot = join(testRoot, "nested", "repo");
      mkdirSync(nestedRoot, { recursive: true });

      await createProjectStructure("nested-test", nestedRoot);
      const result = await generateTemplates("nested-test", nestedRoot);

      expect(result.created.length).toBe(2);
      expect(result.projectPath).toBe(join(nestedRoot, "projects", "nested-test"));

      // Verify both files exist
      expect(existsSync(join(nestedRoot, "projects", "nested-test", "IMPLEMENTATION_PLAN.md"))).toBe(
        true
      );
      expect(existsSync(join(nestedRoot, "projects", "nested-test", "AGENTS.md"))).toBe(
        true
      );
    });

    it("should create both template files when folder exists", async () => {
      await createProjectStructure("mixed-test", testRoot);

      const projectPath = join(testRoot, "projects", "mixed-test");

      const result = await generateTemplates("mixed-test", testRoot);

      expect(result.created.length).toBe(2);
      expect(result.skipped.length).toBe(0);

      // Verify both files exist
      expect(existsSync(join(projectPath, "IMPLEMENTATION_PLAN.md"))).toBe(true);
      expect(existsSync(join(projectPath, "AGENTS.md"))).toBe(true);
    });

    it("should inherit AGENTS.md from repo root if available", async () => {
      await createProjectStructure("inherit-test", testRoot);

      // Create root AGENTS.md with custom content
      const rootAgentsContent = `## Custom Root Guidelines

Custom guidelines here.

# Learnings
- Some existing learning
- Another learning`;
      writeFileSync(join(testRoot, "AGENTS.md"), rootAgentsContent);

      const result = await generateTemplates("inherit-test", testRoot);

      expect(result.created.length).toBe(2);

      // Verify AGENTS.md was created with root content (without root learnings)
      const projectPath = join(testRoot, "projects", "inherit-test");
      const agentsContent = readFileSync(join(projectPath, "AGENTS.md"), "utf-8");

      expect(agentsContent).toContain("Custom Root Guidelines");
      expect(agentsContent).toContain("# Learnings");
      // Learnings section should be empty (not inherit root's learnings)
      expect(agentsContent).not.toContain("Some existing learning");
    });

    it("should use default AGENTS.md template when no root file exists", async () => {
      await createProjectStructure("default-agents-test", testRoot);

      // Ensure no root AGENTS.md exists
      const rootAgentsPath = join(testRoot, "AGENTS.md");
      if (existsSync(rootAgentsPath)) {
        rmSync(rootAgentsPath);
      }

      const result = await generateTemplates("default-agents-test", testRoot);

      expect(result.created.length).toBe(2);

      // Verify AGENTS.md uses default template
      const projectPath = join(testRoot, "projects", "default-agents-test");
      const agentsContent = readFileSync(join(projectPath, "AGENTS.md"), "utf-8");

      expect(agentsContent).toContain("## Feedback Loops and Verifiabilty");
      expect(agentsContent).toContain("### typesafety");
      expect(agentsContent).toContain("# Learnings");
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

    it("should list both template files", async () => {
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

      // Check both files are in result
      expect(result.files).toContain("IMPLEMENTATION_PLAN.md");
      expect(result.files).toContain("AGENTS.md");
      expect(result.files.length).toBe(2);
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

    it("should list created IMPLEMENTATION_PLAN.md in summary", async () => {
      await createProjectStructure("mixed-test", testRoot);

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

      // Should show both template files
      expect(result.files.length).toBe(2);
      expect(result.files).toContain("IMPLEMENTATION_PLAN.md");
      expect(result.files).toContain("AGENTS.md");
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
      expect(result.files).toHaveLength(2);
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

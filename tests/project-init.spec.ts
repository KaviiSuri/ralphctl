import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import {
  isValidProjectName,
  createProjectStructure,
  type DirectoryCreator,
  type FileSystemChecker,
  type FileStatChecker,
  type WritabilityChecker,
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
});

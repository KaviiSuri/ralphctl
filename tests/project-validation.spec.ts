import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  isValidProjectName,
  validateProject,
  resolveProjectPaths,
} from "../src/lib/projects/validation.js";

describe("Project Validation", () => {
  const testRoot = join(process.cwd(), "test-projects-temp");

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
    it("should accept valid kebab-case names", () => {
      expect(isValidProjectName("my-project")).toBe(true);
      expect(isValidProjectName("project-123")).toBe(true);
      expect(isValidProjectName("test")).toBe(true);
      expect(isValidProjectName("a-b-c-1-2-3")).toBe(true);
    });

    it("should reject names with uppercase letters", () => {
      expect(isValidProjectName("MyProject")).toBe(false);
      expect(isValidProjectName("my-Project")).toBe(false);
    });

    it("should reject names with spaces", () => {
      expect(isValidProjectName("my project")).toBe(false);
      expect(isValidProjectName("my project 123")).toBe(false);
    });

    it("should reject names with special characters", () => {
      expect(isValidProjectName("my_project")).toBe(false);
      expect(isValidProjectName("my.project")).toBe(false);
      expect(isValidProjectName("my@project")).toBe(false);
      expect(isValidProjectName("my/project")).toBe(false);
    });

    it("should reject empty names", () => {
      expect(isValidProjectName("")).toBe(false);
    });
  });

  describe("validateProject", () => {
    it("should reject invalid project names", () => {
      const result = validateProject("My_Project", testRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("kebab-case");
    });

    it("should reject project names with path separators", () => {
      const result = validateProject("my/project", testRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("kebab-case");
    });

    it("should reject non-existent projects", () => {
      const result = validateProject("non-existent", testRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain("ralphctl init --project");
    });

    it("should validate existing project with specs folder", () => {
      const projectPath = join(testRoot, "projects", "test-project");
      const specsPath = join(projectPath, "specs");
      mkdirSync(specsPath, { recursive: true });

      const result = validateProject("test-project", testRoot);
      expect(result.valid).toBe(true);
      expect(result.projectPath).toBe(projectPath);
      expect(result.specsPath).toBe(specsPath);
      expect(result.implementationPlanPath).toBe(
        join(projectPath, "IMPLEMENTATION_PLAN.md")
      );
      expect(result.warnings).toBeUndefined();
    });

    it("should warn if specs folder is missing", () => {
      const projectPath = join(testRoot, "projects", "test-project");
      mkdirSync(projectPath, { recursive: true });

      const result = validateProject("test-project", testRoot);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.[0]).toContain("Specs folder not found");
    });
  });

  describe("resolveProjectPaths", () => {
    it("should return root paths when no project specified", () => {
      const result = resolveProjectPaths(undefined, testRoot);
      expect(result.specsPath).toBe(join(testRoot, "specs"));
      expect(result.implementationPlanPath).toBe(
        join(testRoot, "IMPLEMENTATION_PLAN.md")
      );
      expect(result.projectName).toBeUndefined();
    });

    it("should return project-scoped paths when project specified", () => {
      const projectPath = join(testRoot, "projects", "test-project");
      const specsPath = join(projectPath, "specs");
      mkdirSync(specsPath, { recursive: true });

      const result = resolveProjectPaths("test-project", testRoot);
      expect(result.specsPath).toBe(specsPath);
      expect(result.implementationPlanPath).toBe(
        join(projectPath, "IMPLEMENTATION_PLAN.md")
      );
      expect(result.projectName).toBe("test-project");
    });

    it("should throw error for invalid project", () => {
      expect(() => {
        resolveProjectPaths("non-existent", testRoot);
      }).toThrow("not found");
    });

    it("should throw error for invalid project name format", () => {
      expect(() => {
        resolveProjectPaths("Invalid_Name", testRoot);
      }).toThrow("kebab-case");
    });
  });
});

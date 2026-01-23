import { describe, it, expect } from "bun:test";
import { Mode } from "../src/domain/types.js";
import { resolvePrompt } from "../src/lib/prompts/resolver.js";

describe("resolvePrompt", () => {
  describe("custom prompt", () => {
    it("should use custom prompt when provided without project", async () => {
      const customPrompt = "Custom prompt text";
      const result = await resolvePrompt({ mode: Mode.Plan, customPrompt });

      expect(result).toBe(customPrompt);
    });

    it("should use custom prompt when provided with project but no placeholder", async () => {
      const customPrompt = "Custom prompt text";
      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "my-project",
      });

      expect(result).toBe(customPrompt);
    });
  });

  describe("placeholder resolution", () => {
    it("should replace single {project} placeholder with projects/<name>", async () => {
      const customPrompt = "Study specs in {project}/specs/";
      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "auth-system",
      });

      expect(result).toBe("Study specs in projects/auth-system/specs/");
    });

    it("should replace multiple {project} placeholders", async () => {
      const customPrompt =
        "Study specs in {project}/specs/ and update {project}/IMPLEMENTATION_PLAN.md";
      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "auth-system",
      });

      expect(result).toBe(
        "Study specs in projects/auth-system/specs/ and update projects/auth-system/IMPLEMENTATION_PLAN.md"
      );
    });

    it("should use forward slashes in resolved path", async () => {
      const customPrompt = "Check {project}/README.md";
      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "my-feature",
      });

      expect(result).toBe("Check projects/my-feature/README.md");
      expect(result).not.toContain("\\");
    });

    it("should not replace {project} with spaces", async () => {
      const customPrompt = "Study { project } with spaces";
      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "my-project",
      });

      expect(result).toBe("Study { project } with spaces");
    });

    it("should not replace {PROJECT} in uppercase", async () => {
      const customPrompt = "Study {PROJECT} in uppercase";
      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "my-project",
      });

      expect(result).toBe("Study {PROJECT} in uppercase");
    });
  });

  describe("global mode fallback", () => {
    it("should resolve {project} to . when no project flag provided", async () => {
      const customPrompt = "Study specs in {project}/specs/";

      const result = await resolvePrompt({ mode: Mode.Plan, customPrompt });

      expect(result).toBe("Study specs in ./specs/");
    });

    it("should resolve multiple {project} placeholders to . in global mode", async () => {
      const customPrompt = "Study {project}/specs/ and update {project}/IMPLEMENTATION_PLAN.md";

      const result = await resolvePrompt({ mode: Mode.Plan, customPrompt });

      expect(result).toBe("Study ./specs/ and update ./IMPLEMENTATION_PLAN.md");
    });
  });

  describe("backward compatibility", () => {
    it("should work with prompts without {project} placeholder and no project flag", async () => {
      const customPrompt = "Study specs in specs/ and update IMPLEMENTATION_PLAN.md";
      const result = await resolvePrompt({ mode: Mode.Plan, customPrompt });

      expect(result).toBe("Study specs in specs/ and update IMPLEMENTATION_PLAN.md");
    });

    it("should work with prompts without {project} placeholder but project flag provided", async () => {
      const customPrompt = "Study specs in specs/";
      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "my-project",
      });

      expect(result).toBe("Study specs in specs/");
    });
  });

  describe("complex scenarios", () => {
    it("should handle prompt with multiple lines and multiple placeholders", async () => {
      const customPrompt = `# Planning Agent

## Context
Study all specs in {project}/specs/ to understand requirements.
Update {project}/IMPLEMENTATION_PLAN.md with task status.

## Tasks
- Analyze gap between specs and current implementation
- Read files in {project}/src/
`;

      const result = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "auth-system",
      });

      expect(result).toContain("projects/auth-system/specs/");
      expect(result).toContain("projects/auth-system/IMPLEMENTATION_PLAN.md");
      expect(result).toContain("projects/auth-system/src/");
      expect(result).not.toContain("{project}");
    });

    it("should handle project names with hyphens and underscores", async () => {
      const customPrompt = "Check {project}/README.md";

      const result1 = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "my-feature-branch",
      });
      expect(result1).toBe("Check projects/my-feature-branch/README.md");

      const result2 = await resolvePrompt({
        mode: Mode.Plan,
        customPrompt,
        project: "my_feature_branch",
      });
      expect(result2).toBe("Check projects/my_feature_branch/README.md");
    });
  });
});

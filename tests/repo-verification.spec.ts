import { describe, it, expect } from "bun:test";
import {
  verifyRepoRoot,
  isGitRepository,
  getRepoRoot,
  type GitCommandExecutor,
  type UserPrompter,
} from "../src/lib/repo/verification.js";
import * as path from "path";

describe("Repository Verification", () => {
  describe("isGitRepository", () => {
    it("should return true when in a git repository", () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --git-dir") {
          return ".git";
        }
        return "";
      };

      const result = isGitRepository(mockExecutor);
      expect(result).toBe(true);
    });

    it("should return false when not in a git repository", () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        throw new Error("fatal: not a git repository");
      };

      const result = isGitRepository(mockExecutor);
      expect(result).toBe(false);
    });

    it("should return false when git is not installed", () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        const error: any = new Error("git: command not found");
        error.code = "ENOENT";
        throw error;
      };

      const result = isGitRepository(mockExecutor);
      expect(result).toBe(false);
    });
  });

  describe("getRepoRoot", () => {
    it("should return repo root path when in a repository", () => {
      const mockRepoRoot = "/Users/test/my-repo";
      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --show-toplevel") {
          return mockRepoRoot;
        }
        return "";
      };

      const result = getRepoRoot(mockExecutor);
      expect(result).toBe(mockRepoRoot);
    });

    it("should return null when not in a repository", () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        throw new Error("fatal: not a git repository");
      };

      const result = getRepoRoot(mockExecutor);
      expect(result).toBe(null);
    });

    it("should handle worktrees correctly", () => {
      const mockRepoRoot = "/Users/test/my-repo";
      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --show-toplevel") {
          return mockRepoRoot;
        }
        return "";
      };

      const result = getRepoRoot(mockExecutor);
      expect(result).toBe(mockRepoRoot);
    });
  });

  describe("verifyRepoRoot", () => {
    // Save and restore process.cwd
    const originalCwd = process.cwd();

    it("should pass silently when at repo root", async () => {
      const mockRepoRoot = "/Users/test/my-repo";
      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --git-dir") {
          return ".git";
        }
        if (command === "git rev-parse --show-toplevel") {
          return mockRepoRoot;
        }
        return "";
      };

      const mockPrompter: UserPrompter = async (message: string) => {
        throw new Error("Prompter should not be called when at repo root");
      };

      // Mock process.cwd to return the repo root
      const originalCwd = process.cwd;
      process.cwd = () => mockRepoRoot;

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      // Restore process.cwd
      process.cwd = originalCwd;

      expect(result.isRepoRoot).toBe(true);
      expect(result.repoRootPath).toBe(path.resolve(mockRepoRoot));
      expect(result.userConfirmed).toBe(false);
      expect(result.needsWarning).toBe(false);
    });

    it("should warn and prompt when not in a repository", async () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        throw new Error("fatal: not a git repository");
      };

      let promptMessage = "";
      const mockPrompter: UserPrompter = async (message: string) => {
        promptMessage = message;
        return false; // User declines
      };

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      expect(result.isRepoRoot).toBe(false);
      expect(result.repoRootPath).toBe(null);
      expect(result.userConfirmed).toBe(false);
      expect(result.needsWarning).toBe(true);
      expect(promptMessage).toContain("Do you want to proceed anyway?");
    });

    it("should warn and prompt when in repo subdirectory", async () => {
      const mockRepoRoot = "/Users/test/my-repo";
      const mockCwd = "/Users/test/my-repo/src/components";

      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --git-dir") {
          return "../../.git";
        }
        if (command === "git rev-parse --show-toplevel") {
          return mockRepoRoot;
        }
        return "";
      };

      let promptMessage = "";
      const mockPrompter: UserPrompter = async (message: string) => {
        promptMessage = message;
        return false; // User declines
      };

      // Mock process.cwd to return subdirectory
      const originalCwd = process.cwd;
      process.cwd = () => mockCwd;

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      // Restore process.cwd
      process.cwd = originalCwd;

      expect(result.isRepoRoot).toBe(false);
      expect(result.repoRootPath).toBe(path.resolve(mockRepoRoot));
      expect(result.userConfirmed).toBe(false);
      expect(result.needsWarning).toBe(true);
      expect(promptMessage).toContain("Do you want to proceed anyway?");
    });

    it("should accept user confirmation when they type 'y'", async () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        throw new Error("fatal: not a git repository");
      };

      const mockPrompter: UserPrompter = async (message: string) => {
        return true; // User confirms with 'y'
      };

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      expect(result.isRepoRoot).toBe(false);
      expect(result.repoRootPath).toBe(null);
      expect(result.userConfirmed).toBe(true);
      expect(result.needsWarning).toBe(true);
    });

    it("should accept user confirmation when they type 'yes'", async () => {
      const mockRepoRoot = "/Users/test/my-repo";
      const mockCwd = "/Users/test/my-repo/src";

      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --git-dir") {
          return "../.git";
        }
        if (command === "git rev-parse --show-toplevel") {
          return mockRepoRoot;
        }
        return "";
      };

      const mockPrompter: UserPrompter = async (message: string) => {
        return true; // User confirms with 'yes'
      };

      // Mock process.cwd to return subdirectory
      const originalCwd = process.cwd;
      process.cwd = () => mockCwd;

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      // Restore process.cwd
      process.cwd = originalCwd;

      expect(result.isRepoRoot).toBe(false);
      expect(result.repoRootPath).toBe(path.resolve(mockRepoRoot));
      expect(result.userConfirmed).toBe(true);
      expect(result.needsWarning).toBe(true);
    });

    it("should handle git command failure after repo detection", async () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --git-dir") {
          return ".git";
        }
        if (command === "git rev-parse --show-toplevel") {
          throw new Error("Unexpected error");
        }
        return "";
      };

      const mockPrompter: UserPrompter = async (message: string) => {
        return false;
      };

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      expect(result.isRepoRoot).toBe(false);
      expect(result.repoRootPath).toBe(null);
      expect(result.userConfirmed).toBe(false);
      expect(result.needsWarning).toBe(true);
    });

    it("should normalize paths when comparing (handle symlinks, trailing slashes)", async () => {
      const mockRepoRoot = "/Users/test/my-repo/";
      const mockCwd = "/Users/test/my-repo"; // No trailing slash

      const mockExecutor: GitCommandExecutor = (command: string) => {
        if (command === "git rev-parse --git-dir") {
          return ".git";
        }
        if (command === "git rev-parse --show-toplevel") {
          return mockRepoRoot; // With trailing slash
        }
        return "";
      };

      const mockPrompter: UserPrompter = async (message: string) => {
        throw new Error("Prompter should not be called when at repo root");
      };

      // Mock process.cwd to return the repo root without trailing slash
      const originalCwd = process.cwd;
      process.cwd = () => mockCwd;

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      // Restore process.cwd
      process.cwd = originalCwd;

      expect(result.isRepoRoot).toBe(true);
      expect(result.needsWarning).toBe(false);
    });

    it("should handle permission errors gracefully", async () => {
      const mockExecutor: GitCommandExecutor = (command: string) => {
        const error: any = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      const mockPrompter: UserPrompter = async (message: string) => {
        return false;
      };

      const result = await verifyRepoRoot(mockExecutor, mockPrompter);

      expect(result.isRepoRoot).toBe(false);
      expect(result.repoRootPath).toBe(null);
      expect(result.needsWarning).toBe(true);
    });
  });
});

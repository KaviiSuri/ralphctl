import { describe, it, expect } from "bun:test";
import {
  createClaudeCommandsFolder,
  createOpenCodeCommandsFolder,
  createCommandFolders,
  type DirectoryCreator,
  type FileSystemChecker,
  type FileStatChecker,
  type WritabilityChecker,
} from "../src/lib/command-infrastructure.js";

describe("Command Infrastructure", () => {
  describe("createClaudeCommandsFolder", () => {
    it("should create .claude/commands/ folder when it does not exist", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      const result = await createClaudeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(result).toBe("/test/repo/.claude/commands");
      expect(createdPaths).toEqual(["/test/repo/.claude/commands"]);
    });

    it("should return path when folder already exists (idempotent)", async () => {
      let createCalled = false;

      const mockDirCreator: DirectoryCreator = async () => {
        createCalled = true;
      };

      const mockFsChecker: FileSystemChecker = () => true; // Folder exists

      const result = await createClaudeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(result).toBe("/test/repo/.claude/commands");
      expect(createCalled).toBe(false); // Should not create if exists
    });

    it("should throw clear error on permission denied (EACCES)", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker, mockStatChecker)
      ).rejects.toThrow(/Permission denied creating .claude\/commands\//);
    });

    it("should throw clear error on permission denied (EPERM)", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("Operation not permitted");
        error.code = "EPERM";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker, mockStatChecker)
      ).rejects.toThrow(/Permission denied creating .claude\/commands\//);
    });

    it("should throw clear error on insufficient disk space", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("No space left on device");
        error.code = "ENOSPC";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker, mockStatChecker)
      ).rejects.toThrow(/Insufficient disk space/);
    });

    it("should re-throw unexpected errors with context", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        throw new Error("Unexpected filesystem error");
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker, mockStatChecker)
      ).rejects.toThrow(/Failed to create .claude\/commands\//);
    });

    it("should use recursive option when creating directory", async () => {
      let receivedOptions: any = null;

      const mockDirCreator: DirectoryCreator = async (
        _dirPath: string,
        options?: { recursive?: boolean }
      ) => {
        receivedOptions = options;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      await createClaudeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(receivedOptions).toEqual({ recursive: true });
    });

    it("should throw error if parent directory exists as file", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        // Should not be called
      };

      const mockFsChecker: FileSystemChecker = (path: string) => {
        // .claude exists (as file)
        return path.endsWith(".claude");
      };

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => false, // It's a file, not directory
      });

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker, mockStatChecker)
      ).rejects.toThrow(/.claude exists as a file, not a directory/);
    });

    it("should verify writability after creation", async () => {
      let writabilityChecked = false;

      const mockDirCreator: DirectoryCreator = async () => {
        // Created successfully
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        writabilityChecked = true;
      };

      await createClaudeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(writabilityChecked).toBe(true);
    });

    it("should throw error if directory is not writable after creation", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        // Created successfully
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        throw new Error("Permission denied");
      };

      await expect(
        createClaudeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker,
          mockStatChecker,
          mockWritabilityChecker
        )
      ).rejects.toThrow(/not writable/);
    });
  });

  describe("createOpenCodeCommandsFolder", () => {
    it("should create .opencode/commands/ folder when it does not exist", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      const result = await createOpenCodeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(result).toBe("/test/repo/.opencode/commands");
      expect(createdPaths).toEqual(["/test/repo/.opencode/commands"]);
    });

    it("should return path when folder already exists (idempotent)", async () => {
      let createCalled = false;

      const mockDirCreator: DirectoryCreator = async () => {
        createCalled = true;
      };

      const mockFsChecker: FileSystemChecker = () => true; // Folder exists

      const result = await createOpenCodeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(result).toBe("/test/repo/.opencode/commands");
      expect(createCalled).toBe(false); // Should not create if exists
    });

    it("should throw clear error on permission denied (EACCES)", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker,
          mockStatChecker
        )
      ).rejects.toThrow(/Permission denied creating .opencode\/commands\//);
    });

    it("should throw clear error on permission denied (EPERM)", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("Operation not permitted");
        error.code = "EPERM";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker,
          mockStatChecker
        )
      ).rejects.toThrow(/Permission denied creating .opencode\/commands\//);
    });

    it("should throw clear error on insufficient disk space", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("No space left on device");
        error.code = "ENOSPC";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker,
          mockStatChecker
        )
      ).rejects.toThrow(/Insufficient disk space/);
    });

    it("should re-throw unexpected errors with context", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        throw new Error("Unexpected filesystem error");
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker,
          mockStatChecker
        )
      ).rejects.toThrow(/Failed to create .opencode\/commands\//);
    });

    it("should use recursive option when creating directory", async () => {
      let receivedOptions: any = null;

      const mockDirCreator: DirectoryCreator = async (
        _dirPath: string,
        options?: { recursive?: boolean }
      ) => {
        receivedOptions = options;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      await createOpenCodeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(receivedOptions).toEqual({ recursive: true });
    });

    it("should throw error if parent directory exists as file", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        // Should not be called
      };

      const mockFsChecker: FileSystemChecker = (path: string) => {
        // .opencode exists (as file)
        return path.endsWith(".opencode");
      };

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => false, // It's a file, not directory
      });

      await expect(
        createOpenCodeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker, mockStatChecker)
      ).rejects.toThrow(/.opencode exists as a file, not a directory/);
    });
  });

  describe("createCommandFolders", () => {
    it("should create only Claude folder when choice is 'claude'", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      const result = await createCommandFolders(
        "claude",
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(result.claudeReady).toBe(true);
      expect(result.opencodeReady).toBe(false);
      expect(result.claudePath).toBe("/test/repo/.claude/commands");
      expect(result.opencodePath).toBeUndefined();
      expect(createdPaths).toEqual(["/test/repo/.claude/commands"]);
    });

    it("should create only OpenCode folder when choice is 'opencode'", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      const result = await createCommandFolders(
        "opencode",
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(result.claudeReady).toBe(false);
      expect(result.opencodeReady).toBe(true);
      expect(result.claudePath).toBeUndefined();
      expect(result.opencodePath).toBe("/test/repo/.opencode/commands");
      expect(createdPaths).toEqual(["/test/repo/.opencode/commands"]);
    });

    it("should create both folders when choice is 'both'", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      const result = await createCommandFolders(
        "both",
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(result.claudeReady).toBe(true);
      expect(result.opencodeReady).toBe(true);
      expect(result.claudePath).toBe("/test/repo/.claude/commands");
      expect(result.opencodePath).toBe("/test/repo/.opencode/commands");
      expect(createdPaths).toEqual([
        "/test/repo/.claude/commands",
        "/test/repo/.opencode/commands",
      ]);
    });

    it("should use process.cwd() as default repo root", async () => {
      const usedRepoPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        // Extract repo root from path (remove /.claude/commands or /.opencode/commands)
        const repoRoot = dirPath.replace(/\/(\.claude|\.opencode)\/commands$/, "");
        usedRepoPaths.push(repoRoot);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      await createCommandFolders(
        "claude",
        undefined,
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(usedRepoPaths[0]).toBe(process.cwd());
    });

    it("should handle existing folders gracefully (idempotent)", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        // Should not be called
        throw new Error("Should not create when folder exists");
      };

      const mockFsChecker: FileSystemChecker = () => true; // All folders exist

      const result = await createCommandFolders(
        "both",
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      // Should report as ready even though they already existed
      expect(result.claudeReady).toBe(true);
      expect(result.opencodeReady).toBe(true);
    });

    it("should propagate errors from folder creation", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      await expect(
        createCommandFolders("claude", "/test/repo", mockDirCreator, mockFsChecker, mockStatChecker)
      ).rejects.toThrow(/Permission denied creating .claude\/commands\//);
    });

    it("should create folders in correct order (Claude then OpenCode)", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const mockStatChecker: FileStatChecker = () => ({
        isDirectory: () => true,
      });

      const mockWritabilityChecker: WritabilityChecker = async () => {
        // Writable
      };

      await createCommandFolders(
        "both",
        "/test/repo",
        mockDirCreator,
        mockFsChecker,
        mockStatChecker,
        mockWritabilityChecker
      );

      expect(createdPaths[0]).toContain(".claude");
      expect(createdPaths[1]).toContain(".opencode");
    });
  });
});

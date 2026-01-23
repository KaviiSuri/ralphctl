import { describe, it, expect } from "bun:test";
import {
  createClaudeCommandsFolder,
  createOpenCodeCommandsFolder,
  createCommandFolders,
  type DirectoryCreator,
  type FileSystemChecker,
} from "../src/lib/command-infrastructure.js";

describe("Command Infrastructure", () => {
  describe("createClaudeCommandsFolder", () => {
    it("should create .claude/commands/ folder when it does not exist", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const result = await createClaudeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker
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

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker)
      ).rejects.toThrow(/Permission denied creating .claude\/commands\//);
    });

    it("should throw clear error on permission denied (EPERM)", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("Operation not permitted");
        error.code = "EPERM";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker)
      ).rejects.toThrow(/Permission denied creating .claude\/commands\//);
    });

    it("should throw clear error on insufficient disk space", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("No space left on device");
        error.code = "ENOSPC";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker)
      ).rejects.toThrow(/Insufficient disk space/);
    });

    it("should re-throw unexpected errors with context", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        throw new Error("Unexpected filesystem error");
      };

      const mockFsChecker: FileSystemChecker = () => false;

      await expect(
        createClaudeCommandsFolder("/test/repo", mockDirCreator, mockFsChecker)
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

      await createClaudeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(receivedOptions).toEqual({ recursive: true });
    });
  });

  describe("createOpenCodeCommandsFolder", () => {
    it("should create .opencode/commands/ folder when it does not exist", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const result = await createOpenCodeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker
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

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker
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

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker
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

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker
        )
      ).rejects.toThrow(/Insufficient disk space/);
    });

    it("should re-throw unexpected errors with context", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        throw new Error("Unexpected filesystem error");
      };

      const mockFsChecker: FileSystemChecker = () => false;

      await expect(
        createOpenCodeCommandsFolder(
          "/test/repo",
          mockDirCreator,
          mockFsChecker
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

      await createOpenCodeCommandsFolder(
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(receivedOptions).toEqual({ recursive: true });
    });
  });

  describe("createCommandFolders", () => {
    it("should create only Claude folder when choice is 'claude'", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      const result = await createCommandFolders(
        "claude",
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(result.claudeCreated).toBe(true);
      expect(result.opencodeCreated).toBe(false);
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

      const result = await createCommandFolders(
        "opencode",
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(result.claudeCreated).toBe(false);
      expect(result.opencodeCreated).toBe(true);
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

      const result = await createCommandFolders(
        "both",
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(result.claudeCreated).toBe(true);
      expect(result.opencodeCreated).toBe(true);
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

      await createCommandFolders("claude", undefined, mockDirCreator, mockFsChecker);

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

      // Should report as created even though they already existed
      expect(result.claudeCreated).toBe(true);
      expect(result.opencodeCreated).toBe(true);
    });

    it("should propagate errors from folder creation", async () => {
      const mockDirCreator: DirectoryCreator = async () => {
        const error: any = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      const mockFsChecker: FileSystemChecker = () => false;

      await expect(
        createCommandFolders("claude", "/test/repo", mockDirCreator, mockFsChecker)
      ).rejects.toThrow(/Permission denied creating .claude\/commands\//);
    });

    it("should create folders in correct order (Claude then OpenCode)", async () => {
      const createdPaths: string[] = [];

      const mockDirCreator: DirectoryCreator = async (dirPath: string) => {
        createdPaths.push(dirPath);
      };

      const mockFsChecker: FileSystemChecker = () => false;

      await createCommandFolders(
        "both",
        "/test/repo",
        mockDirCreator,
        mockFsChecker
      );

      expect(createdPaths[0]).toContain(".claude");
      expect(createdPaths[1]).toContain(".opencode");
    });
  });
});

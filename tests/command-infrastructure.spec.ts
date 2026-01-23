import { describe, it, expect } from "bun:test";
import {
  createClaudeCommandsFolder,
  createOpenCodeCommandsFolder,
  createCommandFolders,
  installCommandFiles,
  type DirectoryCreator,
  type FileSystemChecker,
  type FileStatChecker,
  type WritabilityChecker,
  type FileWriter,
  type CommandFolderResult,
} from "../src/lib/command-infrastructure.js";
import { COMMAND_FILES } from "../src/lib/templates/commands.js";

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

  describe("installCommandFiles", () => {
    it("should install all 7 commands to Claude directory when claudeReady is true", async () => {
      const writtenFiles: Map<string, string> = new Map();

      const mockFileWriter: FileWriter = async (filePath: string, content: string) => {
        writtenFiles.set(filePath, content);
      };

      const mockFsChecker: FileSystemChecker = () => true; // Directory exists

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      const result = await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      expect(result.claudeInstalled).toBe(7);
      expect(result.opencodeInstalled).toBe(0);
      expect(result.claudePath).toBe("/test/repo/.claude/commands");
      expect(result.errors).toEqual([]);
      expect(writtenFiles.size).toBe(7);

      // Verify all 7 command files were written
      const expectedFiles = COMMAND_FILES.map(f => f.name);
      for (const fileName of expectedFiles) {
        const fullPath = `/test/repo/.claude/commands/${fileName}`;
        expect(writtenFiles.has(fullPath)).toBe(true);
      }
    });

    it("should install all 7 commands to OpenCode directory when opencodeReady is true", async () => {
      const writtenFiles: Map<string, string> = new Map();

      const mockFileWriter: FileWriter = async (filePath: string, content: string) => {
        writtenFiles.set(filePath, content);
      };

      const mockFsChecker: FileSystemChecker = () => true; // Directory exists

      const folderResult: CommandFolderResult = {
        claudeReady: false,
        opencodeReady: true,
        opencodePath: "/test/repo/.opencode/commands",
      };

      const result = await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      expect(result.claudeInstalled).toBe(0);
      expect(result.opencodeInstalled).toBe(7);
      expect(result.opencodePath).toBe("/test/repo/.opencode/commands");
      expect(result.errors).toEqual([]);
      expect(writtenFiles.size).toBe(7);
    });

    it("should install commands to both directories when both are ready", async () => {
      const writtenFiles: Map<string, string> = new Map();

      const mockFileWriter: FileWriter = async (filePath: string, content: string) => {
        writtenFiles.set(filePath, content);
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: true,
        claudePath: "/test/repo/.claude/commands",
        opencodePath: "/test/repo/.opencode/commands",
      };

      const result = await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      expect(result.claudeInstalled).toBe(7);
      expect(result.opencodeInstalled).toBe(7);
      expect(result.errors).toEqual([]);
      expect(writtenFiles.size).toBe(14); // 7 files × 2 directories
    });

    it("should throw error when no directories are ready", async () => {
      const mockFileWriter: FileWriter = async () => {
        throw new Error("Should not be called");
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: false,
        opencodeReady: false,
      };

      await expect(
        installCommandFiles(folderResult, mockFileWriter, mockFsChecker)
      ).rejects.toThrow(/No command directories found/);
    });

    it("should throw error if target directory does not exist", async () => {
      const mockFileWriter: FileWriter = async () => {
        throw new Error("Should not be called");
      };

      const mockFsChecker: FileSystemChecker = () => false; // Directory doesn't exist

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      await expect(
        installCommandFiles(folderResult, mockFileWriter, mockFsChecker)
      ).rejects.toThrow(/Command directory does not exist/);
    });

    it("should throw error if file write fails", async () => {
      const mockFileWriter: FileWriter = async (filePath: string) => {
        if (filePath.includes("project:prd.md")) {
          throw new Error("Permission denied");
        }
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      await expect(
        installCommandFiles(folderResult, mockFileWriter, mockFsChecker)
      ).rejects.toThrow(/Failed to install.*command file/);
    });

    it("should verify each command file has correct content", async () => {
      const writtenFiles: Map<string, string> = new Map();

      const mockFileWriter: FileWriter = async (filePath: string, content: string) => {
        writtenFiles.set(filePath, content);
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      // Check project:new.md
      const newCommandPath = "/test/repo/.claude/commands/project:new.md";
      const newCommandContent = writtenFiles.get(newCommandPath);
      expect(newCommandContent).toContain("description: Create a new project");
      expect(newCommandContent).toContain("argument-hint: <project-name>");

      // Check project:research.md
      const researchCommandPath = "/test/repo/.claude/commands/project:research.md";
      const researchCommandContent = writtenFiles.get(researchCommandPath);
      expect(researchCommandContent).toContain("description: Guide multi-source research");

      // Check project:specs.md
      const specsCommandPath = "/test/repo/.claude/commands/project:specs.md";
      const specsCommandContent = writtenFiles.get(specsCommandPath);
      expect(specsCommandContent).toContain("description: Generate spec files");
    });

    it("should be idempotent (allow overwriting existing files)", async () => {
      const writeCount: Map<string, number> = new Map();

      const mockFileWriter: FileWriter = async (filePath: string) => {
        const count = writeCount.get(filePath) || 0;
        writeCount.set(filePath, count + 1);
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      // Install once
      await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      // Install again (simulating re-run)
      await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      // Each file should have been written twice
      for (const [_path, count] of writeCount.entries()) {
        expect(count).toBe(2);
      }
    });

    it("should use UTF-8 encoding for all files", async () => {
      const fileEncodings: Map<string, string> = new Map();

      const mockFileWriter: FileWriter = async (filePath: string, _content: string, encoding: BufferEncoding) => {
        fileEncodings.set(filePath, encoding);
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      // All files should use UTF-8 encoding
      for (const [_path, encoding] of fileEncodings.entries()) {
        expect(encoding).toBe("utf-8");
      }
    });

    it("should continue installing to OpenCode if Claude installation fails", async () => {
      const writtenFiles: Map<string, string> = new Map();

      const mockFileWriter: FileWriter = async (filePath: string, content: string) => {
        if (filePath.includes(".claude")) {
          throw new Error("Claude directory write failed");
        }
        writtenFiles.set(filePath, content);
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: true,
        claudePath: "/test/repo/.claude/commands",
        opencodePath: "/test/repo/.opencode/commands",
      };

      await expect(
        installCommandFiles(folderResult, mockFileWriter, mockFsChecker)
      ).rejects.toThrow(/Command installation failed/);

      // Verify OpenCode files were written even though Claude failed
      const opencodeFiles = Array.from(writtenFiles.keys()).filter(p => p.includes(".opencode"));
      expect(opencodeFiles.length).toBe(7);
    });

    it("should include all 7 command files in correct order", async () => {
      const writtenPaths: string[] = [];

      const mockFileWriter: FileWriter = async (filePath: string) => {
        writtenPaths.push(filePath);
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      await installCommandFiles(folderResult, mockFileWriter, mockFsChecker);

      // Verify order matches COMMAND_FILES order
      const expectedOrder = COMMAND_FILES.map(f => `/test/repo/.claude/commands/${f.name}`);
      expect(writtenPaths).toEqual(expectedOrder);
    });

    it("should report correct error count when multiple files fail", async () => {
      const mockFileWriter: FileWriter = async (filePath: string) => {
        // Fail on 3 specific files
        if (filePath.includes("project:prd.md") ||
            filePath.includes("project:jtbd.md") ||
            filePath.includes("project:hld.md")) {
          throw new Error("Write failed");
        }
      };

      const mockFsChecker: FileSystemChecker = () => true;

      const folderResult: CommandFolderResult = {
        claudeReady: true,
        opencodeReady: false,
        claudePath: "/test/repo/.claude/commands",
      };

      await expect(
        installCommandFiles(folderResult, mockFileWriter, mockFsChecker)
      ).rejects.toThrow(/Failed to install 3 command file/);
    });
  });
});

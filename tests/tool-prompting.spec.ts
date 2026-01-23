import { describe, expect, test } from "bun:test";
import {
  parseToolChoice,
  promptToolSelection,
  determineToolChoice,
  type ToolChoice,
  type ToolSelector,
} from "../src/lib/tools/prompting";

describe("parseToolChoice", () => {
  test("parses numeric choice 1 as claude", () => {
    expect(parseToolChoice("1")).toBe("claude");
  });

  test("parses numeric choice 2 as opencode", () => {
    expect(parseToolChoice("2")).toBe("opencode");
  });

  test("parses numeric choice 3 as both", () => {
    expect(parseToolChoice("3")).toBe("both");
  });

  test("parses 'claude' as claude", () => {
    expect(parseToolChoice("claude")).toBe("claude");
  });

  test("parses 'Claude Code' as claude", () => {
    expect(parseToolChoice("claude code")).toBe("claude");
  });

  test("parses 'CLAUDE CODE' as claude (case insensitive)", () => {
    expect(parseToolChoice("CLAUDE CODE")).toBe("claude");
  });

  test("parses 'opencode' as opencode", () => {
    expect(parseToolChoice("opencode")).toBe("opencode");
  });

  test("parses 'OpenCode' as opencode (case insensitive)", () => {
    expect(parseToolChoice("OpenCode")).toBe("opencode");
  });

  test("parses 'both' as both", () => {
    expect(parseToolChoice("both")).toBe("both");
  });

  test("parses 'BOTH' as both (case insensitive)", () => {
    expect(parseToolChoice("BOTH")).toBe("both");
  });

  test("trims whitespace from input", () => {
    expect(parseToolChoice("  1  ")).toBe("claude");
    expect(parseToolChoice(" claude ")).toBe("claude");
    expect(parseToolChoice("\t3\n")).toBe("both");
  });

  test("returns null for invalid input", () => {
    expect(parseToolChoice("4")).toBeNull();
    expect(parseToolChoice("invalid")).toBeNull();
    expect(parseToolChoice("test")).toBeNull();
    expect(parseToolChoice("")).toBeNull();
  });
});

describe("promptToolSelection", () => {
  test("returns claude when user enters 1", async () => {
    const mockSelector: ToolSelector = async () => "1";
    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("claude");
  });

  test("returns opencode when user enters 2", async () => {
    const mockSelector: ToolSelector = async () => "2";
    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("opencode");
  });

  test("returns both when user enters 3", async () => {
    const mockSelector: ToolSelector = async () => "3";
    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("both");
  });

  test("returns claude when user enters 'claude'", async () => {
    const mockSelector: ToolSelector = async () => "claude";
    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("claude");
  });

  test("returns opencode when user enters 'OpenCode' (case insensitive)", async () => {
    const mockSelector: ToolSelector = async () => "OpenCode";
    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("opencode");
  });

  test("returns both when user enters 'BOTH' (case insensitive)", async () => {
    const mockSelector: ToolSelector = async () => "BOTH";
    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("both");
  });

  test("re-prompts on invalid input then succeeds", async () => {
    let callCount = 0;
    const mockSelector: ToolSelector = async () => {
      callCount++;
      if (callCount === 1) return "invalid";
      return "1";
    };

    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("claude");
    expect(callCount).toBe(2);
  });

  test("re-prompts multiple times before succeeding", async () => {
    let callCount = 0;
    const mockSelector: ToolSelector = async () => {
      callCount++;
      if (callCount === 1) return "invalid";
      if (callCount === 2) return "4";
      return "2";
    };

    const result = await promptToolSelection(mockSelector);
    expect(result).toBe("opencode");
    expect(callCount).toBe(3);
  });

  test("throws error after max attempts with invalid input", async () => {
    const mockSelector: ToolSelector = async () => "invalid";

    await expect(promptToolSelection(mockSelector, 3)).rejects.toThrow(
      "Maximum retry attempts (3) exceeded"
    );
  });

  test("throws error when user cancels (selector throws)", async () => {
    const mockSelector: ToolSelector = async () => {
      throw new Error("Interrupted");
    };

    await expect(promptToolSelection(mockSelector)).rejects.toThrow(
      "Setup cancelled by user"
    );
  });

  test("respects custom maxAttempts parameter", async () => {
    const mockSelector: ToolSelector = async () => "invalid";

    await expect(promptToolSelection(mockSelector, 1)).rejects.toThrow(
      "Maximum retry attempts (1) exceeded"
    );
  });

  test("prompt message includes warning on first attempt", async () => {
    let capturedMessage = "";
    const mockSelector: ToolSelector = async (message: string) => {
      capturedMessage = message;
      return "1";
    };

    await promptToolSelection(mockSelector);
    expect(capturedMessage).toContain("⚠️  No CLI tools detected");
    expect(capturedMessage).toContain("Which tool(s) do you want to set up?");
  });

  test("prompt message shows error on retry", async () => {
    let callCount = 0;
    let secondMessage = "";
    const mockSelector: ToolSelector = async (message: string) => {
      callCount++;
      if (callCount === 2) {
        secondMessage = message;
      }
      if (callCount === 1) return "invalid";
      return "1";
    };

    await promptToolSelection(mockSelector);
    expect(secondMessage).toContain("❌ Invalid choice");
  });
});

describe("determineToolChoice", () => {
  test("returns both when both tools detected", async () => {
    const detection = { claude: true, opencode: true };
    const result = await determineToolChoice(detection);
    expect(result).toBe("both");
  });

  test("returns claude when only claude detected", async () => {
    const detection = { claude: true, opencode: false };
    const result = await determineToolChoice(detection);
    expect(result).toBe("claude");
  });

  test("returns opencode when only opencode detected", async () => {
    const detection = { claude: false, opencode: true };
    const result = await determineToolChoice(detection);
    expect(result).toBe("opencode");
  });

  test("prompts user when neither tool detected", async () => {
    const detection = { claude: false, opencode: false };
    const mockSelector: ToolSelector = async () => "1";

    const result = await determineToolChoice(detection, mockSelector);
    expect(result).toBe("claude");
  });

  test("prompts user and respects user choice of opencode", async () => {
    const detection = { claude: false, opencode: false };
    const mockSelector: ToolSelector = async () => "opencode";

    const result = await determineToolChoice(detection, mockSelector);
    expect(result).toBe("opencode");
  });

  test("prompts user and respects user choice of both", async () => {
    const detection = { claude: false, opencode: false };
    const mockSelector: ToolSelector = async () => "3";

    const result = await determineToolChoice(detection, mockSelector);
    expect(result).toBe("both");
  });

  test("throws when user cancels during prompt", async () => {
    const detection = { claude: false, opencode: false };
    const mockSelector: ToolSelector = async () => {
      throw new Error("Cancelled");
    };

    await expect(determineToolChoice(detection, mockSelector)).rejects.toThrow(
      "Setup cancelled by user"
    );
  });
});

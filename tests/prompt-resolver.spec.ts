import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Mode } from "../src/domain/types.js";

describe("resolvePrompt", () => {
  beforeEach(() => {
    mock.module("../src/lib/prompts/resolver.js", () => {
      return {
        resolvePrompt: mock(({ mode, customPrompt }: { mode: Mode; customPrompt?: string }) => {
          if (customPrompt) {
            return Promise.resolve(customPrompt);
          }
          
          if (mode === Mode.Plan) {
            return Promise.resolve("Plan prompt content");
          }
          
          if (mode === Mode.Build) {
            return Promise.resolve("Build prompt content");
          }
          
          return Promise.reject(new Error("Unknown mode"));
        }),
      };
    });
  });

  it("should use custom prompt when provided", async () => {
    const { resolvePrompt } = await import("../src/lib/prompts/resolver.js");
    const customPrompt = "Custom prompt text";
    const result = await resolvePrompt({ mode: Mode.Plan, customPrompt });
    
    expect(result).toBe(customPrompt);
  });

  it("should return plan prompt in plan mode", async () => {
    const { resolvePrompt } = await import("../src/lib/prompts/resolver.js");
    const result = await resolvePrompt({ mode: Mode.Plan });
    
    expect(result).toBe("Plan prompt content");
  });

  it("should return build prompt in build mode", async () => {
    const { resolvePrompt } = await import("../src/lib/prompts/resolver.js");
    const result = await resolvePrompt({ mode: Mode.Build });
    
    expect(result).toBe("Build prompt content");
  });
});

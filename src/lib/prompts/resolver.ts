import { Mode } from "../../domain/types.js";
import { readFileSync } from "fs";

const PROMPT_FILE_MAP: Record<Mode, string> = {
  [Mode.Plan]: "PROMPT_plan.md",
  [Mode.Build]: "PROMPT_build.md",
};

export interface ResolvePromptOptions {
  mode: Mode;
  customPrompt?: string;
}

export async function resolvePrompt(options: ResolvePromptOptions): Promise<string> {
  const { mode, customPrompt } = options;

  if (customPrompt) {
    return customPrompt;
  }

  const promptFile = PROMPT_FILE_MAP[mode];

  try {
    return readFileSync(promptFile, "utf-8");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read prompt file '${promptFile}': ${errorMessage}. Run 'ralphctl init' to create default prompt templates.`
    );
  }
}

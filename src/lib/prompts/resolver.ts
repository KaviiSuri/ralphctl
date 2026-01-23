import { Mode } from "../../domain/types.js";
import { readFileSync } from "fs";

const PROMPT_FILE_MAP: Record<Mode, string> = {
  [Mode.Plan]: "PROMPT_plan.md",
  [Mode.Build]: "PROMPT_build.md",
};

export interface ResolvePromptOptions {
  mode: Mode;
  customPrompt?: string;
  project?: string;
}

function resolvePromptPlaceholders(promptContent: string, options: { project?: string }): string {
  const hasProjectPlaceholder = promptContent.includes("{project}");

  if (hasProjectPlaceholder && !options.project) {
    throw new Error(
      "Prompt contains {project} placeholder but --project flag was not provided. " +
        "Either provide --project flag or remove {project} from your prompt templates."
    );
  }

  if (options.project) {
    const projectPath = `projects/${options.project}`;
    return promptContent.replaceAll("{project}", projectPath);
  }

  return promptContent;
}

export async function resolvePrompt(options: ResolvePromptOptions): Promise<string> {
  const { mode, customPrompt, project } = options;

  let promptContent: string;

  if (customPrompt) {
    promptContent = customPrompt;
  } else {
    const promptFile = PROMPT_FILE_MAP[mode];

    try {
      promptContent = readFileSync(promptFile, "utf-8");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to read prompt file '${promptFile}': ${errorMessage}. Run 'ralphctl init' to create default prompt templates.`
      );
    }
  }

  return resolvePromptPlaceholders(promptContent, { project });
}

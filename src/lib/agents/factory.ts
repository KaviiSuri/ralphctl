import type { AgentAdapter } from "../../domain/agent.js";
import { AgentType } from "../../domain/agent.js";
import { OpenCodeAdapter } from "./opencode-adapter.js";
import { ClaudeCodeAdapter } from "./claude-code-adapter.js";

export interface CreateAgentOptions {
  permissionPosture?: "allow-all" | "ask";
  cwd?: string;
  env?: Record<string, string>;
  headless?: boolean;
}

export class AgentUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentUnavailableError";
  }
}

function resolveAgentType(cliAgent?: string): AgentType {
  if (cliAgent && (cliAgent === AgentType.OpenCode || cliAgent === AgentType.ClaudeCode)) {
    return cliAgent;
  }

  const envAgent = process.env.RALPHCTL_AGENT;
  if (envAgent === AgentType.OpenCode || envAgent === AgentType.ClaudeCode) {
    return envAgent;
  }

  return AgentType.OpenCode;
}

export async function createAgent(
  cliAgent?: string,
  options?: CreateAgentOptions
): Promise<AgentAdapter> {
  const agentType = resolveAgentType(cliAgent);
  const { permissionPosture = "allow-all", cwd, env, headless = true } = options ?? {};

  let adapter: AgentAdapter;

  if (agentType === AgentType.ClaudeCode) {
    adapter = new ClaudeCodeAdapter({
      cwd,
      env,
      headless,
    });
  } else {
    adapter = new OpenCodeAdapter({
      cwd,
      env: {
        ...env,
        OPENCODE_PERMISSION: permissionPosture === "allow-all" ? '{"*":"allow"}' : "ask",
      },
    });
  }

  const available = await adapter.checkAvailability();
  if (!available) {
    throw new AgentUnavailableError(adapter.getUnavailableErrorMessage());
  }

  return adapter;
}

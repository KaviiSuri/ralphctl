import type { ModelConfig } from "../../domain/types.js";

export function resolveModelPlaceholders(prompt: string, config: ModelConfig): string {
  const { smart, fast } = config;

  return prompt
    .replaceAll("{smart}", smart)
    .replaceAll("{fast}", fast);
}

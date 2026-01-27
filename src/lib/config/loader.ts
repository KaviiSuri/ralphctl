import { loadConfig } from "c12";
import { ZodError } from "zod";
import { ConfigSchema, type AppConfig } from "./schema.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Filters out undefined values from an object to prevent CLI flags
 * from overriding config file values when not specified
 */
function filterUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined),
	) as Partial<T>;
}

/**
 * Manually loads global config from ~/.config/ralphctl/config.{json,yaml}
 * since c12 doesn't natively support XDG Base Directory pattern
 */
async function loadGlobalConfig(): Promise<Partial<AppConfig>> {
	const configDir = join(homedir(), ".config", "ralphctl");
	const jsonPath = join(configDir, "config.json");
	const yamlPath = join(configDir, "config.yaml");

	// Try JSON first
	if (existsSync(jsonPath)) {
		try {
			const content = readFileSync(jsonPath, "utf-8");
			return JSON.parse(content);
		} catch (error) {
			// Ignore parse errors for global config
			console.warn(
				`Warning: Failed to parse global config at ${jsonPath}`,
			);
		}
	}

	// Try YAML
	if (existsSync(yamlPath)) {
		try {
			// Use dynamic import to avoid adding yaml dependency if not needed
			const content = readFileSync(yamlPath, "utf-8");
			// Simple YAML parsing for basic key-value pairs
			// For more complex YAML, would need a dedicated parser
			const lines = content.split("\n");
			const result: any = {};
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed && !trimmed.startsWith("#")) {
					const colonIndex = trimmed.indexOf(":");
					if (colonIndex > 0) {
						const key = trimmed.substring(0, colonIndex).trim();
						const value = trimmed.substring(colonIndex + 1).trim();
						// Parse value (basic parsing)
						if (value === "true" || value === "false") {
							result[key] = value === "true";
						} else if (!isNaN(Number(value)) && value !== "") {
							result[key] = Number(value);
						} else {
							// Remove quotes if present
							result[key] = value.replace(/^["']|["']$/g, "");
						}
					}
				}
			}
			return result;
		} catch (error) {
			console.warn(
				`Warning: Failed to parse global config at ${yamlPath}`,
			);
		}
	}

	return {};
}

/**
 * Loads application configuration from multiple sources with priority order:
 * 1. CLI flags (highest priority)
 * 2. --config explicit file
 * 3. Project config (.ralphctl.json)
 * 4. Global config (~/.config/ralphctl/config.json)
 * 5. Hardcoded defaults (lowest priority)
 *
 * @param cliOverrides - Configuration values from CLI flags
 * @param configFile - Optional explicit config file path (--config flag)
 * @returns Validated and merged configuration
 * @throws Error if validation fails or explicit config file is missing
 */
export async function loadAppConfig(
	cliOverrides: Partial<AppConfig> = {},
	configFile?: string,
): Promise<AppConfig> {
	// If explicit config file is provided, verify it exists
	if (configFile && !existsSync(configFile)) {
		throw new Error(`Config file not found: ${configFile}`);
	}

	// Load global config manually (c12 doesn't support ~/.config/{name}/)
	const globalConfig = await loadGlobalConfig();

	// Determine which config file to load
	// When no explicit config file is provided, check if project config exists
	let projectConfig: Partial<AppConfig> = {};
	let resolvedConfigFile: string | undefined;

	if (configFile) {
		// Explicit config file provided via --config flag
		const { config, configFile: resolved } = await loadConfig<
			Partial<AppConfig>
		>({
			name: "ralphctl",
			configFile: configFile,
			defaults: globalConfig,
			rcFile: false,
			globalRc: false,
		});
		projectConfig = config || {};
		resolvedConfigFile = resolved;
	} else {
		// Try to load project-level config (.ralphctl.json or .ralphctl.yaml)
		const cwd = process.cwd();
		const possibleFiles = [
			join(cwd, ".ralphctl.json"),
			join(cwd, ".ralphctl.yaml"),
			join(cwd, ".ralphctl.yml"),
		];

		for (const filePath of possibleFiles) {
			if (existsSync(filePath)) {
				const content = readFileSync(filePath, "utf-8");
				if (filePath.endsWith(".json")) {
					try {
						projectConfig = JSON.parse(content);
						resolvedConfigFile = filePath;
						break;
					} catch (error) {
						throw new Error(
							`Failed to parse config file ${filePath}: ${(error as Error).message}`,
						);
					}
				} else {
					// Basic YAML parsing (same as global config)
					const lines = content.split("\n");
					const result: any = {};
					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed && !trimmed.startsWith("#")) {
							const colonIndex = trimmed.indexOf(":");
							if (colonIndex > 0) {
								const key = trimmed.substring(0, colonIndex).trim();
								const value = trimmed.substring(colonIndex + 1).trim();
								if (value === "true" || value === "false") {
									result[key] = value === "true";
								} else if (!isNaN(Number(value)) && value !== "") {
									result[key] = Number(value);
								} else {
									result[key] = value.replace(/^["']|["']$/g, "");
								}
							}
						}
					}
					projectConfig = result;
					resolvedConfigFile = filePath;
					break;
				}
			}
		}
	}

	// Filter undefined values from CLI overrides
	// This ensures CLI flags only override when explicitly set
	const filteredCliOverrides = filterUndefined(cliOverrides);

	// Merge with CLI overrides (CLI takes precedence)
	// Priority: CLI > explicit config > project config > global config
	const merged = {
		...globalConfig,
		...projectConfig,
		...filteredCliOverrides,
	};

	// Validate with Zod and provide enhanced error messages
	try {
		return ConfigSchema.parse(merged);
	} catch (error) {
		if (error instanceof ZodError) {
			// Enhance error with source information
			const sourceInfo = resolvedConfigFile || "defaults";
			const issues = error.issues || [];
			const enhancedError = new Error(
				`Config validation failed (source: ${sourceInfo}):\n` +
					issues
						.map((e: any) => `  - ${e.path.join(".")}: ${e.message}`)
						.join("\n"),
			);
			throw enhancedError;
		}
		throw error;
	}
}

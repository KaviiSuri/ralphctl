import { z } from "zod";

export const ConfigSchema = z.object({
	smartModel: z.string({ message: "smartModel must be a string" }).optional(),
	fastModel: z.string({ message: "fastModel must be a string" }).optional(),
	agent: z
		.enum(["opencode", "claude-code"], {
			message: "agent must be 'opencode' or 'claude-code'",
		})
		.optional(),
	maxIterations: z
		.number({ message: "maxIterations must be a number" })
		.int({ message: "maxIterations must be a whole number" })
		.positive({ message: "maxIterations must be greater than 0" })
		.optional(),
	permissionPosture: z
		.enum(["allow-all", "ask"], {
			message: "permissionPosture must be 'allow-all' or 'ask'",
		})
		.optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

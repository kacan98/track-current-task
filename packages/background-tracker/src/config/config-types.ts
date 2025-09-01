import { z } from 'zod';

export const RepositoryConfigSchema = z.object({
  path: z.string().min(1),
  mainBranch: z.string().min(1)
});

export const ConfigSchema = z.object({
  repositories: z.array(RepositoryConfigSchema).optional(),
  repositoriesFolder: z.string().optional(),
  trackingIntervalMinutes: z.number().positive().default(5),
  taskIdRegEx: z.string().default('DFO-\\d+'),
  taskTrackingUrl: z.string().url().optional().or(z.literal(''))
}).refine(
  (data) => data.repositories?.length || data.repositoriesFolder,
  { message: "Either repositories or repositoriesFolder must be provided" }
);

export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

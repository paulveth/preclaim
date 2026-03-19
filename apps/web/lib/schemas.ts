import { z } from 'zod';

export const ClaimRequestSchema = z.object({
  project_id: z.string().uuid(),
  file_path: z.string().min(1).max(500),
  session_id: z.string().min(1),
  ttl_minutes: z.number().int().min(1).max(1440).optional(),
});

export const ReleaseRequestSchema = z.object({
  project_id: z.string().uuid(),
  session_id: z.string().min(1),
  file_path: z.string().min(1).max(500).optional(),
});

export const BatchCheckRequestSchema = z.object({
  project_id: z.string().uuid(),
  file_paths: z.array(z.string().min(1).max(500)).min(1).max(100),
});

export const HeartbeatRequestSchema = z.object({
  session_id: z.string().min(1),
});

export const SessionRegisterRequestSchema = z.object({
  session_id: z.string().min(1),
  project_id: z.string().uuid(),
  provider: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const SessionDeleteRequestSchema = z.object({
  session_id: z.string().min(1),
});

export const OnboardRequestSchema = z.object({
  project_name: z.string().min(1).max(100),
  project_slug: z.string().min(1).max(100),
});

export const RegisterInterestSchema = z.object({
  project_id: z.string().uuid(),
  file_path: z.string().min(1).max(500),
  session_id: z.string().min(1),
});

export const CheckInterestsSchema = z.object({
  project_id: z.string().uuid(),
  file_path: z.string().min(1).max(500),
  exclude_session_id: z.string().min(1),
});

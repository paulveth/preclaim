import { describe, it, expect } from 'vitest';
import {
  ClaimRequestSchema,
  ReleaseRequestSchema,
  BatchCheckRequestSchema,
  HeartbeatRequestSchema,
  SessionRegisterRequestSchema,
  OnboardRequestSchema,
} from './schemas';

describe('ClaimRequestSchema', () => {
  it('validates a correct request', () => {
    const result = ClaimRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      file_path: 'src/index.ts',
      session_id: 'session-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing project_id', () => {
    const result = ClaimRequestSchema.safeParse({
      file_path: 'src/index.ts',
      session_id: 'session-123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid uuid for project_id', () => {
    const result = ClaimRequestSchema.safeParse({
      project_id: 'not-a-uuid',
      file_path: 'src/index.ts',
      session_id: 'session-123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty file_path', () => {
    const result = ClaimRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      file_path: '',
      session_id: 'session-123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional ttl_minutes', () => {
    const result = ClaimRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      file_path: 'src/index.ts',
      session_id: 'session-123',
      ttl_minutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it('rejects ttl_minutes > 1440', () => {
    const result = ClaimRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      file_path: 'src/index.ts',
      session_id: 'session-123',
      ttl_minutes: 1441,
    });
    expect(result.success).toBe(false);
  });
});

describe('BatchCheckRequestSchema', () => {
  it('validates correct request', () => {
    const result = BatchCheckRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      file_paths: ['src/a.ts', 'src/b.ts'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty file_paths array', () => {
    const result = BatchCheckRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      file_paths: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 file_paths', () => {
    const result = BatchCheckRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      file_paths: Array.from({ length: 101 }, (_, i) => `file${i}.ts`),
    });
    expect(result.success).toBe(false);
  });
});

describe('ReleaseRequestSchema', () => {
  it('validates with optional file_path', () => {
    const result = ReleaseRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      session_id: 'session-123',
    });
    expect(result.success).toBe(true);
  });

  it('validates with file_path', () => {
    const result = ReleaseRequestSchema.safeParse({
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      session_id: 'session-123',
      file_path: 'src/index.ts',
    });
    expect(result.success).toBe(true);
  });
});

describe('HeartbeatRequestSchema', () => {
  it('rejects empty session_id', () => {
    const result = HeartbeatRequestSchema.safeParse({ session_id: '' });
    expect(result.success).toBe(false);
  });
});

describe('SessionRegisterRequestSchema', () => {
  it('validates with required fields only', () => {
    const result = SessionRegisterRequestSchema.safeParse({
      session_id: 'session-123',
      project_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('OnboardRequestSchema', () => {
  it('rejects empty project_name', () => {
    const result = OnboardRequestSchema.safeParse({
      project_name: '',
      project_slug: 'my-project',
    });
    expect(result.success).toBe(false);
  });
});

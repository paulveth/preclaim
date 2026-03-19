import type { PreclaimConfig, ApiResponse } from '@preclaim/core';

export interface FailOpenResult<T> {
  data?: T;
  warning?: string;
  error?: string;
}

export async function withFailOpen<T>(
  config: PreclaimConfig,
  operation: () => Promise<ApiResponse<T>>,
  fallbackMessage: string,
): Promise<FailOpenResult<T>> {
  try {
    const result = await operation();

    if (result.error) {
      if (config.failOpen) {
        return { warning: `${fallbackMessage}: ${result.error}` };
      }
      return { error: result.error };
    }

    return { data: result.data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (config.failOpen) {
      return { warning: `${fallbackMessage}: ${message}` };
    }
    return { error: message };
  }
}

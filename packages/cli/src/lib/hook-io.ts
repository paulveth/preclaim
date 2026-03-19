// Hook I/O helpers for Claude Code hooks
// Reads hook input from stdin and writes hook output to stdout

export interface ClaudeHookInput {
  session_id: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

export interface ClaudeHookOutput {
  permissionDecision?: 'allow' | 'deny';
  reason?: string;
  systemMessage?: string;
}

export async function readHookInput(): Promise<ClaudeHookInput> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Failed to parse hook input'));
      }
    });
    process.stdin.on('error', reject);

    // Timeout after 3s
    setTimeout(() => reject(new Error('Hook input timeout')), 3000);
  });
}

export function writeHookOutput(output: ClaudeHookOutput, eventName?: string): void {
  const hookEventName = eventName ?? 'PreToolUse';

  if (output.permissionDecision === 'deny') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        permissionDecision: 'deny',
        permissionDecisionReason: output.reason ?? 'Denied by Preclaim',
      },
    }));
  } else if (output.permissionDecision === 'allow') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        permissionDecision: 'allow',
        ...(output.systemMessage ? { permissionDecisionReason: output.systemMessage } : {}),
      },
    }));
  }
}

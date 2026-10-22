import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Runs the real CLI in a separate Node process, the way a user would.
// `--import tsx` lets Node run TypeScript directly without going through npx or a shell.
function runCli(args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
    encoding: 'utf8',
  });
  return { stdout: result.stdout, stderr: result.stderr, exitCode: result.status };
}

// Git on Windows may check text files out with \r\n; the CLI always prints \n.
const readFixture = (path: string) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');

// Each test starts a Node process, which is much slower than a unit test.
describe('cli (end to end)', { timeout: 15_000 }, () => {
  it('prints the expected report for the example input file', () => {
    expect(runCli(['examples/input.txt'])).toEqual({
      stdout: readFixture('examples/expected.txt'),
      stderr: '',
      exitCode: 0,
    });
  });

  it('keeps warnings on stderr and the note on stdout, and exits 2, when lines are skipped', () => {
    expect(runCli(['examples/with-errors.txt'])).toEqual({
      stdout: 'Globex: No current relationship.\n\nNote: 1 input line skipped; report may be incomplete.\n',
      stderr: "warning: line 2: unknown command 'Investor'\n",
      exitCode: 2,
    });
  });

  it('exits 1 with an error naming the file when it cannot be read', () => {
    const result = runCli(['does-not-exist.txt']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('does-not-exist.txt');
  });

  it.each([
    ['no file', []],
    ['more than one file', ['a.txt', 'b.txt']],
  ])('exits 1 with usage when given %s', (_label, args) => {
    const result = runCli(args);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^usage:/);
  });
});

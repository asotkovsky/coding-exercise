import { Network } from './network.js';
import { parseLine } from './parser.js';
import { formatReport, formatSkippedNote } from './report.js';

export const ExitCode = {
  Ok: 0,
  Fatal: 1,
  SkippedLines: 2,
} as const;

export interface RunResult {
  stdout: string[];
  stderr: string[];
  exitCode: number;
}

// Pure core of the CLI: takes the whole input and returns what to print, without touching
// the file system, console, or process. cli.ts does the I/O.
export function run(input: string): RunResult {
  const network = new Network();
  const stderr: string[] = [];
  let skippedLines = 0;

  input.split('\n').forEach((line, index) => {
    const problem = processLine(network, line);
    if (problem !== undefined) {
      skippedLines++;
      stderr.push(`warning: line ${index + 1}: ${problem}`);
    }
  });

  const companies = network.listCompanies();
  if (companies.length === 0) {
    stderr.push('note: no companies declared; report is empty');
  }

  const stdout = formatReport(companies);
  if (skippedLines > 0) {
    if (stdout.length > 0) {
      stdout.push('');
    }
    stdout.push(formatSkippedNote(skippedLines));
  }

  return {
    stdout,
    stderr,
    exitCode: skippedLines > 0 ? ExitCode.SkippedLines : ExitCode.Ok,
  };
}

// Returns why the line was skipped, or undefined if it was applied (or blank).
function processLine(network: Network, line: string): string | undefined {
  const parsed = parseLine(line);
  if (parsed.kind === 'blank') {
    return undefined;
  }
  if (parsed.kind === 'error') {
    return parsed.message;
  }
  const result = network.apply(parsed);
  return result.ok ? undefined : result.message;
}

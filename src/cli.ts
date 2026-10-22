import { readFile } from 'node:fs/promises';
import { ExitCode, run } from './run.js';

const USAGE = 'usage: npm run -s analyze -- <input-file>';

async function main(args: string[]): Promise<number> {
  const [file, ...extra] = args;
  if (file === undefined || extra.length > 0) {
    console.error(USAGE);
    return ExitCode.Fatal;
  }

  let input: string;
  try {
    input = await readFile(file, 'utf8');
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    return ExitCode.Fatal;
  }

  const result = run(input);
  result.stderr.forEach((line) => console.error(line));
  result.stdout.forEach((line) => console.log(line));
  return result.exitCode;
}

// Set exitCode rather than calling process.exit() so buffered output is flushed before exiting.
process.exitCode = await main(process.argv.slice(2));

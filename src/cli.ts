import { readFile } from 'node:fs/promises';
import { ExitCode, run } from './run.js';

const USAGE = `usage: npx tsx src/cli.ts <input-file>
       cat <input-file> | npx tsx src/cli.ts`;

async function main(args: string[]): Promise<number> {
  if (args.length > 1) {
    console.error(USAGE);
    return ExitCode.Fatal;
  }

  const [file] = args;
  let input: string;
  if (file !== undefined) {
    try {
      input = await readFile(file, 'utf8');
    } catch (err) {
      console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
      return ExitCode.Fatal;
    }
  } else if (process.stdin.isTTY) {
    // Nothing piped in: reading stdin would wait for typed input forever.
    console.error(USAGE);
    return ExitCode.Fatal;
  } else {
    input = await readStdin();
  }

  const result = run(input);
  result.stderr.forEach((line) => console.error(line));
  result.stdout.forEach((line) => console.log(line));
  return result.exitCode;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Set exitCode rather than calling process.exit() so buffered output is flushed before exiting.
process.exitCode = await main(process.argv.slice(2));

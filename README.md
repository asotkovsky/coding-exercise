# analyze-network

Reads a list of Partner, Company, Employee, and Contact commands and reports which
Drive Capital Partner has the strongest relationship with each Company.

Example:
```
$ npm run -s analyze -- examples/input.txt
ACME: No current relationship.
Globex: Chris (2)
Hooli: Molly (1)
```

## Requirements

- Node.js 20 or later
- npm

## Setup

```
npm install
```

There's no build step. Runs the TypeScript directly.

## Running

```
npm run -s analyze -- examples/input.txt
```
(`-s` keeps npm from printing its own header above the report.)

### Output and exit codes

- The report goes to **stdout**. Warnings about skipped lines go to **stderr**, so
  `> report.txt` saves a clean report while warnings still show in the terminal.
- If any lines were skipped, a note with the count is added below the report.
- Exit code is 0 on success, 1 if the input can't be read, and 2 if the report
  was printed but some lines were skipped.

## Testing

```
npm test            # unit + end-to-end tests (Vitest)
npm run typecheck   # TypeScript strict mode check
```
Or in VSCode, install the [official Vitest extension](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) and open any test file. A green arrow will appear to the left of any tests. Click the arrow to execute.

- Unit tests cover each module on its own (`test/parser.test.ts`, `network.test.ts`,
  `report.test.ts`, `run.test.ts`).
- `test/cli.e2e.test.ts` runs the real CLI in a child process and checks stdout,
  stderr, and exit code, including the assignment example against
  `examples/expected.txt`.

## Approach

The code is a pipeline of small modules, each with one job:

1. `cli.ts` reads the input file and passes the text to `run.ts`.
2. `run.ts` goes through the input line by line. `parser.ts` turns each line into a
   command, and `network.ts` applies it, keeping track of contact counts.
3. Once every line is processed, `report.ts` sorts the companies, picks the strongest
   Partner for each, and formats the output lines.
4. `cli.ts` prints the result and sets the exit code.

## Interpretations of the assignment

Full details, including every error case, are in [SPEC.md](SPEC.md). In short:

- **Ties.** All tied Partners are listed alphabetically: `Globex: Chris, Molly (2)`.
- **Ordering.** Lines are processed in order. Anything referenced must already be
  declared, so a Contact for a Partner declared later is skipped with a warning.
- **Case.** Names, commands, and contact types are matched case-insensitively. This is to accomodate for human error in hand-entered data. Output uses the spelling from the first declaration if there were multiple spellings referenced in the input file.
- **Bad input.** The assignment allows assuming well-formed input, but invalid lines
  are skipped with a warning (with line number) rather than crashing or silently
  dropping data.

## Assumptions and edge cases

- Names are letters A-Z only, as specified, so names like `José`, `Mary-Jane`, or
  `O'Brien` are rejected.
- Leading/trailing whitespace, multiple spaces between words, blank lines, and
  Windows `\r\n` line endings are all accepted.
- A Partner and an Employee can share a name. `Contact` arguments are positional,
  so there's no ambiguity.
- An exact repeat of a declaration is ignored. An Employee re-declared at a
  different company is skipped with a warning (first declaration wins).
- Input with no companies prints an empty report, with a warning log, and exits 0.

## What I'd do next

- Treat an Employee re-declared at a different company as a job change instead of an error.
- Weight contact types differently (e.g. coffee > email), or factor in recency.

## How I used LLM tools


import { describe, expect, it } from 'vitest';
import { run } from '../src/run.js';

const lines = (...input: string[]): string => input.join('\n');

const EXAMPLE = lines(
  'Partner Chris',
  'Partner Molly',
  'Company Globex',
  'Company ACME',
  'Employee Laurie Globex',
  'Company Hooli',
  'Employee Abdi Hooli',
  'Employee Jamie Globex',
  'Contact Laurie Chris email',
  'Contact Laurie Molly call',
  'Partner Rezzan',
  'Contact Abdi Molly email',
  'Contact Laurie Chris coffee',
);

describe('run', () => {
  describe('valid input', () => {
    it('produces the assignment example report with no warnings', () => {
      expect(run(EXAMPLE)).toEqual({
        stdout: ['ACME: No current relationship', 'Globex: Chris (2)', 'Hooli: Molly (1)'],
        stderr: [],
        exitCode: 0,
      });
    });

    it('handles Windows line endings and a trailing newline', () => {
      const windowsInput = EXAMPLE.replaceAll('\n', '\r\n') + '\r\n';
      expect(run(windowsInput)).toEqual(run(EXAMPLE));
    });

    it('ignores blank lines without warning', () => {
      const result = run(lines('Company Globex', '', '   ', 'Company Hooli'));
      expect(result.stderr).toEqual([]);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('skipped lines', () => {
    it('warns with 1-based line numbers, counting blank lines', () => {
      const result = run(lines('Company Globex', '', 'Investor Bob', 'Employee Laurie Hooli'));

      expect(result.stderr).toEqual([
        "warning: line 3: unknown command 'Investor'",
        "warning: line 4: unknown company 'Hooli'",
      ]);
    });

    it('reports both parse errors and network rejections', () => {
      const result = run(lines('Partner Chris', 'Company Globex', 'Contact Bob Chris text', 'Contact Bob Chris email'));

      expect(result.stderr).toEqual([
        "warning: line 3: unknown contact type 'text' (expected email, call, or coffee)",
        "warning: line 4: unknown employee 'Bob'",
      ]);
    });

    it('adds a note after a blank line in the report and exits with 2', () => {
      const result = run(lines('Company Globex', 'Investor Bob'));

      expect(result.stdout).toEqual([
        'Globex: No current relationship',
        '',
        'Note: 1 input line skipped; report may be incomplete.',
      ]);
      expect(result.exitCode).toBe(2);
    });

    it('pluralizes the note for several skipped lines', () => {
      const result = run(lines('Company Globex', 'Investor Bob', 'Investor Ann'));
      expect(result.stdout.at(-1)).toBe('Note: 2 input lines skipped; report may be incomplete.');
    });

    it('still counts contacts on valid lines around skipped ones', () => {
      const result = run(lines(EXAMPLE, 'Contact Laurie Chris text', 'Contact Abdi Molly call'));
      expect(result.stdout).toContain('Hooli: Molly (2)');
    });
  });

  describe('no companies', () => {
    it('prints nothing, notes it on stderr, and exits 0 for empty input', () => {
      expect(run('')).toEqual({
        stdout: [],
        stderr: ['note: no companies declared; report is empty'],
        exitCode: 0,
      });
    });

    it('notes it when only partners are declared', () => {
      expect(run('Partner Chris').stderr).toEqual(['note: no companies declared; report is empty']);
    });

    it('prints only the skipped note, without a leading blank line, when every line is invalid', () => {
      const result = run(lines('Investor Bob'));

      expect(result.stdout).toEqual(['Note: 1 input line skipped; report may be incomplete.']);
      expect(result.exitCode).toBe(2);
    });
  });
});

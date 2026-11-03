import { describe, expect, it } from 'vitest';
import type { CompanyContacts } from '../src/network.js';
import { formatReport, formatSkippedNote } from '../src/report.js';

describe('formatSkippedNote', () => {
  it('uses the singular for one line', () => {
    expect(formatSkippedNote(1)).toBe('Note: 1 input line skipped; report may be incomplete.');
  });

  it('uses the plural for several lines', () => {
    expect(formatSkippedNote(3)).toBe('Note: 3 input lines skipped; report may be incomplete.');
  });
});

describe('formatReport', () => {
  it('formats the assignment example', () => {
    const companies: CompanyContacts[] = [
      {
        name: 'Globex',
        partnerStrengths: [
          { name: 'Chris', strength: 2 },
          { name: 'Molly', strength: 1 },
        ],
      },
      { name: 'ACME', partnerStrengths: [] },
      { name: 'Hooli', partnerStrengths: [{ name: 'Molly', strength: 1 }] },
    ];

    expect(formatReport(companies)).toEqual([
      'ACME: No current relationship',
      'Globex: Chris (2)',
      'Hooli: Molly (1)',
    ]);
  });

  it('returns no lines when there are no companies', () => {
    expect(formatReport([])).toEqual([]);
  });

  describe('sorting', () => {
    it('sorts companies alphabetically, ignoring case', () => {
      const companies: CompanyContacts[] = [
        { name: 'banana', partnerStrengths: [] },
        { name: 'Cherry', partnerStrengths: [] },
        { name: 'APPLE', partnerStrengths: [] },
      ];

      expect(formatReport(companies)).toEqual([
        'APPLE: No current relationship',
        'banana: No current relationship',
        'Cherry: No current relationship',
      ]);
    });

    it('does not reorder the array it was given', () => {
      const companies: CompanyContacts[] = [
        { name: 'Hooli', partnerStrengths: [] },
        { name: 'ACME', partnerStrengths: [] },
      ];

      formatReport(companies);

      expect(companies.map((company) => company.name)).toEqual(['Hooli', 'ACME']);
    });
  });

  describe('strongest partner', () => {
    it('picks the partner with the most contacts, wherever they appear in the list', () => {
      const companies: CompanyContacts[] = [
        {
          name: 'Globex',
          partnerStrengths: [
            { name: 'Molly', strength: 1 },
            { name: 'Rezzan', strength: 3 },
            { name: 'Chris', strength: 2 },
          ],
        },
      ];

      expect(formatReport(companies)).toEqual(['Globex: Rezzan (3)']);
    });

    it('lists all tied partners alphabetically, ignoring case', () => {
      const companies: CompanyContacts[] = [
        {
          name: 'Globex',
          partnerStrengths: [
            { name: 'Molly', strength: 2 },
            { name: 'Rezzan', strength: 1 },
            { name: 'chris', strength: 2 },
            { name: 'Abdi', strength: 2 },
          ],
        },
      ];

      expect(formatReport(companies)).toEqual(['Globex: Abdi, chris, Molly (2)']);
    });

    it('does not list partners tied below the top strength', () => {
      const companies: CompanyContacts[] = [
        {
          name: 'Globex',
          partnerStrengths: [
            { name: 'Chris', strength: 2 },
            { name: 'Molly', strength: 1 },
            { name: 'Rezzan', strength: 1 },
          ],
        },
      ];

      expect(formatReport(companies)).toEqual(['Globex: Chris (2)']);
    });
  });
});

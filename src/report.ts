import type { CompanyContacts, PartnerCount } from './network.js';

interface Strongest {
  names: string[];
  strength: number;
}

export function formatReport(companies: CompanyContacts[]): string[] {
  return [...companies].sort((a, b) => compareNames(a.name, b.name)).map(formatCompanyLine);
}

export function formatSkippedNote(skippedLines: number): string {
  const noun = skippedLines === 1 ? 'line' : 'lines';
  return `Note: ${skippedLines} input ${noun} skipped; report may be incomplete.`;
}

function formatCompanyLine(company: CompanyContacts): string {
  const strongest = findStrongest(company.partnerCounts);
  if (strongest === undefined) {
    return `${company.name}: No current relationship`;
  }
  return `${company.name}: ${strongest.names.join(', ')} (${strongest.strength})`;
}

// All partners tied for the highest count, alphabetically; undefined if there are no contacts.
function findStrongest(partnerCounts: PartnerCount[]): Strongest | undefined {
  if (partnerCounts.length === 0) {
    return undefined;
  }
  const strength = partnerCounts.reduce((max, partner) => Math.max(max, partner.count), 0);
  const names = partnerCounts
    .filter((partner) => partner.count === strength)
    .map((partner) => partner.name)
    .sort(compareNames);
  return { names, strength };
}

// Case-insensitive A-Z. Names are unique ignoring case, so this never has to break a tie.
function compareNames(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

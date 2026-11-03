import type { CompanyContacts, PartnerStrength } from './network.js';

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
  const strongest = findStrongest(company.partnerStrengths);
  if (strongest === undefined) {
    return `${company.name}: No current relationship`;
  }
  return `${company.name}: ${strongest.names.join(', ')} (${strongest.strength})`;
}

// All partners tied for the highest strength, alphabetically; undefined if there are no contacts.
function findStrongest(partnerStrengths: PartnerStrength[]): Strongest | undefined {
  if (partnerStrengths.length === 0) {
    return undefined;
  }
  const strength = partnerStrengths.reduce((max, partner) => Math.max(max, partner.strength), 0);
  const names = partnerStrengths
    .filter((partner) => partner.strength === strength)
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

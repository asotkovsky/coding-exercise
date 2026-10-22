export const CONTACT_TYPES = ['email', 'call', 'coffee'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export type Command =
  | { kind: 'partner'; name: string }
  | { kind: 'company'; name: string }
  | { kind: 'employee'; name: string; company: string }
  | { kind: 'contact'; employee: string; partner: string; contactType: ContactType };

export type ParseResult =
  | Command
  | { kind: 'blank' }
  | { kind: 'error'; message: string };

const WORD = /^[A-Za-z]+$/;

export function parseLine(line: string): ParseResult {
  const [keyword = '', ...args] = line.trim().split(/\s+/);

  if (keyword === '') {
    return { kind: 'blank' };
  }

  const invalidWord = args.find((word) => !WORD.test(word));
  if (invalidWord !== undefined) {
    return { kind: 'error', message: `invalid word '${invalidWord}' (letters A-Z only)` };
  }

  switch (keyword.toLowerCase()) {
    case 'partner': {
      const [name, ...extra] = args;
      if (name === undefined || extra.length > 0) {
        return usageError('Partner <Name>');
      }
      return { kind: 'partner', name };
    }

    case 'company': {
      const [name, ...extra] = args;
      if (name === undefined || extra.length > 0) {
        return usageError('Company <Name>');
      }
      return { kind: 'company', name };
    }

    case 'employee': {
      const [name, company, ...extra] = args;
      if (name === undefined || company === undefined || extra.length > 0) {
        return usageError('Employee <Name> <CompanyName>');
      }
      return { kind: 'employee', name, company };
    }

    case 'contact': {
      const [employee, partner, type, ...extra] = args;
      if (employee === undefined || partner === undefined || type === undefined || extra.length > 0) {
        return usageError('Contact <EmployeeName> <PartnerName> <email|call|coffee>');
      }
      const contactType = type.toLowerCase();
      if (!isContactType(contactType)) {
        return { kind: 'error', message: `unknown contact type '${type}' (expected email, call, or coffee)` };
      }
      return { kind: 'contact', employee, partner, contactType };
    }

    default:
      return { kind: 'error', message: `unknown command '${keyword}'` };
  }
}

function isContactType(value: string): value is ContactType {
  return (CONTACT_TYPES as readonly string[]).includes(value);
}

function usageError(usage: string): ParseResult {
  return { kind: 'error', message: `expected '${usage}'` };
}

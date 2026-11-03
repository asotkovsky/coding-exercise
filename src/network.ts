import type { Command, ContactType } from './parser.js';

export type ApplyResult = { ok: true } | { ok: false; message: string };

export interface PartnerStrength {
  name: string;
  strength: number;
}

export interface CompanyContacts {
  name: string;
  partnerStrengths: PartnerStrength[];
}

interface Employee {
  name: string;
  companyKey: string;
}

const OK: ApplyResult = { ok: true };

// How much each contact type adds to a partner's relationship strength with a company.
const contactWeight: Record<ContactType, number> = { email: 1, call: 2, coffee: 3, pitch: 5 };

export class Network {
  // All maps are keyed by lowercased name; values keep the first-declared spelling for display.
  private readonly partners = new Map<string, string>();
  private readonly companies = new Map<string, string>();
  private readonly employees = new Map<string, Employee>();
  // companyKey -> partnerKey -> relationship strength (sum of contact weights)
  private readonly strengths = new Map<string, Map<string, number>>();

  // Returns copies in declaration order, so callers can't change the network's state.
  listCompanies(): CompanyContacts[] {
    return [...this.companies].map(([companyKey, name]) => {
      const strengths = this.strengths.get(companyKey) ?? new Map<string, number>();
      return {
        name,
        partnerStrengths: [...strengths].map(([partnerKey, strength]) => ({
          name: displayName(this.partners, partnerKey),
          strength,
        })),
      };
    });
  }

  apply(command: Command): ApplyResult {
    switch (command.kind) {
      case 'partner':
        return this.addPartner(command.name);
      case 'company':
        return this.addCompany(command.name);
      case 'employee':
        return this.addEmployee(command.name, command.company);
      case 'contact':
        return this.addContact(command.employee, command.partners, command.contactType);
    }
  }

  private addPartner(name: string): ApplyResult {
    const key = toKey(name);
    if (!this.partners.has(key)) {
      this.partners.set(key, name);
    }
    return OK;
  }

  private addCompany(name: string): ApplyResult {
    const key = toKey(name);
    if (!this.companies.has(key)) {
      this.companies.set(key, name);
    }
    return OK;
  }

  private addEmployee(name: string, company: string): ApplyResult {
    const companyKey = toKey(company);
    const companyName = this.companies.get(companyKey);
    if (companyName === undefined) {
      return error(`unknown company '${company}'`);
    }

    const key = toKey(name);
    const existing = this.employees.get(key);
    if (existing === undefined) {
      this.employees.set(key, { name, companyKey });
      return OK;
    }
    if (existing.companyKey === companyKey) {
      return OK;
    }
    return error(
      `employee '${existing.name}' is already declared at '${displayName(this.companies, existing.companyKey)}'; ` +
        `skipping declaration at '${companyName}'`,
    );
  }

  // Every partner at the contact gets the full weight. The contact is all-or-nothing: if any
  // partner is undeclared, nobody is credited. A partner listed twice is credited once.
  private addContact(employeeName: string, partnerNames: string[], contactType: ContactType): ApplyResult {
    const employee = this.employees.get(toKey(employeeName));
    if (employee === undefined) {
      return error(`unknown employee '${employeeName}'`);
    }
    const unknownPartner = partnerNames.find((name) => !this.partners.has(toKey(name)));
    if (unknownPartner !== undefined) {
      return error(`unknown partner '${unknownPartner}'`);
    }

    let strengths = this.strengths.get(employee.companyKey);
    if (strengths === undefined) {
      strengths = new Map();
      this.strengths.set(employee.companyKey, strengths);
    }
    const weight = contactWeight[contactType];
    for (const partnerKey of new Set(partnerNames.map(toKey))) {
      strengths.set(partnerKey, (strengths.get(partnerKey) ?? 0) + weight);
    }
    return OK;
  }
}

function toKey(name: string): string {
  return name.toLowerCase();
}

// Keys passed here always came from the same map, so the fallback never runs; it only satisfies the type.
function displayName(names: Map<string, string>, key: string): string {
  return names.get(key) ?? key;
}

function error(message: string): ApplyResult {
  return { ok: false, message };
}

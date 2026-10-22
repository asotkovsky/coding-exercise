import type { Command } from './parser.js';

export type ApplyResult = { ok: true } | { ok: false; message: string };

export interface PartnerCount {
  name: string;
  count: number;
}

export interface CompanyContacts {
  name: string;
  partnerCounts: PartnerCount[];
}

interface Employee {
  name: string;
  companyKey: string;
}

const OK: ApplyResult = { ok: true };

export class Network {
  // All maps are keyed by lowercased name; values keep the first-declared spelling for display.
  private readonly partners = new Map<string, string>();
  private readonly companies = new Map<string, string>();
  private readonly employees = new Map<string, Employee>();
  // companyKey -> partnerKey -> number of contacts
  private readonly contacts = new Map<string, Map<string, number>>();

  // Returns copies in declaration order, so callers can't change the network's state.
  listCompanies(): CompanyContacts[] {
    return [...this.companies].map(([companyKey, name]) => {
      const counts = this.contacts.get(companyKey) ?? new Map<string, number>();
      return {
        name,
        partnerCounts: [...counts].map(([partnerKey, count]) => ({
          name: displayName(this.partners, partnerKey),
          count,
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
        return this.addContact(command.employee, command.partner);
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

  // Every contact type counts the same, so the type isn't needed here.
  private addContact(employeeName: string, partnerName: string): ApplyResult {
    const employee = this.employees.get(toKey(employeeName));
    if (employee === undefined) {
      return error(`unknown employee '${employeeName}'`);
    }
    const partnerKey = toKey(partnerName);
    if (!this.partners.has(partnerKey)) {
      return error(`unknown partner '${partnerName}'`);
    }

    let counts = this.contacts.get(employee.companyKey);
    if (counts === undefined) {
      counts = new Map();
      this.contacts.set(employee.companyKey, counts);
    }
    counts.set(partnerKey, (counts.get(partnerKey) ?? 0) + 1);
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

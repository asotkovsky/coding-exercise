import { beforeEach, describe, expect, it } from 'vitest';
import { Network } from '../src/network.js';
import type { Command } from '../src/parser.js';

const partner = (name: string): Command => ({ kind: 'partner', name });
const company = (name: string): Command => ({ kind: 'company', name });
const employee = (name: string, companyName: string): Command => ({
  kind: 'employee',
  name,
  company: companyName,
});
const contact = (employeeName: string, partnerName: string): Command => ({
  kind: 'contact',
  employee: employeeName,
  partner: partnerName,
  contactType: 'email',
});

describe('Network', () => {
  let network: Network;

  beforeEach(() => {
    network = new Network();
  });

  describe('Partner', () => {
    it('accepts a new partner', () => {
      expect(network.apply(partner('Chris'))).toEqual({ ok: true });
    });

    it('ignores a repeat declaration, regardless of case', () => {
      network.apply(partner('Chris'));
      expect(network.apply(partner('Chris'))).toEqual({ ok: true });
      expect(network.apply(partner('CHRIS'))).toEqual({ ok: true });
    });
  });

  describe('Company', () => {
    it('accepts a new company', () => {
      expect(network.apply(company('Globex'))).toEqual({ ok: true });
    });

    it('ignores a repeat declaration, regardless of case', () => {
      network.apply(company('ACME'));
      expect(network.apply(company('acme'))).toEqual({ ok: true });
    });
  });

  describe('Employee', () => {
    beforeEach(() => {
      network.apply(company('Globex'));
      network.apply(company('Hooli'));
    });

    it('accepts an employee at a declared company', () => {
      expect(network.apply(employee('Laurie', 'Globex'))).toEqual({ ok: true });
    });

    it('matches the company case-insensitively', () => {
      expect(network.apply(employee('Laurie', 'gLoBeX'))).toEqual({ ok: true });
    });

    it('rejects an employee at an undeclared company', () => {
      expect(network.apply(employee('Laurie', 'Initech'))).toEqual({
        ok: false,
        message: "unknown company 'Initech'",
      });
    });

    it('ignores a repeat declaration at the same company, regardless of case', () => {
      network.apply(employee('Laurie', 'Globex'));
      expect(network.apply(employee('LAURIE', 'globex'))).toEqual({ ok: true });
    });

    it('rejects a conflicting declaration at a different company', () => {
      network.apply(employee('Laurie', 'Globex'));
      expect(network.apply(employee('laurie', 'Hooli'))).toEqual({
        ok: false,
        message: "employee 'Laurie' is already declared at 'Globex'; skipping declaration at 'Hooli'",
      });
    });
  });

  describe('Contact', () => {
    beforeEach(() => {
      network.apply(partner('Chris'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));
    });

    it('accepts a contact between a declared employee and partner', () => {
      expect(network.apply(contact('Laurie', 'Chris'))).toEqual({ ok: true });
    });

    it('matches names case-insensitively', () => {
      expect(network.apply(contact('LAURIE', 'chris'))).toEqual({ ok: true });
    });

    it('rejects an undeclared employee', () => {
      expect(network.apply(contact('Abdi', 'Chris'))).toEqual({
        ok: false,
        message: "unknown employee 'Abdi'",
      });
    });

    it('rejects an undeclared partner', () => {
      expect(network.apply(contact('Laurie', 'Rezzan'))).toEqual({
        ok: false,
        message: "unknown partner 'Rezzan'",
      });
    });

    it('reports only the employee when both are undeclared', () => {
      expect(network.apply(contact('Abdi', 'Rezzan'))).toEqual({
        ok: false,
        message: "unknown employee 'Abdi'",
      });
    });
  });

  describe('listCompanies', () => {
    it('returns nothing for an empty network', () => {
      expect(network.listCompanies()).toEqual([]);
    });

    it('counts contacts per partner for the assignment example', () => {
      [
        partner('Chris'),
        partner('Molly'),
        company('Globex'),
        company('ACME'),
        employee('Laurie', 'Globex'),
        company('Hooli'),
        employee('Abdi', 'Hooli'),
        employee('Jamie', 'Globex'),
        contact('Laurie', 'Chris'),
        contact('Laurie', 'Molly'),
        partner('Rezzan'),
        contact('Abdi', 'Molly'),
        contact('Laurie', 'Chris'),
      ].forEach((command) => network.apply(command));

      expect(network.listCompanies()).toEqual([
        {
          name: 'Globex',
          partnerCounts: [
            { name: 'Chris', count: 2 },
            { name: 'Molly', count: 1 },
          ],
        },
        { name: 'ACME', partnerCounts: [] },
        { name: 'Hooli', partnerCounts: [{ name: 'Molly', count: 1 }] },
      ]);
    });

    it('sums contacts across all employees of a company', () => {
      network.apply(partner('Chris'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));
      network.apply(employee('Jamie', 'Globex'));
      network.apply(contact('Laurie', 'Chris'));
      network.apply(contact('Jamie', 'Chris'));

      expect(network.listCompanies()).toEqual([
        { name: 'Globex', partnerCounts: [{ name: 'Chris', count: 2 }] },
      ]);
    });

    it('uses the first-declared spelling for display', () => {
      network.apply(partner('Chris'));
      network.apply(partner('CHRIS'));
      network.apply(company('ACME'));
      network.apply(company('acme'));
      network.apply(employee('Laurie', 'acme'));
      network.apply(contact('laurie', 'chris'));

      expect(network.listCompanies()).toEqual([
        { name: 'ACME', partnerCounts: [{ name: 'Chris', count: 1 }] },
      ]);
    });

    it('does not count rejected contacts', () => {
      network.apply(partner('Chris'));
      network.apply(company('Globex'));
      network.apply(contact('Laurie', 'Chris')); // Laurie not declared yet
      network.apply(employee('Laurie', 'Globex'));

      expect(network.listCompanies()).toEqual([{ name: 'Globex', partnerCounts: [] }]);
    });

    it('returns copies that cannot change the network', () => {
      network.apply(partner('Chris'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));
      network.apply(contact('Laurie', 'Chris'));

      const [globex] = network.listCompanies();
      globex!.name = 'Changed';
      globex!.partnerCounts[0]!.count = 99;

      expect(network.listCompanies()).toEqual([
        { name: 'Globex', partnerCounts: [{ name: 'Chris', count: 1 }] },
      ]);
    });
  });
});

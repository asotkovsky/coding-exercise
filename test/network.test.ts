import { beforeEach, describe, expect, it } from 'vitest';
import { Network } from '../src/network.js';
import type { Command, ContactType } from '../src/parser.js';

const partner = (name: string): Command => ({ kind: 'partner', name });
const company = (name: string): Command => ({ kind: 'company', name });
const employee = (name: string, companyName: string): Command => ({
  kind: 'employee',
  name,
  company: companyName,
});
const contact = (
  employeeName: string,
  partnerNames: string | string[],
  contactType: ContactType = 'email',
): Command => ({
  kind: 'contact',
  employee: employeeName,
  partners: typeof partnerNames === 'string' ? [partnerNames] : partnerNames,
  contactType,
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
          partnerStrengths: [
            { name: 'Chris', strength: 2 },
            { name: 'Molly', strength: 1 },
          ],
        },
        { name: 'ACME', partnerStrengths: [] },
        { name: 'Hooli', partnerStrengths: [{ name: 'Molly', strength: 1 }] },
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
        { name: 'Globex', partnerStrengths: [{ name: 'Chris', strength: 2 }] },
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
        { name: 'ACME', partnerStrengths: [{ name: 'Chris', strength: 1 }] },
      ]);
    });

    it('adds each contact type by its weight (email 1, call 2, coffee 3, pitch 5)', () => {
      network.apply(partner('Chris'));
      network.apply(partner('Molly'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));
      network.apply(contact('Laurie', 'Chris', 'email'));
      network.apply(contact('Laurie', 'Chris', 'call'));
      network.apply(contact('Laurie', 'Chris', 'coffee'));
      network.apply(contact('Laurie', 'Molly', 'pitch'));

      expect(network.listCompanies()).toEqual([
        {
          name: 'Globex',
          partnerStrengths: [
            { name: 'Chris', strength: 6 },
            { name: 'Molly', strength: 5 },
          ],
        },
      ]);
    });

    it('gives every partner at a contact the full weight', () => {
      network.apply(partner('Molly'));
      network.apply(partner('Rezzan'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));
      network.apply(contact('Laurie', ['Molly', 'Rezzan'], 'coffee'));

      expect(network.listCompanies()).toEqual([
        {
          name: 'Globex',
          partnerStrengths: [
            { name: 'Molly', strength: 3 },
            { name: 'Rezzan', strength: 3 },
          ],
        },
      ]);
    });

    it('credits a partner listed twice in one contact only once', () => {
      network.apply(partner('Molly'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));
      network.apply(contact('Laurie', ['Molly', 'molly'], 'call'));

      expect(network.listCompanies()).toEqual([
        { name: 'Globex', partnerStrengths: [{ name: 'Molly', strength: 2 }] },
      ]);
    });

    it('credits nobody when any partner at a contact is undeclared', () => {
      network.apply(partner('Molly'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));

      expect(network.apply(contact('Laurie', ['Molly', 'Rezzan']))).toEqual({
        ok: false,
        message: "unknown partner 'Rezzan'",
      });
      expect(network.listCompanies()).toEqual([{ name: 'Globex', partnerStrengths: [] }]);
    });

    it('does not count rejected contacts', () => {
      network.apply(partner('Chris'));
      network.apply(company('Globex'));
      network.apply(contact('Laurie', 'Chris')); // Laurie not declared yet
      network.apply(employee('Laurie', 'Globex'));

      expect(network.listCompanies()).toEqual([{ name: 'Globex', partnerStrengths: [] }]);
    });

    it('returns copies that cannot change the network', () => {
      network.apply(partner('Chris'));
      network.apply(company('Globex'));
      network.apply(employee('Laurie', 'Globex'));
      network.apply(contact('Laurie', 'Chris'));

      const [globex] = network.listCompanies();
      globex!.name = 'Changed';
      globex!.partnerStrengths[0]!.strength = 99;

      expect(network.listCompanies()).toEqual([
        { name: 'Globex', partnerStrengths: [{ name: 'Chris', strength: 1 }] },
      ]);
    });
  });
});

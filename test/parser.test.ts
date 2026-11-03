import { describe, expect, it } from 'vitest';
import { parseLine } from '../src/parser.js';

describe('parseLine', () => {
  describe('blank lines', () => {
    it('treats an empty line as blank', () => {
      expect(parseLine('')).toEqual({ kind: 'blank' });
    });

    it('treats a whitespace-only line as blank', () => {
      expect(parseLine('   \t  ')).toEqual({ kind: 'blank' });
    });

    it('treats a bare Windows line ending as blank', () => {
      expect(parseLine('\r')).toEqual({ kind: 'blank' });
    });
  });

  describe('valid commands', () => {
    it('parses Partner', () => {
      expect(parseLine('Partner Chris')).toEqual({ kind: 'partner', name: 'Chris' });
    });

    it('parses Company', () => {
      expect(parseLine('Company Globex')).toEqual({ kind: 'company', name: 'Globex' });
    });

    it('parses Employee', () => {
      expect(parseLine('Employee Laurie Globex')).toEqual({
        kind: 'employee',
        name: 'Laurie',
        company: 'Globex',
      });
    });

    it.each(['email', 'call', 'coffee', 'pitch'])('parses Contact with type %s', (type) => {
      expect(parseLine(`Contact Laurie Chris ${type}`)).toEqual({
        kind: 'contact',
        employee: 'Laurie',
        partners: ['Chris'],
        contactType: type,
      });
    });

    it('parses Contact with several partners', () => {
      expect(parseLine('Contact Abdi Molly Rezzan email')).toEqual({
        kind: 'contact',
        employee: 'Abdi',
        partners: ['Molly', 'Rezzan'],
        contactType: 'email',
      });
    });
  });

  describe('whitespace', () => {
    it('treats multiple spaces between words as one separator', () => {
      expect(parseLine('Partner    Chris')).toEqual({ kind: 'partner', name: 'Chris' });
    });

    it('accepts tabs between words', () => {
      expect(parseLine('Partner\tChris')).toEqual({ kind: 'partner', name: 'Chris' });
    });

    it('ignores leading/trailing whitespace and a Windows line ending', () => {
      expect(parseLine('  Partner Chris  \r')).toEqual({ kind: 'partner', name: 'Chris' });
    });
  });

  describe('case sensitivity', () => {
    it('matches command keywords case-insensitively', () => {
      expect(parseLine('pArTnEr Chris')).toEqual({ kind: 'partner', name: 'Chris' });
    });

    it('matches contact types case-insensitively and normalizes them to lowercase', () => {
      expect(parseLine('Contact Laurie Chris COFFEE')).toMatchObject({ contactType: 'coffee' });
    });

    it('keeps names exactly as written', () => {
      expect(parseLine('Employee lAURIE ACME')).toEqual({
        kind: 'employee',
        name: 'lAURIE',
        company: 'ACME',
      });
    });
  });

  describe('errors', () => {
    it('rejects an unknown command', () => {
      expect(parseLine('Investor Bob')).toEqual({ kind: 'error', message: "unknown command 'Investor'" });
    });

    it('treats the last word as the contact type when there are extra words', () => {
      expect(parseLine('Contact Laurie Chris email today')).toEqual({
        kind: 'error',
        message: "unknown contact type 'today' (expected email, call, coffee, pitch)",
      });
    });

    it('rejects an unknown contact type', () => {
      expect(parseLine('Contact Laurie Chris text')).toEqual({
        kind: 'error',
        message: "unknown contact type 'text' (expected email, call, coffee, pitch)",
      });
    });

    it.each([
      ['Partner', "expected 'Partner <Name>'"],
      ['Partner Chris Smith', "expected 'Partner <Name>'"],
      ['Company', "expected 'Company <Name>'"],
      ['Company Globex Inc', "expected 'Company <Name>'"],
      ['Employee Laurie', "expected 'Employee <Name> <CompanyName>'"],
      ['Employee Laurie Globex Extra', "expected 'Employee <Name> <CompanyName>'"],
      ['Contact', "expected 'Contact <EmployeeName> <PartnerName> [<PartnerName>...] <email|call|coffee|pitch>'"],
      ['Contact Laurie', "expected 'Contact <EmployeeName> <PartnerName> [<PartnerName>...] <email|call|coffee|pitch>'"],
      ['Contact Laurie Chris', "expected 'Contact <EmployeeName> <PartnerName> [<PartnerName>...] <email|call|coffee|pitch>'"],
    ])('rejects wrong number of words: %s', (line, message) => {
      expect(parseLine(line)).toEqual({ kind: 'error', message });
    });

    it.each([
      ['Partner Chr1s', 'Chr1s'],
      ['Company Ben&Jerrys', 'Ben&Jerrys'],
      ['Employee Mary-Jane Globex', 'Mary-Jane'],
      ['Employee Laurie Globex2', 'Globex2'],
      ['Contact Laurie Chris em@il', 'em@il'],
      ['Partner José', 'José'],
      ['Partner Chris_Smith', 'Chris_Smith'],
    ])('rejects non-letter characters: %s', (line, word) => {
      expect(parseLine(line)).toEqual({
        kind: 'error',
        message: `invalid word '${word}' (letters A-Z only)`,
      });
    });
  });
});

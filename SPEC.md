# Herbie 0.1

## Problem Summary
Drive needs a tool which has the capability to ingest data in a standard file format and derive relationship insights from the data. Specifically, it should be able to answer the question of which partner at Drive has had the most contacts across all employees of a given company.

## Input Format
One command per line. Words are separated by spaces and contain only the letters A-Z and a-z.

| Command | Meaning |
|---|---|
| `Partner <Name>` | Declares a Partner (an employee of Drive Capital). |
| `Company <Name>` | Declares a Company (never Drive Capital). |
| `Employee <Name> <CompanyName>` | Declares an Employee of a previously declared Company. Employee names are globally unique. |
| `Contact <EmployeeName> <PartnerName> <email\|call\|coffee>` | Records one interaction between a Partner and an Employee. |

## Output
Every declared company, one per line sorted alphabetically. 
- `<CompanyName>: <PartnerName> (<RelationshipStrength>)` 
- `<CompanyName>: No current relationship`

__Rules__:

- Relationship strength = total number of Contacts between a Partner and all Employees of the Company. Every contact type counts as 1.
- A Company with no Contacts (including one with no Employees) prints `No current relationship`
- If several Partners tie for the highest strength, all of them are listed, alphabetically, comma-separated: `Globex: Chris, Molly (2)`

## Design decisions not outlined in assignment requirements

1. Ties - Picking one Partner if multiple partners have the same contact count for a given company would hide information that could be relevant. We should list all tied Partners. Alphabetical order keeps output deterministic regardless of input order.
2. Ordering - In line with the assignment requirements: `...you can assume that when an employee is declared, the company referenced will be previously declared in the input.`
Commands are processed in order. Anything referenced must already be declared, so a Contact for a Partner declared later in the file is skipped with a warning.
3. Case sensitivity -  The assignment doesn't say whether names are case-sensitive. I treat all comparisons as case-insensitive: names (ACME = acme), commands (partner), and contact types (Email). This mirrors how a CRM should behave with hand-entered data. Output uses the spelling from the first declaration of each name. 

## Error Handling
While well-formed input can be assumed for this assignment, it won't hurt to account for possible failure scenarios.

- Invalid lines should be skipped, and a warning logged
- If any lines were skipped, a note with the count is printed below the report (e.g. `Note: 2 input lines skipped; report may be incomplete.`) so anyone reading the output knows it may be missing data. Warnings for each skipped line will be visible in the console.

| Situation | Behavior |
|---|---|
| Unknown command (e.g. `Investor Bob`) | Warn, skip |
| Wrong number of words | Warn, skip |
| Word with non-letter characters | Warn, skip |
| Contact type not `email`/`call`/`coffee` | Warn, skip |
| Employee references undeclared Company | Warn, skip |
| Contact references undeclared Employee or Partner | Warn, skip |
| Exact repeat of an earlier declaration | Ignored, no warning |
| Conflicting re-declaration (e.g. Employee Sarah at Hooli and Employee Sarah at ACME) | Warn, skip (first declaration wins) |
| Blank line | Ignored, no warning |

## Assumptions
- Employees and Partners can share a name
- Whitespace in input is tolerated (leading/trailing spaces, multiple spaces between words, \r\n line endings.) 
- Input with no companies logs a notice
- Some real names like José, Mary-Jane and O'Brien will fail to parse but this is in line with the requirements that only letter characters are valid

## Out of scope
- Weighting contact types differently (e.g. coffee > email).
- Considering recency of contact
- Persistence of information between runs
- Employees changing companies (e.g. Sarah is declared as working for Hooli earlier in the input and then later is declared as working for ACME). For this first iteration this should be treated as a conflicting declaration and the 2nd is skipped.
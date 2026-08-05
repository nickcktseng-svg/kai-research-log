import { printValidationReport, validateInbox } from './journal-pipeline-utils.mjs';

const result = validateInbox();
printValidationReport(result);

if (result.errors.length > 0) {
	process.exitCode = 1;
}

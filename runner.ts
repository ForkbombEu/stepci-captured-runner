import { Command } from 'commander';
import { runFromFile, runFromYAML, type TestResult, StepResult, WorkflowResult, WorkflowOptions } from '@stepci/runner';
import fs from 'fs';


interface CliOptions {
    path?: string;
    secret?: string | undefined;
    env?: string | undefined;
    humanReadable?: boolean;
}

interface CliReturns {
    passed: boolean;
    messages: string[];
    captures: Record<string, any>;
    tests: TestResult[];
    errors: cliError[]
}
interface cliError {
    message: string;
    stack?: string;
}

const program = new Command();

program
  .option('-p, --path <file>', 'Path to the test file')
  .option('-s, --secret <json>', 'Secrets as a JSON string or path to JSON file')
  .option('-e, --env <json>', 'Environment variables as a JSON string or path to JSON file')
  .option('-h, --human-readable', 'Output in human-readable format')
  .argument('[yaml]', 'Raw YAML string as fallback input');

program.parse(process.argv);
const options = program.opts<CliOptions>(); 
const rawYamlArg: string | undefined = program.args[0];

function parseJsonInput(input:string | undefined): Record<string, any> {
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch {
    try {
      const content = fs.readFileSync(input, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error(`Failed to parse JSON from input or file: ${input}`);
      process.exit(1);
    }
  }
}

const secrets = parseJsonInput(options.secret);
const env = parseJsonInput(options.env);


const humanReadable = options.humanReadable || false;

const workflowOptions: WorkflowOptions = { secrets, env };

async function run(): Promise<void> {
  const messages: string[] = [];
  const errors: cliError[] = [];
  let captures: Record<string, any> = {};
  let tests: TestResult[] = [];
  let passed = false;

  try {
    let runnerResponse: WorkflowResult;

    if (options.path) {
      runnerResponse = (await runFromFile(options.path, workflowOptions));
    } else if (rawYamlArg) {
      runnerResponse = (await runFromYAML(rawYamlArg, workflowOptions));
    } else {
      const yamlInput: string = await new Promise<string>((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => (data += chunk));
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
      });
      if (!yamlInput.trim()) {
        errors.push({ message: "No input provided via file, argument, or stdin. Use --help for options." });
        outputResult(false, messages, captures, tests, errors);
        return;
      }
      runnerResponse = (await runFromYAML(yamlInput, workflowOptions));
    }

    ({ passed, tests } = runnerResponse.result);

    if (!passed) {
      handleFailures(tests, messages, errors);
      outputResult(false, messages, captures, tests, errors);
      return;
    }

    if (tests.length === 0) {
      messages.push("Workflow passed, but no tests were executed.");
      outputResult(true, messages, captures, tests, errors);
      return;
    }

    const lastTest = tests[tests.length - 1];
    if (!lastTest || lastTest.steps.length === 0) {
        errors.push({ message: "No steps found in the last test." });
        outputResult(false, messages, captures, tests, errors);
        return;
    }
    
    const lastStep = lastTest.steps[lastTest.steps.length - 1];

    if (!lastStep?.captures || Object.keys(lastStep.captures).length === 0) {
      messages.push("Workflow passed. No captures found in the last step of the last test.");
    } else {
      messages.push("Workflow passed. Captures from the last step:");
      captures = lastStep.captures;
    }
    outputResult(true, messages, captures, tests, errors);

  } catch (err: any) {
    errors.push({ message: err?.message || String(err), stack: err?.stack });
    outputResult(false, messages, captures, tests, errors);
  }
}

function outputResult(
    passed: boolean,
    messages: string[],
    captures: Record<string, any>,
    tests: TestResult[],
    errors: cliError[]
) {
    const result: CliReturns = { passed, messages, captures, tests, errors };
    if (humanReadable) {
        if (result.passed) {
            console.log("✅ Workflow PASSED!");
        } else {
            console.log("❌ Workflow FAILED!");
        }
        if (tests.length > 0) {
            let passedCount = 0;
            let failedCount = 0;
            for (const test of tests) {
                if (test.passed) passedCount++;
                else failedCount++;
            }
            console.log(
                `\n🧪 Tests: ${tests.length} | ✅ Passed: ${passedCount} | ❌ Failed: ${failedCount}`
            );
        } else {
            console.log("\n🧪 No tests were executed.");
        }

        let totalSteps = 0;
        let passedSteps = 0;
        let failedSteps = 0;
        for (const test of tests) {
            for (const step of test.steps) {
                totalSteps++;
                if (step.passed) passedSteps++;
                else failedSteps++;
            }
        }
        if (totalSteps > 0) {
            console.log(
                `🚶 Steps: ${totalSteps} | ✅ Passed: ${passedSteps} | ❌ Failed: ${failedSteps}`
            );
        }

        if (captures && Object.keys(captures).length > 0) {
            console.log("\n📦 Captures:");
            for (const [key, value] of Object.entries(captures)) {
                console.log(`  - ${key}: ${JSON.stringify(value)}`);
            }
        }

        if (errors.length > 0) {
            console.log("\n🚨 Errors:");
            for (const err of errors) {
                console.log(`  - ${err.message}`);
                if (err.stack) {
                    console.log(`    Stack: ${err.stack.split('\n')[0]}`);
                }
            }
        }

        if (messages.length > 0) {
            console.log("\n📝 Details:");
            for (const message of messages) {
                console.log(message);
            }
        }

        console.log(
            result.passed
                ? "\n🎉 All done! Your workflow succeeded."
                : "\n⚠️  Workflow finished with failures. See above for details."
        );
        return;
    }
    console.log(JSON.stringify(result, null, 2));
}

function handleFailures(
  tests: TestResult[],
  messages: string[],
  errors: cliError[]
): void {
  messages.push("Workflow failed. Details:");
  for (const test of tests) {
    for (const step of test.steps) {
      if (step.passed) continue;
      logStepFailure(step, messages, errors);
      logStepChecks(step, messages, errors);
      logStepResponse(step, messages, errors);
      messages.push(""); // blank line
    }
  }
}

function logStepFailure(step: StepResult, messages: string[], errors: cliError[]) {
  messages.push(`Step Failed: ${step.name || 'Unnamed Step'}`);
  if (step.request) {
    messages.push(`  URL: ${step.request.url}`);
    messages.push(`  Method: ${step.request.method}`);
  }
}

function logStepChecks(step: StepResult, messages: string[], errors: cliError[]) {
  if (!step.checks) return;

  let hasErrors = false;
  let errorMessages = "  Failed Checks:\n";

  for (const key in step.checks) {
    const checkGroupOrDetail = step.checks[key];
    if (isCheckDetail(checkGroupOrDetail)) {
      if (!checkPassed(checkGroupOrDetail)) {
        hasErrors = true;
        errorMessages += formatCheckError(key, checkGroupOrDetail);
      }
    } else if (typeof checkGroupOrDetail === 'object' && checkGroupOrDetail !== null) {
      for (const subKey in checkGroupOrDetail) {
        const subCheck = checkGroupOrDetail[subKey];
        if (!checkPassed(subCheck)) {
          hasErrors = true;
          errorMessages += formatCheckError(`${key}.${subKey}`, subCheck);
        }
      }
    }
  }

  if (hasErrors) messages.push(errorMessages);
}

function isCheckDetail(obj: any): obj is { expected: any; given: any } {
  return obj && typeof obj === 'object' && 'expected' in obj && 'given' in obj;
}

function checkPassed(check: { expected: any; given: any }): boolean {
  return JSON.stringify(check.expected) === JSON.stringify(check.given);
}

function formatCheckError(key: string, check: { expected: any; given: any }): string {
  return `    - ${key}:\n        Expected: ${JSON.stringify(check.expected, null, 2)}\n        Got:      ${JSON.stringify(check.given, null, 2)}\n`;
}

function logStepResponse(step: StepResult, messages: string[], errors: cliError[]) {
  if (!step.response) return;
  messages.push("  Response:");
  messages.push(`    - Status: ${step.response.status} ${step.response.statusText}`);
  messages.push(`    - Headers: ${JSON.stringify(step.response.headers, null, 2)}`);
  if (step.response.body) {
    const responseBody = Buffer.from(step.response.body).toString('utf-8');
    try {
      const responseJson = JSON.parse(responseBody);
      messages.push(`    - Body (JSON):\n${JSON.stringify(responseJson, null, 2)}`);
    } catch {
      messages.push(`    - Body (Raw Text):\n${responseBody}`);
    }
  }
}

run();
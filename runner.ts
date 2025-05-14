// cli.ts
import { Command } from 'commander';
import { runFromFile, runFromYAML, type TestResult, StepResult, WorkflowResult, WorkflowOptions } from '@stepci/runner';

interface CliOptions {
    path?: string;
    secret?: string[];
    env?: string[];
  }

const program = new Command();

program
  .option('-p, --path <file>', 'Path to the test file')
  .option('-s, --secret <key=value...>', 'Secrets as key=value pairs')
  .option('-e, --env <key=value...>', 'Environment variables as key=value pairs')
  .argument('[yaml]', 'Raw YAML string as fallback input');

program.parse(process.argv);
const options = program.opts<CliOptions>(); 
const rawYamlArg: string | undefined = program.args[0];

const secrets: Record<string, string> = {};
(options.secret || []).forEach((pair: string) => {
  const match = pair.match(/^([^=]+)=(.*)$/);
  if (match && match[1] && match[2]) {
    secrets[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  }
});

const env: Record<string, string> = {};
(options.env || []).forEach((pair: string) => {
  const match = pair.match(/^([^=]+)=(.*)$/);
  if (match && match[1] && match[2]) {
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  }
});

const workflowOptions: WorkflowOptions = { secrets, env };

async function run(): Promise<void> {
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
        console.error("🚨 No input provided via file, argument, or stdin. Use --help for options.");
        process.exit(1);
      }
      runnerResponse = (await runFromYAML(yamlInput, workflowOptions));
    }

    const { passed, tests } = runnerResponse.result;

    if (!passed) {
      handleFailures(tests);
      process.exit(1);
    }

    if (tests.length === 0) {
      console.log("✅ Workflow passed, but no tests were executed.");
      process.exit(0);
    }

    const lastTest = tests[tests.length - 1];
    if (!lastTest || lastTest.steps.length === 0) {
        console.error("❌ No steps found in the last test.");
        process.exit(1); 
    }
    
    const lastStep = lastTest.steps[lastTest.steps.length - 1];

    if (!lastStep?.captures || Object.keys(lastStep.captures).length === 0) {
      console.log("✅ Workflow passed. No captures found in the last step of the last test.");
    } else {
      console.log("✅ Workflow passed. Captures from the last step:");
      console.log(JSON.stringify(lastStep.captures, null, 2));
    }
    process.exit(0);

  } catch (err: any) {
    console.error("🚨 Error running workflow:", err.message || err);
    process.exit(1);
  }
}

function handleFailures(tests: TestResult[]): void {
  console.error("❌ Workflow failed. Details:\n");
for (const test of tests) {
    for (const step of test.steps) {
        if (step.passed) continue;

        logStepFailure(step);
        logStepChecks(step);
        logStepResponse(step);
        console.error("\n");
    }
}

function logStepFailure(step: StepResult) {
    console.error(`🔴 Step Failed: ${step.name || 'Unnamed Step'}`);
    if (step.request) {
        console.error(`  🌍 URL: ${step.request.url}`);
        console.error(`  📡 Method: ${step.request.method}`);
    }
}

function logStepChecks(step: StepResult) {
    if (!step.checks) return;

    let hasErrors = false;
    let errorMessages = "  ❌ Failed Checks:\n";

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

    if (hasErrors) console.error(errorMessages);
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

function logStepResponse(step: StepResult) {
    if (!step.response) return;
    console.error("  📩 Response:");
    console.error(`    - Status: ${step.response.status} ${step.response.statusText}`);
    console.error(`    - Headers: ${JSON.stringify(step.response.headers, null, 2)}`);
    if (step.response.body) {
        const responseBody = Buffer.from(step.response.body).toString('utf-8');
        try {
            const responseJson = JSON.parse(responseBody);
            console.error(`    - Body (JSON):\n${JSON.stringify(responseJson, null, 2)}`);
        } catch {
            console.error(`    - Body (Raw Text):\n${responseBody}`);
        }
    }
}
}

run();
import { Command } from 'commander';
import { runFromFile, runFromYAML } from '@stepci/runner';

const program = new Command();

program
  .option('-p, --path <file>', 'Path to the test file')
  .option('-s, --secret <key=value...>', 'Secrets as key=value pairs')
  .option('-e, --env <key=value...>', 'Environment variables as key=value pairs')
  .argument('[yaml]', 'Raw YAML string as fallback input');

program.parse(process.argv);
const options = program.opts();
const rawYamlArg = program.args[0];

// Parse secrets
const secrets = {};
(options.secret || []).forEach((pair) => {
  const match = pair.match(/^([^=]+)=(.*)$/);
  if (match) secrets[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

// Parse env
const env = {};
(options.env || []).forEach((pair) => {
  const match = pair.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

const workflowOptions = { secrets, env };

async function run() {
  try {
    let result;

    if (options.path) {
      result = await runFromFile(options.path, workflowOptions);
    } else if (rawYamlArg) {
      result = await runFromYAML(rawYamlArg, workflowOptions);
    } else {
      // Read from stdin
      const yaml = await new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
      });

      result = await runFromYAML(yaml, workflowOptions);
    }
    const { passed, tests } = result.result;

    if (passed) {
      const lastTest = tests[tests.length - 1];
      const lastStep = lastTest.steps[lastTest.steps.length - 1];
      if (lastStep?.captures) {
        console.log(JSON.stringify(lastStep.captures, null, 2));
      } else {
        console.log("No captures found in the last step.");
      }
    } else {
      handleFailures(tests);
      process.exit(1);
    }
  } catch (err) {
    console.error("Runner output:", JSON.stringify(result, null, 2));
    console.error("🚨 Error running workflow:", err.message || err);
    process.exit(1);
  }
}

function handleFailures(tests) {
  console.error("❌ Workflow failed. Details:\n");
  tests.forEach((test) => {
    test.steps.forEach((step) => {
      if (!step.passed) {
        console.error(`🔴 Step Failed: ${step.name}`);
        console.error(`  🌍 URL: ${step.request?.url}`);
        console.error(`  📡 Method: ${step.request?.method}`);

        if (step.checks) {
          let hasErrors = false;
          let errorMessages = "  ❌ Failed Checks:\n";
          for (const key in step.checks) {
            const check = step.checks[key];
            if ('expected' in check && 'given' in check) {
              if (JSON.stringify(check.expected) !== JSON.stringify(check.given)) {
                hasErrors = true;
                errorMessages += `    - ${key}:\n        Expected: ${JSON.stringify(check.expected, null, 2)}\n        Got:      ${JSON.stringify(check.given, null, 2)}\n`;

              }
            } else {
              for (const subKey in check) {
                const subCheck = check[subKey];
                if (JSON.stringify(subCheck.expected) !== JSON.stringify(subCheck.given)) {
                  hasErrors = true;
                  errorMessages += `    - ${key}.${subKey}:\n        Expected: ${JSON.stringify(subCheck.expected, null, 2)}\n        Got:      ${JSON.stringify(subCheck.given, null, 2)}\n`;

                }
              }
            }
          }
          if (hasErrors) console.error(errorMessages);
        }

        if (step.response) {
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

        console.error("\n");
      }
    });
  });
}

run();

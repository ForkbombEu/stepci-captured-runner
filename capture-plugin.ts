import { CapturesStorage } from '@stepci/runner/dist/utils/runner';
import { StepRunResult } from '@stepci/runner/dist';

export type CapturePlugin = {
  params: {
    values: { [key: string]: any };
  };
};

export default async function (
  input: CapturePlugin,
  captures: CapturesStorage,
): Promise<StepRunResult> {
  const stepResult: StepRunResult = {
    type: 'capture-plugin',
  }

  for (const key in input.params.values) {
    if (Object.prototype.hasOwnProperty.call(input.params.values, key)) {
      const value = input.params.values[key];
      captures[key] = value;
    }
  }
  
  return stepResult
}




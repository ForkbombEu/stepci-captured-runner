import type { HTTPStepResponse } from "@stepci/runner/dist/steps/http";
import type { TestResult } from "@stepci/runner";

function shouldDisplayBody(contentType: string | undefined): boolean {
    // Treat empty content-type as displayable
    if (!contentType) {
        return true;
    }

    const displayableTypes: RegExp[] = [
        /^text\//, // Matches any MIME type starting with "text/"
        /application\/(x-)?(json|xml|csv|javascript|ecmascript)/, // Matches both standard and non-standard textual application types
        /application\/.*\+(json|xml)$/, // Matches MIME types that end with +json or +xml
    ];

    // Normalize content type to handle cases with parameters like charset
    const normalizedType = contentType.split(";")[0].trim();
    return displayableTypes.some((pattern) => pattern.test(normalizedType));
}

function renderHTTPResponse(response: HTTPStepResponse) {
    if (shouldDisplayBody(response.contentType || undefined)) {
        return Buffer.from(response.body).toString();
    }
    return "Response body not displayed due to unsupported Content-Type";
}

export function testRenderResponseBody(tests: TestResult[]) {
    for (const test of tests) {
        for (const step  of test.steps) {
            if (step.response) {
                step.response.body = renderHTTPResponse(step.response);
            }
        }
    }
}

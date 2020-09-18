
export const DEFAULT_REQ_OPTIONS = { 'content-type': 'application/json' };

/**
 * Makes a request to the Jira REST API and returns the JSON object in the 
 * response body. In the event of an error, the response body is logged an 
 * exception is thrown. The response body is also logged if the DEBUG_LOGGING 
 * env variable is set.
 * 
 * @param apiPath the Jira REST API path to invoke
 * @param options object with additional Fetch params. See https://developer.atlassian.com/platform/forge/js-api-reference/product-fetch-api/#requestconfluence
 */
export async function request(apiPath, options = DEFAULT_REQ_OPTIONS) {
    const response = await api.asApp().requestJira(apiPath, options);
    if (!response.ok) {
      const message = `Error invoking ${apiPath}: ${response.status} ${await response.text()}`;
      console.error(message);
      throw new Error(message);
    }
    const responseBody = !(await response.text()) ? {} : await response.json();
    if (process.env.DEBUG_LOGGING) {
      console.debug(`GET ${apiPath}: ${JSON.stringify(responseBody)}`);
    }
    return responseBody;
  }
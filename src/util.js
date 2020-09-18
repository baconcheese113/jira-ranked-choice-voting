export const DEFAULT_REQ_OPTIONS = { 'content-type': 'application/json' };
export const CHOICE_COUNT = 3;
export const CHOICE_ARRAY = Array.from({length: CHOICE_COUNT}, (_, i) => `${i + 1}`);

/**
 * Makes a request to the Jira REST API and returns the JSON object in the 
 * response body. In the event of an error, the response body is logged an 
 * exception is thrown. The response body is also logged if the DEBUG_LOGGING 
 * env variable is set.
 * 
 * @param {string} apiPath the Jira REST API path to invoke
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

/**
 * Get color associated with different vote rankings
 * 
 * @param {string} rank the current rank
 */
export function getAppearance(rank) {
  // default - grey, inprogress - light blue,
  // moved - yellow, new - light purple
  // removed - red, success - light green
  if (rank === '1') return 'success';
  if (rank === '2') return 'inprogress';
  return 'new'
}

/**
 * Get a json list of all issues that can be voted on
 * 
 * @param {string} projectKey specifies a project filter for the issues
 */
export async function getAllVotableIssues(projectKey) {
  // TODO (future) Max returned results is 100, so might need to paginate through to make sure all epics are checked
  const projectFilter = projectKey ? ` AND project=${projectKey} ` : '';
  const jql = encodeURI(`issuetype=Epic${projectFilter}AND status was not in (Invalidated, Uncertain, Validated)`);
  return await request(`/rest/api/3/search?maxResults=100&fields=summary&properties=forge-ct-votes&jql=${jql}`);
}

/**
 * Parse summary to find [] or create new [] and insert updated point score
 * 
 * @param {string} oldSummary
 * @param {number} points (ex: ranked vote of 1 = 3 points)
 */
export function getSummaryWithPoints(oldSummary, points) {
  const existingPointsStr = oldSummary.match(/^\[.*\]\s*(.*)/);
  const newSummary = existingPointsStr ? existingPointsStr[1] : oldSummary;
  return `[${points}] ${newSummary}`;
}
import ForgeUI, {
  render,
  useProductContext,
  useEffect,
  CustomField,
  CustomFieldView,
  Text,
  useState,
  Fragment,
  StatusLozenge,
  IssuePanel,
  Select,
  Option,
  Form,
  CustomFieldEdit,
  TextArea,
  Avatar,
  AvatarStack,
} from "@forge/ui";
import { useIssueProperty } from '@forge/ui-jira'
import api from '@forge/api';

const defaultReqOptions = { 'content-type': 'application/json' };
const CHOICE_COUNT = 3;

const VoteField = () => {
  const [votes, setVotes, deleteVotes] = useIssueProperty('ct-votes', {}); // { [userId: string]: { rank: number } } || { '12345': {rank: 1} }
  const { platformContext, accountId } = useProductContext();
  const defaultOption = votes[accountId] ? votes[accountId].rank : undefined;
  console.log('votes', votes)

  if (platformContext.issueType !== 'Epic') return null;
  return (
    <CustomFieldView>
      <Fragment>
        {Object.entries(votes).map(([id, { rank }]) => (
          <Fragment>
            <Avatar accountId={id} />
            <Text content={`${id === accountId ? 'Your' : 'Their'} ranking: ${rank}`} />
          </Fragment>
        ))}
      </Fragment>
      <Text content={defaultOption || 'Unranked'} />
    </CustomFieldView>
  )
};

const Edit = () => {
  const [votes, setVotes, deleteVotes] = useIssueProperty('ct-votes', {});
  const { platformContext, accountId } = useProductContext();
  const defaultOption = votes[accountId] ? votes[accountId].rank : undefined;

  const isDefaultSelected = (value) => {
    if (!defaultOption && !value) return true;
    return value === defaultOption;
  }

  const onSave = async (formValue) => {
    // TODO remove existing vote off other issue for specified rank

    // Update user's vote on issue
    const newRank = formValue.voteFieldValue;
    const { [accountId]: userId, ...existingVotes } = votes;
    const updatedVotes = newRank 
      ? await setVotes({ ...votes, [accountId]: { rank: newRank }})
      : await setVotes(existingVotes);

    // Get new vote agg
    console.log('updatedVotes', updatedVotes)
    const newAgg = Object.entries(updatedVotes).reduce((total, vote) => {
      const rankInt = vote[1] ? parseInt(vote[1].rank) : 0;
      return total + CHOICE_COUNT - (rankInt ? rankInt - 1 : CHOICE_COUNT);
    }, 0);

    // Update issue summary
    const issueMetadata = await request(`/rest/api/3/issue/${platformContext.issueKey}`)
    const { summary } = issueMetadata.fields;
    const existingAgg = summary.match(/^\[.*\]\s*(.*)/);
    const newSummary = `[${newAgg}] ${existingAgg ? existingAgg[1] : summary}`;
    const body = JSON.stringify({
      update: {
        summary: [
          { set: newSummary }
        ]
      },
      field: {
        summary: newSummary
      }
    });
    await request(`/rest/api/3/issue/${platformContext.issueKey}`, {
      ...defaultReqOptions,
      method: 'PUT',
      body,
    })
    return newRank
  }

  return (
    <CustomFieldEdit onSave={onSave} header="Select vote" width="medium" >
      {/* TODO show current allocated votes */}
      <Select label="Your Ranked Vote" name="voteFieldValue" isRequired>
        <Option label="1" value="1" defaultSelected={isDefaultSelected('1')} />
        <Option label="2" value="2" defaultSelected={isDefaultSelected('2')} />
        <Option label="3" value="3" defaultSelected={isDefaultSelected('3')} />
        <Option label="Unranked" value={undefined} defaultSelected={isDefaultSelected()} />
      </Select>
    </CustomFieldEdit>
  );
};

/**
 * Makes a request to the Jira REST API and returns the JSON object in the 
 * response body. In the event of an error, the response body is logged an 
 * exception is thrown. The response body is also logged if the DEBUG_LOGGING 
 * env variable is set.
 * 
 * @param apiPath the Jira REST API path to invoke
 * @param options the Jira REST API path to invoke
 */
async function request(apiPath, options = defaultReqOptions) {
  const response = await api.asApp().requestJira(apiPath, options);
  if (!response.ok) {
    const message = `Error invoking ${apiPath}: ${response.status} ${await response.text()}`;
    console.error(message);
    throw new Error(message);
  }
  const responseBody = response.statusText === 'No Content' ? {} : await response.json();
  if (process.env.DEBUG_LOGGING) {
    console.debug(`GET ${apiPath}: ${JSON.stringify(responseBody)}`);
  }
  return responseBody;
}

export const voteRender = render(<CustomField view={<VoteField />} />);
export const voteEdit = render(<Edit />)
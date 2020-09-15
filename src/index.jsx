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

const defaultReqOptions = { 'content-type': 'application/json' }

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
      <Text content={defaultOption || ''} />
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
    const issueMetadata = await request(`/rest/api/3/issue/${platformContext.issueKey}`)
    console.log('issueMetadata', issueMetadata)
    const { summary } = issueMetadata.fields;
    const existingAgg = summary.match(/^\[.*\] /);
    const newMetadata = await request(`/rest/api/3/issue/${platformContext.issueKey}/summary`, {
      ...defaultReqOptions,
      method: 'PUT',
      body: {
        summary: 'A new hope',
      }
    })
    console.log('newMetadata', newMetadata)
    console.log('existingAgg', existingAgg)
    const { [accountId]: userId, ...existingVotes } = votes;
    if (!formValue.voteFieldValue) await setVotes(existingVotes);
    else await setVotes({ ...votes, [accountId]: { rank: formValue.voteFieldValue } })
    return formValue.voteFieldValue
  }

  return (
    <CustomFieldEdit onSave={onSave} header="Select vote" width="medium" >
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
  const responseBody = await response.json();
  if (process.env.DEBUG_LOGGING) {
    console.debug(`GET ${apiPath}: ${JSON.stringify(responseBody)}`);
  }
  return responseBody;
}

export const voteRender = render(<CustomField view={<VoteField />} />);
export const voteEdit = render(<Edit />)
import ForgeUI, {
  render,
  useProductContext,
  CustomField,
  CustomFieldView,
  Text,
  StatusLozenge,
  Select,
  Option,
  CustomFieldEdit,
} from "@forge/ui";
import { useIssueProperty } from '@forge/ui-jira'
import { request, DEFAULT_REQ_OPTIONS, getAppearance } from "./util";

const CHOICE_COUNT = 3;

const VoteField = () => {
  const [votes] = useIssueProperty('ct-votes', {}); // { [userId: string]: { rank: number } } || { '12345': {rank: 1} }
  const { platformContext, accountId } = useProductContext();
  const defaultOption = votes[accountId] ? votes[accountId].rank : undefined;

  if (platformContext.issueType !== 'Epic') return null;
  return (
    <CustomFieldView>
      <Text>
        {defaultOption 
          ? <StatusLozenge text={defaultOption} appearance={getAppearance(defaultOption)} /> 
          : 'Unranked'
        }
      </Text>
    </CustomFieldView>
  )
};

const Edit = () => {
  const [votes, setVotes] = useIssueProperty('ct-votes', {});
  const { platformContext, accountId } = useProductContext();
  const defaultOption = votes[accountId] ? votes[accountId].rank : undefined;

  const isDefaultSelected = (value) => {
    if (!defaultOption && !value) return true;
    return value === defaultOption;
  }

  const onSave = async (formValue) => {
    const newRank = formValue.voteFieldValue;
    console.log('newRank', newRank)
    // Look for existing vote on other issue for specified rank if exists
    // TODO Max returned results is 100, so might need to paginate through in the future to make sure all epics are checked
    const jql = encodeURI(`issuetype=Epic AND project=${platformContext.projectKey} AND status was not in (Invalidated, Uncertain, Validated)`)
    const allIssuesMetadata = await request(`/rest/api/3/search?maxResults=100&fields=summary&properties=forge-ct-votes&jql=${jql}`);
    console.log('allIssuesMetadata', allIssuesMetadata);
    const differentIssues = allIssuesMetadata.issues.filter((issue) => {
      const isDifferentIssue = issue.key !== platformContext.issueKey;
      const ctVotesProperty = issue.properties['forge-ct-votes'];
      if (!isDifferentIssue || !ctVotesProperty || !ctVotesProperty[accountId]) return false;
      return ctVotesProperty[accountId].rank === newRank;
    });
    console.log('differentIssues', differentIssues);
    // Remove existing votes from this user on other issues for specified rank
    await Promise.all(differentIssues.map(issue => {
      const { [accountId]: _id, ...otherUserVotes } = issue.properties['forge-ct-votes'];
      // Update agg score in summary on other issue when removing vote
      const updatedAgg = Object.entries(otherUserVotes).reduce((total, vote) => {
        const rankInt = vote[1] ? parseInt(vote[1].rank) : 0;
        return total + CHOICE_COUNT - (rankInt ? rankInt - 1 : CHOICE_COUNT);
      }, 0);
      const { summary } = issue.fields;
      const existingAgg = summary.match(/^\[.*\]\s*(.*)/);
      const newSummary = `[${updatedAgg}] ${existingAgg ? existingAgg[1] : summary}`;
      return request(`/rest/api/3/issue/${issue.key}`, {
        ...DEFAULT_REQ_OPTIONS,
        method: 'PUT',
        body: JSON.stringify({
          fields: {
            summary: newSummary
          },
          properties: [
            {
              key: 'forge-ct-votes',
              value: otherUserVotes
            }
          ]
        })
      })
    }));

    // Update user's vote on issue
    const { [accountId]: userId, ...existingVotes } = votes;
    const updatedVotes = newRank
      ? await setVotes({ ...votes, [accountId]: { rank: newRank } })
      : await setVotes(existingVotes);

    // Get new vote agg
    console.log('updatedVotes', updatedVotes)
    const newAgg = Object.entries(updatedVotes).reduce((total, vote) => {
      const rankInt = vote[1] ? parseInt(vote[1].rank) : 0;
      return total + CHOICE_COUNT - (rankInt ? rankInt - 1 : CHOICE_COUNT);
    }, 0);

    // Update issue summary
    const issueMetadata = await request(`/rest/api/3/issue/${platformContext.issueKey}?fields=summary&properties=forge-ct-votes`);
    console.log('issueMetadata', issueMetadata);
    const { summary } = issueMetadata.fields;
    const existingAgg = summary.match(/^\[.*\]\s*(.*)/);
    const newSummary = `[${newAgg}] ${existingAgg ? existingAgg[1] : summary}`;

    await request(`/rest/api/3/issue/${platformContext.issueKey}`, {
      ...DEFAULT_REQ_OPTIONS,
      method: 'PUT',
      body: JSON.stringify({
        fields: {
          summary: newSummary
        }
      })
    });
    // TODO update issue title for user without page refresh (not supported as of Sep-2020)
    return newRank
  }

  return (
    <CustomFieldEdit onSave={onSave} header="Select vote" width="medium" >
      <Select label="Your Ranked Vote" name="voteFieldValue" isRequired>
        <Option label="1" value="1" defaultSelected={isDefaultSelected('1')} />
        <Option label="2" value="2" defaultSelected={isDefaultSelected('2')} />
        <Option label="3" value="3" defaultSelected={isDefaultSelected('3')} />
        <Option label="Unranked" value={undefined} defaultSelected={isDefaultSelected()} />
      </Select>
      <Text content="Please refresh page after saving to see updated issue fields" />
    </CustomFieldEdit>
  );
};

export const voteRender = render(<CustomField view={<VoteField />} />);
export const voteEdit = render(<Edit />)
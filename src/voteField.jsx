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
import { request, DEFAULT_REQ_OPTIONS, getAppearance, CHOICE_COUNT, getAllVotableIssues, getSummaryWithPoints, CHOICE_ARRAY } from "./util";

const VoteField = () => {
  const [votes] = useIssueProperty('ct-votes', {}); // { [userId: string]: { rank: number } } || { '12345': {rank: 1} }
  const { accountId } = useProductContext();
  const defaultOption = votes[accountId] ? votes[accountId].rank : undefined;

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

  const calculatePoints = (votes) => {
    return Object.entries(votes).reduce((total, vote) => {
      const rank = vote[1] ? parseInt(vote[1].rank) : 0;
      return total + CHOICE_COUNT - (rank ? rank - 1 : CHOICE_COUNT);
    }, 0);
  }

  const cleanupIssuesWithSameVote = async (newRank) => {
    // Look for existing vote on other issue for specified rank if exists
    const allIssues = await getAllVotableIssues(platformContext.projectKey);
    const issuesWithSameRank = allIssues.issues.filter((issue) => {
      const isDifferentIssue = issue.key !== platformContext.issueKey;
      const ctVotesProperty = issue.properties['forge-ct-votes'];
      if (!isDifferentIssue || !ctVotesProperty || !ctVotesProperty[accountId]) return false;
      return ctVotesProperty[accountId].rank === newRank;
    });

    // Remove existing votes from this user on other issues for specified rank
    await Promise.all(issuesWithSameRank.map(issue => {
      const { [accountId]: _id, ...votesFromOtherUsers } = issue.properties['forge-ct-votes'];
      const calculatedPoints = calculatePoints(votesFromOtherUsers);

      return request(`/rest/api/3/issue/${issue.key}`, {
        ...DEFAULT_REQ_OPTIONS,
        method: 'PUT',
        body: JSON.stringify({
          fields: {
            summary: getSummaryWithPoints(issue.fields.summary, calculatedPoints)
          },
          properties: [
            {
              key: 'forge-ct-votes',
              value: votesFromOtherUsers
            }
          ]
        })
      })
    }));

  }

  const onSave = async (formValue) => {
    const newRank = formValue.voteFieldValue;

    await cleanupIssuesWithSameVote(newRank);

    // Update user's vote on issue
    const { [accountId]: _, ...existingVotes } = votes;
    const updatedVotes = newRank
      ? await setVotes({ ...votes, [accountId]: { rank: newRank } })
      : await setVotes(existingVotes);

    const newPoints = calculatePoints(updatedVotes);
    // Update issue summary
    const issue = await request(`/rest/api/3/issue/${platformContext.issueKey}?fields=summary&properties=forge-ct-votes`);

    await request(`/rest/api/3/issue/${platformContext.issueKey}`, {
      ...DEFAULT_REQ_OPTIONS,
      method: 'PUT',
      body: JSON.stringify({
        fields: {
          summary: getSummaryWithPoints(issue.fields.summary, newPoints),
        }
      })
    });
    // TODO (future) Update issue title for user without page refresh (not supported as of Sep-2020)
    return newRank
  }

  return (
    <CustomFieldEdit onSave={onSave} header="Select vote" width="medium" >
      <Select label="Your Ranked Vote" name="voteFieldValue" isRequired>
        {CHOICE_ARRAY.map(choice => (
          <Option label={choice} value={choice} defaultSelected={isDefaultSelected(choice)} />
        ))}
        <Option label="Unranked" value={undefined} defaultSelected={isDefaultSelected()} />
      </Select>
      <Text content="Please refresh page after saving to see updated issue fields (Cmd+R)" />
    </CustomFieldEdit>
  );
};

export const voteRender = render(<CustomField view={<VoteField />} />);
export const voteEdit = render(<Edit />)
import ForgeUI, {
  render,
  Text,
  useProductContext,
  Fragment,
  Avatar,
  IssuePanel,
  Table,
  Head,
  Cell,
  Row,
  StatusLozenge,
  useEffect,
  useState,
  Link,
  SectionMessage,
} from "@forge/ui";
import { useIssueProperty } from "@forge/ui-jira";
import { getAppearance, getAllVotableIssues, CHOICE_ARRAY } from "./util";

const VotePanel = () => {
  const [votes] = useIssueProperty('ct-votes', {}); // { [userId: string]: { rank: number } }
  const { platformContext, accountId } = useProductContext();
  const [myVotes, setMyVotes] = useState([]);

  useEffect(async () => {
    const allIssues = await getAllVotableIssues(platformContext.projectKey);
    const myRankedIssues = allIssues.issues.filter((issue) => {
      const ctVotesProperty = issue.properties['forge-ct-votes'];
      return ctVotesProperty && ctVotesProperty[accountId]
    });
    setMyVotes(myRankedIssues); // To trigger component refresh
  }, [])

  const sortedVotes = Object.entries(votes)
    .reduce((prev, [id, { rank }]) => [...prev, { id, rank }], [])
    .sort((a, b) => a.rank - b.rank);

  return (
    <Fragment>
      <SectionMessage appearance="info">
        {CHOICE_ARRAY.map(rank => {
          const myVote = myVotes.find(vote => vote.properties['forge-ct-votes'][accountId].rank === rank);
          const isThisIssueMsg = myVote && myVote.key === platformContext.issueKey ? ' (current issue)' : '';
          const link = myVote ? <Link href={myVote.self}>{`${myVote.key} - ${myVote.fields.summary}`}</Link> : 'Unranked';

          return <Text format="markup">Choice {rank}: {link}{isThisIssueMsg}</Text>;
        })}
      </SectionMessage>
      <Text>**List of everyone who voted for this issue**</Text>
      <Table>
        <Head>
          <Cell>
            <Text content="User" />
          </Cell>
          <Cell>
            <Text content="Vote" />
          </Cell>
        </Head>
        {sortedVotes.map((vote) => (
          <Row>
            <Cell>
              <Avatar accountId={vote.id} />
            </Cell>
            <Cell>
              <Text>
                <StatusLozenge text={vote.rank} appearance={getAppearance(vote.rank)} />
              </Text>
            </Cell>
          </Row>
        ))}
      </Table>
    </Fragment>
  )
};

export const run = render(<IssuePanel><VotePanel /></IssuePanel>);
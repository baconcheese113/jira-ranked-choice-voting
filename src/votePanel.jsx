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
import { request } from "./util";

const VotePanel = () => {
  const [votes] = useIssueProperty('ct-votes', {}); // { [userId: string]: { rank: number } }
  console.log('votes', votes);
  const { platformContext, accountId } = useProductContext();
  const [myVotes, setMyVotes] = useState([]);

  const updateVoteAllocations = async () => {
    console.log('updateVoteAllocations');
    const allIssuesMetadata = await request(`/rest/api/2/search?maxResults=100&properties=forge-ct-votes&jql=${encodeURI(`issuetype=Epic AND project=${platformContext.projectKey}`)}`);
    console.log('allIssuesMetadata', allIssuesMetadata);
    const myRankedIssues = allIssuesMetadata.issues.filter((issue) => {
      const ctVotesProperty = issue.properties['forge-ct-votes'];
      console.log('ctVotesProperty', ctVotesProperty && ctVotesProperty[accountId])
      return ctVotesProperty && ctVotesProperty[accountId]
    });
    setMyVotes(myRankedIssues);
    console.log('myRankedIssues', myRankedIssues)
  }

  useEffect(async () => {
    console.log('useEffect');
    await updateVoteAllocations()
  }, [])

  // TODO Sort by vote ranking
  const getAppearance = (rank) => {
    // default - grey, inprogress - light blue,
    // moved - yellow, new - light purple
    // removed - red, success - light green
    if (rank === '1') return 'success';
    if (rank === '2') return 'inprogress';
    return 'new'
  }



  if (platformContext.issueType !== 'Epic') return null;
  return (
    <Fragment>
      <SectionMessage title="Your Current Votes" appearance="info">
        {["1", "2", "3"].map(rank => {
          const myVote = myVotes.find(vote => vote.properties['forge-ct-votes'][accountId].rank === rank);
          const link = myVote ? <Link href={myVote.self}>{`${myVote.key} - ${myVote.fields.summary}`}</Link> : 'Unranked';

          return <Text format="markup">Choice {rank}: {link}</Text>;
        })}
      </SectionMessage>
      <Table>
        <Head>
          <Cell>
            <Text content="User" />
          </Cell>
          <Cell>
            <Text content="Vote" />
          </Cell>
        </Head>
        {Object.entries(votes).map(([id, { rank }]) => (
          <Row>
            <Cell>
              <Avatar accountId={id} />
            </Cell>
            <Cell>
              <Text>
                <StatusLozenge text={rank} appearance={getAppearance(rank)} />
              </Text>
            </Cell>
          </Row>
        ))}
      </Table>
    </Fragment>
  )
};

export const run = render(<IssuePanel><VotePanel /></IssuePanel>);
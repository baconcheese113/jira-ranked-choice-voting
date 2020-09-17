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
} from "@forge/ui";
import { useIssueProperty } from "@forge/ui-jira";

const VotePanel = () => {
  const [votes] = useIssueProperty('ct-votes', {}); // { [userId: string]: { rank: number } }
  console.log('votes', votes);
  const { platformContext, accountId } = useProductContext();
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
      {/* TODO Show list of existing issues ranks */}
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

export const run = render(
  <IssuePanel>
    <VotePanel />
  </IssuePanel>
);
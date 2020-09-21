# Forge Ranked Choice integration"

This project allows users to vote on issues (currently limited to Epics). It is based around the concept of [RCV](https://ballotpedia.org/Ranked-choice_voting_(RCV)) (Ranked Choice Voting). See `manifest.yml` for current components.

See [developer.atlassian.com/platform/forge/](https://developer.atlassian.com/platform/forge) for documentation and tutorials explaining Forge, including the [documentation of Forge custom fields](https://developer.atlassian.com/platform/forge/manifest-reference/#jira-custom-field). 

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick start

- Install your app in an Atlassian site by running:
```
forge install
```

- Build and deploy your app by running:
```
forge deploy
```

- Develop your app by running `forge tunnel` to proxy invocations locally:
```
forge tunnel
```

### Notes
- Use the `forge install` command when you want to install the app on a new site.
- Use the `forge deploy` command when you want to persist code changes.
- Once the app is installed on a site, the site picks up the new app changes you deploy without needing to rerun the install command.

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.

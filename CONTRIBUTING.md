<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Team Process Document**

- [GitHub Workflow](#github-workflow)
- [Coding Style](#coding-style)
  - [Comments](#comments)
- [Delivering Code](#delivering-code)
  - [Making PRs](#making-prs)
- [GitHub Story Process](#github-story-process)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# GitHub Workflow

The team follows the Forking Workflow documented [here](https://www.atlassian.com/git/tutorials/comparing-workflows#forking-workflow).

There are two main exceptions:

1. We will make use of two project maintainers, instead of one. Essentially developers fork the main repo, develop in their own fork as they wish, and then make a PR using GitHub Enterprise. The PR should be reviewed and merged by one of the project maintainers.

2. We are not using bitbucket, pull requests can be made using GitHub Enterprise instead.

# Coding Style

In an effort to have clear uniform code across a code base being developed by multiple individuals we will adopt the [airbnb style guildlines](https://github.com/airbnb/javascript)

The above is provided primarily for reference and while it is encouraged reading, we will use eslint and the prettier formatter to automatically apply most of these rules.

Travis will automatically run eslint and prettier when a PR is made. Descriptions on how to run eslint manually, perhaps for local testing, can be found [here](https://github.com/eslint/eslint#local-installation-and-usage). 

## Comments

We should likely identify a tool to run when a PR is made but for now this is simply a reminder that we need more comments in the code. Actions and functions should have some description of what they do.  Major algorithms that are difficult to understand should have some inline function comments.

# Delivering Code

Each code deliverable should come from the developer's fork of the master repo. GitHub Enterprise can be used to create the Pull Request (PR).

## Making PRs

- It is highly encouraged that PRs be made for small, specific pieces of work. Attempts should be made to not bundle unrelated work into the same PR.

- When making PRs please use the closes feature to reference and close the corresponding issue.  This helps ensure that we have an issue to track anything worth making code changes for.  You can read more about this feature [here](https://help.github.com/articles/closing-issues-via-commit-messages/)

- Assuming all checks pass, you have an associated issue for the work, and an automated test exists for the new changes; assign the PR to one of the project maintainers, Ashima Arora or David Terry. We will involve others to help with the review if necessary. For folks looking for tips on how to do a code review this is a [nice reference]  (https://ralbz001189.raleigh.ibm.com/qse/QSE.nsf/html/code_review_checklist.html)

- The maintainer should review and merge the PR if it looks good. All merges should squash the commits into a single commit on the master branch.

Note: A PR with failing checks, with no automated tests, or with no associated github issue, will be automatically rejected.

# GitHub Story Process

With an increased focus on stories and their associated points, we should be filing github issues in such a way that the team gets credit for all our work. 

When filing issues:

1. Make sure it has the Squad: Developer tag on it
2. Make sure it is assigned to a sprint
3. Make sure it is a story or associated with a story. If associating with a story please # mention the number of the story. We no longer get credit for estimates on tasks or unlabeled issues.
4. Make sure the story has points on it.  Every week burndown charts are generated that check on story closure rate so making stories that feel like about a week's worth of work is best. Since stories are typically a collection of related work it might make sense to put checklists of small items in the story if there are a few things that can be batched up into a week's worth of work.  Alternatively, consider making a story and associate child tasks, estimate those, and roll those estimates into the story. The latter is preferred but we can try both and see what works better.  The main point is having everything in github and closing things weekly is going to give us the most credit for what we are doing.

For help with estimating story points see the below information: 

| Estimation Guide  |
| ------------- |
| 1 Point (1 day) |
| 2 Points (1-2 days) |
| 3 Points (3-5 days) |
| 5 Points (5 days) |
| 8 Points (5-10 days) |
| 13 Points (10-15 days) |
| 18 Points (15 days) |
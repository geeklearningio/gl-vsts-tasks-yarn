![Icon](https://github.com/geeklearningio/gl-vsts-tasks-yarn/blob/master/Extension/extension-icon.png)

# Yarn Build and Release Tasks

> ## ⚠️ Deprecated and unmaintained
>
> This extension is **no longer maintained**. No further releases, bug fixes or security
> updates will be published, and [Yarn 1.x (Classic)](https://classic.yarnpkg.com/) is itself
> end-of-life.
>
> **You almost certainly don't need it** — see _Migrating off this extension_ below.
> The repository is left as-is for anyone who still depends on it. Feel free to fork.

## Migrating off this extension

Yarn 1.x is already available in the standard hosted agent images, and Yarn 2 and later can be
enabled directly through [Corepack](https://nodejs.org/api/corepack.html). Between the two,
none of this needs an extension any more.

The following does everything this extension did, with nothing installed:

```yaml
variables:
  YARN_CACHE_FOLDER: $(Pipeline.Workspace)/.yarn-cache

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"

  - task: Bash@3
    displayName: Yarn enable
    inputs:
      targetType: "inline"
      script: |
        corepack enable
        corepack prepare yarn@stable --activate

  - task: Cache@2
    displayName: Cache Yarn packages
    inputs:
      key: '"yarn" | "$(Agent.OS)" | yarn.lock'
      restoreKeys: |
        yarn | "$(Agent.OS)"
        yarn
      path: $(YARN_CACHE_FOLDER)

  - task: Bash@3
    displayName: Yarn
    inputs:
      targetType: "inline"
      script: |
        yarn --immutable

  - task: Bash@3
    displayName: Yarn build
    inputs:
      targetType: "inline"
      script: |
        yarn build
```

If your project pins its Yarn version with the `packageManager` field in `package.json`, then
`corepack enable` on its own is enough and the `corepack prepare` line can be dropped. On Yarn
1.x, use `yarn --frozen-lockfile` in place of `yarn --immutable`.

If package feed authentication is needed — the one thing the **Yarn** task did beyond running
Yarn — the built-in
[npm authenticate](https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/npm-authenticate-v0)
task does the job.

![cistatus](https://geeklearning.visualstudio.com/_apis/public/build/definitions/f841b266-7595-4d01-9ee1-4864cf65aa73/77/badge)

[Yarn](https://yarnpkg.com/) is Facebook's npm alternative. It is the fast, reliable and secure dependency management.
This extension brings the power of Yarn to Visual Studio Team Services Build and Release Management. It enables using yarn with the official npm registry or any registry you like such as Myget or [Visual Studio Team Services Package Management](https://marketplace.visualstudio.com/items?itemName=ms.feed#).

![GeekLearning Loves Yarn](https://github.com/geeklearningio/gl-vsts-tasks-yarn/blob/master/Extension/Screenshots/GeekLearningLovesYarn.png)

Why so much sudden love for Yarn ? You can find out [here](http://geeklearning.io/npm-install-drives-you-crazy-yarn-and-chill)

[Learn more](https://github.com/geeklearningio/gl-vsts-tasks-yarn/wiki) about this extension on the wiki!

## Tasks included

- **[Yarn installer](https://github.com/geeklearningio/gl-vsts-tasks-yarn/wiki/Yarn-Installer)**: Installs Yarn
- **[Yarn](https://github.com/geeklearningio/gl-vsts-tasks-yarn/wiki/Yarn)**: Execute Yarn

## To contribute

This repo uses Yarn 4 through [Corepack](https://nodejs.org/api/corepack.html), pinned by the
`packageManager` field in `package.json` — run `corepack enable` once and `yarn` resolves to the
right version by itself. Node.js 20 or later is required; `.nvmrc` pins the version used for
development. `typescript` and `tfx-cli` come from the repo's own dependencies, so nothing needs
installing globally.

1. From the root of the repo run `yarn`. The two tasks are Yarn workspaces, so this installs their dependencies as well.
2. Run `yarn build` to compile the build tasks.
3. Run `yarn package --version <version>` to create the .vsix extension packages (supports multiple environments) that includes the build tasks.

> `.yarnrc.yml` sets `nmHoistingLimits: workspaces`. Each task folder is copied into the .vsix
> with its own `node_modules` and is run by the agent as a standalone script, so that setting is
> load-bearing — without it the dependencies hoist to the repo root and the packaged extension
> ships without them.

## Known Issues

Please refer to our [wiki page](https://github.com/geeklearningio/gl-vsts-tasks-yarn/wiki/Known-Issues)

## Release Notes

Please refer to our [release page](https://github.com/geeklearningio/gl-vsts-tasks-yarn/releases)

## Contributors

This extension was created by [Geek Learning](http://geeklearning.io/), with help from the community.
It also uses some foundation code from [Azure pipelines Tasks](https://github.com/Microsoft/azure-pipelines-tasks).

## Attributions

- [Yarn by Yarn](https://yarnpkg.com/)

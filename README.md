![Icon](https://github.com/geeklearningio/gl-vsts-tasks-yarn/blob/master/Extension/extension-icon.png)

# Yarn Build and Release Tasks

![cistatus](https://geeklearning.visualstudio.com/_apis/public/build/definitions/f841b266-7595-4d01-9ee1-4864cf65aa73/77/badge)

[Yarn](https://yarnpkg.com/) is Facebook's npm alternative. It is the fast, reliable and secure dependency management. 
This extension brings the power of Yarn to Visual Studio Team Services Build and Release Management.

![GeekLearning Loves Yarn](https://github.com/geeklearningio/gl-vsts-tasks-yarn/blob/master/Extension/Screenshots/GeekLearningLovesYarn.png)

Why so much sudden love for Yarn ? You can find out [here](http://geeklearning.io/npm-install-drives-you-crazy-yarn-and-chill) 


[Learn more](https://github.com/geeklearningio/gl-vsts-tasks-yarn/wiki) about this extension on the wiki!

## Tasks included

* **[Yarn](https://github.com/geeklearningio/gl-vsts-tasks-yarn/wiki/Yarn)**: Execute Yarn (Yarn is bundled for Hosted Agents)

## To contribute

1. Globally install typescript and tfx-cli (to package VSTS extensions): `npm install -g typescript tfx-cli`
2. From the root of the repo run `npm install`. This will pull down the necessary modules for the different tasks and for the build tools.
3. Run `npm run build` to compile the build tasks.
4. Run `npm run package -- --version <version>` to create the .vsix extension packages (supports multiple environments) that includes the build tasks.

## Release Notes

## Contributors

This extension was created by [Geek Learning](http://geeklearning.io/), with help from the community.

## Attributions

* [Yarn by Yarn]](https://yarnpkg.com/)

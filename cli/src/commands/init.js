// @flow

import path from 'path';
import { green } from 'chalk';
import inquirer from 'inquirer';
import R from 'ramda';
import tildify from 'tildify';
import untildify from 'untildify';
import { answerWithOptionIfSetOrPrompt } from '../cli/answerWithOption';
import { globalOptionDefaults } from '../config/globalOptions';
import { writeConfigFile } from '../configFile/writeConfigFile';
import { fileExists } from '../util/fs';
import { printErrors } from '../util/printErrors';

import typeof Yargs from 'yargs';
import type { ConfigFileInput } from '../types/ConfigFile';
import type { CommandHandlerArgsWithOptions } from '../types/Command';

export const command = 'init';
export const description =
  'Create a .lagoobernetes.yml config file in the current working directory';

export const OVERWRITE: 'overwrite' = 'overwrite';
export const PROJECT: 'project' = 'project';
export const API: 'api' = 'api';
export const SSH: 'ssh' = 'ssh';
export const TOKEN: 'token' = 'token';

export const commandOptions = Object.freeze({
  [OVERWRITE]: OVERWRITE,
  [PROJECT]: PROJECT,
  [API]: API,
  [SSH]: SSH,
  [TOKEN]: TOKEN,
});

export const dynamicOptionsKeys = Object.freeze([
  OVERWRITE,
  PROJECT,
  API,
  SSH,
  TOKEN,
]);

type OptionalOptions = {
  overwrite?: boolean,
  project?: string,
  api?: string,
  ssh?: string,
  token: string,
};

export function builder(yargs: Yargs) {
  return yargs
    .usage(`$0 ${command} - ${description}`)
    .options({
      [OVERWRITE]: {
        describe: 'Overwrite the configuration file if it exists',
        type: 'boolean',
      },
      [PROJECT]: {
        describe: 'Name of project to configure',
        type: 'string',
      },
      [API]: {
        describe: 'API URL',
        type: 'string',
      },
      [SSH]: {
        describe: 'SSH URL',
        type: 'string',
      },
      [TOKEN]: {
        describe: 'Path to the Lagoobernetes token file',
        type: 'string',
      },
    })
    .example(
      `$0 ${command}`,
      'Create a config file at ./.lagoobernetes.yml. This will confirm with the user whether to overwrite the config if it already exists and also prompt for some parameters to add to the config.\n',
    )
    .example(
      `$0 ${command} --${OVERWRITE}`,
      'Overwrite existing config file (do not confirm with the user).\n',
    )
    .example(
      `$0 ${command} --${OVERWRITE} false`,
      'Prevent overwriting of existing config file (do not confirm with user).\n',
    )
    .example(
      `$0 ${command} --${PROJECT} my_project`,
      'Set project to "my_project" (do not prompt the user).\n',
    )
    .example(
      `$0 ${command} --${API} http://localhost:3000`,
      'Set API URL to "http://localhost:3000" (do not prompt the user).\n',
    )
    .example(
      `$0 ${command} --${SSH} localhost:2020`,
      'Set SSH URL to "localhost:2020" (do not prompt the user).\n',
    )
    .example(
      `$0 ${command} --${TOKEN} ~/tokens/.lagoobernetes-token`,
      'Set the token path to ~/tokens/.lagoobernetes-token (do not prompt the user).\n',
    )
    .example(
      `$0 ${command} --${API} --${SSH} --${TOKEN}`,
      'Skip configuration of API and SSH URLs and token path (do not prompt the user).\n',
    )
    .example(
      `$0 ${command} --${OVERWRITE} --${PROJECT} my_project --${API} --${SSH} --${TOKEN}`,
      'Overwrite existing config files, set project to "my_project" and skip configuration of API and SSH URLs and token path (do not confirm with or prompt the user for any parameters).',
    );
}

type PromptForOverwriteArgs = {|
  filepath: string,
  options: OptionalOptions,
  clog: typeof console.log,
|};

async function promptForOverwrite({
  filepath,
  options,
  clog,
}:
PromptForOverwriteArgs): Promise<{ [key: typeof OVERWRITE]: boolean }> {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: OVERWRITE,
      message: `File '${filepath}' already exists! Overwrite?`,
      default: false,
      when: answerWithOptionIfSetOrPrompt({
        option: OVERWRITE,
        options,
        notify: true,
        clog,
      }),
    },
  ]);
}

type Args = CommandHandlerArgsWithOptions<{
  +overwrite?: boolean,
  +project?: string,
}>;

export async function handler({
  cwd,
  options,
  clog,
  cerr,
}:
Args): Promise<number> {
  const filepath = path.join(cwd, '.lagoobernetes.yml');
  const exists = await fileExists(filepath);

  const overwrite = !exists
    ? undefined
    : R.prop(
      OVERWRITE,
      await promptForOverwrite({
        filepath,
        options,
        clog,
      }),
    );

  if (exists && !overwrite) {
    return printErrors(cerr, {
      message: `Not overwriting existing file '${filepath}'.`,
    });
  }

  const defaultToken = R.prop(TOKEN, globalOptionDefaults);

  // $FlowFixMe inquirer$Answers is inexact, LagoobernetesConfigInput is exact
  const configInput: ConfigFileInput = await inquirer.prompt([
    {
      type: 'input',
      name: PROJECT,
      message: 'Enter the name of the project to configure.',
      validate: input => (input ? Boolean(input) : 'Please enter a project.'),
      when: answerWithOptionIfSetOrPrompt({
        option: PROJECT,
        options,
        notify: true,
        clog,
      }),
    },
    {
      type: 'input',
      name: API,
      message: 'Enter the API URL',
      when: answerWithOptionIfSetOrPrompt({
        option: API,
        options,
        notify: true,
        clog,
      }),
    },
    {
      type: 'input',
      name: SSH,
      message: 'Enter the SSH URL',
      when: answerWithOptionIfSetOrPrompt({
        option: SSH,
        options,
        notify: true,
        clog,
      }),
    },
    {
      type: 'input',
      name: TOKEN,
      message: `Change the path for the token (default: ${R.compose(
        tildify,
        R.prop(TOKEN),
      )(globalOptionDefaults)})`,
      when: answerWithOptionIfSetOrPrompt({
        option: TOKEN,
        options: (R.pickBy((val, key) =>
          // Filter to options that...
          R.or(
            // ...either don't have the key TOKEN...
            R.complement(R.equals)(TOKEN, key),
            // ...or those that are a TOKEN that are the default value.
            // This is to avoid writing the default value in the config file.
            R.complement(R.equals)(defaultToken, val),
          ),
        )(options): { ...typeof options }),
        notify: true,
        clog,
      }),
      filter: untildify,
    },
  ]);

  try {
    clog(`Creating file '${filepath}'...`);
    await writeConfigFile(filepath, configInput);
    clog(green('Configuration file created!'));
    return 0;
  } catch (e) {
    return printErrors(
      cerr,
      `Error occurred while creating config at ${filepath}:`,
      e,
    );
  }
}

// @flow

import yargs from 'yargs';
import { setConfigForHandlers } from './setConfigForHandlers';
import { printErrors } from '../util/printErrors';
import { globalOptions } from '../config/globalOptions';

export function registerCommands() {
  try {
    // eslint-disable-next-line no-unused-expressions
    yargs
      .options(globalOptions)
      // Use yargs.commandDir method to initialize a directory of commands
      // Ref: https://github.com/yargs/yargs/blob/e87f4873012e3541325e7ec6dafb11a93b5717e0/docs/advanced.md#commanddirdirectory-opts
      .commandDir('../commands', { visit: setConfigForHandlers })
      // Require entry of at least one command after `lagoobernetes`, such as `lagoobernetes login`.
      // `lagoobernetes` by itself has no assigned function at the moment.
      .demandCommand()
      // .strict(): Error out on non-demanded or non-described command line argument
      // .argv: Get arguments as an object
      .strict().argv;
  } catch (err) {
    const exitCode = printErrors(console.error, 'Uncaught error:', err);
    process.exit(exitCode);
  }
}

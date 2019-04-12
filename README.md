# ceph-dashboard-i18ntool

A tool to manage the translation files of the ceph dashboard.

## Commands
- `push` Adds/Updates the resource files
- `merge` Adds missing <target> tags to language files
- `config` Configures the i18ntool
- `help` Shows the help dialog
- `-v` Displays the version

### push
Authenticate with the Transifex CLI to manage your resource files.

You can either use the i18n tool with a config file (json) or set the options directly on the cli.

**Note:** The config file settings have a higher priority than the options on the cli

Usage:
- `i18ntool push -c <filename>`
- `i18ntool push <options>`

Options:
- `-o`, `--organization` the unique slug of the organization on transifex
- `-p`, `--project` the unique slug of the project on transifex
- `--srcDir`, `--sourceDirectory` (default '.') directory where the source file is expected
- `--srcFile`, `--sourceFile` (default 'messages.xlf') source file (relative to srcDir)
- `-q`, `--quiet` (default 'false') quiet output. Errors will be displayed

For more information, see the file [i18ntool.example.json](i18ntool.example.json)

### merge
Adds missing <target> tags to language files

You can either use the i18n tool with a config file (json) or set the options directly on the cli.

**Note:** The config file settings have a higher priority than the options on the cli

Usage:
- `i18ntool merge -c <filename>`
- `i18ntool merge <options>`

Options:
- `--srcDir`, `--sourceDirectory` (default '.') directory where the source file is expected
- `--tarDir`, `--targetDirectory` (default '.') directory where the target files are expected (usually identical with srcDir)
- `--srcFile`, `--sourceFile` (default 'messages.xlf') source file (relative to srcDir)
- `-l`, `--languages` Comma separated list of country codes. File naming convention: `messages.<country-code>.xlf` (relative to tarDir)
- `--removeUnusedIds` (default 'true') determine if unused IDs should be removed during merge
- `-q`, `--quiet` (default 'false') quiet output. Errors will be displayed

For more information, see the file [i18ntool.example.json](i18ntool.example.json)

### config
Stores information such as the auth token of transifex in a configuration file in the users home directory

Usage:
- `i18ntool config <command>`

Commands:
- `token <token>` stores the transifex auth token in the configuration file
# ceph-dashboard-i18ntool

A tool to manage the translation files of the ceph dashboard.

## Commands
- `merge` Adds missing <target> tags to language files
- `help` Shows the help dialog
- `-v` Displays the version

### merge
You can either use the i18n tool with a config file (json) or set the options directly on the cli.

**Note:** The config file settings have a higher priority than the options on the cli

Usage:
- `i18ntool merge -c <filename>`
- `i18ntool merge <options>`

Options:
- `--srcDir`, `--sourceDirectory` (default '.') directory where the source file is expected
- `--tarDir`, `--targetDirectory` (default '.') directory where the target files are expected (usually identical with srcDir)
- `--srcFile`, `--sourceFile` (default 'messages.xlf') source file (relativ to srcDir)
- `-l`, `--languages` Comma separated list of country codes. File naming convention: `messages.<country-code>.xlf` (relativ to tarDir)
- `--removeUnusedIds` (default 'true') determine if unused IDs should be removed during merge
- `-q`, `--quiet` (default 'false') quiet ouput. Errors will be displayed.

For more information, see the file [i18ntool.example.json](i18ntool.example.json)
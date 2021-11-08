# daidoquer3

## Dependencies

- Node.js 16.x
- Yarn 1.22.5
- Python >= 2
  - need `python` in your $PATH
- make
- (Optional) yl-dlp dependencies
  - see yl-dlp's README

## How to start

- make your discord bot at Discord Developer Portal
- permissions
  - OAuth2.0
    - bot (investigating...)
      - send messages
      - manage messages
      - read message history
      - connect
      - speak
      - video
    - applications.commands
- invite your discord bot to your channel with above permissions
- clone and setup daidoquer3
  ```
  git clone git@github.com:ushitora-anqou/daidoquer3 -r
  yarn (or npm install)
  ```
- configure config/config.json referrencing config/config.sample.json
- `yarn start`
- type `!deploy` (by default) in your discord channel

### start

`yarn start`

### build

`yarn run build` or `yarn run watch`

### linting

`yarn run lint-check`(only checking) or `yarn run lint`(allow overwriting)
or use prettier-plugin compatible for your editor.

### testing

TBD

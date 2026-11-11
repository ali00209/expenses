# Expenses

A small Exact app for adding and deleting expenses. The Contract view is in
`app.contract`; the in-memory list and data sources are in `app.ts`.

## Prerequisites

- Bun 1.4.2
- A checkout of [Expo Exact](https://github.com/expo/exact)
- Google Chrome for web tests

The app's generated `exact.mjs` expects the Exact checkout at `../exact` when
the app is run from a sibling directory. Set `EXACT2` if your checkout is
elsewhere.

## Build and run

```sh
git clone https://github.com/expo/exact.git
cd exact
bun scripts/exact.mjs setup
bun scripts/exact.mjs new ../expenses
cd ../expenses
```

For an existing checkout of this app, skip `exact new` and run:

```sh
bun exact.mjs contract types app.contract -o app.contract.d.ts
bun exact.mjs contract build app.contract --json --errors-only
bun exact.mjs web
```

The web app is served at the URL printed by the command.

## Test

Run the Contract test on the web with:

```sh
bun exact.mjs test web app.test.contract
```

Or use the agent driver directly from the Exact checkout:

```sh
EXACT_APP_DIR="$PWD" \
  bun ../exact/scripts/agent.mjs web --app expenses --test "$PWD/app.test.contract"
```

Native hosts must be built before their agent tests:

```sh
bun exact.mjs linux
bun ../exact/scripts/agent.mjs linux --app expenses --test "$PWD/app.test.contract"

bun exact.mjs android
bun ../exact/scripts/agent.mjs android --app expenses --test "$PWD/app.test.contract"
```

The Linux and Android commands require the platform toolchains described in
Exact's setup documentation.

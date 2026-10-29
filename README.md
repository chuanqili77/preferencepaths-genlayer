# PreferencePaths

A reusable GenLayer primitive for aggregating wallet-signed natural-language preferences with the Schulze strongest-path method. Applications supply 2–4 options and 3–5 wallet members. GenLayer consensus interprets every signed ballot against every option pair; deterministic code derives the full winner set. Useful for small, public design or configuration polls.

## Mechanism

Each leader proposes FIRST, SECOND, TIE or UNCLEAR for every member/pair. A validator independently interprets the original options and signed statements, then compares the **entire semantic vote vector**. It does not merely check JSON or accept the leader's explanation. Reasons may differ; choices must agree. Any UNCLEAR result sends the poll to REVIEW without a tally.

For accepted votes, `direct[i][j]` counts members strictly preferring i to j. Ties add neither direction. Strongest paths start with direct winning edges (zero for losing/tied edges), then use max-min Floyd–Warshall. A winner i satisfies `paths[i][j] >= paths[j][i]` for every j. All tied winners are returned; no index-based tie breaker. The model never selects the winner.

## State and API

Text inputs are trimmed at their outer boundaries on ingestion. Source preservation refers to these stored normalized strings; interior text is unchanged.

`COLLECTING → READY → TALLIED | REVIEW`. The owner and poll ID form a namespace. Options, membership and each submitted ballot are immutable. Each listed wallet can submit once; all members must submit before tallying. Any caller may tally a READY poll. A SHA-256 digest binds protocol, owner, ID, options, members, signed ballot text, interpreted votes and final tally/status.

| Method | Arguments | Authorization / result |
| --- | --- | --- |
| `open_poll` | poll_id, options_json, members_json | Caller owns new poll |
| `submit_ballot` | owner, poll_id, statement | Listed signer, once |
| `tally` | owner, poll_id | Permissionless, READY only; JSON result |
| `get_poll` | owner, poll_id | JSON snapshot |
| `get_protocol` | none | `preferencepaths-1` |

IDs: 1–40 alphanumeric/underscore/hyphen. Options: distinct exact text, 12–250 characters each; input JSON 30–1300 characters. Members: distinct nonzero addresses, JSON 80–260 characters. Statements: 30–900 characters. See source and schema for exact enforced bounds.

Use the minimal fixture in [examples/poll.json](examples/poll.json). For `genlayer-js`, call `client.writeContract({address, functionName:'open_poll', args:[id, JSON.stringify(options), JSON.stringify(members)], value:0n, leaderOnly:false})`; each member signs `submit_ballot`, then any caller invokes `tally`. Read snapshots with `readContract` and `TransactionHashVariant.LATEST_FINAL`. This repository includes no frontend.

## Scope and limitations

Public preferences, not secret voting. Wallet signatures establish address control, not independent people: the owner chooses membership and can control multiple wallets. No Sybil resistance, quorum, expiry, cancellation, edit, appeal, payments or automatic execution of a winning option. A missing member can stall a poll; ambiguous results require a fresh poll. Semantic models can misread negation, context or prompt injection despite independent validation. Do not use this primitive for binding elections or high-stakes eligibility decisions.

## Originality and reuse

The accessible repository review covered chuanqili77, chongqianli7, zuotu295, gqzy999, zsf11221 and accessible public gqzy1/halihalibt repositories. Existing mechanisms included policy/eligibility decisions, amendment acknowledgements, dependency ordering, identity consolidation, matching, coverage and evidence aggregation. This primitive contributes signed full pairwise preference matrices plus deterministic Schulze beatpath aggregation; it does not repackage those mechanisms. This bounded review does not establish worldwide novelty.

## Development and verification

```sh
npm ci
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
genvm-lint check contracts/preference_paths.py
python scripts/prepare-sdk.py
python sdk-tests/check_sdk.py
node scripts/read-live.mjs
```

The unit tests use a small SDK shim and mocked semantic responses. The Direct Mode test uses the official pinned SDK, storage and calldata with a mocked LLM, including independent validator acceptance and rejection. Neither is network consensus. `read-live.mjs` performs only reads: chain ID, deployed source, exact transaction method/arguments/signer/target, full-consensus flags, finalized receipts and final state.

`verify-live.mjs` is an **opt-in write tool**, not a routine test command. `NEW_TEST=1 node scripts/verify-live.mjs` creates disposable development wallets and performs the documented zero-value workflow. It persists private state outside the repository, records intent before sending and resumes existing hashes. Never delete that state to retry a pending or failed transaction. Inspect failures first; it does not Appeal. Do not run it to reproduce evidence already recorded here. Never fund these disposable wallets or use them for valuable assets.

## Network and compatibility

Only Stable Studionet, chain **61999**, RPC **https://studio.genlayer.com/api**. Official [network documentation](https://docs.genlayer.com/developers/intelligent-contracts/networks) and the installed `genlayer-js` Studionet preset were checked before deployment; the RPC returned `0xf22f`. Dependencies are pinned in the lockfiles. The source pins `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`; the official linter suggests a newer runner, so the declared pin is intentionally retained and compatibility is established by the recorded live execution. This is not a claim of compatibility with other networks or future SDK releases.

See [VALIDATION.md](VALIDATION.md), [deployment.json](deployment.json), the generated [schema](schema.json) and [public evidence](evidence/studionet.json). MIT licensed.

# Validation

Recorded on 2026-10-29.

## Local verification (simulated semantics)

- 12 unit tests passed. These use mocked model results, not live consensus.
- Official linter: validation passed; 3 checks, 5 public methods (3 write, 2 view).
- Official pinned SDK Direct Mode: storage, calldata, terminal state and independent validator acceptance/rejection passed with a mocked LLM.
- Property checks: 729 small pair-strength graphs, including ties and cycle/path invariants.

## Real Stable Studionet evidence

Contract: `0x516C2d91958ea8a62387086A19B3b0d5471ff4F6`. Chain 61999; RPC https://studio.genlayer.com/api.
Exact deployed source SHA-256: `6e3dd6dce97dd8344922155569586c53f9aaf516e088356063a8f8cfdb8712fa`.

6 distinct transactions completed with `FINALIZED`, `MAJORITY_AGREE`, `SUCCESS` and `leader_only=false`. No transaction was resent and no Appeal was requested. Zero-value development transactions; no cash purchase or funding.

| Step | Transaction hash |
| --- | --- |
| deploy | `0xa9fb11b077a944ce1ecc4ffa5bed1b2ecdd0b43ddf308d96e91c2eb98fb7d327` |
| open | `0xf4347fd5c692655f34e1f9b32f313672d89c7d2a8c055bcdbc81d32c51c6b28b` |
| ballot_0 | `0x48c24176232d750a7679f0aab57b3c8586a0cfbbf8ce8b34c3ce5823ff3bca5b` |
| ballot_1 | `0x2e334a5f35e94516171deb74cb3a7203151be873f2ca5249f18f8a6e2f091319` |
| ballot_2 | `0x6551d67bd881d22c9797aa2fdc6dd82eace912b520600344adb0c6c580f0aadb` |
| tally | `0x5f5f34d80b7af0174b90aac4475e05376b920244be6465afca8ad0073a7ac85b` |

Final state: **TALLIED**.

The synthetic three-member editor-theme poll produced direct strengths `[[0,2,2],[1,0,3],[1,0,0]]` and winner set `[0]` (ATLAS). All three development wallets are controlled by one operator; this proves signer-slot enforcement and consensus execution, not independent human participation.

[evidence/studionet.json](evidence/studionet.json) retains final records, transaction arguments, public receipt projections, consensus votes and leader receipt payloads. Node configuration, timing logs and redundant byte arrays are omitted. Public receipts establish actual network execution; they do not prove model correctness on all inputs.

## Boundaries of evidence

Only the clean recorded fixture was exercised on-chain. Ambiguous, conflict, malicious input, authorization and equivalence disagreement cases are covered locally, not claimed as live consensus tests. The read-only verifier checks code equality, exact receipt/call binding and finalized state; it sends no transactions. SDK compatibility may change after this date.

# Teach Daso threat model

Local tablet prototype. Flight Lab only. No cloud identity.

| Threat | What would go wrong | Control | Test |
|---|---|---|---|
| Secret AI authorship | A compiled rule appears with no child decision | Every material behaviour has ledger provenance; AI suggestions are labelled | INV-09, INV-11, INV-40 |
| Self-approval | The model marks its own candidate approved | Approval is a separate child-actor entry; the agent cannot emit approval | INV-10, INV-41, INV-47, INV-56, D-01 |
| Ungrounded parent claims | A summary invents a prediction, distance, or foreign event | Closed id selection; `ParentSummary` built only from a validated local projection; D-02 leaves the unstored prediction blank | INV-24, INV-73, INV-74, INV-78 |
| Model leakage into Runner or the client | Runner calls a model or the browser bundle holds a credential | Runner imports neither teaching nor evidence; credentials stay in the two route files | INV-22, INV-38, INV-43, INV-52, INV-79 |
| Raw media retention | Video or photos of the child persist | No media store; distance and obstruction are typed fields the child enters | INV-32, INV-46 |
| Decorative deletion | “Delete” hides a row but leaves the graph | Coordinated all-or-nothing graph delete; reopen is empty | INV-25, INV-31, INV-76 |
| Orphaned-fork privacy | After Maya is deleted, UI still shows Maya or credits inherited rules to Leo | Anonymous title/teacher; `displayName` redacted in the same delete transaction; product UI never prints `forkedFrom` | INV-77, P7 privacy tests |

Simulations that must stay disclosed: automatic distance measurement, obstruction vision, parent SMS/push delivery, and second-child accounts. Registry: `src/core/disclosure/simulations.ts`. Surfaces: capture, runner, parent, and `README.md`.

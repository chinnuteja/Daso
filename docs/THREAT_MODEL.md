# Kale Memory Lab threat model

Local tablet prototype. Draw and Flight Lab share the bounded child-approved capability engine. Earlier experiments remain separate legacy routes. No cloud identity or authentication claim.

| Threat | What would go wrong | Control | Test |
|---|---|---|---|
| Secret AI authorship | A compiled rule appears with no child decision | Every material behaviour has ledger provenance; AI suggestions are labelled | INV-09, INV-11, INV-40 |
| Self-approval | The model marks its own candidate approved | Approval is a separate child-actor entry; the agent cannot emit approval | INV-10, INV-41, INV-47, INV-56, D-01 |
| Ungrounded parent claims | A summary invents a prediction, distance, or foreign event | Closed id selection; `ParentSummary` built only from a validated local projection; D-02 leaves the unstored prediction blank | INV-24, INV-73, INV-74, INV-78 |
| Model leakage into Runner or the client | Runner calls a model or the browser bundle holds a credential | Runner imports neither teaching nor evidence; credentials stay in the two route files | INV-22, INV-38, INV-43, INV-52, INV-79 |
| Raw media retention | Video or photos of the child persist | No media store; distance and obstruction are typed fields the child enters | INV-32, INV-46 |
| Decorative deletion | “Delete” hides a row but leaves the graph | Coordinated all-or-nothing graph delete; reopen is empty | INV-25, INV-31, INV-76 |
| Orphaned-fork privacy | After Maya is deleted, UI still shows Maya or credits inherited rules to Leo | Anonymous title/teacher; `displayName` redacted in the same delete transaction; product UI never prints `forkedFrom` | INV-77, P7 privacy tests |
| Cross-tab overwrite/reset resurrection | An old tab replaces newer vectors or restores deleted work | Ordered UI writes; revision compare-and-swap and owner reset fence in the storage transaction; stale review references rejected | Phase 11 hardening tests, both adapters |
| Stale or damaged saved graph | Cached UI applies removed records or the wrong active pointer | Consistent graph read/validation immediately before reuse; focus/data-rights refresh; no model fallback | Phase 11 hardening tests; existing graph attack tests |
| Oversized geometry/request | Invalid vectors or arbitrary request bytes consume unbounded work | Finite geometry schemas; explicit stamp/point/workbench budgets; 16 KiB teaching body limit before JSON parsing | Phase 11 geometry/budget and body-limit tests |

Profile deletion retains only a namespaced owner reset counter in the existing metadata store. It contains a local identifier and integer, not a profile, drawing, sentence, suggestion or saved tool; it prevents old tabs from recreating deleted work. It is not included in tool exports. This fence is not authentication against someone who controls the browser or forges repository inputs. Existing raw save compatibility is not a permission boundary.

Public deployment still needs provider cost/rate controls and hosting-specific review. A zero production-dependency audit count is not a security certification: the Phase 11 packet records remaining development-tool advisories. No whole-site cold offline guarantee is made.

Simulations that must stay disclosed: automatic distance measurement, obstruction vision, parent SMS/push delivery, and second-child accounts. Registry: `src/core/disclosure/simulations.ts`. Surfaces: capture, runner, parent, and `README.md`.

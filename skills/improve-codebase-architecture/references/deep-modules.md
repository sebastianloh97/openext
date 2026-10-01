# Deep Modules

Shared vocabulary and principles for architectural improvement, drawn on
Ousterhout, "A Philosophy of Software Design" (via Matt Pocock's
`improve-codebase-architecture` skill). Use these terms exactly; never
substitute component, service, or boundary.

## Vocabulary

- **Module**: anything with an interface and an implementation — a function,
  class, package, or tier-spanning slice. Avoid: unit, component, service.
- **Interface**: everything a caller must know to use the module correctly —
  the type signature plus invariants, ordering constraints, error modes,
  required configuration, performance characteristics. Avoid: API, signature.
- **Implementation**: what is inside the module. **Adapter**: a concrete thing
  satisfying an interface at a seam (role, not substance).
- **Depth**: leverage at the interface — behaviour per unit of interface a
  caller must learn. **Deep** = small interface, large implementation.
  **Shallow** = interface nearly as complex as the implementation. Avoid
  shallow modules.
- **Seam**: the place where behaviour can be altered without editing in that
  place; where the module's interface lives. Avoid: boundary.
- **Leverage**: what callers get — capability per interface learned.
  **Locality**: what maintainers get — change, bugs, knowledge, and
  verification concentrate in one place.

## Principles

- Depth is a property of the interface, not the implementation; a deep module
  may contain many small internal parts that are not part of its interface
  (internal seams).
- **Deletion test**: imagine deleting the module. If complexity vanishes, it
  was a pass-through; if complexity reappears across N callers, it was earning
  its keep.
- The interface is the test surface: if tests must reach past the interface,
  the module is the wrong shape.
- One adapter means a hypothetical seam; two adapters mean a real one.
  Introduce a port only when something actually varies across it.
- Designing for testability: accept dependencies, do not create them; return
  results, do not produce side effects; keep surface area small.

## Dependency Categories

Determine how the deepened module is tested across its seam:

1. **In-process**: pure computation, no I/O. Always deepenable; test through
   the new interface directly, no adapter.
2. **Local-substitutable**: local stand-ins exist (in-memory database, fake
   filesystem). Deepenable with the stand-in in the suite; the seam stays
   internal.
3. **Remote but owned**: your own services across a network. Define a port at
   the seam; the logic sits in one deep module; production adapter
   (HTTP/gRPC/queue) plus in-memory test adapter.
4. **True external**: third-party services. Inject as a port; tests provide a
   mock adapter.

## Testing Strategy: Replace, Don't Layer

- Old unit tests on shallow modules become waste once interface-level tests
  exist; delete them.
- New tests assert observable outcomes through the interface, never internal
  state; they should survive internal refactors. A test that must change when
  the implementation changes is testing past the interface.

## Design-It-Twice Brief Archetypes

Alternative designs for the same candidate, each radically different:

1. Minimize the interface: one to three entry points max; maximize leverage
   per entry point.
2. Maximize flexibility: support many use cases and extension.
3. Optimize for the most common caller: make the default case trivial.
4. Ports-and-adapters: only when cross-seam dependencies exist.

Each design outputs: the interface (types, methods, params, invariants,
ordering, error modes), a usage example, what the implementation hides behind
the seam, the dependency/adapter strategy, and trade-offs (where leverage is
high, where thin).

## Scoping And Exploration

- Scope by hot spots: weight recently changed code (`git log`); or take a
  master-named direction.
- Explore organically for friction: concept bounce across many small modules;
  shallow modules; pure functions extracted for testing while the real bugs
  live at the call sites (no locality); coupling leaking across seams;
  untested or hard-to-test-through-the-interface areas.
- Present each candidate as a before/after shape: the seam today, the seam
  after, and the wins in leverage and locality terms.

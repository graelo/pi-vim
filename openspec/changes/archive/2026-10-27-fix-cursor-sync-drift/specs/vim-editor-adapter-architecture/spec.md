# Spec Delta

## MODIFIED Requirements

### Requirement: Adapter applies modal effects with public Pi APIs

The Pi adapter SHALL apply modal effects using public Pi editor behavior,
except for cursor restoration, which SHALL use a verified cursor-position
seam: the adapter writes the target logical cursor position into the editor
cursor state, reads the position back through the public cursor API, and
falls back to replaying public movement keys when the read-back does not
match the target.

#### Scenario: Structural edit applies text and cursor target

- **WHEN** the modal module returns a structural edit effect
- **THEN** the adapter updates prompt text through the supported editor
    text-update path and restores the cursor so that the public cursor
    position equals the effect's target position

#### Scenario: Cursor restoration is verified against the public API

- **WHEN** the adapter restores the cursor to a target position
- **THEN** it writes the position through the cursor-state seam and verifies
    the result through the public cursor reader
- **WHEN** the written position does not match the target after read-back
- **THEN** the adapter replays public movement keys toward the target so the
    failure mode is the previous replay behavior, never a silently diverged
    cursor

#### Scenario: Cursor seam assumptions are guarded by tests

- **WHEN** the underlying Pi editor changes its cursor-state shape or
    semantics
- **THEN** the adapter's canary tests fail loudly instead of leaving the
    cursor silently diverged

#### Scenario: Delegated shortcut remains Pi-owned

- **WHEN** the modal module returns a delegate effect for `Enter`, `Esc`,
    `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, model or thinking shortcuts, image paste, or
    unknown non-printable input
- **THEN** the adapter delegates the original input to Pi's default editor
    behavior

#### Scenario: Terminal cursor hint remains best-effort

- **WHEN** the modal module returns a terminal cursor style or reset effect
- **THEN** the adapter applies it best-effort without making terminal support
    a correctness requirement

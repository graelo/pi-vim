## MODIFIED Requirements

### Requirement: Keybinding popup remains separate from message history

Runtime read-only popup output and popup-local scroll events SHALL remain
separate from retained runtime message history and SHALL NOT turn `:messages`
into a help, diagnostic, or popup log.

#### Scenario: Popup output is not retained as message history

- **WHEN** the editor executes a read-only popup-backed command such as
    `:keybindings`, `:help search`, `:keymap redo`,
    `:mapcheck ctrl+p`, `:vimdoctor`, or `:vimmode inspect` and then executes
    `:messages`
- **THEN** `:messages` does not include the popup content as a retained
    runtime message solely because the popup content was shown

#### Scenario: Popup scroll is not retained as message history

- **WHEN** the editor opens a read-only popup and scrolls within it
- **THEN** retained message history does not grow solely because popup scroll
    position changed

#### Scenario: Repeated popup display does not pollute messages

- **WHEN** the editor opens and dismisses read-only popups multiple times
- **THEN** retained message history does not grow solely because popup content
    was shown or dismissed

#### Scenario: Existing message retention remains unchanged

- **WHEN** retained Ex errors, Ex success messages, inspect diagnostics,
    customization diagnostics, or enabled no-op feedback exist before the popup
    is opened
- **THEN** opening, scrolling, or dismissing the popup does not remove,
    reorder, or duplicate those retained messages

### Requirement: Keybinding popup avoids raw prompt dumps

Runtime read-only popup output SHALL summarize diagnostic and help metadata
without dumping raw prompt contents or large internal editor state.

#### Scenario: Popup content omits prompt text

- **WHEN** the current prompt contains arbitrary user text and the editor
    executes a read-only popup-backed command such as `:keybindings`, `:help`,
    `:keymap`, `:mapcheck`, `:messages`, `:vimdoctor`, or
    `:vimmode inspect`
- **THEN** the popup output does not include raw prompt text, register
    contents, macro token streams, mark tables, search history contents, or
    visual selection text unless an existing bounded summary explicitly redacts
    and limits the data

#### Scenario: Popup content stays diagnostic in scope

- **WHEN** a read-only popup is visible
- **THEN** it describes finite help, feature, diagnostic, message, or
    inspectability metadata and does not expose a raw inspect dump or persistent
    runtime log

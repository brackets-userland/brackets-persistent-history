# Brackets Persistent History
Extension that saves editing history between changing projects or while Brackets is closed.

Created to supplement [this Trello card (Local history versioning).](https://trello.com/c/H8AyDwFA/391-local-history-versioning)

### Note
> This extension is still under work, but the basics should work. Help by filing issues, figuring out edge cases and suggesting new features!

## How does it work?

### Saving history

When a file has been edited (so that it's CodeMirror history has been modified) and user saves the current file following happens:

* the actual history is saved to `state.json` (key is the full path)
* a cached version the file is saved to `modules/cache` (as `first-10-letters-of-path-converted-to-sha-1.tmp`)

### Loading history

When user opens a file, the extension checks first checks if the cache folder contains a cached copy of the file and the diff's it against the current document using `JsDiff`. This step is important, as CodeMirror history works line/character basis, which makes any changes to the document invalidate the entire history.

Regardless of whether the cached version differs from the original, the extension proceeds to reinserting the history. However, if the document was modified, the extension first reverts the document to the cached version, applies the history and then returns the document to original state. This way the `redo` history get invalidated, but `undo` history works as intended:

> current document &rarr; cached document &rarr; history

## Preferences

Following configuration options are available (under `petetnt.brackets-persistent-history`):

#### persistHistory (Boolean) 
> Default: `true` - Enables or disables persistent history

#### cacheTimeToLiveInDays (Integer)
> Default: `14` - How many days should the cache (`===` editing history + files) live. Note that working with many large files might bloat the size of the cache very quickly, so modify accordingly.

## TODO

- [ ] Create unit tests

## Contributing
Contributions are welcome! Just open a new issue and/or send a pull request.

## License 
MIT

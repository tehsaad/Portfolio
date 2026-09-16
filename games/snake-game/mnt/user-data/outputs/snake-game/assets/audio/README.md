# Optional audio files

This folder is **intentionally empty**. The game synthesises every sound with the
Web Audio API, so it has full audio with zero files here.

If you would rather use real samples, drop them in with these exact names:

```text
assets/audio/eat.wav          normal food eaten
assets/audio/bonus.wav        bonus / special food eaten
assets/audio/click.wav        UI button press
assets/audio/level-up.wav     advancing a level
assets/audio/game-over.wav    death
assets/audio/high-score.wav   new record
```

Rules the loader follows:

- Every file is **optional and independent**. Add one, add six, or add none.
- A missing, blocked or malformed file is caught silently and the synthesised
  version is used for that cue instead. It can never break the game.
- Files are fetched relative to the page, or relative to `data-base-path` on the
  `#snake-game` wrapper if you set it.
- Keep samples short (under ~1 s for effects). They are decoded once on first use
  and cached.

Background music is generated procedurally — there is no `background.mp3` to
supply. It is off by default and can be toggled in Settings.

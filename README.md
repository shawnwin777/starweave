# starweave

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/shawnwin777/starweave/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/shawnwin777/starweave/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Starweave** — weave the night sky into constellations. Drag through 3 or more stars of the same colour to weave them into a constellation and score; stars fade if you leave them, and twelve lost lights end the night. Catch comets for bonuses, fire a nova with Space when the sky is about to go dark, and beware the black hole that drifts across from level 3. Levels raise the quota, the pace, and the stakes.

- Original idea, art and sounds: all graphics are drawn on canvas, all sounds are synthesised live with WebAudio — no assets, no network, no build step.
- Complete game: title screen, HUD (score, level quota, combo, novas, lights), level-ups, results screen with best score, and restart with R or a click.
- Keyboard and mouse: drag to weave, Space for a nova, P to pause, M to mute, Enter to start.

## Run it

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in a desktop browser. `screenshots/` holds the title, play and results screens; `?shot=start|play|end&seed=1` stages each one deterministically.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vzf6m5kx&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

# Echo Platoon Intelligence Network

Static training tool for the Australian Army Cadets. This site simulates an
intelligence network for supervised exercises. It is youth-safe and does not
connect to real systems.

## Usage
Open `index.html` locally or visit the GitHub Pages deployment. Select a
scenario to launch the terminal. Use keyboard commands to explore nodes and
recover codes.

## Development
This project is pure client-side. To test locally run a simple web server:

```bash
npx http-server .
```

No build step is required.

## Scenarios
Create JSON or JavaScript files in `scenarios/`. See
[`scenarios/README.md`](scenarios/README.md) and the examples provided.

## Accessibility & youth safety
- Keyboard-first interaction with visible focus.
- Screen reader friendly terminal output via `aria-live`.
- All content is fictional and for training purposes only.

## Deployment on GitHub Pages
1. Commit and push to `main`.
2. Enable GitHub Pages for this repository using the root directory.
3. Files like `.nojekyll` ensure JSON scenario files are served.

## Licence
MIT Licence. See [LICENSE](LICENSE).

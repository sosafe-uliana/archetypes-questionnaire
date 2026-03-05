# Engineering Leadership Archetypes

A self-assessment tool that maps engineering leaders across four dimensions — **People**, **Execution**, **Change**, and **Stability** — and assigns them one of four leadership archetypes.

Supports individual self-assessment and 360° peer evaluation with multi-respondent aggregation.

## Archetypes

| Archetype | Quadrant |
|---|---|
| Systems Stabilizer | Execution + Stability |
| The Driver | Execution + Change |
| Team Builder | People + Stability |
| Strategic Shaper | People + Change |

## Features

- 10-question Likert-scale assessment with randomized question order
- Radar chart visualizing scores across all four dimensions
- Name personalisation — results addressed to the respondent
- **360° Peer Evaluation mode** — peers independently rate a named subject
- **Multi-respondent aggregation** — peer scores are averaged across all submissions, stored in `localStorage`
- **Self-Awareness Variance** — side-by-side delta between self and peer perceptions when both exist
- Copyable plain-text summary

No backend, no build tools, no npm — fully static vanilla HTML/CSS/JS.

## Running locally

Any static file server works. Opening `index.html` directly via `file://` works for everything except the clipboard copy button, which requires a secure context (`http://` or `https://`).

**VS Code Live Server**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → *Open with Live Server*

**Python**
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

**Node.js**
```bash
npx serve .
# open the URL shown in the terminal
```

## Deploying

### GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch** → `main` → `/ (root)`
4. Your site will be live at `https://<username>.github.io/<repo-name>/`

### Netlify

**Drag & drop:** go to [app.netlify.com](https://app.netlify.com), drag the project folder onto the deploy dropzone.

**Git-connected:**
1. Connect your GitHub repo in the Netlify dashboard
2. Build command: *(leave empty)*
3. Publish directory: `.`
4. Deploy

No configuration files needed.

## File structure

```
index.html      markup
styles.css      all styling
questions.js    question data
archetypes.js   archetype definitions
app.js          application logic
README.md       this file
```

## Data storage

Peer evaluation results are stored in `localStorage` keyed by the subject's first name (case-insensitive). Multiple peers can evaluate the same person from the same browser and their scores are averaged. Data persists until browser storage is cleared. No data is sent to any server.

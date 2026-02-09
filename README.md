# Oxidian Website

Landing page for [Oxidian](https://github.com/nicokimmel/oxidian) — the open-source note-taking app built for speed.

## Structure

```
oxidian-website/
├── index.html          # Single-page landing
├── css/
│   └── style.css       # All styles (dark theme, responsive)
├── js/
│   └── main.js         # Scroll animations, mobile menu, particles
├── assets/             # SVG icons (if needed)
└── README.md
```

## Tech Stack

- Pure HTML + CSS + vanilla JS
- No build tools or frameworks required
- Fonts: Inter + JetBrains Mono (Google Fonts)
- Catppuccin-inspired color palette

## Development

Just open `index.html` in a browser, or serve it:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

## Features

- Smooth scroll with anchor navigation
- Intersection Observer fade-in animations
- Particle canvas background
- Responsive mobile hamburger menu
- CSS mockups of the Oxidian app UI
- Glassmorphism card design
- Comparison table vs competitors
- Accessible and performant

## License

MIT

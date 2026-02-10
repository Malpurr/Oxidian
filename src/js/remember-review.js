// remember-review.js — Spaced Repetition Engine + Review UI
// Oxidian Knowledge Retention System

const { invoke } = window.__TAURI__.core;

/**
 * SM-2 Algorithm Implementation
 */
function sm2(quality, interval, ease) {
    // quality: 0=Again, 1=Hard, 2=Good, 3=Easy
    let newInterval = interval;
    let newEase = ease;

    if (quality < 2) {
        // Failed — reset interval, keep ease
        newInterval = 1;
    } else {
        // Passed
        if (interval === 0) {
            newInterval = 1;
        } else if (interval === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(interval * ease);
        }
    }

    // Update ease factor
    newEase = ease + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
    newEase = Math.max(1.3, newEase);

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    const nextReviewStr = nextReview.toISOString().split('T')[0];

    return {
        interval: newInterval,
        ease: Math.round(newEase * 100) / 100,
        next_review: nextReviewStr,
        last_review: new Date().toISOString().split('T')[0]
    };
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { frontmatter: {}, body: content };

    const fm = {};
    const lines = match[1].split('\n');
    for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();
        // Parse arrays like [a, b, c]
        if (val.startsWith('[') && val.endsWith(']')) {
            val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        } else if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        } else if (!isNaN(Number(val)) && val !== '') {
            val = Number(val);
        }
        fm[key] = val;
    }
    return { frontmatter: fm, body: match[2] };
}

/**
 * Serialize frontmatter back to YAML string
 */
function serializeFrontmatter(fm, body) {
    let yaml = '---\n';
    for (const [key, val] of Object.entries(fm)) {
        if (Array.isArray(val)) {
            yaml += `${key}: [${val.map(v => v.includes(' ') ? `"${v}"` : v).join(', ')}]\n`;
        } else if (typeof val === 'string' && (val.includes(':') || val.includes('#') || val.startsWith('['))) {
            yaml += `${key}: "${val}"\n`;
        } else {
            yaml += `${key}: ${val}\n`;
        }
    }
    yaml += '---\n';
    return yaml + body;
}

/**
 * Parse card body into front (question) and back (answer)
 * Convention: First heading = front, rest = back
 */
function parseCardBody(body) {
    const lines = body.split('\n');
    let front = '';
    let back = '';
    let pastFirstHeading = false;
    let foundHeading = false;

    for (const line of lines) {
        if (!foundHeading && line.startsWith('#')) {
            front = line.replace(/^#+\s*/, '').trim();
            foundHeading = true;
            pastFirstHeading = true;
            continue;
        }
        if (pastFirstHeading) {
            back += line + '\n';
        }
    }

    back = back.trim();
    if (!front && !back) {
        // Fallback: first line = front, rest = back
        front = lines[0] || '(empty card)';
        back = lines.slice(1).join('\n').trim();
    }

    return { front, back: back || '(no answer)' };
}

/**
 * Get all due cards from Cards/ folder
 */
async function getDueCards(app) {
    const today = new Date().toISOString().split('T')[0];
    const dueCards = [];

    try {
        const tree = await invoke('list_files');
        const cardFiles = flattenTree(tree).filter(f => f.startsWith('Cards/') && f.endsWith('.md'));

        for (const path of cardFiles) {
            try {
                const content = await invoke('read_note', { path });
                const { frontmatter, body } = parseFrontmatter(content);

                if (frontmatter.type !== 'card') continue;

                const nextReview = frontmatter.next_review || '1970-01-01';
                if (nextReview > today) continue;

                const { front, back } = parseCardBody(body);
                dueCards.push({
                    path,
                    frontmatter,
                    body,
                    front,
                    back,
                    rawContent: content,
                    // For sorting: days overdue
                    overdueDays: Math.floor((new Date(today) - new Date(nextReview)) / 86400000),
                    ease: frontmatter.ease || 2.5
                });
            } catch (e) {
                console.warn(`[Remember] Failed to read card: ${path}`, e);
            }
        }

        // Sort: most overdue first, then lowest ease (hardest)
        dueCards.sort((a, b) => {
            if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
            return a.ease - b.ease;
        });
    } catch (e) {
        console.error('[Remember] Failed to get due cards:', e);
    }

    return dueCards;
}

/**
 * Flatten file tree to array of paths
 */
function flattenTree(tree, prefix = '') {
    const paths = [];
    if (!tree) return paths;
    for (const item of tree) {
        const p = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.children) {
            paths.push(...flattenTree(item.children, p));
        } else {
            paths.push(p);
        }
    }
    return paths;
}

/**
 * Update card frontmatter after review
 */
async function updateCardAfterReview(card, quality) {
    const interval = card.frontmatter.interval || 0;
    const ease = card.frontmatter.ease || 2.5;
    const reviewCount = (card.frontmatter.review_count || 0) + 1;

    const result = sm2(quality, interval, ease);

    const newFm = { ...card.frontmatter };
    newFm.interval = result.interval;
    newFm.ease = result.ease;
    newFm.next_review = result.next_review;
    newFm.last_review = result.last_review;
    newFm.review_count = reviewCount;

    const newContent = serializeFrontmatter(newFm, card.body);
    await invoke('save_note', { path: card.path, content: newContent });

    return result;
}

// ─── Review UI ───────────────────────────────────────────────────────

const QUALITY_LABELS = [
    { label: 'Again', quality: 0, color: '#e74c3c', key: '1' },
    { label: 'Hard',  quality: 1, color: '#e67e22', key: '2' },
    { label: 'Good',  quality: 2, color: '#27ae60', key: '3' },
    { label: 'Easy',  quality: 3, color: '#3498db', key: '4' },
];

class ReviewSession {
    constructor(app, cards) {
        this.app = app;
        this.cards = cards;
        this.currentIndex = 0;
        this.showingAnswer = false;
        this.results = { again: 0, hard: 0, good: 0, easy: 0 };
        this.container = null;
        this._keyHandler = null;
    }

    start() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error('[Remember] No #content-area found');
            return;
        }

        // Save existing content reference
        this._savedContent = contentArea.innerHTML;

        // Create review container
        this.container = document.createElement('div');
        this.container.className = 'remember-review-session';
        this.container.innerHTML = '';
        contentArea.innerHTML = '';
        contentArea.appendChild(this.container);

        // Keyboard shortcuts
        this._keyHandler = (e) => this._handleKey(e);
        document.addEventListener('keydown', this._keyHandler);

        this._renderCard();
    }

    _handleKey(e) {
        if (!this.showingAnswer) {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this._showAnswer();
            }
        } else {
            const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
            if (idx !== -1) {
                e.preventDefault();
                this._rate(idx);
            }
        }
    }

    _renderCard() {
        const card = this.cards[this.currentIndex];
        const total = this.cards.length;
        const num = this.currentIndex + 1;
        const pct = Math.round((this.currentIndex / total) * 100);

        this.container.innerHTML = `
            <div class="rr-progress">
                <div class="rr-progress-bar">
                    <div class="rr-progress-fill" style="width: ${pct}%"></div>
                </div>
                <span class="rr-progress-text">Karte ${num}/${total}</span>
            </div>
            <div class="rr-card">
                <div class="rr-card-front">
                    <div class="rr-card-label">FRAGE</div>
                    <div class="rr-card-content">${escapeHtml(card.front)}</div>
                </div>
                <div class="rr-card-back" style="display:none">
                    <div class="rr-card-label">ANTWORT</div>
                    <div class="rr-card-content rr-answer-content">${renderMarkdownSimple(card.back)}</div>
                </div>
                <div class="rr-actions">
                    ${this.showingAnswer ? this._renderRatingButtons() : `
                        <button class="rr-btn rr-btn-show" onclick="window._reviewSession._showAnswer()">
                            Antwort zeigen <span class="rr-shortcut">Space</span>
                        </button>
                    `}
                </div>
            </div>
            <div class="rr-card-meta">
                ${card.path.replace('Cards/', '').replace('.md', '')}
                ${card.overdueDays > 0 ? `<span class="rr-overdue">${card.overdueDays}d überfällig</span>` : ''}
            </div>
        `;

        this.showingAnswer = false;
    }

    _showAnswer() {
        this.showingAnswer = true;
        const backEl = this.container.querySelector('.rr-card-back');
        const actionsEl = this.container.querySelector('.rr-actions');
        if (backEl) backEl.style.display = 'block';
        if (actionsEl) actionsEl.innerHTML = this._renderRatingButtons();
    }

    _renderRatingButtons() {
        return QUALITY_LABELS.map(q => `
            <button class="rr-btn rr-btn-rate" style="background:${q.color}"
                    onclick="window._reviewSession._rate(${q.quality})">
                ${q.label} <span class="rr-shortcut">${q.key}</span>
            </button>
        `).join('');
    }

    async _rate(quality) {
        const card = this.cards[this.currentIndex];

        // Track result
        const labels = ['again', 'hard', 'good', 'easy'];
        this.results[labels[quality]]++;

        // Update card file
        try {
            await updateCardAfterReview(card, quality);
        } catch (e) {
            console.error('[Remember] Failed to update card:', e);
        }

        this.currentIndex++;
        if (this.currentIndex >= this.cards.length) {
            this._showSummary();
        } else {
            this._renderCard();
        }
    }

    _showSummary() {
        const total = this.cards.length;
        const { again, hard, good, easy } = this.results;

        this.container.innerHTML = `
            <div class="rr-summary">
                <div class="rr-summary-icon">🎉</div>
                <h2>Review abgeschlossen!</h2>
                <div class="rr-summary-total">${total} Karten reviewed</div>
                <div class="rr-summary-breakdown">
                    ${again ? `<div class="rr-stat" style="color:#e74c3c">Again: ${again}</div>` : ''}
                    ${hard ? `<div class="rr-stat" style="color:#e67e22">Hard: ${hard}</div>` : ''}
                    ${good ? `<div class="rr-stat" style="color:#27ae60">Good: ${good}</div>` : ''}
                    ${easy ? `<div class="rr-stat" style="color:#3498db">Easy: ${easy}</div>` : ''}
                </div>
                <button class="rr-btn rr-btn-show" onclick="window._reviewSession.close()">
                    Zurück
                </button>
            </div>
        `;

        // Cleanup keyboard handler
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    }

    close() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        window._reviewSession = null;

        // Restore content area
        const contentArea = document.getElementById('content-area');
        if (contentArea && this._savedContent) {
            contentArea.innerHTML = this._savedContent;
        }
    }
}

/**
 * Simple markdown rendering (bold, italic, quotes, code)
 */
function renderMarkdownSimple(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── CSS Injection ───────────────────────────────────────────────────

function injectReviewStyles() {
    if (document.getElementById('remember-review-styles')) return;
    const style = document.createElement('style');
    style.id = 'remember-review-styles';
    style.textContent = `
        .remember-review-session {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 2rem;
            font-family: var(--font-text, -apple-system, BlinkMacSystemFont, sans-serif);
            color: var(--text-normal, #dcddde);
            background: var(--background-primary, #1e1e1e);
        }

        .rr-progress {
            width: 100%;
            max-width: 600px;
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .rr-progress-bar {
            flex: 1;
            height: 6px;
            background: var(--background-modifier-border, #333);
            border-radius: 3px;
            overflow: hidden;
        }

        .rr-progress-fill {
            height: 100%;
            background: var(--interactive-accent, #7c3aed);
            border-radius: 3px;
            transition: width 0.3s ease;
        }

        .rr-progress-text {
            font-size: 0.85rem;
            color: var(--text-muted, #888);
            white-space: nowrap;
        }

        .rr-card {
            width: 100%;
            max-width: 600px;
            background: var(--background-secondary, #262626);
            border-radius: 12px;
            padding: 2.5rem 2rem;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }

        .rr-card-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-muted, #888);
            margin-bottom: 0.75rem;
        }

        .rr-card-front .rr-card-content {
            font-size: 1.4rem;
            font-weight: 600;
            line-height: 1.5;
        }

        .rr-card-back {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--background-modifier-border, #333);
        }

        .rr-answer-content {
            font-size: 1.1rem;
            line-height: 1.7;
        }

        .rr-answer-content blockquote {
            border-left: 3px solid var(--interactive-accent, #7c3aed);
            padding-left: 1rem;
            margin: 0.5rem 0;
            color: var(--text-muted, #aaa);
            font-style: italic;
        }

        .rr-answer-content code {
            background: var(--background-primary, #1e1e1e);
            padding: 0.15em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
        }

        .rr-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 2rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        .rr-btn {
            border: none;
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            color: #fff;
            transition: opacity 0.15s, transform 0.1s;
        }

        .rr-btn:hover {
            opacity: 0.85;
            transform: translateY(-1px);
        }

        .rr-btn:active {
            transform: translateY(0);
        }

        .rr-btn-show {
            background: var(--interactive-accent, #7c3aed);
            min-width: 200px;
        }

        .rr-btn-rate {
            min-width: 100px;
        }

        .rr-shortcut {
            font-size: 0.7rem;
            opacity: 0.6;
            margin-left: 0.3rem;
        }

        .rr-card-meta {
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: var(--text-faint, #666);
            text-align: center;
        }

        .rr-overdue {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            padding: 0.15em 0.5em;
            border-radius: 4px;
            margin-left: 0.5rem;
            font-size: 0.75rem;
        }

        .rr-summary {
            text-align: center;
        }

        .rr-summary-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .rr-summary h2 {
            margin: 0 0 0.5rem;
            font-size: 1.6rem;
        }

        .rr-summary-total {
            font-size: 1.1rem;
            color: var(--text-muted, #888);
            margin-bottom: 1.5rem;
        }

        .rr-summary-breakdown {
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }

        .rr-stat {
            font-size: 1.1rem;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Start a review session — called from dashboard or sidebar
 */
async function startReviewSession(app) {
    injectReviewStyles();

    const cards = await getDueCards(app);
    if (cards.length === 0) {
        // No cards due — show message in content area
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            const msg = document.createElement('div');
            msg.className = 'remember-review-session';
            msg.innerHTML = `
                <div class="rr-summary">
                    <div class="rr-summary-icon">✅</div>
                    <h2>Keine Karten fällig!</h2>
                    <div class="rr-summary-total">Alle Reviews sind erledigt. Komm später wieder.</div>
                </div>
            `;
            contentArea.innerHTML = '';
            contentArea.appendChild(msg);
        }
        return null;
    }

    const session = new ReviewSession(app, cards);
    window._reviewSession = session;
    session.start();
    return session;
}

// ─── Module Init ─────────────────────────────────────────────────────

function safeInitModule(name, factory) {
    try {
        return factory();
    } catch (err) {
        console.error(`[Remember] Failed to initialize "${name}":`, err);
        return null;
    }
}

const RememberReview = safeInitModule('RememberReview', () => {
    injectReviewStyles();
    console.log('[Remember] Review module loaded');
    return {
        sm2,
        getDueCards,
        startReviewSession,
        ReviewSession,
        updateCardAfterReview,
        parseFrontmatter,
        serializeFrontmatter,
    };
});

export default RememberReview;
export { sm2, getDueCards, startReviewSession, ReviewSession, updateCardAfterReview, parseFrontmatter, serializeFrontmatter };

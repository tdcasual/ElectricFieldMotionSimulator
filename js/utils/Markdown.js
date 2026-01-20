/**
 * Minimal, safe Markdown renderer (HTML escaped).
 * Supports: headings, lists, blockquotes, code blocks, inline code, bold/italic, links.
 */

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(text) {
    return escapeHtml(text).replace(/`/g, '&#96;');
}

function sanitizeUrl(url) {
    const raw = String(url ?? '').trim();
    if (!raw) return '#';
    const lowered = raw.toLowerCase();
    if (lowered.startsWith('javascript:')) return '#';
    if (lowered.startsWith('data:')) return '#';
    return raw;
}

function renderInline(raw) {
    const placeholders = [];
    const tokenFor = (html) => {
        const id = placeholders.length;
        placeholders.push(html);
        return `\u0000${id}\u0000`;
    };

    let text = String(raw ?? '');

    // Inline code
    text = text.replace(/`([^`]+)`/g, (_, code) => tokenFor(`<code>${escapeHtml(code)}</code>`));

    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
        const safeUrl = sanitizeUrl(url);
        const href = escapeHtmlAttr(safeUrl);
        const labelHtml = escapeHtml(label);
        return tokenFor(`<a href="${href}" target="_blank" rel="noopener noreferrer">${labelHtml}</a>`);
    });

    // Escape remaining text before formatting
    text = escapeHtml(text);

    // Bold / italic (simple)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Restore placeholders
    text = text.replace(/\u0000(\d+)\u0000/g, (_, id) => placeholders[Number(id)] ?? '');
    return text;
}

export function renderMarkdown(markdown) {
    const src = String(markdown ?? '').replace(/\r\n?/g, '\n');
    const lines = src.split('\n');

    let html = '';
    let inCodeBlock = false;
    let listType = null; // 'ul' | 'ol' | null

    const closeList = () => {
        if (!listType) return;
        html += `</${listType}>`;
        listType = null;
    };

    const openList = (type) => {
        if (listType === type) return;
        closeList();
        listType = type;
        html += `<${type}>`;
    };

    for (const line of lines) {
        const raw = String(line ?? '');
        const trimmed = raw.trimEnd();

        if (trimmed.startsWith('```')) {
            closeList();
            if (inCodeBlock) {
                html += '</code></pre>';
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
                html += '<pre><code>';
            }
            continue;
        }

        if (inCodeBlock) {
            html += `${escapeHtml(raw)}\n`;
            continue;
        }

        const t = trimmed.trim();
        if (!t) {
            closeList();
            continue;
        }

        const headingMatch = t.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            closeList();
            const level = headingMatch[1].length;
            html += `<h${level}>${renderInline(headingMatch[2])}</h${level}>`;
            continue;
        }

        if (/^(-|\*|\+)\s+/.test(t)) {
            openList('ul');
            html += `<li>${renderInline(t.replace(/^(-|\*|\+)\s+/, ''))}</li>`;
            continue;
        }

        if (/^\d+\.\s+/.test(t)) {
            openList('ol');
            html += `<li>${renderInline(t.replace(/^\d+\.\s+/, ''))}</li>`;
            continue;
        }

        if (/^>\s?/.test(t)) {
            closeList();
            html += `<blockquote>${renderInline(t.replace(/^>\s?/, ''))}</blockquote>`;
            continue;
        }

        closeList();
        html += `<p>${renderInline(t)}</p>`;
    }

    closeList();
    if (inCodeBlock) {
        html += '</code></pre>';
    }

    return html;
}


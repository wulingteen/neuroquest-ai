/**
 * Minimal YAML frontmatter parser (no external dependencies).
 *
 * Handles the subset of YAML used in roadmap `.md` files:
 *   - scalar values (strings, numbers, booleans)
 *   - nested maps (indented key: value)
 *   - sequences (indented - item)
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract and parse the YAML frontmatter block (between `---` delimiters)
 * from a markdown string.
 */
export function parseFrontmatter(src: string): Record<string, any> | null {
    const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    return parseYamlBlock(match[1]);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseYamlBlock(block: string): Record<string, any> {
    const lines = block.split(/\r?\n/);
    return parseMapping(lines, 0, 0).value;
}

/**
 * Parse a YAML mapping starting at `start` where every key line has
 * indentation >= `indent`.
 */
function parseMapping(
    lines: string[],
    start: number,
    indent: number,
): { value: Record<string, any>; next: number } {
    const obj: Record<string, any> = {};
    let i = start;
    while (i < lines.length) {
        const line = lines[i];
        // Skip blank lines and comments
        if (line.trim() === '' || line.trim().startsWith('#')) {
            i++;
            continue;
        }
        const lineIndent = line.search(/\S/);
        if (lineIndent < indent) break; // dedented → parent takes over

        const kvMatch = line.match(/^(\s*)(\S[^:]*):\s*(.*)$/);
        if (!kvMatch) {
            i++;
            continue;
        }
        const keyIndent = kvMatch[1].length;
        if (keyIndent < indent) break;
        if (keyIndent > indent) break; // deeper than expected → belongs to parent

        const key = kvMatch[2].trim();
        const inlineValue = kvMatch[3].trim();

        if (inlineValue) {
            // Inline scalar value
            obj[key] = parseScalar(inlineValue);
            i++;
        } else {
            // Value is on subsequent indented lines — could be a mapping or a list
            i++;
            if (i < lines.length) {
                const nextLine = lines[i];
                const nextTrimmed = nextLine.trim();
                const nextIndent = nextLine.search(/\S/);
                if (nextIndent > keyIndent && nextTrimmed.startsWith('- ')) {
                    // Sequence
                    const seq = parseSequence(lines, i, nextIndent);
                    obj[key] = seq.value;
                    i = seq.next;
                } else if (nextIndent > keyIndent && nextTrimmed !== '') {
                    // Nested mapping
                    const nested = parseMapping(lines, i, nextIndent);
                    obj[key] = nested.value;
                    i = nested.next;
                } else {
                    obj[key] = null;
                }
            } else {
                obj[key] = null;
            }
        }
    }
    return { value: obj, next: i };
}

/**
 * Parse a YAML sequence (lines starting with `- `) at the given indent.
 */
function parseSequence(
    lines: string[],
    start: number,
    indent: number,
): { value: any[]; next: number } {
    const arr: any[] = [];
    let i = start;
    while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === '' || line.trim().startsWith('#')) {
            i++;
            continue;
        }
        const lineIndent = line.search(/\S/);
        if (lineIndent < indent) break;
        const seqMatch = line.match(/^(\s*)- (.*)$/);
        if (!seqMatch || seqMatch[1].length !== indent) break;
        arr.push(parseScalar(seqMatch[2].trim()));
        i++;
    }
    return { value: arr, next: i };
}

/**
 * Convert a raw YAML scalar string to a JS value.
 * Handles quoted strings, booleans, numbers, and null.
 */
function parseScalar(raw: string): any {
    // Remove inline comments (not inside quotes)
    if (!raw.startsWith("'") && !raw.startsWith('"')) {
        const commentIdx = raw.indexOf(' #');
        if (commentIdx !== -1) raw = raw.slice(0, commentIdx).trim();
    }
    // Quoted strings
    if (
        (raw.startsWith("'") && raw.endsWith("'")) ||
        (raw.startsWith('"') && raw.endsWith('"'))
    ) {
        return raw.slice(1, -1);
    }
    // Booleans
    if (raw === 'true' || raw === 'True' || raw === 'TRUE') return true;
    if (raw === 'false' || raw === 'False' || raw === 'FALSE') return false;
    // Null
    if (raw === 'null' || raw === '~' || raw === '') return null;
    // Numbers
    if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
    if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
    return raw;
}

import React from 'react';

// ── Parse a markdown table into { headers, rows } ─────────────────────────────
export function parseMarkdownTable(markdown) {
  if (!markdown) return null;
  const lines = markdown.trim().split('\n').filter(l => l.trim());
  if (lines.length < 3) return null;
  const parseRow = (line) =>
    line.split('|').slice(1, -1).map(cell => cell.trim().replace(/\*\*/g, ''));
  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);
  return { headers, rows };
}

// ── Slice a markdown table to the first n data rows ───────────────────────────
export function sliceMarkdownTable(markdown, n) {
  if (!markdown) return markdown;
  const lines = markdown.trim().split('\n').filter(l => l.trim());
  if (lines.length < 3) return markdown;
  // lines[0] = header row, lines[1] = separator, lines[2+] = data rows
  return [lines[0], lines[1], ...lines.slice(2, 2 + n)].join('\n');
}

// ── Render a markdown table with optional bullet-column support ───────────────
export function AssessmentTable({ markdown, bulletCols = [], className = '' }) {
  const table = parseMarkdownTable(markdown);
  if (!table) return null;
  return (
    <div style={{ overflowX: 'auto' }} className={`md-content ${className}`}>
      <table>
        <thead>
          <tr>{table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>
                  {bulletCols.includes(ci) ? (
                    <ul style={{ paddingLeft: '16px', margin: 0 }}>
                      {cell.split(' >> ').map(s => s.trim()).filter(Boolean).map((item, ii) => (
                        <li key={ii} style={{ marginBottom: '5px', lineHeight: '1.5', fontSize: '14px' }}>{item}</li>
                      ))}
                    </ul>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

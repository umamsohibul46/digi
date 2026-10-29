import React, { useState } from 'react';
import { ZoomIn, X } from 'lucide-react';

interface QuestionContentRendererProps {
  content: string;
  imageUrl?: string;
  isDarkMode?: boolean;
  compact?: boolean;
}

interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

interface CodeBlock {
  type: 'code';
  code: string;
}

interface TextBlock {
  type: 'text';
  text: string;
}

interface ImageBlock {
  type: 'image';
  alt: string;
  url: string;
}

type ParsedBlock = TableBlock | CodeBlock | TextBlock | ImageBlock;

export const QuestionContentRenderer: React.FC<QuestionContentRendererProps> = ({
  content = '',
  imageUrl,
  isDarkMode = false,
  compact = false,
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomedImgUrl, setZoomedImgUrl] = useState<string | null>(null);

  // Helper to detect if a line is part of a table
  const isTableLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Pipe table: contains | and at least 2 cells
    if (trimmed.includes('|') && trimmed.split('|').filter(Boolean).length >= 2) return true;
    // Markdown table separator line
    if (/^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(trimmed)) return true;
    // Tab-separated table: contains \t
    if (trimmed.includes('\t') && trimmed.split('\t').map(s => s.trim()).filter(Boolean).length >= 2) return true;
    // Multi-column spaced line (at least 2 consecutive spaces separating 3+ words, e.g. "Jepit Pita   Pink   4   Rambut   Rp 15.000")
    const spaceCols = trimmed.split(/\s{2,}|\t/).map(s => s.trim()).filter(Boolean);
    if (spaceCols.length >= 3) return true;
    return false;
  };

  const parseLineToCells = (line: string): string[] => {
    const trimmed = line.trim();
    if (trimmed.includes('|')) {
      return trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
    }
    if (trimmed.includes('\t')) {
      return trimmed.split('\t').map((c) => c.trim()).filter(Boolean);
    }
    // Multiple spaces
    return trimmed.split(/\s{2,}|\t/).map((c) => c.trim()).filter(Boolean);
  };

  const isSeparatorLine = (line: string): boolean => {
    return /^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(line.trim());
  };

  // Parse content into blocks
  const blocks: ParsedBlock[] = [];
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const currentLine = lines[i];

    // Check code fence (e.g. ```)
    if (currentLine.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', code: codeLines.join('\n') });
      continue;
    }

    // Check markdown image: ![alt](url)
    const imgMatch = currentLine.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({ type: 'image', alt: imgMatch[1], url: imgMatch[2] });
      i++;
      continue;
    }

    // Check if table block starts
    if (isTableLine(currentLine)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = parseLineToCells(tableLines[0]);
        const bodyRows: string[][] = [];
        for (let t = 1; t < tableLines.length; t++) {
          if (isSeparatorLine(tableLines[t])) continue;
          const cells = parseLineToCells(tableLines[t]);
          if (cells.length > 0) {
            bodyRows.push(cells);
          }
        }
        if (bodyRows.length > 0) {
          blocks.push({
            type: 'table',
            headers: headerCells,
            rows: bodyRows,
          });
          continue;
        }
      } else {
        // Only 1 line matched table criteria, treat as regular text
        blocks.push({ type: 'text', text: tableLines[0] });
        continue;
      }
    }

    // Regular line / text paragraph
    const textBuffer: string[] = [currentLine];
    i++;
    while (
      i < lines.length &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().match(/^!\[(.*?)\]\((.*?)\)$/) &&
      !isTableLine(lines[i])
    ) {
      textBuffer.push(lines[i]);
      i++;
    }

    const joinedText = textBuffer.join('\n').trim();
    if (joinedText) {
      blocks.push({ type: 'text', text: joinedText });
    }
  }

  // Handle image zoom
  const handleOpenZoom = (url: string) => {
    setZoomedImgUrl(url);
    setIsZoomOpen(true);
  };

  return (
    <div className={`space-y-3.5 ${compact ? 'text-xs' : 'text-sm sm:text-base'}`}>
      {/* Attached image if present */}
      {imageUrl && (
        <div className="relative group max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-950/20 my-2">
          <img
            src={imageUrl}
            alt="Ilustrasi Soal"
            className="w-full max-h-72 object-contain rounded-2xl bg-white/5 transition-transform duration-200 group-hover:scale-[1.01]"
          />
          <button
            type="button"
            onClick={() => handleOpenZoom(imageUrl)}
            className="absolute top-2 right-2 px-2.5 py-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Perbesar gambar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Perbesar</span>
          </button>
        </div>
      )}

      {/* Render Parsed Blocks */}
      {blocks.map((block, idx) => {
        if (block.type === 'text') {
          return (
            <div
              key={idx}
              className={`leading-relaxed whitespace-pre-line ${
                isDarkMode ? 'text-slate-100' : 'text-slate-800'
              }`}
            >
              {block.text}
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={idx}
              className={`my-3 overflow-x-auto rounded-xl border shadow-xs ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-900/90 shadow-slate-950/50'
                  : 'border-slate-300 bg-white shadow-slate-200/50'
              }`}
            >
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr
                    className={`${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-200 border-b border-slate-700'
                        : 'bg-slate-100 text-slate-800 border-b border-slate-300'
                    }`}
                  >
                    {block.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 font-bold tracking-wide border-r last:border-r-0 border-inherit whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`transition-colors ${
                        rIdx % 2 === 1
                          ? isDarkMode
                            ? 'bg-slate-800/40'
                            : 'bg-slate-50/70'
                          : 'bg-transparent'
                      } ${
                        isDarkMode
                          ? 'hover:bg-slate-700/50 text-slate-200 border-slate-700'
                          : 'hover:bg-blue-50/50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2 border-r last:border-r-0 border-inherit tabular-nums"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'code') {
          return (
            <div
              key={idx}
              className="my-3 p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner whitespace-pre leading-relaxed"
            >
              {block.code}
            </div>
          );
        }

        if (block.type === 'image') {
          return (
            <div key={idx} className="my-2.5 max-w-md">
              <img
                src={block.url}
                alt={block.alt || 'Gambar soal'}
                className="rounded-xl border border-slate-300 dark:border-slate-700 max-h-64 object-contain cursor-pointer"
                onClick={() => handleOpenZoom(block.url)}
              />
              {block.alt && (
                <div className="text-[11px] text-slate-500 mt-1 italic">{block.alt}</div>
              )}
            </div>
          );
        }

        return null;
      })}

      {/* Lightbox / Zoom Modal */}
      {isZoomOpen && zoomedImgUrl && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-lg font-bold hover:bg-slate-200 cursor-pointer"
              title="Tutup gambar"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImgUrl}
              alt="Perbesar gambar soal"
              className="max-h-[85vh] max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

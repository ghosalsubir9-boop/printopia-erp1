/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Typography } from '@mui/material';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
}

export function BarcodeGenerator({ value, width = 200, height = 50 }: BarcodeProps) {
  // Simple deterministic barcode generation (Code 39 simplified representation)
  // Convert characters to a pattern of thin (1px) and thick (3px) bars
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const seed = hashString(value);
  const bars: { x: number; w: number }[] = [];
  let currentX = 10;
  
  // Guard borders
  bars.push({ x: currentX, w: 1.5 }); currentX += 3.5;
  bars.push({ x: currentX, w: 1.5 }); currentX += 3.5;

  // Generate middle bars based on character hash
  for (let i = 0; i < 24; i++) {
    const isBar = (seed >> i) & 1;
    if (isBar) {
      const isThick = (seed >> (i + 1)) & 1;
      const w = isThick ? 3.5 : 1.5;
      bars.push({ x: currentX, w });
      currentX += w + 2;
    } else {
      currentX += 3;
    }
  }

  // Guard borders
  bars.push({ x: currentX, w: 1.5 }); currentX += 3.5;
  bars.push({ x: currentX, w: 1.5 }); currentX += 3.5;

  const totalWidth = currentX + 10;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ background: 'white' }}
      >
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={2}
            width={bar.w}
            height={height - 10}
            fill="black"
          />
        ))}
      </svg>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mt: 0.5, letterSpacing: 2, color: 'black' }}>
        {value}
      </Typography>
    </Box>
  );
}

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCodeGenerator({ value, size = 100 }: QRCodeProps) {
  // Standard QR code layout with 3 locator finder patterns
  // Matrix size: 21x21 (Version 1)
  const matrixSize = 21;
  const qrGrid: boolean[][] = Array(matrixSize).fill(null).map(() => Array(matrixSize).fill(false));

  // 1. Draw locator finder patterns (7x7 at (0,0), (14,0), (0,14))
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        qrGrid[row + r][col + c] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // 2. Draw timing lines
  for (let i = 8; i < 13; i++) {
    qrGrid[6][i] = i % 2 === 0;
    qrGrid[i][6] = i % 2 === 0;
  }

  // 3. Populate other areas deterministically based on character codes
  let charIdx = 0;
  let bitIdx = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder patterns
      if (
        (r < 8 && c < 8) ||
        (r > 12 && c < 8) ||
        (r < 8 && c > 12)
      ) {
        continue;
      }
      
      const charCode = value.charCodeAt(charIdx % value.length) || 0xAC;
      const isPixel = ((charCode >> bitIdx) & 1) === 1;
      qrGrid[r][c] = isPixel;

      bitIdx = (bitIdx + 1) % 8;
      if (bitIdx === 0) {
        charIdx++;
      }
    }
  }

  // Draw SVG
  const cellSize = size / matrixSize;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: 'white', border: '1px solid #e2e8f0', padding: 4 }}>
        {qrGrid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) return null;
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx * cellSize}
                y={rIdx * cellSize}
                width={cellSize + 0.1} // overlap slightly to prevent sub-pixel gaps
                height={cellSize + 0.1}
                fill="black"
              />
            );
          })
        )}
      </svg>
    </Box>
  );
}

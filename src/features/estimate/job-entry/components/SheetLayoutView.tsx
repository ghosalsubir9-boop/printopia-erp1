/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { LayoutData } from '../types';

interface SheetLayoutViewProps {
  layout: LayoutData;
  type: 'Parent' | 'Machine';
  title?: string;
}

export const SheetLayoutView = ({ layout, type, title }: SheetLayoutViewProps) => {
  const {
    parentSheetWidth, parentSheetHeight,
    machineSheetWidth, machineSheetHeight,
    productWidth, productHeight,
    across, down,
    gripperMargin, sideMargin, tailMargin,
    cuttingMethod, numMachineSheets
  } = layout;

  // Scaling factor to fit the preview in a reasonable container
  const containerWidth = 500;
  const containerHeight = 400;

  const sheetW = type === 'Parent' ? parentSheetWidth : machineSheetWidth;
  const sheetH = type === 'Parent' ? parentSheetHeight : machineSheetHeight;

  // Calculate scaling to fill approx 75-80% of container while preserving aspect ratio
  const padding = 60;
  const availableW = containerWidth - padding;
  const availableH = containerHeight - padding;
  
  const scale = Math.min(availableW / sheetW, availableH / sheetH);
  
  const drawW = sheetW * scale;
  const drawH = sheetH * scale;

  // Center the sheet in the SVG
  const offsetX = (containerWidth - drawW) / 2;
  const offsetY = (containerHeight - drawH) / 2;

  // Margin offsets in drawing units
  const gMargin = gripperMargin * scale;
  const sMargin = sideMargin * scale;
  const tMargin = tailMargin * scale;
  const pW = productWidth * scale;
  const pH = productHeight * scale;

  // Printable area dimensions
  const printW = (machineSheetWidth - (sideMargin * 2)) * scale;
  const printH = (machineSheetHeight - gripperMargin - tailMargin) * scale;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1, width: '100%' }}>
      {title && <Typography variant="subtitle2" gutterBottom color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>}
      
      <svg width={containerWidth} height={containerHeight} viewBox={`0 0 ${containerWidth} ${containerHeight}`} style={{ backgroundColor: '#fcfcfc', borderRadius: '8px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}>
        <defs>
          <pattern id="gripperHatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#ef5350" strokeWidth="1" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>

        {/* Printing Direction Arrow (Right Side) */}
        {type === 'Machine' && (
          <g transform={`translate(${offsetX + drawW + 25}, ${offsetY + drawH / 2})`}>
            <line x1="0" y1="-30" x2="0" y2="30" stroke="#666" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
            <text x="8" y="0" fontSize="10" fontWeight="600" fill="#666" transform="rotate(90, 8, 0)" textAnchor="middle">PRINT FEED</text>
          </g>
        )}

        {/* Main Sheet Shadow */}
        <rect
          x={offsetX + 3} y={offsetY + 3}
          width={drawW} height={drawH}
          fill="rgba(0,0,0,0.1)"
          rx="2"
        />

        {/* Main Sheet */}
        <rect
          x={offsetX} y={offsetY}
          width={drawW} height={drawH}
          fill="white"
          stroke="#444"
          strokeWidth="1.5"
          rx="2"
        />

        {type === 'Machine' ? (
          <>
            {/* Gripper Area (Leading Edge) */}
            <rect
              x={offsetX + sMargin} y={offsetY}
              width={printW} height={gMargin}
              fill="url(#gripperHatch)"
              opacity="0.4"
            />
            <text x={offsetX + drawW / 2} y={offsetY + gMargin / 2 + 4} fontSize="10" fontWeight="700" textAnchor="middle" fill="#c62828" style={{ pointerEvents: 'none', textTransform: 'uppercase' }}>Gripper ({gripperMargin}mm)</text>

            {/* Tail Margin */}
            <rect
              x={offsetX + sMargin} y={offsetY + gMargin + printH}
              width={printW} height={tMargin}
              fill="#ffebee"
              opacity="0.6"
              stroke="#ef9a9a"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
            <text x={offsetX + drawW / 2} y={offsetY + drawH - tMargin / 2 + 4} fontSize="9" textAnchor="middle" fill="#c62828" opacity="0.8">Tail ({tailMargin}mm)</text>

            {/* Side Margins */}
            <rect x={offsetX} y={offsetY} width={sMargin} height={drawH} fill="#eee" opacity="0.5" />
            <rect x={offsetX + sMargin + printW} y={offsetY} width={sMargin} height={drawH} fill="#eee" opacity="0.5" />
            <text x={offsetX + sMargin / 2} y={offsetY + drawH / 2} fontSize="8" textAnchor="middle" transform={`rotate(-90, ${offsetX + sMargin / 2}, ${offsetY + drawH / 2})`} fill="#777">Side Margin</text>

            {/* Printable Area Boundary */}
            <rect
              x={offsetX + sMargin} y={offsetY + gMargin}
              width={printW} height={printH}
              fill="none"
              stroke="#2196f3"
              strokeDasharray="5 3"
              strokeWidth="1"
            />

            {/* Product Blocks - Grid Arrangement */}
            {Array.from({ length: down }).map((_, j) => (
              Array.from({ length: across }).map((_, i) => {
                const itemIndex = j * across + i + 1;
                return (
                  <Tooltip key={`${i}-${j}`} title={`UPS ${itemIndex}: ${productWidth}mm x ${productHeight}mm`}>
                    <g transform={`translate(${offsetX + sMargin + i * pW}, ${offsetY + gMargin + j * pH})`}>
                      <rect
                        width={pW} height={pH}
                        fill="#e3f2fd"
                        stroke="#1976d2"
                        strokeWidth="1.2"
                      />
                      {/* Product Dimension Labels */}
                      {pW > 40 && pH > 30 && (
                        <>
                          <text x={pW / 2} y={pH / 2 - 4} fontSize="11" fontWeight="700" textAnchor="middle" fill="#1565c0">{itemIndex}</text>
                          <text x={pW / 2} y={pH / 2 + 10} fontSize="8" textAnchor="middle" fill="#1976d2" opacity="0.8">{productWidth}x{productHeight}</text>
                        </>
                      )}
                      {/* Small size fallback */}
                      {(pW <= 40 || pH <= 30) && (
                        <text x={pW / 2} y={pH / 2 + 4} fontSize="9" fontWeight="700" textAnchor="middle" fill="#1565c0">{itemIndex}</text>
                      )}
                    </g>
                  </Tooltip>
                );
              })
            ))}
          </>
        ) : (
          <>
            {/* Parent Sheet Divisions - Cutting Visualization */}
            <g>
              {cuttingMethod === '1:2' && (
                <line x1={offsetX + drawW / 2} y1={offsetY} x2={offsetX + drawW / 2} y2={offsetY + drawH} stroke="#d32f2f" strokeWidth="2" strokeDasharray="8 4" />
              )}
              {cuttingMethod === '1:3' && (
                <>
                  <line x1={offsetX + drawW / 3} y1={offsetY} x2={offsetX + drawW / 3} y2={offsetY + drawH} stroke="#d32f2f" strokeWidth="2" strokeDasharray="8 4" />
                  <line x1={offsetX + (drawW * 2) / 3} y1={offsetY} x2={offsetX + (drawW * 2) / 3} y2={offsetY + drawH} stroke="#d32f2f" strokeWidth="2" strokeDasharray="8 4" />
                </>
              )}
              {cuttingMethod === '1:4' && (
                <>
                  <line x1={offsetX + drawW / 2} y1={offsetY} x2={offsetX + drawW / 2} y2={offsetY + drawH} stroke="#d32f2f" strokeWidth="2" strokeDasharray="8 4" />
                  <line x1={offsetX} y1={offsetY + drawH / 2} x2={offsetX + drawW} y2={offsetY + drawH / 2} stroke="#d32f2f" strokeWidth="2" strokeDasharray="8 4" />
                </>
              )}
              {cuttingMethod === 'Custom' && numMachineSheets > 1 && (
                Array.from({ length: numMachineSheets - 1 }).map((_, idx) => (
                  <line 
                    key={idx}
                    x1={offsetX + (drawW * (idx + 1)) / numMachineSheets} 
                    y1={offsetY} 
                    x2={offsetX + (drawW * (idx + 1)) / numMachineSheets} 
                    y2={offsetY + drawH} 
                    stroke="#d32f2f" strokeWidth="1.5" strokeDasharray="6 3" 
                  />
                ))
              )}
            </g>
            <rect
               x={offsetX + drawW / 2 - 80}
               y={offsetY + drawH / 2 - 15}
               width={160}
               height={30}
               fill="white"
               stroke="#ddd"
               rx="4"
            />
            <text x={offsetX + drawW / 2} y={offsetY + drawH / 2 + 5} fontSize="11" fontWeight="700" textAnchor="middle" fill="#555">
              {numMachineSheets} × {machineSheetWidth}x{machineSheetHeight}mm
            </text>
          </>
        )}
      </svg>
      
      <Box sx={{ mt: 2, textAlign: 'center', bgcolor: 'action.hover', p: 1, borderRadius: 1, width: '100%', maxWidth: containerWidth }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block' }}>
          {type === 'Parent' ? 'Parent Sheet: ' : 'Machine Sheet: '} 
          {sheetW}mm x {sheetH}mm 
          {type === 'Machine' && ` | Total UPS: ${layout.machineUps}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
           Printable Area: {(machineSheetWidth - (sideMargin * 2)).toFixed(1)} x {(machineSheetHeight - gripperMargin - tailMargin).toFixed(1)} mm
        </Typography>
      </Box>
    </Box>
  );
};

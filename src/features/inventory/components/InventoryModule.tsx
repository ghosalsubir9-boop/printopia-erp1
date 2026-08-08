/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  IconButton,
  Collapse,
  Button
} from '@mui/material';
import {
  LayoutDashboard,
  Layers,
  Database,
  Droplets,
  Package,
  Boxes,
  FileText,
  Sliders,
  AlertTriangle,
  Menu as MenuIcon
} from 'lucide-react';
import { InventoryApiService } from '../services/api';
import StockDashboard from './StockDashboard';
import StockLists from './StockLists';
import StockLedgerView from './StockLedgerView';
import LowStockAlerts from './LowStockAlerts';
import MaterialIssueForm from './MaterialIssueForm';
import StockAdjustmentForm from './StockAdjustmentForm';

export default function InventoryModule() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  
  // Dialog controls
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueType, setIssueType] = useState<'Paper' | 'Plate'>('Paper');
  const [issueItemId, setIssueItemId] = useState<string>('');

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustItemId, setAdjustItemId] = useState<string>('');

  // Mobile menu control
  const [menuOpen, setMenuOpen] = useState(true);

  useEffect(() => {
    loadAlertCount();
  }, []);

  const loadAlertCount = async () => {
    try {
      const all = await InventoryApiService.getInventoryItems();
      const low = all.filter((i) => i.availableStock <= i.minimumStock);
      setLowStockCount(low.length);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefresh = () => {
    loadAlertCount();
    // Re-trigger states inside active panels
    const current = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(current), 50);
  };

  const handleOpenIssue = (type: 'Paper' | 'Plate', itemId = '') => {
    setIssueType(type);
    setIssueItemId(itemId);
    setIssueDialogOpen(true);
  };

  const handleOpenIssueFromItem = async (itemId: string) => {
    try {
      const items = await InventoryApiService.getInventoryItems();
      const target = items.find((i) => i.id === itemId);
      if (target && (target.materialType === 'Paper' || target.materialType === 'Plate')) {
        handleOpenIssue(target.materialType, itemId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdjustFromItem = (itemId: string) => {
    setAdjustItemId(itemId);
    setAdjustDialogOpen(true);
  };

  const navigationItems = [
    { id: 'dashboard', text: 'Stock Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'paper', text: 'Paper Stock', icon: <Layers size={18} /> },
    { id: 'plate', text: 'Plate Stock', icon: <Database size={18} /> },
    { id: 'ink', text: 'Ink Stock', icon: <Droplets size={18} /> },
    { id: 'chemical', text: 'Chemical Stock', icon: <Boxes size={18} /> },
    { id: 'packing', text: 'Packing Material Stock', icon: <Package size={18} /> },
    { id: 'ledger', text: 'Stock Ledger', icon: <FileText size={18} /> },
    { id: 'adjustment', text: 'Stock Adjustment', icon: <Sliders size={18} /> },
    { id: 'low-stock', text: 'Low Stock Alert', icon: <AlertTriangle size={18} />, badge: lowStockCount }
  ];

  return (
    <Box>
      {/* Mobile submenu toggle button */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
        <ListItemButton onClick={() => setMenuOpen(!menuOpen)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper' }}>
          <MenuIcon size={18} style={{ marginRight: 8 }} />
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {menuOpen ? 'Hide Submenu' : 'Show Submenu'}
          </Typography>
        </ListItemButton>
      </Box>

      <Grid container spacing={3}>
        {/* Sub-navigation Sidebar Menu Pane */}
        <Collapse in={menuOpen} orientation="vertical" sx={{ display: { xs: 'block', md: 'block' }, width: { xs: '100%', md: '240px' } }}>
          <Grid size="auto" sx={{ width: '240px', pr: { md: 2.5 } }}>
            <Paper variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper', overflow: 'hidden' }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', tracking: '0.5px', fontSize: '0.725rem' }}>
                  Inventory Control
                </Typography>
              </Box>
              <Divider />
              <List sx={{ py: 0.75 }}>
                {navigationItems.map((item) => (
                  <ListItem key={item.id} disablePadding sx={{ px: 1, py: 0.25 }}>
                    <ListItemButton
                      selected={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      sx={{
                        borderRadius: '8px',
                        py: 0.8,
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          fontWeight: 'bold',
                          '& .MuiListItemIcon-root': { color: 'primary.dark' },
                          '&:hover': { bgcolor: 'primary.light' }
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: activeTab === item.id ? 'primary.dark' : 'text.secondary' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: activeTab === item.id ? 700 : 500 }}>
                            {item.text}
                          </Typography>
                        }
                      />
                      {item.badge !== undefined && item.badge > 0 && (
                        <Chip
                          label={item.badge}
                          size="small"
                          color="error"
                          sx={{ height: 18, minWidth: 18, fontSize: '0.6rem', fontWeight: 'bold' }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Collapse>

        {/* Content Pane */}
        <Grid size={{ xs: 12, md: 9 }} sx={{ minWidth: 0 }}>
          {activeTab === 'dashboard' && (
            <StockDashboard
              onNavigate={(tabId) => setActiveTab(tabId)}
              onOpenIssue={(type) => handleOpenIssue(type)}
            />
          )}

          {activeTab === 'paper' && (
            <StockLists
              category="Paper"
              onOpenIssue={handleOpenIssueFromItem}
              onOpenAdjustment={handleOpenAdjustFromItem}
            />
          )}

          {activeTab === 'plate' && (
            <StockLists
              category="Plate"
              onOpenIssue={handleOpenIssueFromItem}
              onOpenAdjustment={handleOpenAdjustFromItem}
            />
          )}

          {activeTab === 'ink' && (
            <StockLists
              category="Ink"
              onOpenIssue={handleOpenIssueFromItem}
              onOpenAdjustment={handleOpenAdjustFromItem}
            />
          )}

          {activeTab === 'chemical' && (
            <StockLists
              category="Chemical"
              onOpenIssue={handleOpenIssueFromItem}
              onOpenAdjustment={handleOpenAdjustFromItem}
            />
          )}

          {activeTab === 'packing' && (
            <StockLists
              category="Packing"
              onOpenIssue={handleOpenIssueFromItem}
              onOpenAdjustment={handleOpenAdjustFromItem}
            />
          )}

          {activeTab === 'ledger' && <StockLedgerView />}

          {activeTab === 'adjustment' && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Stock Adjustments Control
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manual adjustment center for adding or deducting items from stocks. Requires administrative credentials.
                </Typography>
              </Box>
              <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Administrative Stock Correction Terminal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
                    Click the button below to initiate a formal stock adjustment record. Discrepancies logged here are permanently cataloged in the Material Stock Ledger.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Sliders size={16} />}
                    onClick={() => handleOpenAdjustFromItem('')}
                    sx={{ borderRadius: '8px', fontWeight: 'bold', boxShadow: 'none' }}
                  >
                    Open Adjustment Tool
                  </Button>
                </CardContent>
              </Card>
            </Box>
          )}

          {activeTab === 'low-stock' && <LowStockAlerts />}
        </Grid>
      </Grid>

      {/* Material Issue Dialog */}
      <MaterialIssueForm
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        onSuccess={handleRefresh}
        initialType={issueType}
        initialItemId={issueItemId}
      />

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentForm
        open={adjustDialogOpen}
        onClose={() => setAdjustDialogOpen(false)}
        onSuccess={handleRefresh}
        initialItemId={adjustItemId}
      />
    </Box>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Collapse,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  useMediaQuery,
  CssBaseline,
  Tooltip,
  Alert,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  LocalPrintshop as LogoIcon,
  Build as BuildIcon,
  Calculate as CalcIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Dashboard as DashboardIcon,
  VerifiedUser as UserIcon,
  Sync as SyncIcon,
  PowerSettingsNew as PowerIcon,
  Layers as LayersIcon,
  ExpandLess,
  ExpandMore,
  Folder as FolderIcon,
  Summarize,
  AccountBalance as BankIcon,
  AdminPanelSettings as AdminIcon,
  MeetingRoom as SupportIcon
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthService } from '../../../services/authService';
import { TenantService } from '../../../services/TenantService';

const DRAWER_WIDTH = 210;

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeModule?: string;
  onModuleChange?: (module: any) => void;
  onLogout?: () => void;
}

export default function DashboardLayout({ children, activeModule = 'machines', onModuleChange, onLogout }: DashboardLayoutProps) {
  const currentUser = AuthService.getCurrentUser();
  const tenants = TenantService.getAllTenants();
  const currentCompanyId = AuthService.getCurrentCompanyId();
  const currentTenant = currentCompanyId ? TenantService.getTenantById(currentCompanyId) : null;

  const handleLogout = () => {
    handleMenuClose();
    AuthService.logout();
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  const handleExitSupportMode = () => {
    AuthService.setSupportTenant(null);
    window.location.reload();
  };

  // Light/Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('printopia_dark_mode');
    return saved === 'true';
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('printopia_dark_mode', String(next));
      return next;
    });
  };

  // Create custom MUI theme
  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
          main: '#2563eb',
          light: '#60a5fa',
          dark: '#1d4ed8'
        },
        secondary: {
          main: '#ec4899',
          light: '#f472b6',
          dark: '#db2777'
        },
        background: {
          default: darkMode ? '#0f172a' : '#f8fafc',
          paper: darkMode ? '#1e293b' : '#ffffff'
        },
        text: {
          primary: darkMode ? '#f1f5f9' : '#0f172a',
          secondary: darkMode ? '#94a3b8' : '#475569'
        },
        action: {
          hover: darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'
        }
      },
      typography: {
        fontFamily: '"Inter", "Helvetica Neue", sans-serif',
        h4: { fontWeight: 800 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 600 },
        body1: { fontSize: '0.925rem', lineHeight: 1.5 },
        body2: { fontSize: '0.85rem' },
        caption: { fontSize: '0.75rem' }
      },
      components: {
        MuiButton: { styleOverrides: { root: { borderRadius: '8px', textTransform: 'none', padding: '6px 16px' } } },
        MuiPaper: { styleOverrides: { root: { borderRadius: '12px' } } },
        MuiChip: { styleOverrides: { root: { borderRadius: '6px', fontWeight: 600 } } }
      }
    });
  }, [darkMode]);

  // Responsive state
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mastersExpanded, setMastersExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('printopia_masters_expanded');
    return saved === 'true';
  });

  const [salesExpanded, setSalesExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('printopia_sales_expanded');
    return saved === 'true';
  });

  const [purchaseExpanded, setPurchaseExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('printopia_purchase_expanded');
    return saved === 'true';
  });

  useEffect(() => {
    if (['customers', 'vendors', 'products', 'papers', 'machines'].includes(activeModule as string)) {
      setMastersExpanded(true);
    }
    if (['quotations', 'proforma-invoices', 'gst-invoices', 'payment-receipts', 'customer-outstanding', 'credit-notes'].includes(activeModule as string)) {
      setSalesExpanded(true);
    }
    if (['purchase-orders', 'grns', 'purchase-invoices', 'vendor-outstanding'].includes(activeModule as string)) {
      setPurchaseExpanded(true);
    }
  }, [activeModule]);

  const toggleMasters = () => {
    setMastersExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('printopia_masters_expanded', String(next));
      return next;
    });
  };

  const toggleSales = () => {
    setSalesExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('printopia_sales_expanded', String(next));
      return next;
    });
  };

  const togglePurchase = () => {
    setPurchaseExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('printopia_purchase_expanded', String(next));
      return next;
    });
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // User Profile Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Tenant Switcher Menu State
  const [tenantAnchorEl, setTenantAnchorEl] = useState<null | HTMLElement>(null);
  const handleTenantMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTenantAnchorEl(event.currentTarget);
  };
  const handleTenantMenuClose = () => {
    setTenantAnchorEl(null);
  };

  const handleSwitchTenant = (tenantId: string) => {
    handleTenantMenuClose();
    if (currentUser?.role === 'SUPER_ADMIN') {
      AuthService.setSupportTenant(tenantId);
      window.location.reload();
    }
  };

  // Navigation Links definition
  const mainNavItems = [
    ...(currentUser?.role === 'SUPER_ADMIN'
      ? [{ text: 'Super Admin', icon: <AdminIcon sx={{ color: '#ec4899' }} />, active: activeModule === 'super-admin', id: 'super-admin', tag: 'Global' }]
      : []),
    { text: 'Dashboard', icon: <DashboardIcon />, active: activeModule === 'dashboard', id: 'dashboard' },
    { text: 'Finance Foundation', icon: <BankIcon />, active: activeModule === 'finance', id: 'finance' },
    { text: 'Accounting Vouchers', icon: <ReceiptIcon />, active: activeModule === 'vouchers', id: 'vouchers', tag: 'New' },
    { text: 'Financial Reports', icon: <Summarize sx={{ color: 'primary.light' }} />, active: activeModule === 'financial-reports', id: 'financial-reports', tag: 'New' }
  ];

  const masterItems = [
    { text: 'Customer Master', icon: <UserIcon />, active: activeModule === 'customers', id: 'customers' },
    { text: 'Vendor Master', icon: <UserIcon />, active: activeModule === 'vendors', id: 'vendors' },
    { text: 'Product Master', icon: <LayersIcon />, active: activeModule === 'products', id: 'products' },
    { text: 'Paper Master', icon: <InventoryIcon />, active: activeModule === 'papers', id: 'papers' },
    { text: 'Machine Master', icon: <BuildIcon />, active: activeModule === 'machines', id: 'machines' },
    { text: 'Company Settings', icon: <SettingsIcon />, active: activeModule === 'company-settings', id: 'company-settings' }
  ];

  const workflowItems = [
    { text: 'Estimate', icon: <CalcIcon />, active: activeModule === 'estimates', id: 'estimates' },
    { text: 'Job Card', icon: <ReceiptIcon />, active: activeModule === 'job-cards', id: 'job-cards' as any },
    { text: 'Production', icon: <BuildIcon />, active: activeModule === 'production', id: 'production' as any },
    { text: 'Inventory', icon: <InventoryIcon />, active: activeModule === 'inventory', id: 'inventory' as any }
  ];

  const salesItems = [
    { text: 'Quotation', icon: <ReceiptIcon />, active: activeModule === 'quotations', id: 'quotations' },
    { text: 'Proforma Invoice', icon: <ReceiptIcon />, active: activeModule === 'proforma-invoices', id: 'proforma-invoices' },
    { text: 'GST Invoices', icon: <ReceiptIcon />, active: activeModule === 'gst-invoices', id: 'gst-invoices' },
    { text: 'Payment Receipts', icon: <ReceiptIcon />, active: activeModule === 'payment-receipts', id: 'payment-receipts' },
    { text: 'Customer Outstanding', icon: <ReceiptIcon />, active: activeModule === 'customer-outstanding', id: 'customer-outstanding' },
    { text: 'Credit Notes', icon: <ReceiptIcon />, active: activeModule === 'credit-notes', id: 'credit-notes' },
    { text: 'GST Reports', icon: <Summarize sx={{ color: 'secondary.light' }} />, active: activeModule === 'gst-reports', id: 'gst-reports', tag: 'New' }
  ];

  const purchaseItems = [
    { text: 'Purchase Orders', icon: <ReceiptIcon />, active: activeModule === 'purchase-orders', id: 'purchase-orders' },
    { text: 'Goods Receipt (GRN)', icon: <InventoryIcon />, active: activeModule === 'grns', id: 'grns' },
    { text: 'Purchase Invoice', icon: <ReceiptIcon />, active: activeModule === 'purchase-invoices', id: 'purchase-invoices', tag: 'New' },
    { text: 'Vendor Outstanding', icon: <ReceiptIcon />, active: activeModule === 'vendor-outstanding', id: 'vendor-outstanding', tag: 'New' }
  ];

  const renderNavItem = (item: any, isSubItem = false) => (
    <ListItem key={item.text} disablePadding>
      <Tooltip title={item.disabled ? `${item.text} is under development` : ''} placement="right">
        <Box sx={{ width: '100%' }}>
          <ListItemButton
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled && onModuleChange && item.id) {
                onModuleChange(item.id as any);
              }
            }}
            sx={{
              borderRadius: '8px',
              py: isSubItem ? 0.6 : 1,
              px: 2,
              pl: isSubItem ? 4 : 2,
              bgcolor: item.active ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
              color: item.active ? 'white' : 'inherit',
              '&.Mui-disabled': {
                opacity: 0.4,
                color: 'rgba(255, 255, 255, 0.25)'
              },
              '&:hover': {
                bgcolor: item.active ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: item.active ? 'white' : 'white'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: item.active ? 'primary.light' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" sx={{ fontSize: isSubItem ? '0.775rem' : '0.825rem', fontWeight: item.active ? 'bold' : 'medium' }}>
                  {item.text}
                </Typography>
              }
            />
            {item.tag && (
              <Chip
                label={item.tag}
                size="small"
                color={item.active ? 'primary' : 'default'}
                sx={{ height: 16, '& .MuiChip-label': { px: 0.8, fontSize: '0.6rem' } }}
              />
            )}
          </ListItemButton>
        </Box>
      </Tooltip>
    </ListItem>
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: darkMode ? '#0f172a' : '#1e293b', color: '#94a3b8' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: 2, display: 'flex' }}>
          <LogoIcon />
        </Box>
        <Box>
          <Typography variant="h6" color="white" sx={{ lineHeight: 1.1, fontSize: '1rem', letterSpacing: '-0.3px', fontWeight: 'bold' }}>
            Printopia ERP
          </Typography>
          <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem' }}>
            Multi-Tenant Node
          </Typography>
        </Box>
      </Box>

      {/* Navigation List */}
      <Box sx={{ flexGrow: 1, px: 1.5, py: 2, overflowY: 'auto' }}>
        <List sx={{ p: 0 }}>
          {mainNavItems.map((item) => renderNavItem(item))}

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={toggleMasters}
              sx={{
                borderRadius: '8px',
                py: 1,
                px: 2,
                color: 'inherit',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'white' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontSize: '0.825rem', fontWeight: 'bold' }}>Masters</Typography>}
              />
              {mastersExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          <Collapse in={mastersExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {masterItems.map((item) => renderNavItem(item, true))}
            </List>
          </Collapse>

          <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {renderNavItem(workflowItems[0])}

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={toggleSales}
              sx={{
                borderRadius: '8px',
                py: 1,
                px: 2,
                color: 'inherit',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'white' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontSize: '0.825rem', fontWeight: 'bold' }}>Sales & Billing</Typography>}
              />
              {salesExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          <Collapse in={salesExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {salesItems.map((item) => renderNavItem(item, true))}
            </List>
          </Collapse>

          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={togglePurchase}
              sx={{
                borderRadius: '8px',
                py: 1,
                px: 2,
                color: 'inherit',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'white' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontSize: '0.825rem', fontWeight: 'bold' }}>Purchase</Typography>}
              />
              {purchaseExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          <Collapse in={purchaseExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {purchaseItems.map((item) => renderNavItem(item, true))}
            </List>
          </Collapse>

          {workflowItems.slice(1).map((item) => renderNavItem(item))}
        </List>
      </Box>

      {/* Database Connection / System Footing */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)', bgcolor: 'rgba(0, 0, 0, 0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} />
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontFamily: 'monospace' }}>
            ISOLATED TENANT STORAGE
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', display: 'block', fontFamily: 'monospace', fontSize: '0.65rem' }}>
          Tenant: {currentTenant ? currentTenant.companyCode : 'Super Admin Global'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

        {/* APP BAR HEADER */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: 2, minHeight: '48px !important' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Title / Section Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '-0.2px', textTransform: 'uppercase', color: 'text.secondary' }}>
                {activeModule === 'super-admin'
                  ? 'Super Admin Control Center'
                  : activeModule === 'dashboard'
                  ? 'Home Dashboard'
                  : activeModule === 'proforma-invoices'
                  ? 'Proforma Invoices'
                  : activeModule === 'quotations'
                  ? 'Quotations Workflow'
                  : activeModule === 'estimates'
                  ? 'Estimate Engine'
                  : activeModule === 'customers'
                  ? 'Customer Master CRM'
                  : activeModule === 'vendors'
                  ? 'Vendor Master'
                  : activeModule === 'products'
                  ? 'Product Master'
                  : activeModule === 'papers'
                  ? 'Paper Master'
                  : activeModule === 'purchase-orders'
                  ? 'Purchase Orders'
                  : activeModule === 'grns'
                  ? 'Goods Receipt Note (GRN)'
                  : activeModule === 'inventory'
                  ? 'Inventory & Stock'
                  : activeModule === 'company-settings'
                  ? 'Company Settings & Staff Users'
                  : activeModule === 'finance'
                  ? 'Finance Foundation'
                  : 'Machine Master'}
              </Typography>
            </Box>

            {/* Quick Actions Header Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Active Tenant Display Chip */}
              <Tooltip title={currentUser?.role === 'SUPER_ADMIN' ? 'Click to inspect another client organization' : 'Current Active Organization'}>
                <Chip
                  icon={<LogoIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label={currentTenant ? currentTenant.companyName : 'SYSTEM SUPER ADMIN (GLOBAL)'}
                  onClick={currentUser?.role === 'SUPER_ADMIN' ? handleTenantMenuOpen : undefined}
                  color={currentUser?.role === 'SUPER_ADMIN' ? 'secondary' : 'primary'}
                  variant="outlined"
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.725rem',
                    cursor: currentUser?.role === 'SUPER_ADMIN' ? 'pointer' : 'default',
                    bgcolor: 'rgba(37, 99, 235, 0.08)',
                    maxWidth: { xs: 150, sm: 260 },
                    '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                  }}
                />
              </Tooltip>

              {currentUser?.role === 'SUPER_ADMIN' && (
                <Menu
                  id="tenant-switcher-menu"
                  anchorEl={tenantAnchorEl}
                  open={Boolean(tenantAnchorEl)}
                  onClose={handleTenantMenuClose}
                  slotProps={{ paper: { sx: { width: 300, mt: 1, borderRadius: 2, p: 1 } } }}
                >
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, fontWeight: 'bold', color: 'text.secondary', display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Inspect Client Organization
                  </Typography>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    selected={!currentCompanyId}
                    onClick={() => handleSwitchTenant('')}
                    sx={{ borderRadius: 1.5, my: 0.25 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      🌐 Global Super Admin View
                    </Typography>
                  </MenuItem>
                  {tenants.map((tenant) => {
                    const isSelected = tenant.id === currentCompanyId;
                    return (
                      <MenuItem
                        key={tenant.id}
                        selected={isSelected}
                        onClick={() => handleSwitchTenant(tenant.id)}
                        sx={{ borderRadius: 1.5, my: 0.25 }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: isSelected ? 'bold' : 'medium' }}>
                            {tenant.companyName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem' }}>
                            Code: {tenant.companyCode} • Status: {tenant.status}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Menu>
              )}

              {/* Light/Dark Mode Switcher */}
              <Tooltip title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}>
                <IconButton onClick={toggleDarkMode} color="inherit" size="small">
                  {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 0.5 }} />

              {/* User Profile avatar */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer' }} onClick={handleMenuOpen}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: currentUser?.role === 'SUPER_ADMIN' ? 'secondary.main' : 'primary.main', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {currentUser?.userName.split(' ').map((n) => n[0]).join('') || 'U'}
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left', lineHeight: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{currentUser?.userName || 'User'}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{currentUser?.role || 'Role'}</Typography>
                </Box>
              </Box>

              {/* Dropdown Menu */}
              <Menu
                id="user-profile-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                slotProps={{ paper: { sx: { width: 220, mt: 1, borderRadius: 2 } } }}
              >
                <MenuItem onClick={handleMenuClose} sx={{ gap: 1.5 }}>
                  <UserIcon fontSize="small" color="action" />
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Role: <strong>{currentUser?.role || 'Role'}</strong>
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: 'error.main' }}>
                  <PowerIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Log Out Session</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* SIDE DRAWER NAVIGATION */}
        <Box
          component="nav"
          sx={{ width: { md: DRAWER_WIDTH }, shrink: { md: 0 } }}
          aria-label="mailbox folders"
        >
          {/* Mobile Drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none' }
            }}
          >
            {drawerContent}
          </Drawer>

          {/* Desktop Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none' }
            }}
            open
          >
            {drawerContent}
          </Drawer>
        </Box>

        {/* MAIN BODY LAYOUT PANEL */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1.5, md: 2.5 },
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            mt: '48px',
            overflowX: 'hidden'
          }}
        >
          {/* Support Mode Warning Banner */}
          {currentUser?.role === 'SUPER_ADMIN' && currentUser.supportTenantId && (
            <Alert
              severity="warning"
              icon={<SupportIcon />}
              action={
                <Button color="inherit" size="small" variant="outlined" onClick={handleExitSupportMode} sx={{ fontWeight: 'bold' }}>
                  Exit Support Mode
                </Button>
              }
              sx={{ mb: 2, borderRadius: 2.5, fontWeight: 'bold' }}
            >
              Viewing: <strong>{currentTenant?.companyName}</strong> ({currentTenant?.companyCode || currentTenant?.id})
            </Alert>
          )}

          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

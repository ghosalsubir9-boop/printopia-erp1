/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
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
  Tooltip
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
  PowerSettingsNew as PowerIcon
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const DRAWER_WIDTH = 260;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
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

  // Create custom MUI theme with Inter and JetBrains Mono
  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
          main: '#2563eb', // Blue-600
          light: '#60a5fa',
          dark: '#1d4ed8'
        },
        secondary: {
          main: '#8b5cf6', // Violet-550
          light: '#a78bfa',
          dark: '#6d28d9'
        },
        background: {
          default: darkMode ? '#0f172a' : '#f8fafc', // Slate-900 / Slate-50
          paper: darkMode ? '#1e293b' : '#ffffff' // Slate-800 / White
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
        h4: {
          fontWeight: 800,
          fontFamily: '"Inter", sans-serif'
        },
        h5: {
          fontWeight: 700,
          fontFamily: '"Inter", sans-serif'
        },
        h6: {
          fontWeight: 700,
          fontFamily: '"Inter", sans-serif'
        },
        subtitle1: {
          fontWeight: 600
        },
        body1: {
          fontSize: '0.925rem',
          lineHeight: 1.5
        },
        body2: {
          fontSize: '0.85rem'
        },
        caption: {
          fontSize: '0.75rem'
        }
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: '8px',
              textTransform: 'none',
              padding: '6px 16px'
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: '12px'
            }
          }
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: '6px',
              fontWeight: 600
            }
          }
        }
      }
    });
  }, [darkMode]);

  // Responsive state
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Navigation Links definition
  const navItems = [
    { text: 'ERP Dashboard', icon: <DashboardIcon />, disabled: true, tag: 'Coming Soon' },
    { text: 'Machine Master (M-01)', icon: <BuildIcon />, active: true, tag: 'Active' },
    { text: 'Estimation Engine', icon: <CalcIcon />, disabled: true },
    { text: 'Paper Inventory', icon: <InventoryIcon />, disabled: true },
    { text: 'Job Ticketing (CTP)', icon: <ReceiptIcon />, disabled: true },
    { text: 'Global Rates Setup', icon: <SettingsIcon />, disabled: true }
  ];

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: darkMode ? '#0f172a' : '#1e293b', color: '#94a3b8' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: 2, display: 'flex' }}>
          <LogoIcon />
        </Box>
        <Box>
          <Typography variant="h6" color="white" sx={{ leading: 1.1, fontSize: '1rem', tracking: '-0.3px', fontWeight: 'bold' }}>
            Printopia ERP
          </Typography>
          <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem', tracking: '0.5px' }}>
            Enterprise Node
          </Typography>
        </Box>
      </Box>

      {/* Navigation List */}
      <Box sx={{ flexGrow: 1, px: 1.5, py: 2 }}>
        <Typography variant="caption" sx={{ pl: 1.5, fontWeight: 'bold', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.35)', tracking: '1px', display: 'block', mb: 1 }}>
          Core Modules
        </Typography>
        <List sx={{ p: 0, '& .MuiListItem-root': { mb: 0.5 } }}>
          {navItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <Tooltip title={item.disabled ? `${item.text} is locked for Module-01 implementation` : ''} placement="right">
                <Box sx={{ width: '100%' }}>
                  <ListItemButton
                    disabled={item.disabled}
                    sx={{
                      borderRadius: '8px',
                      py: 1,
                      px: 2,
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
                        <Typography variant="body2" sx={{ fontSize: '0.825rem', fontWeight: item.active ? 'bold' : 'medium' }}>
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
          ))}
        </List>
      </Box>

      {/* Database Connection / System Footing */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)', bgcolor: 'rgba(0, 0, 0, 0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} />
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontFamily: 'monospace' }}>
            PG CENTRAL CONNECTED
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.3)', display: 'block', fontFamily: 'monospace', fontSize: '0.65rem' }}>
          Node: printopia-pg-central-01
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
          <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
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
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 800, tracking: '-0.2px' }}>
                Module-01: Machine Master Configuration
              </Typography>
              <Chip label="Ready for PostgreSQL" size="small" color="success" variant="outlined" sx={{ display: { xs: 'none', sm: 'inline-flex' }, height: 20, fontSize: '0.65rem' }} />
            </Box>

            {/* Quick Actions Header Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Sync Button */}
              <Tooltip title="Synchronize specs with PostgreSQL cloud storage">
                <IconButton color="inherit" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                  <SyncIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Light/Dark Mode Switcher */}
              <Tooltip title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}>
                <IconButton onClick={toggleDarkMode} color="inherit" size="small">
                  {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 0.5 }} />

              {/* User Profile avatar */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer' }} onClick={handleMenuOpen}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  SG
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left', lineHeight: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Subir Ghosal</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>System Architect</Typography>
                </Box>
              </Box>

              {/* Dropdown Menu */}
              <Menu
                id="user-profile-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                slotProps={{ paper: { sx: { width: 200, mt: 1, borderRadius: 2 } } }}
              >
                <MenuItem onClick={handleMenuClose} sx={{ gap: 1.5 }}>
                  <UserIcon fontSize="small" color="action" />
                  <Typography variant="body2">System Role: Admin</Typography>
                </MenuItem>
                <MenuItem onClick={handleMenuClose} sx={{ gap: 1.5 }}>
                  <LogoIcon fontSize="small" color="action" />
                  <Typography variant="body2">Printopia Node Spec</Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleMenuClose} sx={{ gap: 1.5, color: 'error.main' }}>
                  <PowerIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Log Out Node</Typography>
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
            p: 4,
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            mt: '64px',
            overflowX: 'hidden'
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

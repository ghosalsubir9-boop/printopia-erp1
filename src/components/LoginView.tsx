/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
  Container,
  Paper,
  Divider
} from '@mui/material';
import {
  LocalPrintshop as LogoIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  PhoneIphone as PhoneIcon,
  VpnKey as OtpIcon,
  Visibility,
  VisibilityOff,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Palette as DesignIcon,
  Print as PrintIcon,
  AccountBalance as FinanceIcon,
  SuperAdminIcon,
  CorporateFare as CompanyIcon
} from '@mui/icons-material';
import { AuthService, UserRole } from '../services/authService';
import { TenantService, UserRecord } from '../services/TenantService';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [tabIndex, setTabIndex] = useState<number>(0);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mobile OTP state
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Common UI state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registeredUsers = TenantService.getAllUsers();

  const startResendCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      AuthService.loginWithEmail(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate user.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    setError(null);
    try {
      const res = AuthService.sendMobileOTP(mobile);
      setOtpSent(true);
      setOtpMessage(res.message);
      startResendCountdown();
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    }
  };

  const handleMobileOtpLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      AuthService.verifyMobileOTP(mobile, otp);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (userEmail: string, pass: string) => {
    setError(null);
    try {
      AuthService.loginWithEmail(userEmail, pass);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return <AdminIcon sx={{ color: '#ec4899' }} />;
      case 'COMPANY_ADMIN':
      case 'Admin': return <CompanyIcon sx={{ color: '#2563eb' }} />;
      case 'SALES_EXECUTIVE':
      case 'Sales Executive': return <UserIcon sx={{ color: '#059669' }} />;
      case 'DESIGNER':
      case 'Designer': return <DesignIcon sx={{ color: '#d97706' }} />;
      case 'PRINTER':
      case 'Printer': return <PrintIcon sx={{ color: '#7c3aed' }} />;
      case 'ACCOUNTS':
      case 'Accounts': return <FinanceIcon sx={{ color: '#dc2626' }} />;
      default: return <UserIcon sx={{ color: '#2563eb' }} />;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(37, 99, 235, 0.25), transparent 70%)'
      }}
    >
      <Container maxWidth="sm">
        {/* Brand Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1.5,
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 3,
              boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)',
              mb: 1.5
            }}
          >
            <LogoIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h4" color="white" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 0.5 }}>
            Printopia ERP
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 'medium' }}>
            Multi-Tenant Enterprise Printing & Packaging ERP System
          </Typography>
        </Box>

        <Card
          variant="outlined"
          sx={{
            borderRadius: 4,
            bgcolor: '#1e293b',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => {
                setTabIndex(v);
                setError(null);
              }}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{
                '& .MuiTab-root': {
                  color: '#94a3b8',
                  fontWeight: 'bold',
                  py: 2,
                  '&.Mui-selected': { color: '#60a5fa' }
                }
              }}
            >
              <Tab label="Email Password" />
              <Tab label="Mobile OTP" />
              <Tab label="Registered Users" />
            </Tabs>
          </Box>

          <CardContent sx={{ p: 3.5 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* TAB 0: EMAIL & PASSWORD */}
            {tabIndex === 0 && (
              <form onSubmit={handleEmailLogin}>
                <Stack spacing={2.5}>
                  <TextField
                    required
                    fullWidth
                    label="Corporate Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@printopia.com"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon sx={{ color: '#94a3b8' }} />
                          </InputAdornment>
                        )
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' }
                      },
                      '& .MuiInputLabel-root': { color: '#94a3b8' }
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    label="Account Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: '#94a3b8' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#94a3b8' }}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' }
                      },
                      '& .MuiInputLabel-root': { color: '#94a3b8' }
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      borderRadius: 2.5,
                      textTransform: 'none',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    Authenticate & Access ERP
                  </Button>
                </Stack>
              </form>
            )}

            {/* TAB 1: MOBILE OTP */}
            {tabIndex === 1 && (
              <form onSubmit={handleMobileOtpLogin}>
                <Stack spacing={2.5}>
                  <TextField
                    required
                    fullWidth
                    label="Registered Mobile Number (10 digits)"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9830012345"
                    disabled={otpSent}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>+91</Typography>
                          </InputAdornment>
                        )
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' }
                      },
                      '& .MuiInputLabel-root': { color: '#94a3b8' }
                    }}
                  />

                  {!otpSent ? (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleSendOtp}
                      disabled={mobile.replace(/\D/g, '').length !== 10}
                      sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 2.5, textTransform: 'none' }}
                    >
                      Send Verification OTP
                    </Button>
                  ) : (
                    <>
                      {otpMessage && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          {otpMessage} <strong>(OTP code: 123456)</strong>
                        </Alert>
                      )}

                      <TextField
                        required
                        fullWidth
                        label="6-Digit OTP Code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP code"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <OtpIcon sx={{ color: '#94a3b8' }} />
                              </InputAdornment>
                            )
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' }
                          },
                          '& .MuiInputLabel-root': { color: '#94a3b8' }
                        }}
                      />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp('');
                          }}
                          sx={{ color: '#94a3b8' }}
                        >
                          Change Mobile Number
                        </Button>

                        <Button
                          variant="text"
                          size="small"
                          disabled={countdown > 0}
                          onClick={handleSendOtp}
                          sx={{ color: countdown > 0 ? '#64748b' : '#60a5fa' }}
                        >
                          {countdown > 0 ? `Resend OTP (${countdown}s)` : 'Resend OTP'}
                        </Button>
                      </Box>

                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || otp.length < 6}
                        sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 2.5, textTransform: 'none' }}
                      >
                        Verify OTP & Login
                      </Button>
                    </>
                  )}
                </Stack>
              </form>
            )}

            {/* TAB 2: REGISTERED USERS */}
            {tabIndex === 2 && (
              <Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2, textAlign: 'center' }}>
                  Click any active account below to test authentication and role context:
                </Typography>

                <Stack spacing={1.5} sx={{ maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
                  {registeredUsers.map((u) => (
                    <Paper
                      key={u.email}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        bgcolor: u.companyId === 'company-suspended' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        borderColor: u.companyId === 'company-suspended' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(37, 99, 235, 0.15)',
                          borderColor: 'primary.main',
                          transform: 'translateY(-1px)'
                        }
                      }}
                      onClick={() => handleQuickDemoLogin(u.email, u.passwordHash)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, display: 'flex' }}>
                          {getRoleIcon(u.role)}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {u.userName} {u.role === 'SUPER_ADMIN' && <Chip label="SUPER ADMIN" size="small" color="secondary" sx={{ ml: 1, height: 18, fontSize: '0.625rem', fontWeight: 900 }} />}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.725rem' }}>
                            {u.email} • {u.companyName || 'Super Admin Context'}
                          </Typography>
                        </Box>
                      </Box>

                      <Chip
                        label={u.role}
                        size="small"
                        color={
                          u.role === 'SUPER_ADMIN' ? 'secondary' :
                          u.role === 'COMPANY_ADMIN' ? 'primary' :
                          u.role === 'SALES_EXECUTIVE' ? 'success' :
                          u.role === 'DESIGNER' ? 'warning' :
                          u.role === 'PRINTER' ? 'info' : 'error'
                        }
                        sx={{ fontWeight: 'bold', fontSize: '0.675rem' }}
                      />
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Printopia ERP v2.5 • Multi-Tenant Isolated Architecture • Indian GST Compliant
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

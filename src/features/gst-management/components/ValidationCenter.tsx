/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Button,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  ErrorOutlined, 
  WarningAmber, 
  Launch, 
  Refresh,
  CheckCircleOutlined,
  Download
} from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod, GstValidationError } from '../types';
import { ExportUtils } from '../utils/exportUtils';

export default function ValidationCenter({ period }: { period: GstPeriod }) {
  const [errors, setErrors] = React.useState<GstValidationError[]>([]);
  const [loading, setLoading] = React.useState(true);

  const handleExport = () => {
    const headers = ['Type', 'Category', 'Message', 'Source Reference'];
    const rows = errors.map(e => [e.type, e.category, e.message, e.sourceReference]);
    ExportUtils.exportToCsv(`Validation_Report_${period.month}_${period.year}.csv`, [headers, ...rows]);
  };

  React.useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await GstApiService.validatePeriodData(period);
      setErrors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  const errorCount = errors.filter(e => e.type === 'Error').length;
  const warningCount = errors.filter(e => e.type === 'Warning').length;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Validation Center</Typography>
          <Typography variant="caption" color="text.secondary">
            Pre-filing checks for {period.month}/{period.year}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Download />} variant="outlined" size="small" onClick={handleExport}>Export CSV</Button>
          <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={loadData}>Re-validate</Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Alert severity="error" icon={<ErrorOutlined />} sx={{ flex: 1 }}>
          <strong>{errorCount} Blocking Errors:</strong> These must be fixed before report generation.
        </Alert>
        <Alert severity="warning" icon={<WarningAmber />} sx={{ flex: 1 }}>
          <strong>{warningCount} Warnings:</strong> Non-blocking but recommended to review.
        </Alert>
      </Stack>

      <Paper variant="outlined">
        {errors.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <CheckCircleOutlined color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">No issues found!</Typography>
            <Typography variant="body2" color="text.secondary">All data reconciles and follows GST formatting rules.</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {errors.map((error, index) => (
              <React.Fragment key={error.id}>
                <ListItem sx={{ py: 2 }}>
                  <ListItemIcon>
                    {error.type === 'Error' ? (
                      <ErrorOutlined color="error" />
                    ) : (
                      <WarningAmber color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{error.category}</Typography>
                        <Chip label={error.sourceReference} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Stack>
                    }
                    secondary={error.message}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Go to Source">
                      <IconButton edge="end" color="primary">
                        <Launch fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < errors.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

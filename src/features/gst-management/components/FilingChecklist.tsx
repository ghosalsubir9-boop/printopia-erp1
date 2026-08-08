/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Divider,
  Stack,
  Button,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { 
  CheckCircle, 
  RadioButtonUnchecked, 
  Save, 
  Edit,
  History
} from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod, FilingChecklistItem } from '../types';

interface FilingChecklistProps {
  period: GstPeriod;
}

import { AuthService } from '../../../services/authService';

export const FilingChecklist: React.FC<FilingChecklistProps> = ({ period }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FilingChecklistItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await GstApiService.getFilingChecklist(period.id);
      setItems(data);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  const handleToggle = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newStatus = item.status === 'pending' ? 'completed' : 'pending';
    await GstApiService.updateChecklistItem(period.id, itemId, newStatus);
    
    // Optimistic update
    setItems(items.map(i => i.id === itemId ? { 
      ...i, 
      status: newStatus, 
      updatedBy: currentUser?.userName || 'System', 
      updatedAt: new Date().toISOString() 
    } : i));
  };

  const handleSaveNote = async (itemId: string) => {
    await GstApiService.updateChecklistItem(period.id, itemId, items.find(i => i.id === itemId)?.status || 'pending', noteValue);
    setItems(items.map(i => i.id === itemId ? { ...i, notes: noteValue } : i));
    setEditId(null);
    setNoteValue('');
  };

  const startEdit = (item: FilingChecklistItem) => {
    setEditId(item.id);
    setNoteValue(item.notes || '');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  const completedCount = items.filter(i => i.status === 'completed').length;
  const progress = (completedCount / items.length) * 100;

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Monthly Filing Checklist</Typography>
          <Typography variant="caption" color="text.secondary">
            Verify all steps before marking the return as filed for {new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' })} {period.year}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>{completedCount} / {items.length}</Typography>
          <Typography variant="caption" color="text.secondary">Tasks Completed</Typography>
        </Box>
      </Stack>

      <Paper variant="outlined">
        <List sx={{ p: 0 }}>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              <ListItem 
                sx={{ 
                  py: 2, 
                  bgcolor: item.status === 'completed' ? 'action.hover' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={item.status === 'completed'}
                    onChange={() => handleToggle(item.id)}
                    icon={<RadioButtonUnchecked />}
                    checkedIcon={<CheckCircle color="success" />}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textDecoration: item.status === 'completed' ? 'line-through' : 'none', color: item.status === 'completed' ? 'text.secondary' : 'text.primary' }}>
                      {item.label}
                    </Typography>
                  }
                  secondary={
                    editId === item.id ? (
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={noteValue}
                          onChange={(e) => setNoteValue(e.target.value)}
                          placeholder="Add observation or note..."
                        />
                        <Button variant="contained" size="small" onClick={() => handleSaveNote(item.id)}>Save</Button>
                      </Box>
                    ) : (
                      item.notes && (
                        <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                          Note: {item.notes}
                        </Typography>
                      )
                    )
                  }
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={1}>
                    {item.updatedAt && (
                      <Tooltip title={`Last updated by ${item.updatedBy} at ${new Date(item.updatedAt).toLocaleString()}`}>
                        <IconButton size="small"><History fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    <IconButton size="small" onClick={() => startEdit(item)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
              {index < items.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {progress === 100 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'success.lighter', borderRadius: 1, textAlign: 'center', border: '1px solid', borderColor: 'success.light' }}>
          <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 700 }}>
            🎉 All verification steps completed! You are ready to lock the period.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Typography,
  Box,
  Divider,
  Alert,
  Grid,
  Stack
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { ProductCategory } from '../types';

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  onAddCategory: (name: string, code: string, description?: string) => Promise<any>;
  onUpdateCategory: (id: string, name: string, code: string, description?: string) => Promise<any>;
  onDeleteCategory: (id: string) => Promise<any>;
}

export default function CategoryDialog({
  open,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form inputs
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  // Error/Success state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load selected category into inputs if editing
  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setCode(cat.code);
    setDescription(cat.description || '');
    setErrorMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setDescription('');
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Category Name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('Category Code (e.g. HOS) is required.');
      return;
    }

    try {
      if (editingId) {
        await onUpdateCategory(editingId, name.trim(), code.trim().toUpperCase(), description.trim());
      } else {
        await onAddCategory(name.trim(), code.trim().toUpperCase(), description.trim());
      }
      cancelEdit();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this product category? This action is irreversible.')) {
      setErrorMsg(null);
      try {
        await onDeleteCategory(id);
      } catch (err: any) {
        setErrorMsg(err.message || 'Cannot delete. Category might be actively linked.');
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Manage Product Categories (Admin Terminal)
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
          Add or edit organizational printer departments. Default categories include: <strong>Hospital Printing</strong>, <strong>Commercial Printing</strong>, <strong>Packaging</strong>, and <strong>Stationery</strong>.
        </Typography>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Panel: Category List Table */}
          <Grid size={{ xs: 12, md: 7 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Category Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id} hover selected={editingId === cat.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{cat.name}</Typography>
                        {cat.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                            {cat.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {cat.code}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="primary" onClick={() => startEdit(cat)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(cat.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Right Panel: Add/Edit Category Form */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box component="form" onSubmit={handleSave} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                {editingId ? <EditIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                {editingId ? 'Edit Selected Category' : 'Register New Category'}
              </Typography>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Category Name *"
                  placeholder="e.g. Hospital Printing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Category Code *"
                  placeholder="e.g. HOS"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  slotProps={{ htmlInput: { style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                />

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Category Description"
                  placeholder="Optional explanatory notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                  {editingId && (
                    <Button size="small" variant="outlined" color="inherit" onClick={cancelEdit} startIcon={<CancelIcon />}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" size="small" variant="contained" color="primary" startIcon={<SaveIcon />}>
                    {editingId ? 'Update' : 'Register'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} variant="contained" color="inherit" sx={{ fontWeight: 'bold' }}>
          Dismiss Terminal
        </Button>
      </DialogActions>
    </Dialog>
  );
}

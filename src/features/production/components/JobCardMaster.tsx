/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Box, Container } from '@mui/material';
import JobCardList from './JobCardList';
import JobCardDetails from './JobCardDetails';
import JobCardForm from './JobCardForm';
import { JobCard } from '../types';
import { JobCardApiService } from '../services/jobCardApi';

export default function JobCardMaster() {
  const [view, setView] = useState<'list' | 'details' | 'create'>('list');
  const [selectedCard, setSelectedCard] = useState<JobCard | null>(null);
  const [currentRole, setCurrentRole] = useState<'Admin' | 'Sales' | 'Designer' | 'Production' | 'QC' | 'Dispatch' | 'Accounts'>('Admin');

  const handleSelect = (card: JobCard) => {
    setSelectedCard(card);
    setView('details');
  };

  const handleSave = () => {
    setView('list');
    setSelectedCard(null);
  };

  const handleCancel = () => {
    setView('list');
    setSelectedCard(null);
  };

  const handleRefreshDetails = async () => {
    if (selectedCard) {
      const refreshed = await JobCardApiService.getJobCardById(selectedCard.id);
      if (refreshed) {
        setSelectedCard(refreshed);
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {view === 'list' && (
        <JobCardList
          onSelect={handleSelect}
          onAdd={() => setView('create')}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
        />
      )}
      {view === 'create' && (
        <JobCardForm
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
      {view === 'details' && selectedCard && (
        <JobCardDetails
          jobCard={selectedCard}
          currentRole={currentRole}
          onBack={handleCancel}
          onUpdate={handleRefreshDetails}
        />
      )}
    </Container>
  );
}

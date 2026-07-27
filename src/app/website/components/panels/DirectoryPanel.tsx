'use client';

import React from 'react';
import { Users, Mail, Phone, Building2 } from 'lucide-react';
import { getModuleConfig } from '../../constants/clientModules';
import { PanelShell, EmptyState } from '../PanelShell';
import styles from '../../website.module.css';
import type { DirectoryEntry } from '../../types';

export function DirectoryPanel({ items }: { items: DirectoryEntry[] }) {
  const config = getModuleConfig('directory');
  const grouped = items.reduce<Record<string, DirectoryEntry[]>>((acc, item) => {
    const team = item.selectTeam || 'Other';
    if (!acc[team]) acc[team] = [];
    acc[team].push(item);
    return acc;
  }, {});

  return (
    <PanelShell title={config.label} subtitle={config.subtitle}>
      {items.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          message="No directory contacts shared for this project yet."
        />
      ) : (
        <div className={styles.directoryGroups}>
          {Object.entries(grouped).map(([team, contacts]) => (
            <div key={team} className={styles.directoryGroup}>
              <h3 className={styles.directoryGroupTitle}>{team}</h3>
              <div className={styles.directoryGrid}>
                {contacts.map((contact) => (
                  <div key={contact.id} className={styles.directoryCard}>
                    <div className={styles.directoryAvatar}>
                      <Users size={16} />
                    </div>
                    <div className={styles.directoryMeta}>
                      <strong>{contact.nameOfPerson}</strong>
                      {contact.companyName && (
                        <span><Building2 size={12} /> {contact.companyName}</span>
                      )}
                      {contact.contactNo && (
                        <span><Phone size={12} /> {contact.contactNo}</span>
                      )}
                      {contact.emailId && (
                        <span><Mail size={12} /> {contact.emailId}</span>
                      )}
                      <span className={styles.directoryStatus}>
                        {contact.appointmentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

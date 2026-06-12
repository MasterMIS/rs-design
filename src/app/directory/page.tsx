'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Phone, Mail, MapPin,
  Trash2, Edit2, LayoutGrid, List,
  Building, User, Users, MessageCircle, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, RefreshCw,
  Notebook, Briefcase, Wrench
} from 'lucide-react';
import styles from './directory.module.css';
import Modal from '@/components/Modal';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';

interface Contact {
  rowIndex: number;
  timestamp: string;
  project: string;
  selectTeam: string;
  nameOfPerson: string;
  contactNo: string;
  emailId: string;
  companyName: string;
  category: string;
  address: string;
  appointmentStatus: string;
  id: string;
}

interface Project {
  id: string;
  rowIndex: number;
  basicInfo: {
    name: string;
    code?: string;
  };
}

export default function DirectoryPage() {
  const { activeProject } = useProject();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Form Fields State
  const [formEntries, setFormEntries] = useState<any[]>([{
    project: '',
    selectTeam: 'Clients',
    customTeamName: '',
    nameOfPerson: '',
    contactNo: '',
    emailId: '',
    companyName: '',
    category: 'CIVIL',
    address: '',
    appointmentStatus: 'Yes',
  }]);

  const standardTeams = [
    'Clients',
    'RS Design',
    'Vendor',
    'Engineer',
    'Contractor',
    '2D',
    '3D',
    'Architect',
    'MEP',
    "Client's Wife",
    'Client Staff',
    'Site Supervisor',
    'Project Coordinator',
    'CRM',
    'Custom Team (Add New...)'
  ];

  const appointmentStatuses = ['Yes', 'No'];

  const categories = [
    'CIVIL', 'ELECTRICAL', 'PLUMBING', 'AC', 'TILES AND MARBLE', 'CARPENTRY',
    'PAINT AND POLISH', 'FALSE CEILING', 'FURNISHING', 'WATER PROOFING',
    'FIRE FIGHTING', 'WALL PAINTER', 'POLISHER', 'WINDOW', 'READYMADE FURNITURE',
    'HEAT PUMP', 'PRESSURE PUMP', 'WATER TREATMENT', 'STP', 'SWIMMING POOL', 'IT'
  ];

  useEffect(() => {
    fetchDirectory();
    fetchProjects();
    }, []);

  async function fetchDirectory() {
    try {
      setLoading(true);
      const res = await fetch('/api/directory');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);

        // Expand all unique teams by default
        const uniqueTeams: string[] = Array.from(new Set(data.map((c: Contact) => c.selectTeam)));
        const expandMap: Record<string, boolean> = {};
        uniqueTeams.forEach(team => {
          expandMap[team] = true;
        });
        setExpandedTeams(expandMap);
      }
    } catch (err) {
      console.error('Error fetching directory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }

  const toggleTeam = (teamName: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamName]: !prev[teamName]
    }));
  };

  const handleCreateNew = () => {
    setEditingContact(null);
    setFormEntries([{
      project: activeProject ? activeProject.name : (projects[0]?.basicInfo?.name || ''),
      selectTeam: 'Clients',
      customTeamName: '',
      nameOfPerson: '',
      contactNo: '',
      emailId: '',
      companyName: '',
      category: categories[0],
      address: '',
      appointmentStatus: 'Yes',
    }]);
    setIsModalOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);

    // Check if selectTeam is a standard one or custom
    const isStandard = standardTeams.includes(contact.selectTeam);
    setFormEntries([{
      project: contact.project,
      selectTeam: isStandard ? contact.selectTeam : 'Custom Team (Add New...)',
      customTeamName: isStandard ? '' : contact.selectTeam,
      nameOfPerson: contact.nameOfPerson,
      contactNo: contact.contactNo,
      emailId: contact.emailId,
      companyName: contact.companyName,
      category: contact.category,
      address: contact.address,
      appointmentStatus: contact.appointmentStatus,
    }]);
    setIsModalOpen(true);
  };

  const handleEntryChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [name]: value };
      return updated;
    });
  };

  const addFormEntry = () => {
    const baseProject = formEntries[0]?.project || activeProject?.name || '';
    setFormEntries(prev => [...prev, {
      project: baseProject,
      selectTeam: 'Clients',
      customTeamName: '',
      nameOfPerson: '',
      contactNo: '',
      emailId: '',
      companyName: '',
      category: categories[0],
      address: '',
      appointmentStatus: 'Yes',
    }]);
  };

  const removeFormEntry = (index: number) => {
    setFormEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all entries
    for (const entry of formEntries) {
      if (!entry.project || !entry.nameOfPerson) {
        alert('Please fill out Project and Representative Name for all entries');
        return;
      }
      if (entry.selectTeam === 'Custom Team (Add New...)' && !entry.customTeamName.trim()) {
        alert('Please enter a custom team name');
        return;
      }
    }

    try {
      setSubmitting(true);

      if (editingContact) {
        const entry = formEntries[0];
        const finalTeamName = entry.selectTeam === 'Custom Team (Add New...)' ? entry.customTeamName.trim() : entry.selectTeam;
        
        const updatePayload = {
          project: entry.project,
          selectTeam: finalTeamName,
          nameOfPerson: entry.nameOfPerson,
          contactNo: entry.contactNo,
          emailId: entry.emailId,
          companyName: entry.companyName,
          category: entry.category,
          address: entry.address,
          appointmentStatus: entry.appointmentStatus,
          timestamp: editingContact.timestamp,
          id: editingContact.id
        };

        const res = await fetch(`/api/directory?rowIndex=${editingContact.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchDirectory();
        } else {
          const err = await res.json();
          alert(`Failed to update directory: ${err.error}`);
        }
      } else {
        const payload = formEntries.map(entry => ({
          project: entry.project,
          selectTeam: entry.selectTeam === 'Custom Team (Add New...)' ? entry.customTeamName.trim() : entry.selectTeam,
          nameOfPerson: entry.nameOfPerson,
          contactNo: entry.contactNo,
          emailId: entry.emailId,
          companyName: entry.companyName,
          category: entry.category,
          address: entry.address,
          appointmentStatus: entry.appointmentStatus,
        }));

        const res = await fetch('/api/directory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchDirectory();
        } else {
          const err = await res.json();
          alert(`Failed to add partner to directory: ${err.error}`);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/directory?rowIndex=${contactToDelete.rowIndex}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setContactToDelete(null);
        fetchDirectory();
      } else {
        const err = await res.json();
        alert(`Failed to delete contact: ${err.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Logic
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.nameOfPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.contactNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.emailId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = filterProject === '' || contact.project === filterProject;
    const matchesTeam = filterTeam === '' || contact.selectTeam === filterTeam;
    const matchesStatus = filterStatus === '' || contact.appointmentStatus === filterStatus;

    return matchesSearch && matchesProject && matchesTeam && matchesStatus;
  });

  // Unique project groups and unique team listings for filters
  const uniqueProjectsList = Array.from(new Set(contacts.map(c => c.project))).filter(Boolean);
  const uniqueTeamsList = Array.from(new Set(contacts.map(c => c.selectTeam))).filter(Boolean);

  // Grouping logic by Project first, then by Team
  const groupedData: Record<string, Record<string, Contact[]>> = {};
  filteredContacts.forEach(contact => {
    if (!groupedData[contact.project]) {
      groupedData[contact.project] = {};
    }
    if (!groupedData[contact.project][contact.selectTeam]) {
      groupedData[contact.project][contact.selectTeam] = [];
    }
    groupedData[contact.project][contact.selectTeam].push(contact);
  });

  // Counters
  const totalCount = contacts.length;
  const appointedCount = contacts.filter(c => c.appointmentStatus === 'Yes').length;
  const discussionCount = contacts.filter(c => c.appointmentStatus === 'No').length;
  const uniqueTeamsCount = Array.from(new Set(contacts.map(c => c.selectTeam))).length;

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Project Directory</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <Link href="/projects">Project Portfolio</Link>
            {activeProject && (
              <>
                <span className="separator">&gt;</span>
                <button
                  className="project-breadcrumb"
                  style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                  onClick={() => {
                    localStorage.setItem('pending_view_project_id', activeProject.id);
                    window.location.href = '/projects';
                  }}
                >{activeProject.name}</button>
              </>
            )}
            <span className="separator">&gt;</span>
            <span className="current">Directory</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Add Representative</span>
          </button>
        </div>
      </div>

      {/* Main Display Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>Loading project directories...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-light)' }}>
          <p>No stakeholders found matching filters.</p>
        </div>
      ) : (<div className={styles.tableContainer}>
          <table className={styles.directoryTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Representative</th>
                <th>Project</th>
                <th>Assigned Team</th>
                <th>Trade Specialty</th>
                <th>Status</th>
                <th>Company</th>
                <th>Contact Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className={styles.tableActions}>
                      <button className={styles.controlBtn} onClick={() => handleEdit(member)} title="Edit Stakeholder">
                        <Edit2 size={13} />
                      </button>
                      <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(member)} title="Remove Contact">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.tableTitleCell}>
                      <span className={styles.tableRepName}>{member.nameOfPerson}</span>
                    </div>
                  </td>
                  <td>{member.project}</td>
                  <td>
                    <span className={styles.teamMemberCount} style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6' }}>
                      {member.selectTeam}
                    </span>
                  </td>
                  <td>{member.category}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[member.appointmentStatus.replace(' ', '_')]}`}>
                      {member.appointmentStatus}
                    </span>
                  </td>
                  <td><strong>{member.companyName || '—'}</strong></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {member.contactNo ? (
                        <a href={`tel:${member.contactNo}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                          {member.contactNo}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>-</span>
                      )}
                      {member.emailId && (
                        <a href={`mailto:${member.emailId}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                          {member.emailId}
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stakeholder Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? 'Update Stakeholder Details' : 'Add Project Representative(s)'}
        width="750px"
      >
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          {formEntries.map((entry, index) => (
            <div key={index} style={{ borderBottom: formEntries.length > 1 && index < formEntries.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: formEntries.length > 1 && index < formEntries.length - 1 ? '15px' : '0', marginBottom: formEntries.length > 1 && index < formEntries.length - 1 ? '15px' : '0' }}>
              {formEntries.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '13px' }}>Entry #{index + 1}</h4>
                  {index > 0 && (
                    <button type="button" onClick={() => removeFormEntry(index)} style={{ background: 'rgba(231, 76, 60, 0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px' }}>
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              )}
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><Building size={14} /> Select Project *</label>
                  <input
                    type="text"
                    name="project"
                    value={entry.project}
                    className={styles.formInput}
                    disabled
                  />
                </div>
                <div className={styles.formGroup}>
                  <label><Users size={14} /> Assign to Team Group *</label>
                  <select
                    name="selectTeam"
                    value={entry.selectTeam}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.formSelect}
                    required
                  >
                    {standardTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Input for Custom Teams */}
              {entry.selectTeam === 'Custom Team (Add New...)' && (
                <div className={styles.formGroup} style={{ animation: 'fadeIn 0.2s ease-out' }}>
                  <label><Users size={14} /> Enter Custom Team Name *</label>
                  <input
                    type="text"
                    name="customTeamName"
                    value={entry.customTeamName}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.formInput}
                    required
                  />
                </div>
              )}

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label><User size={14} /> Representative Full Name *</label>
                <input
                  type="text"
                  name="nameOfPerson"
                  value={entry.nameOfPerson}
                  onChange={(e) => handleEntryChange(index, e)}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><Phone size={14} /> Contact Number</label>
                  <input
                    type="text"
                    name="contactNo"
                    value={entry.contactNo}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label><Mail size={14} /> Email Address</label>
                  <input
                    type="email"
                    name="emailId"
                    value={entry.emailId}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><Building size={14} /> Company / Firm Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={entry.companyName}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label><Wrench size={14} /> Trade Specialty / Category</label>
                  <select
                    name="category"
                    value={entry.category}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.formSelect}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><CheckCircle size={14} /> Appointment Status</label>
                  <select
                    name="appointmentStatus"
                    value={entry.appointmentStatus}
                    onChange={(e) => handleEntryChange(index, e)}
                    className={styles.formSelect}
                  >
                    {appointmentStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label><MapPin size={14} /> Workplace / Company Address</label>
                <input
                  type="text"
                  name="address"
                  value={entry.address}
                  onChange={(e) => handleEntryChange(index, e)}
                  className={styles.formInput}
                />
              </div>
            </div>
          ))}

          {!editingContact && (
            <div style={{ marginTop: '10px', marginBottom: '20px' }}>
              <button type="button" onClick={addFormEntry} style={{ background: 'rgba(52, 152, 219, 0.1)', color: 'var(--primary)', border: '1px dashed var(--primary)', borderRadius: '6px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', fontSize: '13px', fontWeight: '600' }}>
                <Plus size={14} /> Add Another Representative
              </button>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? 'Saving stakeholder...' : editingContact ? 'Save Changes' : 'Add Stakeholder'}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Stakeholder Representative"
        width="450px"
      >
        <div className={styles.deleteConfirmBody}>
          <p>Are you sure you want to remove <strong>{contactToDelete?.nameOfPerson}</strong>?</p>
          <p className={styles.warningSub}>This stakeholder will be permanently deleted from the Project Directory.</p>
          <div className={styles.deleteActions}>
            <button type="button" onClick={handleDelete} disabled={submitting} className={styles.confirmDeleteBtn}>
              {submitting ? 'Deleting...' : 'Confirm Deletion'}
            </button>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

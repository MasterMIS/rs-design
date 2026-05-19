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
  appointmentStatus: 'Appointed' | 'Shortlisted' | 'Terminated' | 'Under Discussion';
  designation: string;
  escalationLevel: 'L1' | 'L2' | 'L3';
  whatsAppLink: string;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
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
  const [formFields, setFormFields] = useState({
    project: '',
    selectTeam: 'Client Team',
    customTeamName: '',
    nameOfPerson: '',
    contactNo: '',
    emailId: '',
    companyName: '',
    category: '',
    address: '',
    appointmentStatus: 'Appointed' as 'Appointed' | 'Shortlisted' | 'Terminated' | 'Under Discussion',
    designation: '',
    escalationLevel: 'L1' as 'L1' | 'L2' | 'L3',
  });

  const standardTeams = [
    'Client Team',
    'Architects & Designers',
    'PMC / Consultants',
    'Civil Contractors',
    'Carpentry Contractors',
    'Electrical Contractors',
    'Plumbing Contractors',
    'Painting Contractors',
    'HVAC Partners',
    'Custom Team (Add New...)'
  ];

  const appointmentStatuses = ['Appointed', 'Shortlisted', 'Terminated', 'Under Discussion'];
  const escalationLevels = ['L1', 'L2', 'L3'];

  const categories = [
    'Architecture',
    'Interior Design',
    'Project Management',
    'Civil Work',
    'Carpentry / Furniture',
    'Electrical',
    'Plumbing',
    'Painting / Wallpapering',
    'HVAC',
    'Lighting / Automation',
    'Others'
  ];

  useEffect(() => {
    fetchDirectory();
    fetchProjects();

    const saved = localStorage.getItem('directory_view_mode') as 'card' | 'table';
    if (saved === 'card' || saved === 'table') {
      setTimeout(() => {
        setViewMode(saved);
      }, 0);
    }
  }, []);

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('directory_view_mode', mode);
  };

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
    setFormFields({
      project: projects[0]?.basicInfo?.name || '',
      selectTeam: 'Client Team',
      customTeamName: '',
      nameOfPerson: '',
      contactNo: '',
      emailId: '',
      companyName: '',
      category: categories[0],
      address: '',
      appointmentStatus: 'Appointed',
      designation: '',
      escalationLevel: 'L1',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);

    // Check if selectTeam is a standard one or custom
    const isStandard = standardTeams.includes(contact.selectTeam);
    setFormFields({
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
      designation: contact.designation,
      escalationLevel: contact.escalationLevel,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.project || !formFields.nameOfPerson) {
      alert('Please fill out required fields (Project, Representative Name)');
      return;
    }

    // Determine target team name
    const finalTeamName = formFields.selectTeam === 'Custom Team (Add New...)'
      ? formFields.customTeamName.trim()
      : formFields.selectTeam;

    if (!finalTeamName) {
      alert('Please enter a team name');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        project: formFields.project,
        selectTeam: finalTeamName,
        nameOfPerson: formFields.nameOfPerson,
        contactNo: formFields.contactNo,
        emailId: formFields.emailId,
        companyName: formFields.companyName,
        category: formFields.category,
        address: formFields.address,
        appointmentStatus: formFields.appointmentStatus,
        designation: formFields.designation,
        escalationLevel: formFields.escalationLevel,
      };

      if (editingContact) {
        const updatePayload = {
          ...payload,
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
      contact.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.designation.toLowerCase().includes(searchQuery.toLowerCase());

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
  const appointedCount = contacts.filter(c => c.appointmentStatus === 'Appointed').length;
  const discussionCount = contacts.filter(c => c.appointmentStatus === 'Under Discussion').length;
  const uniqueTeamsCount = Array.from(new Set(contacts.map(c => c.selectTeam))).length;

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Project Directory</h2>
          <p>Coordinate stakeholders, client teams, and appointed contractors for active sites.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleCreateNew}>
            <Plus size={18} />
            <span>Add Representative</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Counters */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.total}`}>
          <div className={styles.statIcon}>
            <Notebook size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{totalCount}</h3>
            <p>Total Contacts</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.appointed}`}>
          <div className={styles.statIcon}>
            <CheckCircle size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{appointedCount}</h3>
            <p>Appointed Partners</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.discussion}`}>
          <div className={styles.statIcon}>
            <RefreshCw size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{discussionCount}</h3>
            <p>Under Discussion</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.teams}`}>
          <div className={styles.statIcon}>
            <Users size={18} />
          </div>
          <div className={styles.statInfo}>
            <h3>{uniqueTeamsCount}</h3>
            <p>Active Teams</p>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className={styles.filtersBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search representatives, companies, specialties..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          <select
            className={styles.filterSelect}
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {uniqueProjectsList.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="">All Teams</option>
            {uniqueTeamsList.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {appointmentStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <div className={styles.viewToggleGroup}>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'card' ? styles.activeView : ''}`}
              onClick={() => handleViewModeChange('card')}
              title="Grouped Cards"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.activeView : ''}`}
              onClick={() => handleViewModeChange('table')}
              title="Compact Table"
            >
              <List size={18} />
            </button>
          </div>
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
      ) : viewMode === 'card' ? (
        <div className={styles.projectGroupSection}>
          {Object.keys(groupedData).map(projectKey => (
            <div key={projectKey} className={styles.projectGroupSection}>
              {/* Project Heading Row */}
              <div className={styles.projectGroupHeader}>
                <h3>{projectKey}</h3>
              </div>

              {/* Accordion Groupings by Team */}
              {Object.keys(groupedData[projectKey]).map(teamKey => {
                const teamMembers = groupedData[projectKey][teamKey];
                const isOpen = expandedTeams[teamKey] !== false;

                return (
                  <div key={teamKey} className={styles.teamAccordion}>
                    <div
                      className={styles.teamAccordionHeader}
                      onClick={() => toggleTeam(teamKey)}
                    >
                      <div className={styles.teamAccordionTitle}>
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <span>{teamKey}</span>
                        <span className={styles.teamMemberCount}>{teamMembers.length}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className={styles.teamAccordionBody}>
                        <div className={styles.memberGrid}>
                          {teamMembers.map(member => (
                            <div key={member.id} className={styles.memberCard}>
                              <div className={styles.memberTop}>
                                <div className={styles.memberPrimary}>
                                  <span className={styles.memberName}>{member.nameOfPerson}</span>
                                  {member.designation && (
                                    <span className={styles.memberDesignation}>{member.designation}</span>
                                  )}
                                </div>
                                <div className={styles.badgesTray}>
                                  <span className={`${styles.escalationBadge} ${styles[member.escalationLevel]}`}>
                                    {member.escalationLevel}
                                  </span>
                                  <span className={`${styles.statusBadge} ${styles[member.appointmentStatus.replace(' ', '_')]}`}>
                                    {member.appointmentStatus}
                                  </span>
                                </div>
                              </div>

                              <div className={styles.memberDetails}>
                                {member.companyName && (
                                  <div className={styles.detailRow}>
                                    <Building size={13} />
                                    <span className={styles.detailValue}><strong>{member.companyName}</strong></span>
                                  </div>
                                )}
                                <div className={styles.detailRow}>
                                  <User size={13} />
                                  <span className={styles.detailValue}>Specialty: {member.category}</span>
                                </div>
                                {member.contactNo && (
                                  <div className={styles.detailRow}>
                                    <Phone size={13} />
                                    <span className={styles.detailValue}>{member.contactNo}</span>
                                  </div>
                                )}
                                {member.emailId && (
                                  <div className={styles.detailRow}>
                                    <Mail size={13} />
                                    <span className={styles.detailValue}>{member.emailId}</span>
                                  </div>
                                )}
                                {member.address && (
                                  <div className={styles.detailRow}>
                                    <MapPin size={13} />
                                    <span className={styles.detailValue}>{member.address}</span>
                                  </div>
                                )}
                              </div>

                              <div className={styles.memberActions}>
                                <div className={styles.communicationTray}>
                                  {member.contactNo && (
                                    <a href={`tel:${member.contactNo}`} className={`${styles.trayBtn} ${styles.phone}`} title="Call Direct">
                                      <Phone size={13} />
                                    </a>
                                  )}
                                  {member.emailId && (
                                    <a href={`mailto:${member.emailId}`} className={`${styles.trayBtn} ${styles.email}`} title="Email Direct">
                                      <Mail size={13} />
                                    </a>
                                  )}
                                  {member.whatsAppLink && (
                                    <a href={member.whatsAppLink} target="_blank" rel="noreferrer" className={`${styles.trayBtn} ${styles.whatsapp}`} title="WhatsApp Chat">
                                      <MessageCircle size={13} />
                                    </a>
                                  )}
                                </div>

                                <div className={styles.recordControls}>
                                  <button className={styles.controlBtn} onClick={() => handleEdit(member)} title="Edit Stakeholder">
                                    <Edit2 size={13} />
                                  </button>
                                  <button className={`${styles.controlBtn} ${styles.delete}`} onClick={() => confirmDelete(member)} title="Remove Contact">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.directoryTable}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Representative</th>
                <th>Project</th>
                <th>Assigned Team</th>
                <th>Trade Specialty</th>
                <th>Status</th>
                <th>Priority Contact</th>
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
                      {member.designation && (
                        <span className={styles.tableRepDetail}>{member.designation}</span>
                      )}
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
                  <td>
                    <span className={`${styles.escalationBadge} ${styles[member.escalationLevel]}`}>
                      {member.escalationLevel}
                    </span>
                  </td>
                  <td><strong>{member.companyName || '—'}</strong></td>
                  <td>
                    <div className={styles.tableActions}>
                      {member.contactNo && (
                        <a href={`tel:${member.contactNo}`} className={`${styles.trayBtn} ${styles.phone}`} title={member.contactNo}>
                          <Phone size={12} />
                        </a>
                      )}
                      {member.emailId && (
                        <a href={`mailto:${member.emailId}`} className={`${styles.trayBtn} ${styles.email}`} title={member.emailId}>
                          <Mail size={12} />
                        </a>
                      )}
                      {member.whatsAppLink && (
                        <a href={member.whatsAppLink} target="_blank" rel="noreferrer" className={`${styles.trayBtn} ${styles.whatsapp}`} title="WhatsApp Chat">
                          <MessageCircle size={12} />
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
        title={editingContact ? 'Update Stakeholder Details' : 'Add Project Representative'}
        width="750px"
      >
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Select Project *</label>
              <select
                name="project"
                value={formFields.project}
                onChange={handleInputChange}
                className={styles.formSelect}
                required
              >
                {projects.length > 0 ? (
                  projects.map(p => (
                    <option key={p.id} value={p.basicInfo.name}>{p.basicInfo.name}</option>
                  ))
                ) : (
                  <option value="">No Active Projects</option>
                )}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><Users size={14} /> Assign to Team Group *</label>
              <select
                name="selectTeam"
                value={formFields.selectTeam}
                onChange={handleInputChange}
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
          {formFields.selectTeam === 'Custom Team (Add New...)' && (
            <div className={styles.formGroup} style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <label><Users size={14} /> Enter Custom Team Name *</label>
              <input
                type="text"
                name="customTeamName"
                value={formFields.customTeamName}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. Landscaping Partners, Automation Engineers"
                required
              />
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><User size={14} /> Representative Full Name *</label>
              <input
                type="text"
                name="nameOfPerson"
                value={formFields.nameOfPerson}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="FullName"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label><Briefcase size={14} /> Professional Designation</label>
              <input
                type="text"
                name="designation"
                value={formFields.designation}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. Principal Architect, Billing Manager, Supervisor"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Phone size={14} /> Contact Number</label>
              <input
                type="text"
                name="contactNo"
                value={formFields.contactNo}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. 9876543210"
              />
            </div>
            <div className={styles.formGroup}>
              <label><Mail size={14} /> Email Address</label>
              <input
                type="email"
                name="emailId"
                value={formFields.emailId}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label><Building size={14} /> Company / Firm Name</label>
              <input
                type="text"
                name="companyName"
                value={formFields.companyName}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Firm/Agency Name"
              />
            </div>
            <div className={styles.formGroup}>
              <label><Wrench size={14} /> Trade Specialty / Category</label>
              <select
                name="category"
                value={formFields.category}
                onChange={handleInputChange}
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
                value={formFields.appointmentStatus}
                onChange={handleInputChange}
                className={styles.formSelect}
              >
                {appointmentStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label><AlertCircle size={14} /> Escalation Level / Priority Contact</label>
              <select
                name="escalationLevel"
                value={formFields.escalationLevel}
                onChange={handleInputChange}
                className={styles.formSelect}
              >
                {escalationLevels.map(level => (
                  <option key={level} value={level}>{level} Contact Priority</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label><MapPin size={14} /> Workplace / Company Address</label>
            <input
              type="text"
              name="address"
              value={formFields.address}
              onChange={handleInputChange}
              className={styles.formInput}
              placeholder="Full location address"
            />
          </div>

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

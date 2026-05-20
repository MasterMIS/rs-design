'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building, Calendar, Users, MapPin, ClipboardList, Files, AlertCircle,
  Clock, DollarSign, LogOut, LayoutDashboard, CheckCircle2, ChevronRight,
  User, Link2, Info, ArrowLeft, ArrowUpRight, CheckCircle, Flame, FileText,
  Activity, Sparkles, Tag, ShieldCheck, Mail, Phone, ExternalLink, CalendarDays,
  Menu, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './website.module.css';

interface Project {
  id: string;
  rowIndex: number;
  basicInfo: any;
  clients: any[];
  sites: any[];
  team: any[];
  timeline: any;
  metadata: any;
}

interface Deficiency {
  id: string;
  project: string;
  type: string;
  description: string;
  status: string;
  priority: string;
  targetDate: string;
  reportedDate: string;
}

interface MOMEntry {
  id: string;
  project: string;
  purpose: string;
  presentOurs: string;
  presentClient: string;
  location: string;
  date: string;
  remarks: string;
  documentUrl: string;
}

interface AttachedFile {
  title: string;
  name: string;
  url: string;
}

interface DocumentEntry {
  id: string;
  project: string;
  title: string;
  category: string;
  referenceNumber: string;
  issueDate: string;
  expiryDate: string;
  stakeholders: string;
  status: string;
  files: AttachedFile[];
  remarks: string;
}

export default function ClientWebsitePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Active project name and fetched lists
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [deficienciesList, setDeficienciesList] = useState<Deficiency[]>([]);
  const [momList, setMomList] = useState<MOMEntry[]>([]);
  const [documentsList, setDocumentsList] = useState<DocumentEntry[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'deficiencies' | 'mom' | 'documents'>('overview');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    try {
      setLoading(true);
      
      const projRes = await fetch('/api/projects');
      let projectsData: Project[] = [];
      if (projRes.ok) {
        projectsData = await projRes.json();
        setProjectsList(projectsData);
      }

      if (user?.role === 'Client') {
        setSelectedProjectName(user.projectName || '');
      } else if (projectsData.length > 0) {
        setSelectedProjectName(projectsData[0].basicInfo.name);
      }

      const defRes = await fetch('/api/deficiencies');
      if (defRes.ok) {
        setDeficienciesList(await defRes.json());
      }

      const momRes = await fetch('/api/mom');
      if (momRes.ok) {
        setMomList(await momRes.json());
      }

      const docRes = await fetch('/api/documents');
      if (docRes.ok) {
        setDocumentsList(await docRes.json());
      }
    } catch (err) {
      console.error('Error fetching portal data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Scoping filters
  const currentProjectObj = projectsList.find(
    (p) => p.basicInfo?.name?.toLowerCase() === selectedProjectName?.toLowerCase()
  );

  const filteredDeficiencies = deficienciesList.filter(
    (d) => d.project?.toLowerCase() === selectedProjectName?.toLowerCase()
  );

  const filteredMoms = momList.filter(
    (m) => m.project?.toLowerCase() === selectedProjectName?.toLowerCase()
  );

  const filteredDocs = documentsList.filter(
    (d) => d.project?.toLowerCase() === selectedProjectName?.toLowerCase()
  );

  // Statistics
  const progressPercent = currentProjectObj?.metadata?.completion || 0;
  const unresolvedDeficiencies = filteredDeficiencies.filter((d) => d.status !== 'Resolved').length;
  const totalMeetings = filteredMoms.length;
  const totalSharedFiles = filteredDocs.reduce((acc, curr) => acc + (curr.files?.length || 0), 0);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.loaderIcon}>
          <Sparkles className={styles.spinIcon} size={40} />
        </div>
        <p>Loading your Client Space...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Decorative Widescreen Light Gradients */}
      <div className={styles.gradientBlurOne} />
      <div className={styles.gradientBlurTwo} />

      {/* Fully Website-Type Top Header Navigation */}
      <header className={styles.mainHeader}>
        {/* Left Section: Branding */}
        <div className={styles.logoGroup}>
          <div className={styles.logoBox}>
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_X4IywFdVmR8DJ3LbFpDDPcq5gHv-_4MLqA&s" 
              alt="RSDesign Logo"
              className={styles.brandLogo} 
            />
          </div>
          <div className={styles.logoText}>
            <h1>RSDesign</h1>
            <span>Client Portal</span>
          </div>
        </div>

        {/* Center Section: Navigation tabs inside the header itself! */}
        <div className={styles.headerTabs}>
          <button 
            type="button"
            className={`${styles.headerTabBtn} ${activeTab === 'overview' ? styles.activeHeaderTab : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Building size={15} />
            <span>Overview</span>
          </button>
          
          <button 
            type="button"
            className={`${styles.headerTabBtn} ${activeTab === 'deficiencies' ? styles.activeHeaderTab : ''}`}
            onClick={() => setActiveTab('deficiencies')}
          >
            <AlertCircle size={15} />
            <span>Deficiencies</span>
            {unresolvedDeficiencies > 0 && (
              <span className={styles.headerTabBadge}>{unresolvedDeficiencies}</span>
            )}
          </button>

          <button 
            type="button"
            className={`${styles.headerTabBtn} ${activeTab === 'mom' ? styles.activeHeaderTab : ''}`}
            onClick={() => setActiveTab('mom')}
          >
            <ClipboardList size={15} />
            <span>Meetings</span>
          </button>

          <button 
            type="button"
            className={`${styles.headerTabBtn} ${activeTab === 'documents' ? styles.activeHeaderTab : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <Files size={15} />
            <span>Documents</span>
          </button>
        </div>

        {/* Right Section: Controls, Admins, and Session Logouts */}
        <div className={styles.headerControls}>
          {user?.role !== 'Client' ? (
            <div className={styles.previewSelector}>
              <span className={styles.previewTag}>
                <ShieldCheck size={12} /> Admin
              </span>
              <select
                value={selectedProjectName}
                onChange={(e) => setSelectedProjectName(e.target.value)}
                className={styles.projectDropdown}
              >
                {projectsList.map((p) => (
                  <option key={p.id} value={p.basicInfo.name}>
                    {p.basicInfo.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className={styles.clientBrandTitle}>
              <Building size={14} />
              <span>Project: <strong>{user.projectName}</strong></span>
            </div>
          )}

          <div className={styles.headerActionBtns}>
            {user?.role !== 'Client' && (
              <button 
                type="button" 
                onClick={() => router.push('/')}
                className={styles.backToErpBtn}
                title="Return to Internal ERP Dashboard"
              >
                <ArrowLeft size={14} />
                <span>Back to ERP</span>
              </button>
            )}

            <button 
              type="button" 
              onClick={logout}
              className={styles.logoutBtn}
              title="Logout Securely"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Project Banner */}
      <section className={styles.projectHero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <span className={styles.projectCategoryBadge}>
              {currentProjectObj?.basicInfo?.category || 'Design Portfolio'}
            </span>
            <h2>{selectedProjectName ? selectedProjectName.toUpperCase() : 'NO ACTIVE PROJECT'}</h2>
            <p className={styles.projectDesc}>
              {currentProjectObj?.basicInfo?.description || 'Your custom architectural interior workspace is fully logged.'}
            </p>
            
            <div className={styles.heroMetaGrid}>
              <div className={styles.metaBox}>
                <MapPin size={14} />
                <span>{currentProjectObj?.sites?.[0]?.address || 'Site Address Pending'}</span>
              </div>
              <div className={styles.metaBox}>
                <CalendarDays size={14} />
                <span>Est. Completion: {currentProjectObj?.basicInfo?.expectedEndDate || 'Timeline Unscheduled'}</span>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.radialCard}>
              <div className={styles.radialInfo}>
                <h3>{progressPercent}%</h3>
                <p>Construction Progress</p>
              </div>
              <div className={styles.radialProgressTrack}>
                <div 
                  className={styles.radialProgressFill} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Website Stat Widget Cards */}
      <div className={styles.statsSummaryRow}>
        <div className={`${styles.statCard} ${styles.totalCard}`}>
          <div className={styles.statIconBox}>
            <Activity size={18} />
          </div>
          <div className={styles.statData}>
            <h4>{progressPercent}% Complete</h4>
            <p>Overall Milestones</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.deficienciesCard}`}>
          <div className={styles.statIconBox}>
            <AlertCircle size={18} />
          </div>
          <div className={styles.statData}>
            <h4>{unresolvedDeficiencies} Pending</h4>
            <p>Deficiencies to Fix</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.momCard}`}>
          <div className={styles.statIconBox}>
            <ClipboardList size={18} />
          </div>
          <div className={styles.statData}>
            <h4>{totalMeetings} Logged</h4>
            <p>Minutes of Meetings</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.docsCard}`}>
          <div className={styles.statIconBox}>
            <Files size={18} />
          </div>
          <div className={styles.statData}>
            <h4>{totalSharedFiles} Files</h4>
            <p>Contracts & Drawings</p>
          </div>
        </div>
      </div>

      {/* Widescreen Central Content Frame */}
      <main className={styles.contentPanel}>
        {activeTab === 'overview' && (
          <div className={styles.tabSection}>
            <div className={styles.sectionHeader}>
              <h2>🏢 Project Overview & Team Structure</h2>
              <p>Track your design categories, budget, supervisor team, and client details.</p>
            </div>

            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <h3><Info size={16} /> Basic Specifications</h3>
                <div className={styles.infoTable}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Structure Type</span>
                    <span className={styles.infoVal}>{currentProjectObj?.basicInfo?.type || 'N/A'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Category Group</span>
                    <span className={styles.infoVal}>{currentProjectObj?.basicInfo?.category || 'N/A'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Milestone Status</span>
                    <span className={styles.infoValBadge}>
                      {currentProjectObj?.basicInfo?.status || 'In Progress'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Budget Estimate</span>
                    <span className={styles.infoVal}>₹ {currentProjectObj?.basicInfo?.estimatedBudget || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.overviewCard}>
                <h3><Users size={16} /> Lead Supervisors & Team</h3>
                <div className={styles.teamList}>
                  {currentProjectObj?.team && currentProjectObj.team.length > 0 ? (
                    currentProjectObj.team.map((member: any, i: number) => (
                      <div key={i} className={styles.teamMemberItem}>
                        <div className={styles.memberAvatar}>
                          <User size={14} />
                        </div>
                        <div className={styles.memberMeta}>
                          <strong>{member.name || 'Staff Member'}</strong>
                          <span>{member.role || 'Design Supervisor'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={styles.noDataNote}>No specific supervisor team assigned.</p>
                  )}
                </div>
              </div>

              <div className={styles.overviewCard}>
                <h3><ShieldCheck size={16} /> Project Client Signatories</h3>
                <div className={styles.teamList}>
                  {currentProjectObj?.clients && currentProjectObj.clients.length > 0 ? (
                    currentProjectObj.clients.map((client: any, i: number) => (
                      <div key={i} className={styles.teamMemberItem} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <div className={styles.memberAvatar} style={{ backgroundColor: 'rgba(74, 0, 224, 0.08)', color: 'var(--primary)' }}>
                          <Building size={14} />
                        </div>
                        <div className={styles.memberMeta}>
                          <strong>{client.name || 'Client Contact'}</strong>
                          <span style={{ color: 'var(--primary)' }}>{client.type || 'Owner'}</span>
                          {client.email && <span className={styles.clientDetailSub}><Mail size={10} /> {client.email}</span>}
                          {client.mobile && <span className={styles.clientDetailSub}><Phone size={10} /> {client.mobile}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={styles.noDataNote}>No client contact details assigned.</p>
                  )}
                </div>
              </div>

              <div className={styles.overviewCard}>
                <h3><MapPin size={16} /> Construction Site Address</h3>
                <div className={styles.siteInfo}>
                  {currentProjectObj?.sites && currentProjectObj.sites.length > 0 ? (
                    currentProjectObj.sites.map((site: any, i: number) => (
                      <div key={i} className={styles.siteItemBlock}>
                        <strong>{site.name || 'Main Location'}</strong>
                        <p>{site.address || 'Address pending verification'}</p>
                        {site.city && <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{site.city}, {site.state || ''} - {site.pincode || ''}</p>}
                        {site.googleLocation && (
                          <a href={site.googleLocation} target="_blank" rel="noopener noreferrer" className={styles.siteLocationLink}>
                            <ExternalLink size={12} /> Google Coordinates
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={styles.noDataNote}>No site locations logged.</p>
                  )}
                </div>
              </div>
            </div>

            {currentProjectObj?.basicInfo?.notes && (
              <div className={styles.remarksCard}>
                <h4>General Notes & Directions:</h4>
                <p>{currentProjectObj.basicInfo.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'deficiencies' && (
          <div className={styles.tabSection}>
            <div className={styles.sectionHeader}>
              <h2>⚠️ Structural & Design Deficiency Reports</h2>
              <p>View open architectural issues, targets, priorities, and fix status for this project.</p>
            </div>

            {filteredDeficiencies.length === 0 ? (
              <div className={styles.emptyContentState}>
                <CheckCircle size={32} style={{ color: 'var(--success)' }} />
                <p>Congratulations! No deficiencies logged for this project.</p>
              </div>
            ) : (
              <div className={styles.deficienciesVaultGrid}>
                {filteredDeficiencies.map((item) => (
                  <div key={item.id} className={styles.deficiencyItemCard}>
                    <div className={styles.defHeader}>
                      <span className={styles.defTypeBadge}>{item.type}</span>
                      <span className={`${styles.defStatusBadge} ${item.status === 'Resolved' ? styles.defResolved : styles.defPending}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className={styles.defDescription}>{item.description}</p>
                    
                    <div className={styles.defFooterMeta}>
                      <div className={styles.defMetaRow}>
                        <Calendar size={12} />
                        <span>Reported: {item.reportedDate ? new Date(item.reportedDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className={styles.defMetaRow}>
                        <Clock size={12} />
                        <span>Target: <strong>{item.targetDate ? new Date(item.targetDate).toLocaleDateString() : 'N/A'}</strong></span>
                      </div>
                      <div className={styles.defMetaRow}>
                        <Flame size={12} style={{ color: item.priority === 'High' ? 'var(--danger)' : '#f39c12' }} />
                        <span>Priority: <strong style={{ color: item.priority === 'High' ? 'var(--danger)' : '#f39c12' }}>{item.priority}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mom' && (
          <div className={styles.tabSection}>
            <div className={styles.sectionHeader}>
              <h2>📅 Minutes of Meetings (MOM)</h2>
              <p>Read executive decisions, location notes, split attendees, and download verified MOM sheets.</p>
            </div>

            {filteredMoms.length === 0 ? (
              <div className={styles.emptyContentState}>
                <CalendarDays size={32} style={{ color: 'var(--text-light)' }} />
                <p>No meeting sessions scheduled for this project.</p>
              </div>
            ) : (
              <div className={styles.momContainerList}>
                {filteredMoms.map((mom) => (
                  <div key={mom.id} className={styles.momBlockItem}>
                    <div className={styles.momLeftMeta}>
                      <span className={styles.momDateBox}>
                        {mom.date ? new Date(mom.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}
                      </span>
                      <span className={styles.momYearBox}>
                        {mom.date ? new Date(mom.date).getFullYear() : ''}
                      </span>
                    </div>

                    <div className={styles.momRightContent}>
                      <div className={styles.momItemHeader}>
                        <h3>Purpose: {mom.purpose}</h3>
                        {mom.documentUrl && (
                          <a href={mom.documentUrl} target="_blank" rel="noopener noreferrer" className={styles.momDownloadBtn} title="Download verified MOM PDF">
                            <Link2 size={13} /> Download MOM
                          </a>
                        )}
                      </div>

                      <div className={styles.momMetaBrief}>
                        <span className={styles.momBriefDetail}><MapPin size={12} /> Location: {mom.location}</span>
                      </div>

                      <div className={styles.attendeesSplitGrid}>
                        <div className={styles.attendeeBlockColumn}>
                          <h5>Our Representatives:</h5>
                          <p>{mom.presentOurs || '—'}</p>
                        </div>
                        <div className={styles.attendeeBlockColumn}>
                          <h5>Client Representatives:</h5>
                          <p>{mom.presentClient || '—'}</p>
                        </div>
                      </div>

                      {mom.remarks && (
                        <div className={styles.momRemarksField}>
                          <strong>Discussions & Remarks:</strong>
                          <p>{mom.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={styles.tabSection}>
            <div className={styles.sectionHeader}>
              <h2>📁 Shared Document Vault</h2>
              <p>Safely view and download executed contracts, permit drawings, certificates, and invoices.</p>
            </div>

            {filteredDocs.length === 0 ? (
              <div className={styles.emptyContentState}>
                <FileText size={32} style={{ color: 'var(--text-light)' }} />
                <p>No document vault files shared for this project.</p>
              </div>
            ) : (
              <div className={styles.documentsClientGrid}>
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className={styles.clientDocItemCard}>
                    <div className={styles.docItemHeader}>
                      <span className={styles.docItemCategory}>{doc.category}</span>
                      <span className={`${styles.docItemStatus} ${doc.status === 'Active / Executed' ? styles.docActive : styles.docReview}`}>
                        {doc.status}
                      </span>
                    </div>
                    <h4>{doc.title}</h4>
                    {doc.referenceNumber && (
                      <span className={styles.docRefNum}><Tag size={11} /> Version Ref: {doc.referenceNumber}</span>
                    )}

                    <div className={styles.docItemDates}>
                      <span className={styles.itemDateLabel}>Issued: {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : 'N/A'}</span>
                      {doc.expiryDate && (
                        <span className={styles.itemDateLabel} style={{ color: doc.status === 'Expired' ? 'var(--danger)' : '#f39c12' }}>
                          Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className={styles.docFilesBox}>
                      <strong>Shared Attachments:</strong>
                      {doc.files && doc.files.length > 0 ? (
                        <div className={styles.docFilesContainer}>
                          {doc.files.map((file, idx) => (
                            <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.clientFileLinkBtn} title={`Download ${file.title}`}>
                              <Link2 size={12} />
                              <span>{file.title}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.noFilesText}>No files uploaded</span>
                      )}
                    </div>

                    {doc.remarks && (
                      <div className={styles.docItemNotes}>
                        <p>{doc.remarks}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

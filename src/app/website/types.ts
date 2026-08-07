export type ClientModuleId =
  | 'requirements'
  | 'selections'
  | 'mom'
  | 'directory'
  | 'quotations'
  | 'audits'
  | 'drawings'
  | 'tracker';

export interface Project {
  id: string;
  rowIndex: number;
  basicInfo: Record<string, string>;
  clients: Array<Record<string, string>>;
  sites: Array<Record<string, string>>;
  team: Array<Record<string, string>>;
  timeline: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface FileAttachment {
  title: string;
  name: string;
  url: string;
}

export interface Requirement {
  id: string;
  project: string;
  title: string;
  requirementNo: string;
  category: string;
  files: FileAttachment[];
  remarks: string;
}

export interface Selection {
  id: string;
  project: string;
  areaName: string;
  productName: string;
  vendor: string;
  files: FileAttachment[];
  remarks: string;
}

export interface MOMEntry {
  id: string;
  project: string;
  purpose: string;
  meetingDate: string;
  location: string;
  documents: string;
  remarks: string;
}

export interface DirectoryEntry {
  id: string;
  project: string;
  selectTeam: string;
  nameOfPerson: string;
  contactNo: string;
  emailId: string;
  companyName: string;
  appointmentStatus: string;
}

export interface Quotation {
  id: string;
  project: string;
  nameOfPerson: string;
  nameOfQuotation: string;
  documentUrl: string;
  remarks: string;
  statusRSDesign: string;
  statusClient: string;
}

export interface Audit {
  id: string;
  project: string;
  auditDate: string;
  auditType: string;
  auditorName: string;
  presentInMeeting: string;
  remarks: string;
  documents: FileAttachment[];
}

export interface DrawingTemplate {
  id: string;
  drawingNo: string;
  areaName: string;
  drawingName: string;
  category: string;
}

export interface DrawingScheduleItem {
  project: string;
  drawingNo: string;
  actualStartDate: string;
  actualEndDate: string;
  revisionNo: string;
  drawingImage: string;
  rsDesignStatus: string;
  clientStatus: string;
}

export interface DrawingPlannedDate {
  project: string;
  category: string;
  planStartDate: string;
  planEndDate: string;
}

export interface TrackerTemplate {
  id: string;
  trackerId: string;
  areaName: string;
  taskName: string;
  category: string;
  tat: string;
}

export interface TrackerScheduleItem {
  project: string;
  trackerId: string;
  actualStartDate: string;
  actualEndDate: string;
}

export interface TrackerPlannedDate {
  project: string;
  category: string;
  trackerId?: string;
  startDate: string;
  endDate: string;
}

export interface ClientPortalData {
  projectsList: Project[];
  requirements: Requirement[];
  selections: Selection[];
  momList: MOMEntry[];
  directory: DirectoryEntry[];
  quotations: Quotation[];
  audits: Audit[];
  drawingTemplates: DrawingTemplate[];
  drawingSchedule: DrawingScheduleItem[];
  drawingPlanned: DrawingPlannedDate[];
  trackerTemplates: TrackerTemplate[];
  trackerSchedule: TrackerScheduleItem[];
  trackerPlanned: TrackerPlannedDate[];
}

export interface MergedDrawingRow {
  id: string;
  drawingNo: string;
  drawingName: string;
  areaName: string;
  category: string;
  planStartDate: string;
  planEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  rsDesignStatus: string;
  clientStatus: string;
  drawingImage: string;
}

export interface MergedTrackerRow {
  id: string;
  trackerId: string;
  taskName: string;
  areaName: string;
  category: string;
  tat: string;
  planStartDate: string;
  planEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
}

export interface ModuleCounts {
  requirements: number;
  selections: number;
  mom: number;
  directory: number;
  quotations: number;
  audits: number;
  drawings: number;
  tracker: number;
}

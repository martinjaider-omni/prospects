// Re-export Prisma types
export * from '@prisma/client'

// Custom types for the application

export interface ContactFilters {
  search?: string
  companyId?: string
  emailStatus?: string
  tags?: string[]
  source?: string
}

export interface CampaignFilters {
  search?: string
  status?: string
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApolloSearchParams {
  domain?: string
  companyName?: string
  jobTitles?: string[]
  seniorities?: string[]
  departments?: string[]
  limit?: number
}

export interface ApolloPersonResult {
  id: string
  first_name: string
  last_name: string
  email: string
  email_status: string
  phone_numbers?: { raw_number: string }[]
  linkedin_url?: string
  title: string
  seniority: string
  department: string
  organization?: {
    id: string
    name: string
    website_url: string
    linkedin_url: string
    industry: string
    estimated_num_employees: number
  }
}

export interface AIGenerateEmailParams {
  contactFirstName: string
  contactLastName: string
  contactJobTitle?: string
  companyName?: string
  companyIndustry?: string
  purpose: string
  tone?: 'formal' | 'casual' | 'friendly' | 'professional'
  previousMessages?: { direction: 'inbound' | 'outbound'; body: string }[]
  customInstructions?: string
}

export interface EmailSendParams {
  to: string
  subject: string
  body: string
  html?: string
  accountId: string
  trackOpens?: boolean
  trackClicks?: boolean
}

export interface DashboardStats {
  totalContacts: number
  totalCompanies: number
  activeCampaigns: number
  emailsSentToday: number
  emailsSentThisWeek: number
  openRate: number
  replyRate: number
  bounceRate: number
}

export interface CampaignStats {
  sent: number
  opened: number
  clicked: number
  replied: number
  bounced: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
}

export type CSVColumnMapping = {
  [key: string]: string | null // CSV column -> Contact field
}

export const CONTACT_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'linkedinUrl',
  'jobTitle',
  'company',
  'location',
  'notes'
] as const

export type ContactField = typeof CONTACT_FIELDS[number]

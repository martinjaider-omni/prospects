import { NodeType, ExecutionStatus, CampaignContactStatus, DelayUnit } from '@prisma/client'

export interface NodeConfig {
  mode?: 'ai' | 'manual' | 'always'
  prompt?: string
  subject?: string
  [key: string]: any
}

export interface NodeConditions {
  onlyIfNoReply?: boolean
  onlyIfNoOpen?: boolean
  onlyIfNoClick?: boolean
  [key: string]: any
}

export interface CampaignNodeData {
  id: string
  campaignId: string
  order: number
  nodeType: NodeType
  title: string
  config: NodeConfig | null
  delayValue: number | null
  delayUnit: DelayUnit | null
  subject: string | null
  body: string | null
  conditions: NodeConditions | null
}

export interface ContactData {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  jobTitle: string | null
  company?: {
    name: string
    industry: string | null
    website: string | null
  } | null
}

export interface CampaignContactData {
  id: string
  campaignId: string
  contactId: string
  contact: ContactData
  status: CampaignContactStatus
  currentNodeOrder: number
  customVariables: Record<string, any> | null
  nextActionAt: Date | null
}

export interface ExecutionContext {
  campaignId: string
  campaignContact: CampaignContactData
  node: CampaignNodeData
  campaign: {
    id: string
    name: string
    platform: string
    emailAccountId: string | null
    linkedInAccountId: string | null
    productPrompt: string | null
    instructionsPrompt: string | null
    timezone: string
    sendingDays: string[]
    sendingStartHour: number
    sendingEndHour: number
  }
}

export interface ExecutionResult {
  success: boolean
  status: ExecutionStatus
  message?: string
  data?: {
    subject?: string
    body?: string
    messageId?: string
    scheduledFor?: Date
  }
  error?: string
  nextNodeOrder?: number
  nextActionAt?: Date
}

export interface NodeProcessor {
  canProcess(nodeType: NodeType): boolean
  process(context: ExecutionContext): Promise<ExecutionResult>
}

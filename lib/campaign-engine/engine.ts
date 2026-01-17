import { NodeType, ExecutionStatus, CampaignContactStatus, CampaignStatus, Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
  NodeProcessor,
  ExecutionContext,
  ExecutionResult,
  CampaignNodeData,
  CampaignContactData,
} from './types'
import {
  TriggerProcessor,
  DelayProcessor,
  EmailProcessor,
  LinkedInConnectProcessor,
  LinkedInMessageProcessor,
} from './processors'

export class CampaignEngine {
  private processors: NodeProcessor[]

  constructor() {
    // Register all node processors
    this.processors = [
      new TriggerProcessor(),
      new DelayProcessor(),
      new EmailProcessor(),
      new LinkedInConnectProcessor(),
      new LinkedInMessageProcessor(),
    ]
  }

  /**
   * Start a campaign - enrolls contacts and begins execution
   */
  async startCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        nodes: { orderBy: { order: 'asc' } },
        contacts: {
          where: { status: 'ACTIVE' },
          include: { contact: { include: { company: true } } },
        },
      },
    })

    if (!campaign) {
      return { success: false, message: 'Campaign not found' }
    }

    if (campaign.nodes.length === 0) {
      return { success: false, message: 'Campaign has no flow nodes configured' }
    }

    if (campaign.contacts.length === 0) {
      return { success: false, message: 'Campaign has no contacts enrolled' }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.ACTIVE,
        startedAt: new Date(),
      },
    })

    // Process each contact - start them at the first node
    for (const campaignContact of campaign.contacts) {
      await this.processContact(campaign, campaignContact)
    }

    return {
      success: true,
      message: `Campaign started with ${campaign.contacts.length} contacts`,
    }
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PAUSED },
    })

    return { success: true, message: 'Campaign paused' }
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.ACTIVE },
    })

    // Trigger processing for contacts that are due
    await this.processScheduledContacts(campaignId)

    return { success: true, message: 'Campaign resumed' }
  }

  /**
   * Process all scheduled contacts across all active campaigns
   * This should be called by a cron job or scheduled task
   */
  async processAllScheduled(): Promise<{ processed: number; errors: number }> {
    let processed = 0
    let errors = 0

    // Get all active campaigns
    const activeCampaigns = await prisma.campaign.findMany({
      where: { status: CampaignStatus.ACTIVE },
    })

    for (const campaign of activeCampaigns) {
      const result = await this.processScheduledContacts(campaign.id)
      processed += result.processed
      errors += result.errors
    }

    return { processed, errors }
  }

  /**
   * Process contacts that are due for their next action in a specific campaign
   */
  async processScheduledContacts(campaignId: string): Promise<{ processed: number; errors: number }> {
    let processed = 0
    let errors = 0

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        nodes: { orderBy: { order: 'asc' } },
      },
    })

    if (!campaign || campaign.status !== CampaignStatus.ACTIVE) {
      return { processed: 0, errors: 0 }
    }

    // Check if we're within sending hours
    if (!this.isWithinSendingHours(campaign)) {
      return { processed: 0, errors: 0 }
    }

    // Get contacts that are due for their next action
    const dueContacts = await prisma.campaignContact.findMany({
      where: {
        campaignId,
        status: CampaignContactStatus.ACTIVE,
        OR: [
          { nextActionAt: { lte: new Date() } },
          { nextActionAt: null, currentNodeOrder: 0 }, // New contacts
        ],
      },
      include: {
        contact: { include: { company: true } },
      },
      take: campaign.dailyLimit, // Respect daily limit
    })

    for (const campaignContact of dueContacts) {
      try {
        await this.processContact(campaign, campaignContact)
        processed++
      } catch (error) {
        console.error(`Error processing contact ${campaignContact.contactId}:`, error)
        errors++
      }
    }

    return { processed, errors }
  }

  /**
   * Process a single contact through the campaign flow
   */
  private async processContact(
    campaign: any,
    campaignContact: any
  ): Promise<void> {
    const nodes = campaign.nodes as CampaignNodeData[]
    const currentNodeOrder = campaignContact.currentNodeOrder

    // Find the current node
    const currentNode = nodes.find(n => n.order === currentNodeOrder)

    if (!currentNode) {
      // No more nodes - mark contact as completed
      await prisma.campaignContact.update({
        where: { id: campaignContact.id },
        data: {
          status: CampaignContactStatus.COMPLETED,
          completedAt: new Date(),
        },
      })
      return
    }

    // Build execution context
    const context: ExecutionContext = {
      campaignId: campaign.id,
      campaignContact: {
        id: campaignContact.id,
        campaignId: campaignContact.campaignId,
        contactId: campaignContact.contactId,
        contact: campaignContact.contact,
        status: campaignContact.status,
        currentNodeOrder: campaignContact.currentNodeOrder,
        customVariables: campaignContact.customVariables,
        nextActionAt: campaignContact.nextActionAt,
      },
      node: currentNode,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        emailAccountId: campaign.emailAccountId,
        linkedInAccountId: campaign.linkedInAccountId,
        productPrompt: campaign.productPrompt,
        instructionsPrompt: campaign.instructionsPrompt,
        timezone: campaign.timezone,
        sendingDays: campaign.sendingDays,
        sendingStartHour: campaign.sendingStartHour,
        sendingEndHour: campaign.sendingEndHour,
      },
    }

    // Find the appropriate processor
    const processor = this.processors.find(p => p.canProcess(currentNode.nodeType))

    if (!processor) {
      console.error(`No processor found for node type: ${currentNode.nodeType}`)
      return
    }

    // Execute the node
    const result = await processor.process(context)

    // Record the execution
    await prisma.campaignNodeExecution.create({
      data: {
        campaignContactId: campaignContact.id,
        nodeId: currentNode.id,
        status: result.status,
        executedAt: new Date(),
        completedAt: result.success ? new Date() : null,
        scheduledFor: result.data?.scheduledFor,
        subject: result.data?.subject,
        body: result.data?.body,
        messageId: result.data?.messageId,
        errorMessage: result.error,
      },
    })

    // Update contact progress
    if (result.success && result.nextNodeOrder !== undefined) {
      const nextNode = nodes.find(n => n.order === result.nextNodeOrder)

      if (nextNode) {
        // Move to next node
        await prisma.campaignContact.update({
          where: { id: campaignContact.id },
          data: {
            currentNodeOrder: result.nextNodeOrder,
            nextActionAt: result.nextActionAt,
          },
        })

        // If the next action is immediate (no delay), process it now
        if (result.nextActionAt && result.nextActionAt <= new Date()) {
          // Recursively process the next node
          const updatedContact = await prisma.campaignContact.findUnique({
            where: { id: campaignContact.id },
            include: { contact: { include: { company: true } } },
          })
          if (updatedContact && updatedContact.status === CampaignContactStatus.ACTIVE) {
            await this.processContact(campaign, updatedContact)
          }
        }
      } else {
        // No more nodes - mark as completed
        await prisma.campaignContact.update({
          where: { id: campaignContact.id },
          data: {
            status: CampaignContactStatus.COMPLETED,
            completedAt: new Date(),
          },
        })
      }
    } else if (!result.success) {
      // Handle failure - could implement retry logic here
      console.error(`Node execution failed: ${result.error}`)
    }
  }

  /**
   * Check if current time is within the campaign's sending hours
   */
  private isWithinSendingHours(campaign: any): boolean {
    const now = new Date()

    // Get current day of week
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = days[now.getDay()]

    if (!campaign.sendingDays.includes(currentDay)) {
      return false
    }

    // Get current hour (in campaign timezone - simplified, using UTC for now)
    const currentHour = now.getUTCHours()

    return currentHour >= campaign.sendingStartHour && currentHour < campaign.sendingEndHour
  }

  /**
   * Add a contact to a campaign
   */
  async addContactToCampaign(
    campaignId: string,
    contactId: string,
    customVariables?: Record<string, any>
  ): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.campaignContact.create({
        data: {
          campaignId,
          contactId,
          status: CampaignContactStatus.ACTIVE,
          currentNodeOrder: 0,
          customVariables: customVariables ?? Prisma.JsonNull,
          nextActionAt: new Date(), // Ready to process immediately
        },
      })

      return { success: true, message: 'Contact added to campaign' }
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { success: false, message: 'Contact is already in this campaign' }
      }
      return { success: false, message: error.message }
    }
  }

  /**
   * Remove a contact from a campaign
   */
  async removeContactFromCampaign(
    campaignId: string,
    contactId: string
  ): Promise<{ success: boolean; message: string }> {
    await prisma.campaignContact.deleteMany({
      where: { campaignId, contactId },
    })

    return { success: true, message: 'Contact removed from campaign' }
  }
}

// Singleton instance
export const campaignEngine = new CampaignEngine()

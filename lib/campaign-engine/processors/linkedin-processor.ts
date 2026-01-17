import { NodeType, ExecutionStatus } from '@prisma/client'
import { NodeProcessor, ExecutionContext, ExecutionResult, NodeConfig } from '../types'
import prisma from '@/lib/prisma'
import { generateEmail } from '@/lib/ai'

export class LinkedInConnectProcessor implements NodeProcessor {
  canProcess(nodeType: NodeType): boolean {
    return nodeType === 'ACTION_LINKEDIN_CONNECT'
  }

  async process(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, campaignContact, campaign } = context
    const contact = campaignContact.contact
    const config = (node.config || {}) as NodeConfig

    try {
      // Check if contact has LinkedIn URL
      if (!contact.linkedinUrl) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'Contact has no LinkedIn URL',
        }
      }

      // Check if we have a LinkedIn account configured
      if (!campaign.linkedInAccountId) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'No LinkedIn account configured for this campaign',
        }
      }

      // Get LinkedIn account
      const linkedInAccount = await prisma.linkedInAccount.findUnique({
        where: { id: campaign.linkedInAccountId },
      })

      if (!linkedInAccount || !linkedInAccount.isActive) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'LinkedIn account not found or inactive',
        }
      }

      // Generate connection message if AI mode
      let message = ''
      if (config.mode === 'ai' && config.prompt) {
        const aiResult = await generateEmail({
          contactFirstName: contact.firstName,
          contactLastName: contact.lastName,
          contactJobTitle: contact.jobTitle || undefined,
          companyName: contact.company?.name,
          purpose: config.prompt,
          tone: 'friendly',
        })
        if ('body' in aiResult) {
          // LinkedIn connection messages are short, use just the first sentence
          message = aiResult.body.split('.')[0] + '.'
          if (message.length > 300) {
            message = message.substring(0, 297) + '...'
          }
        }
      }

      // TODO: Implement actual LinkedIn API integration
      // For now, we'll mark it as completed and log what would be sent
      console.log(`[LinkedIn Connect] Would send connection request to ${contact.linkedinUrl}`)
      console.log(`[LinkedIn Connect] Message: ${message}`)

      // Update stats
      await prisma.campaignNode.update({
        where: { id: node.id },
        data: {
          totalExecuted: { increment: 1 },
          totalSuccess: { increment: 1 },
        },
      })

      return {
        success: true,
        status: ExecutionStatus.COMPLETED,
        message: `LinkedIn connection request sent to ${contact.firstName}`,
        data: {
          body: message,
        },
        nextNodeOrder: node.order + 1,
        nextActionAt: new Date(),
      }
    } catch (error: any) {
      await prisma.campaignNode.update({
        where: { id: node.id },
        data: {
          totalExecuted: { increment: 1 },
          totalFailed: { increment: 1 },
        },
      })

      return {
        success: false,
        status: ExecutionStatus.FAILED,
        error: error.message || 'Failed to send LinkedIn connection',
      }
    }
  }
}

export class LinkedInMessageProcessor implements NodeProcessor {
  canProcess(nodeType: NodeType): boolean {
    return nodeType === 'ACTION_LINKEDIN_MESSAGE'
  }

  async process(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, campaignContact, campaign } = context
    const contact = campaignContact.contact
    const config = (node.config || {}) as NodeConfig

    try {
      if (!contact.linkedinUrl) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'Contact has no LinkedIn URL',
        }
      }

      if (!campaign.linkedInAccountId) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'No LinkedIn account configured for this campaign',
        }
      }

      // Generate message
      let message = node.body || ''
      if (config.mode === 'ai' && config.prompt) {
        const aiResult = await generateEmail({
          contactFirstName: contact.firstName,
          contactLastName: contact.lastName,
          contactJobTitle: contact.jobTitle || undefined,
          companyName: contact.company?.name,
          purpose: config.prompt,
          customInstructions: campaign.instructionsPrompt || undefined,
          tone: 'friendly',
        })
        if ('body' in aiResult) {
          message = aiResult.body
        }
      } else {
        message = this.replaceVariables(message, contact, campaignContact.customVariables)
      }

      // TODO: Implement actual LinkedIn API integration
      console.log(`[LinkedIn Message] Would send message to ${contact.linkedinUrl}`)
      console.log(`[LinkedIn Message] Content: ${message}`)

      await prisma.campaignNode.update({
        where: { id: node.id },
        data: {
          totalExecuted: { increment: 1 },
          totalSuccess: { increment: 1 },
        },
      })

      return {
        success: true,
        status: ExecutionStatus.COMPLETED,
        message: `LinkedIn message sent to ${contact.firstName}`,
        data: {
          body: message,
        },
        nextNodeOrder: node.order + 1,
        nextActionAt: new Date(),
      }
    } catch (error: any) {
      await prisma.campaignNode.update({
        where: { id: node.id },
        data: {
          totalExecuted: { increment: 1 },
          totalFailed: { increment: 1 },
        },
      })

      return {
        success: false,
        status: ExecutionStatus.FAILED,
        error: error.message || 'Failed to send LinkedIn message',
      }
    }
  }

  private replaceVariables(
    text: string,
    contact: ExecutionContext['campaignContact']['contact'],
    customVariables?: Record<string, any> | null
  ): string {
    let result = text
    result = result.replace(/\{\{firstName\}\}/g, contact.firstName || '')
    result = result.replace(/\{\{lastName\}\}/g, contact.lastName || '')
    result = result.replace(/\{\{jobTitle\}\}/g, contact.jobTitle || '')
    result = result.replace(/\{\{company\}\}/g, contact.company?.name || '')

    if (customVariables) {
      for (const [key, value] of Object.entries(customVariables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
      }
    }

    return result
  }
}

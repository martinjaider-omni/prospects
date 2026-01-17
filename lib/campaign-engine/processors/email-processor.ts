import { NodeType, ExecutionStatus } from '@prisma/client'
import { NodeProcessor, ExecutionContext, ExecutionResult, NodeConfig } from '../types'
import prisma from '@/lib/prisma'
import { generateEmail } from '@/lib/ai'
import { sendEmail } from '@/lib/email'

export class EmailProcessor implements NodeProcessor {
  canProcess(nodeType: NodeType): boolean {
    return nodeType === 'ACTION_EMAIL'
  }

  async process(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, campaignContact, campaign } = context
    const contact = campaignContact.contact
    const config = (node.config || {}) as NodeConfig

    try {
      // Check if we should skip based on conditions
      const shouldSkip = await this.checkConditions(context)
      if (shouldSkip) {
        return {
          success: true,
          status: ExecutionStatus.SKIPPED,
          message: 'Skipped due to conditions',
          nextNodeOrder: node.order + 1,
          nextActionAt: new Date(),
        }
      }

      // Check if we have an email account configured
      if (!campaign.emailAccountId) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'No email account configured for this campaign',
        }
      }

      // Get email account
      const emailAccount = await prisma.emailAccount.findUnique({
        where: { id: campaign.emailAccountId },
      })

      if (!emailAccount || !emailAccount.isActive) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'Email account not found or inactive',
        }
      }

      // Check contact has email
      if (!contact.email) {
        return {
          success: false,
          status: ExecutionStatus.FAILED,
          error: 'Contact has no email address',
        }
      }

      // Generate email content
      let subject = node.subject || ''
      let body = node.body || ''

      // If AI mode, generate content using AI
      if (config.mode === 'ai') {
        const aiContent = await this.generateAIContent(context)
        subject = aiContent.subject
        body = aiContent.body
      } else {
        // Replace variables in template
        subject = this.replaceVariables(subject, contact, campaignContact.customVariables)
        body = this.replaceVariables(body, contact, campaignContact.customVariables)
      }

      // Send the email
      const result = await sendEmail({
        to: contact.email,
        subject,
        body,
        html: body,
        accountId: campaign.emailAccountId,
        trackOpens: true,
        trackClicks: true,
      })

      // Update stats
      await prisma.campaignNode.update({
        where: { id: node.id },
        data: {
          totalExecuted: { increment: 1 },
          totalSuccess: { increment: 1 },
        },
      })

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { totalSent: { increment: 1 } },
      })

      return {
        success: true,
        status: ExecutionStatus.COMPLETED,
        message: `Email sent to ${contact.email}`,
        data: {
          subject,
          body,
          messageId: result.messageId,
        },
        nextNodeOrder: node.order + 1,
        nextActionAt: new Date(),
      }
    } catch (error: any) {
      // Update failure stats
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
        error: error.message || 'Failed to send email',
      }
    }
  }

  private async checkConditions(context: ExecutionContext): Promise<boolean> {
    const { node, campaignContact } = context
    const conditions = node.conditions || {}

    if (conditions.onlyIfNoReply) {
      // Check if contact has replied to any previous email
      const hasReplied = await prisma.campaignNodeExecution.findFirst({
        where: {
          campaignContactId: campaignContact.id,
          repliedAt: { not: null },
        },
      })
      if (hasReplied) return true
    }

    if (conditions.onlyIfNoOpen) {
      // Check if contact has opened any previous email
      const hasOpened = await prisma.campaignNodeExecution.findFirst({
        where: {
          campaignContactId: campaignContact.id,
          openedAt: { not: null },
        },
      })
      if (hasOpened) return true
    }

    return false
  }

  private async generateAIContent(context: ExecutionContext): Promise<{ subject: string; body: string }> {
    const { node, campaignContact, campaign } = context
    const contact = campaignContact.contact
    const config = (node.config || {}) as NodeConfig

    try {
      const result = await generateEmail({
        contactFirstName: contact.firstName,
        contactLastName: contact.lastName,
        contactJobTitle: contact.jobTitle || undefined,
        companyName: contact.company?.name,
        companyIndustry: contact.company?.industry || undefined,
        purpose: config.prompt || campaign.productPrompt || 'Introduce our product/service',
        customInstructions: campaign.instructionsPrompt || undefined,
        tone: 'professional',
      })

      if ('error' in result) {
        throw new Error(result.error)
      }

      // Generate a subject line based on the body or use a default
      const generatedSubject = node.subject || `Re: ${contact.company?.name || contact.firstName}`

      return {
        subject: generatedSubject,
        body: result.body,
      }
    } catch (error) {
      // Fallback to template if AI fails
      return {
        subject: node.subject || 'Hello {{firstName}}',
        body: node.body || 'Hi {{firstName}}, I wanted to reach out...',
      }
    }
  }

  private replaceVariables(
    text: string,
    contact: ExecutionContext['campaignContact']['contact'],
    customVariables?: Record<string, any> | null
  ): string {
    let result = text

    // Standard variables
    result = result.replace(/\{\{firstName\}\}/g, contact.firstName || '')
    result = result.replace(/\{\{lastName\}\}/g, contact.lastName || '')
    result = result.replace(/\{\{email\}\}/g, contact.email || '')
    result = result.replace(/\{\{jobTitle\}\}/g, contact.jobTitle || '')
    result = result.replace(/\{\{company\}\}/g, contact.company?.name || '')
    result = result.replace(/\{\{companyName\}\}/g, contact.company?.name || '')

    // Custom variables
    if (customVariables) {
      for (const [key, value] of Object.entries(customVariables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
      }
    }

    return result
  }
}

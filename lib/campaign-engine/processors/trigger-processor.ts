import { NodeType, ExecutionStatus } from '@prisma/client'
import { NodeProcessor, ExecutionContext, ExecutionResult } from '../types'

export class TriggerProcessor implements NodeProcessor {
  canProcess(nodeType: NodeType): boolean {
    return nodeType === 'TRIGGER_START'
  }

  async process(context: ExecutionContext): Promise<ExecutionResult> {
    const { node, campaignContact } = context

    // Trigger nodes always succeed - they just mark the contact as started
    // The campaign engine will then move to the next node

    return {
      success: true,
      status: ExecutionStatus.COMPLETED,
      message: `Contact ${campaignContact.contact.firstName} started in campaign`,
      nextNodeOrder: node.order + 1,
      nextActionAt: new Date(), // Move immediately to next node
    }
  }
}

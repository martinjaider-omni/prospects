import { NodeType, ExecutionStatus, DelayUnit } from '@prisma/client'
import { NodeProcessor, ExecutionContext, ExecutionResult } from '../types'

export class DelayProcessor implements NodeProcessor {
  canProcess(nodeType: NodeType): boolean {
    return nodeType === 'DELAY'
  }

  async process(context: ExecutionContext): Promise<ExecutionResult> {
    const { node } = context

    const delayValue = node.delayValue || 1
    const delayUnit = node.delayUnit || DelayUnit.DAYS

    // Calculate when the next action should happen
    const nextActionAt = this.calculateNextActionTime(delayValue, delayUnit)

    return {
      success: true,
      status: ExecutionStatus.COMPLETED,
      message: `Waiting ${delayValue} ${delayUnit.toLowerCase()}`,
      data: {
        scheduledFor: nextActionAt,
      },
      nextNodeOrder: node.order + 1,
      nextActionAt,
    }
  }

  private calculateNextActionTime(value: number, unit: DelayUnit): Date {
    const now = new Date()

    switch (unit) {
      case DelayUnit.MINUTES:
        return new Date(now.getTime() + value * 60 * 1000)
      case DelayUnit.HOURS:
        return new Date(now.getTime() + value * 60 * 60 * 1000)
      case DelayUnit.DAYS:
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000)
    }
  }
}

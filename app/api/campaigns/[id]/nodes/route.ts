import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { NodeType, DelayUnit, Prisma } from '@prisma/client'

interface NodeInput {
  id?: string
  order: number
  nodeType: string
  title: string
  config?: Record<string, any>
  delayValue?: number
  delayUnit?: string
  subject?: string
  body?: string
  conditions?: Record<string, any>
}

// GET /api/campaigns/[id]/nodes - Get campaign nodes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const nodes = await prisma.campaignNode.findMany({
      where: { campaignId: id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(nodes)
  } catch (error: any) {
    console.error('Get nodes error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener nodos' },
      { status: 500 }
    )
  }
}

// PUT /api/campaigns/[id]/nodes - Save/Update campaign nodes
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nodes } = body as { nodes: NodeInput[] }

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { error: 'Nodes array is required' },
        { status: 400 }
      )
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Delete existing nodes and recreate them
    // Using transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing nodes
      await tx.campaignNode.deleteMany({
        where: { campaignId: id },
      })

      // Create new nodes
      const createdNodes = await Promise.all(
        nodes.map(async (node, index) => {
          return tx.campaignNode.create({
            data: {
              campaignId: id,
              order: node.order ?? index,
              nodeType: mapNodeType(node.nodeType),
              title: node.title,
              config: node.config ?? Prisma.JsonNull,
              delayValue: node.delayValue ?? null,
              delayUnit: node.delayUnit ? mapDelayUnit(node.delayUnit) : null,
              subject: node.subject ?? null,
              body: node.body ?? null,
              conditions: node.conditions ?? Prisma.JsonNull,
            },
          })
        })
      )

      return createdNodes
    })

    return NextResponse.json({
      success: true,
      nodes: result,
    })
  } catch (error: any) {
    console.error('Save nodes error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar nodos' },
      { status: 500 }
    )
  }
}

// Helper to map string nodeType to enum
function mapNodeType(type: string): NodeType {
  const mapping: Record<string, NodeType> = {
    'trigger': NodeType.TRIGGER_START,
    'on_start_contact': NodeType.TRIGGER_START,
    'TRIGGER_START': NodeType.TRIGGER_START,
    'action': NodeType.ACTION_EMAIL,
    'send_email': NodeType.ACTION_EMAIL,
    'ACTION_EMAIL': NodeType.ACTION_EMAIL,
    'send_linkedin_invitation': NodeType.ACTION_LINKEDIN_CONNECT,
    'ACTION_LINKEDIN_CONNECT': NodeType.ACTION_LINKEDIN_CONNECT,
    'conversation_introduction': NodeType.ACTION_LINKEDIN_MESSAGE,
    'send_linkedin_message': NodeType.ACTION_LINKEDIN_MESSAGE,
    'ACTION_LINKEDIN_MESSAGE': NodeType.ACTION_LINKEDIN_MESSAGE,
    'send_instagram_dm': NodeType.ACTION_INSTAGRAM_DM,
    'ACTION_INSTAGRAM_DM': NodeType.ACTION_INSTAGRAM_DM,
    'delay': NodeType.DELAY,
    'DELAY': NodeType.DELAY,
    'condition': NodeType.CONDITION,
    'CONDITION': NodeType.CONDITION,
    'manual_task': NodeType.MANUAL_TASK,
    'MANUAL_TASK': NodeType.MANUAL_TASK,
  }

  return mapping[type] || NodeType.ACTION_EMAIL
}

// Helper to map string delayUnit to enum
function mapDelayUnit(unit: string): DelayUnit {
  const mapping: Record<string, DelayUnit> = {
    'minutes': DelayUnit.MINUTES,
    'MINUTES': DelayUnit.MINUTES,
    'hours': DelayUnit.HOURS,
    'HOURS': DelayUnit.HOURS,
    'days': DelayUnit.DAYS,
    'DAYS': DelayUnit.DAYS,
  }

  return mapping[unit] || DelayUnit.DAYS
}

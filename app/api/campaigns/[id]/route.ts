import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/campaigns/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        emailAccount: true,
        contacts: {
          include: {
            contact: {
              include: {
                company: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Error al obtener campaña' },
      { status: 500 }
    )
  }
}

// PATCH /api/campaigns/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      name,
      description,
      status,
      emailAccountId,
      steps,
      timezone,
      sendingDays,
      sendingStartHour,
      sendingEndHour,
      dailyLimit,
    } = body

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(emailAccountId !== undefined && { emailAccountId }),
        ...(timezone !== undefined && { timezone }),
        ...(sendingDays !== undefined && { sendingDays }),
        ...(sendingStartHour !== undefined && { sendingStartHour }),
        ...(sendingEndHour !== undefined && { sendingEndHour }),
        ...(dailyLimit !== undefined && { dailyLimit }),
        ...(status === 'ACTIVE' && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
      include: {
        steps: { orderBy: { order: 'asc' } },
        emailAccount: true,
      },
    })

    // Update steps if provided
    if (steps && Array.isArray(steps)) {
      // Delete existing steps
      await prisma.campaignStep.deleteMany({
        where: { campaignId: id },
      })

      // Create new steps
      await prisma.campaignStep.createMany({
        data: steps.map((step: any, index: number) => ({
          campaignId: id,
          order: index + 1,
          type: step.type || 'EMAIL',
          subject: step.subject,
          body: step.body || '',
          delayDays: step.delayDays || 0,
          sendOnlyIfNoReply: step.sendOnlyIfNoReply ?? true,
          sendOnlyIfNoOpen: step.sendOnlyIfNoOpen ?? false,
        })),
      })
    }

    // Fetch updated campaign with new steps
    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        emailAccount: true,
      },
    })

    return NextResponse.json(updatedCampaign)
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Error al actualizar campaña' },
      { status: 500 }
    )
  }
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.campaign.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Error al eliminar campaña' },
      { status: 500 }
    )
  }
}

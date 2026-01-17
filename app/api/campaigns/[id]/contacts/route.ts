import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/campaigns/[id]/contacts - Add contacts to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { contactIds } = body

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de contactos' },
        { status: 400 }
      )
    }

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      )
    }

    // Get existing campaign contacts to avoid duplicates
    const existingContacts = await prisma.campaignContact.findMany({
      where: {
        campaignId: id,
        contactId: { in: contactIds },
      },
      select: { contactId: true },
    })

    const existingContactIds = new Set(existingContacts.map(c => c.contactId))
    const newContactIds = contactIds.filter(cId => !existingContactIds.has(cId))

    if (newContactIds.length === 0) {
      return NextResponse.json({
        added: 0,
        skipped: contactIds.length,
        message: 'Todos los contactos ya estaban en la campaña',
      })
    }

    // Add new contacts to campaign
    await prisma.campaignContact.createMany({
      data: newContactIds.map(contactId => ({
        campaignId: id,
        contactId,
        status: 'ACTIVE',
        currentStep: 0,
        enrolledAt: new Date(),
      })),
    })

    return NextResponse.json({
      added: newContactIds.length,
      skipped: existingContactIds.size,
    })
  } catch (error) {
    console.error('Error adding contacts to campaign:', error)
    return NextResponse.json(
      { error: 'Error al añadir contactos a la campaña' },
      { status: 500 }
    )
  }
}

// DELETE /api/campaigns/[id]/contacts - Remove contacts from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { contactIds } = body

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de contactos' },
        { status: 400 }
      )
    }

    await prisma.campaignContact.deleteMany({
      where: {
        campaignId: id,
        contactId: { in: contactIds },
      },
    })

    return NextResponse.json({ removed: contactIds.length })
  } catch (error) {
    console.error('Error removing contacts from campaign:', error)
    return NextResponse.json(
      { error: 'Error al eliminar contactos de la campaña' },
      { status: 500 }
    )
  }
}

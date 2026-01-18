import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateEmail, generateReplysuggestion } from '@/lib/ai'

// POST /api/inbox/[id]/generate - Generate AI reply suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { customInstruction } = body

    // Get thread with all context
    const thread = await prisma.emailThread.findUnique({
      where: { id },
      include: {
        contact: {
          include: {
            company: true,
          },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
        },
        campaign: true,
      },
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread no encontrado' },
        { status: 404 }
      )
    }

    // Get the last inbound message to reply to
    const lastInboundMessage = [...thread.messages]
      .reverse()
      .find(m => m.direction === 'INBOUND')

    if (!lastInboundMessage) {
      return NextResponse.json(
        { error: 'No hay mensaje entrante para responder' },
        { status: 400 }
      )
    }

    // Build conversation history
    const previousMessages = thread.messages.map(m => ({
      direction: m.direction.toLowerCase() as 'inbound' | 'outbound',
      body: m.body.replace(/<[^>]*>/g, ''), // Strip HTML
    }))

    // Determine purpose from campaign or custom instruction
    const purpose = customInstruction ||
      thread.campaign?.productPrompt ||
      'Continuar la conversacion de manera profesional'

    // Generate reply suggestion
    const result = await generateReplysuggestion(
      lastInboundMessage.body.replace(/<[^>]*>/g, ''),
      {
        contactName: `${thread.contact.firstName} ${thread.contact.lastName}`,
        campaignPurpose: purpose,
        previousMessages,
      }
    )

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      suggestion: result.suggestion,
      context: {
        contactName: `${thread.contact.firstName} ${thread.contact.lastName}`,
        company: thread.contact.company?.name,
        lastMessage: lastInboundMessage.body.replace(/<[^>]*>/g, '').substring(0, 200),
      },
    })
  } catch (error: any) {
    console.error('Error generating reply:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar respuesta' },
      { status: 500 }
    )
  }
}

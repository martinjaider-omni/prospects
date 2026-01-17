import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/inbox/[id]/reply - Reply to thread
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { body: messageBody } = body

    if (!messageBody) {
      return NextResponse.json(
        { error: 'El mensaje es requerido' },
        { status: 400 }
      )
    }

    // Get thread with contact
    const thread = await prisma.emailThread.findUnique({
      where: { id },
      include: {
        contact: true,
      },
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread no encontrado' },
        { status: 404 }
      )
    }

    // Create new message
    const message = await prisma.emailMessage.create({
      data: {
        threadId: id,
        direction: 'OUTBOUND',
        subject: `Re: ${thread.subject}`,
        body: messageBody,
        from: 'noreply@prospects.app',
        to: thread.contact.email || '',
        sentAt: new Date(),
      },
    })

    // Update thread
    const updatedThread = await prisma.emailThread.update({
      where: { id },
      data: {
        status: 'REPLIED',
      },
      include: {
        contact: {
          include: {
            company: {
              select: { name: true }
            }
          }
        },
        messages: {
          orderBy: { sentAt: 'asc' },
        },
        _count: {
          select: { messages: true }
        }
      },
    })

    // TODO: Actually send the email via SMTP/Gmail
    // For now, we just save the message to the database

    return NextResponse.json(updatedThread)
  } catch (error) {
    console.error('Error sending reply:', error)
    return NextResponse.json(
      { error: 'Error al enviar respuesta' },
      { status: 500 }
    )
  }
}

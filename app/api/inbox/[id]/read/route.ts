import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/inbox/[id]/read - Mark thread messages as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // TODO: Add read tracking when schema supports it
    // For now, just verify the thread exists
    await prisma.emailThread.findUniqueOrThrow({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking as read:', error)
    return NextResponse.json(
      { error: 'Error al marcar como leído' },
      { status: 500 }
    )
  }
}

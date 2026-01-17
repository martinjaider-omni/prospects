import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/inbox/[id] - Get single thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const thread = await prisma.emailThread.findUnique({
      where: { id },
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

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(thread)
  } catch (error) {
    console.error('Error fetching thread:', error)
    return NextResponse.json(
      { error: 'Error al obtener thread' },
      { status: 500 }
    )
  }
}

// PATCH /api/inbox/[id] - Update thread (archive, star, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, isStarred } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (isStarred !== undefined) updateData.isStarred = isStarred

    const thread = await prisma.emailThread.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(thread)
  } catch (error) {
    console.error('Error updating thread:', error)
    return NextResponse.json(
      { error: 'Error al actualizar thread' },
      { status: 500 }
    )
  }
}

// DELETE /api/inbox/[id] - Delete thread
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.emailThread.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting thread:', error)
    return NextResponse.json(
      { error: 'Error al eliminar thread' },
      { status: 500 }
    )
  }
}

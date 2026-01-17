import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/settings/linkedin-accounts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const account = await prisma.linkedInAccount.findUnique({
      where: { id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error fetching LinkedIn account:', error)
    return NextResponse.json(
      { error: 'Error al obtener cuenta' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings/linkedin-accounts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, profileUrl, sessionCookie, isActive, dailyConnectionLimit, dailyMessageLimit } = body

    const account = await prisma.linkedInAccount.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(profileUrl && { profileUrl }),
        ...(sessionCookie !== undefined && { sessionCookie }),
        ...(isActive !== undefined && { isActive }),
        ...(dailyConnectionLimit !== undefined && { dailyConnectionLimit }),
        ...(dailyMessageLimit !== undefined && { dailyMessageLimit }),
      },
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error updating LinkedIn account:', error)
    return NextResponse.json(
      { error: 'Error al actualizar cuenta' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/linkedin-accounts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.linkedInAccount.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting LinkedIn account:', error)
    return NextResponse.json(
      { error: 'Error al eliminar cuenta' },
      { status: 500 }
    )
  }
}

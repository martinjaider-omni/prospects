import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// DELETE /api/settings/email-accounts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.emailAccount.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email account:', error)
    return NextResponse.json(
      { error: 'Error al eliminar cuenta' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings/email-accounts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const account = await prisma.emailAccount.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error updating email account:', error)
    return NextResponse.json(
      { error: 'Error al actualizar cuenta' },
      { status: 500 }
    )
  }
}

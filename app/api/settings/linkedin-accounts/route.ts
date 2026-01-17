import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/settings/linkedin-accounts - Get all LinkedIn accounts
export async function GET() {
  try {
    const accounts = await prisma.linkedInAccount.findMany({
      select: {
        id: true,
        name: true,
        profileUrl: true,
        dailyConnectionLimit: true,
        dailyMessageLimit: true,
        connectionsSentToday: true,
        messagesSentToday: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Error fetching LinkedIn accounts:', error)
    return NextResponse.json(
      { error: 'Error al obtener cuentas de LinkedIn' },
      { status: 500 }
    )
  }
}

// POST /api/settings/linkedin-accounts - Create LinkedIn account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, profileUrl, sessionCookie } = body

    if (!name || !profileUrl) {
      return NextResponse.json(
        { error: 'Nombre y URL de perfil son requeridos' },
        { status: 400 }
      )
    }

    // Check if account already exists
    const existing = await prisma.linkedInAccount.findFirst({
      where: { profileUrl },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este perfil' },
        { status: 400 }
      )
    }

    const account = await prisma.linkedInAccount.create({
      data: {
        name,
        profileUrl,
        sessionCookie: sessionCookie || null,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        profileUrl: account.profileUrl,
      },
    })
  } catch (error: any) {
    console.error('Error creating LinkedIn account:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear cuenta de LinkedIn' },
      { status: 500 }
    )
  }
}

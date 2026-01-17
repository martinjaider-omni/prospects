import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/settings/email-accounts
export async function GET() {
  try {
    const accounts = await prisma.emailAccount.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        isActive: true,
        isVerified: true,
        dailyLimit: true,
        sentToday: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching email accounts:', error)
    return NextResponse.json(
      { error: 'Error al obtener cuentas de email' },
      { status: 500 }
    )
  }
}

// POST /api/settings/email-accounts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      type,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      imapHost,
      imapPort,
      imapUser,
      imapPass,
      dailyLimit = 100,
      signature,
    } = body

    if (!name || !email || !type) {
      return NextResponse.json(
        { error: 'Nombre, email y tipo son requeridos' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.emailAccount.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este email' },
        { status: 400 }
      )
    }

    const account = await prisma.emailAccount.create({
      data: {
        name,
        email,
        type,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure: true,
        imapHost,
        imapPort,
        imapUser,
        imapPass,
        imapSecure: true,
        dailyLimit,
        signature,
        isActive: true,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Error creating email account:', error)
    return NextResponse.json(
      { error: 'Error al crear cuenta de email' },
      { status: 500 }
    )
  }
}

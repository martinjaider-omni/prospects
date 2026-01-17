import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''

    const where: any = {}
    if (status) {
      where.status = status
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        emailAccount: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { contacts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Error al obtener campañas' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      emailAccountId,
      steps,
      timezone = 'Europe/Madrid',
      sendingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      sendingStartHour = 9,
      sendingEndHour = 18,
      dailyLimit = 50,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Se requiere nombre de campaña' },
        { status: 400 }
      )
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        emailAccountId,
        timezone,
        sendingDays,
        sendingStartHour,
        sendingEndHour,
        dailyLimit,
        steps: steps?.length > 0 ? {
          create: steps.map((step: any, index: number) => ({
            order: index + 1,
            type: step.type || 'EMAIL',
            subject: step.subject,
            body: step.body || '',
            delayDays: step.delayDays || 0,
            sendOnlyIfNoReply: step.sendOnlyIfNoReply ?? true,
            sendOnlyIfNoOpen: step.sendOnlyIfNoOpen ?? false,
          })),
        } : undefined,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        emailAccount: true,
      },
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Error al crear campaña' },
      { status: 500 }
    )
  }
}

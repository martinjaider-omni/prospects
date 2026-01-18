import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/inbox - Get all email threads
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const accountId = searchParams.get('accountId')
    const campaignId = searchParams.get('campaignId')
    const starred = searchParams.get('starred')
    const unread = searchParams.get('unread')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (accountId && accountId !== 'all') {
      where.emailAccountId = accountId
    }

    if (campaignId && campaignId !== 'all') {
      where.campaignId = campaignId
    }

    if (starred === 'true') {
      where.isStarred = true
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { contact: { firstName: { contains: search, mode: 'insensitive' } } },
        { contact: { lastName: { contains: search, mode: 'insensitive' } } },
        { contact: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const threads = await prisma.emailThread.findMany({
      where,
      include: {
        contact: {
          include: {
            company: {
              select: {
                name: true
              }
            }
          }
        },
        messages: {
          orderBy: { sentAt: 'asc' },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            productPrompt: true,
            instructionsPrompt: true,
          }
        },
        emailAccount: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    })

    // If unread filter is set, filter threads that have unread inbound messages
    let filteredThreads = threads
    if (unread === 'true') {
      filteredThreads = threads.filter(thread =>
        thread.messages.some(m => !m.isRead && m.direction === 'INBOUND')
      )
    }

    return NextResponse.json(filteredThreads)
  } catch (error) {
    console.error('Error fetching inbox:', error)
    return NextResponse.json(
      { error: 'Error al obtener mensajes' },
      { status: 500 }
    )
  }
}

// GET /api/inbox/stats - Get inbox statistics
export async function POST(request: NextRequest) {
  try {
    const [
      totalThreads,
      unreadCount,
      unrepliedCount,
      starredCount,
    ] = await Promise.all([
      prisma.emailThread.count(),
      prisma.emailThread.count({
        where: {
          messages: {
            some: {
              isRead: false,
              direction: 'INBOUND',
            },
          },
        },
      }),
      prisma.emailThread.count({
        where: { status: 'OPEN' },
      }),
      prisma.emailThread.count({
        where: { isStarred: true },
      }),
    ])

    return NextResponse.json({
      total: totalThreads,
      unread: unreadCount,
      unreplied: unrepliedCount,
      starred: starredCount,
    })
  } catch (error) {
    console.error('Error fetching inbox stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/inbox - Get all email threads
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}

    if (status) {
      where.status = status
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
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(threads)
  } catch (error) {
    console.error('Error fetching inbox:', error)
    return NextResponse.json(
      { error: 'Error al obtener mensajes' },
      { status: 500 }
    )
  }
}

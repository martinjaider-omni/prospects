import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/contacts - List all contacts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const emailStatus = searchParams.get('emailStatus') || ''
    const companyId = searchParams.get('companyId') || ''

    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (emailStatus) {
      where.emailStatus = emailStatus
    }

    if (companyId) {
      where.companyId = companyId
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true, domain: true },
          },
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      data: contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Error al obtener contactos' },
      { status: 500 }
    )
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      linkedinUrl,
      jobTitle,
      companyName,
      location,
      notes,
      source = 'manual',
    } = body

    // Validate required fields
    if (!firstName && !lastName && !email) {
      return NextResponse.json(
        { error: 'Se requiere al menos nombre, apellido o email' },
        { status: 400 }
      )
    }

    // Find or create company if provided
    let companyId: string | undefined
    if (companyName) {
      const company = await prisma.company.upsert({
        where: { domain: companyName.toLowerCase().replace(/\s+/g, '') },
        update: {},
        create: {
          name: companyName,
          domain: companyName.toLowerCase().replace(/\s+/g, ''),
        },
      })
      companyId = company.id
    }

    const contact = await prisma.contact.create({
      data: {
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || null,
        phone: phone || null,
        linkedinUrl: linkedinUrl || null,
        jobTitle: jobTitle || null,
        location: location || null,
        notes: notes || null,
        source,
        companyId,
      },
      include: {
        company: true,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Error al crear contacto' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/contacts/[id] - Get a single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        tags: true,
        campaigns: {
          include: {
            campaign: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        emailThreads: {
          include: {
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { error: 'Error al obtener contacto' },
      { status: 500 }
    )
  }
}

// PATCH /api/contacts/[id] - Update a contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    } = body

    // Find or create company if provided
    let companyId: string | undefined
    if (companyName) {
      const company = await prisma.company.upsert({
        where: { domain: companyName.toLowerCase().replace(/\s+/g, '') },
        update: { name: companyName },
        create: {
          name: companyName,
          domain: companyName.toLowerCase().replace(/\s+/g, ''),
        },
      })
      companyId = company.id
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(linkedinUrl !== undefined && { linkedinUrl: linkedinUrl || null }),
        ...(jobTitle !== undefined && { jobTitle: jobTitle || null }),
        ...(location !== undefined && { location: location || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(companyId && { companyId }),
      },
      include: {
        company: true,
        tags: true,
      },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Error al actualizar contacto' },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.contact.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Error al eliminar contacto' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyEmail } from '@/lib/apollo'
import prisma from '@/lib/prisma'

// POST /api/apollo/verify - Verify email(s) using Apollo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, emails } = body

    // Single email verification
    if (email) {
      const result = await verifyEmail(email)

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json(result)
    }

    // Bulk email verification
    if (emails && Array.isArray(emails)) {
      if (emails.length > 50) {
        return NextResponse.json(
          { error: 'Máximo 50 emails por solicitud' },
          { status: 400 }
        )
      }

      const results = await Promise.all(
        emails.map(async (e: string) => {
          const result = await verifyEmail(e)
          if ('error' in result) {
            return { email: e, status: 'error' as const, error: result.error }
          }
          return result
        })
      )

      return NextResponse.json({ results })
    }

    return NextResponse.json(
      { error: 'Se requiere email o emails' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al verificar email' },
      { status: 500 }
    )
  }
}

// POST /api/apollo/verify/contact - Verify email for a specific contact and update DB
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactId } = body

    if (!contactId) {
      return NextResponse.json(
        { error: 'Se requiere contactId' },
        { status: 400 }
      )
    }

    // Get the contact
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    if (!contact.email) {
      return NextResponse.json(
        { error: 'El contacto no tiene email' },
        { status: 400 }
      )
    }

    // Verify the email
    const result = await verifyEmail(contact.email)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Map status to enum
    const statusMap: Record<string, 'VALID' | 'INVALID' | 'CATCH_ALL' | 'RISKY' | 'UNKNOWN'> = {
      valid: 'VALID',
      invalid: 'INVALID',
      catch_all: 'CATCH_ALL',
      risky: 'RISKY',
      unknown: 'UNKNOWN',
    }

    // Update the contact
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        emailStatus: statusMap[result.status] ?? 'UNKNOWN',
        emailVerified: true,
      },
    })

    return NextResponse.json({
      success: true,
      email: result.email,
      status: result.status,
      contact: updatedContact,
    })
  } catch (error: any) {
    console.error('Contact email verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al verificar email del contacto' },
      { status: 500 }
    )
  }
}

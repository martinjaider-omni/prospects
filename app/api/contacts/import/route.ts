import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/contacts/import - Bulk import contacts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contacts } = body

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de contactos' },
        { status: 400 }
      )
    }

    let successCount = 0
    let errorCount = 0
    const errors: { row: number; error: string }[] = []

    // Process contacts in batches
    const batchSize = 100
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)

      for (let j = 0; j < batch.length; j++) {
        const contact = batch[j]
        const rowIndex = i + j + 1

        try {
          // Skip if no meaningful data
          if (!contact.firstName && !contact.lastName && !contact.email) {
            continue
          }

          // Find or create company if provided
          let companyId: string | undefined
          if (contact.companyName) {
            const company = await prisma.company.upsert({
              where: { domain: contact.companyName.toLowerCase().replace(/\s+/g, '') },
              update: {},
              create: {
                name: contact.companyName,
                domain: contact.companyName.toLowerCase().replace(/\s+/g, ''),
              },
            })
            companyId = company.id
          }

          // Create contact
          await prisma.contact.create({
            data: {
              firstName: contact.firstName || '',
              lastName: contact.lastName || '',
              email: contact.email || null,
              phone: contact.phone || null,
              linkedinUrl: contact.linkedinUrl || null,
              jobTitle: contact.jobTitle || null,
              location: contact.location || null,
              notes: contact.notes || null,
              source: 'csv',
              companyId,
            },
          })

          successCount++
        } catch (err: any) {
          errorCount++
          errors.push({
            row: rowIndex,
            error: err.message || 'Error desconocido',
          })
        }
      }
    }

    return NextResponse.json({
      success: successCount,
      errors: errorCount,
      errorDetails: errors.slice(0, 10), // Only return first 10 errors
    })
  } catch (error) {
    console.error('Error importing contacts:', error)
    return NextResponse.json(
      { error: 'Error al importar contactos' },
      { status: 500 }
    )
  }
}

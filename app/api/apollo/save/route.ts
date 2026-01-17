import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/apollo/save - Save Apollo results as contacts
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

    let savedCount = 0
    let skippedCount = 0

    for (const contact of contacts) {
      try {
        // Check if contact with same email already exists
        if (contact.email) {
          const existing = await prisma.contact.findFirst({
            where: { email: contact.email },
          })
          if (existing) {
            skippedCount++
            continue
          }
        }

        // Find or create company if provided
        let companyId: string | undefined
        if (contact.company) {
          const domain = contact.company.website
            ? new URL(contact.company.website).hostname.replace('www.', '')
            : contact.company.name.toLowerCase().replace(/\s+/g, '')

          const company = await prisma.company.upsert({
            where: { domain },
            update: {
              name: contact.company.name,
              website: contact.company.website,
              linkedinUrl: contact.company.linkedinUrl,
              industry: contact.company.industry,
              size: contact.company.size,
              apolloId: contact.company.apolloId,
            },
            create: {
              name: contact.company.name,
              domain,
              website: contact.company.website,
              linkedinUrl: contact.company.linkedinUrl,
              industry: contact.company.industry,
              size: contact.company.size,
              apolloId: contact.company.apolloId,
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
            emailStatus: contact.emailStatus || 'UNKNOWN',
            emailVerified: contact.emailStatus === 'VALID',
            phone: contact.phone || null,
            linkedinUrl: contact.linkedinUrl || null,
            jobTitle: contact.jobTitle || null,
            seniority: contact.seniority || null,
            department: contact.department || null,
            location: contact.location || null,
            apolloId: contact.apolloId || null,
            source: 'apollo',
            companyId,
          },
        })

        savedCount++
      } catch (err) {
        console.error('Error saving contact:', err)
        skippedCount++
      }
    }

    return NextResponse.json({
      saved: savedCount,
      skipped: skippedCount,
      total: contacts.length,
    })
  } catch (error: any) {
    console.error('Error saving Apollo contacts:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar contactos' },
      { status: 500 }
    )
  }
}

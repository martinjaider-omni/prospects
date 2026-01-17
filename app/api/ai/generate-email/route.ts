import { NextRequest, NextResponse } from 'next/server'
import { generateEmail } from '@/lib/ai'

// POST /api/ai/generate-email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      contactFirstName,
      contactLastName,
      contactJobTitle,
      companyName,
      companyIndustry,
      purpose = 'Generar interés en nuestros servicios y agendar una llamada',
      tone = 'professional',
      previousMessages,
      customInstructions,
      isFollowUp = false,
      stepNumber = 1,
    } = body

    const result = await generateEmail({
      contactFirstName,
      contactLastName,
      contactJobTitle,
      companyName,
      companyIndustry,
      purpose,
      tone,
      previousMessages,
      customInstructions,
      isFollowUp,
      stepNumber,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI generate email error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar email' },
      { status: 500 }
    )
  }
}

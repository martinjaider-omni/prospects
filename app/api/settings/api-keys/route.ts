import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/settings/api-keys - Get all API configurations
export async function GET() {
  try {
    const [apolloConfig, aiConfig] = await Promise.all([
      prisma.apolloConfig.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          isActive: true,
          dailySearchLimit: true,
          dailyEnrichLimit: true,
          searchesToday: true,
          enrichmentsToday: true,
          createdAt: true,
        },
      }),
      prisma.aIConfig.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          provider: true,
          model: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      apollo: apolloConfig
        ? { ...apolloConfig, configured: true }
        : { configured: false },
      ai: aiConfig
        ? { ...aiConfig, configured: true }
        : { configured: false },
    })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// POST /api/settings/api-keys - Save API key configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, apiKey, provider, model } = body

    if (!type || !apiKey) {
      return NextResponse.json(
        { error: 'Tipo y API key son requeridos' },
        { status: 400 }
      )
    }

    if (type === 'apollo') {
      // Deactivate existing config
      await prisma.apolloConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })

      // Create new config
      const config = await prisma.apolloConfig.create({
        data: {
          apiKey,
          isActive: true,
        },
      })

      return NextResponse.json({ success: true, id: config.id })
    }

    if (type === 'ai') {
      if (!provider) {
        return NextResponse.json(
          { error: 'Proveedor de IA es requerido' },
          { status: 400 }
        )
      }

      // Deactivate existing config
      await prisma.aIConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })

      // Create new config
      const config = await prisma.aIConfig.create({
        data: {
          apiKey,
          provider,
          model: model || getDefaultModel(provider),
          isActive: true,
        },
      })

      return NextResponse.json({ success: true, id: config.id })
    }

    return NextResponse.json(
      { error: 'Tipo de configuración no válido' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error saving API key:', error)
    return NextResponse.json(
      { error: 'Error al guardar configuración', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/api-keys
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'apollo') {
      await prisma.apolloConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    } else if (type === 'ai') {
      await prisma.aIConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: 'Error al eliminar configuración' },
      { status: 500 }
    )
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'OPENAI':
      return 'gpt-4o-mini'
    case 'ANTHROPIC':
      return 'claude-3-haiku-20240307'
    case 'GOOGLE':
      return 'gemini-1.5-flash'
    default:
      return ''
  }
}

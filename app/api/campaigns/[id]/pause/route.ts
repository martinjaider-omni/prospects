import { NextRequest, NextResponse } from 'next/server'
import { campaignEngine } from '@/lib/campaign-engine'

// POST /api/campaigns/[id]/pause - Pause a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await campaignEngine.pauseCampaign(id)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error: any) {
    console.error('Campaign pause error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al pausar campaña' },
      { status: 500 }
    )
  }
}

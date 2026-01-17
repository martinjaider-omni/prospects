import { NextRequest, NextResponse } from 'next/server'
import { campaignEngine } from '@/lib/campaign-engine'

// POST /api/campaigns/[id]/resume - Resume a paused campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await campaignEngine.resumeCampaign(id)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error: any) {
    console.error('Campaign resume error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al reanudar campaña' },
      { status: 500 }
    )
  }
}

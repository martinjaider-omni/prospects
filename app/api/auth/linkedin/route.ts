import { NextResponse } from 'next/server'
import { getLinkedInAuthUrl } from '@/lib/linkedin-oauth'

// GET /api/auth/linkedin - Start LinkedIn OAuth flow
export async function GET() {
  try {
    const authUrl = getLinkedInAuthUrl()
    return NextResponse.json({ url: authUrl })
  } catch (error: any) {
    console.error('LinkedIn OAuth error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al iniciar autenticacion con LinkedIn' },
      { status: 500 }
    )
  }
}

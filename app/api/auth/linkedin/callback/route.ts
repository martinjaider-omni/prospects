import { NextRequest, NextResponse } from 'next/server'
import { getLinkedInTokensFromCode, getLinkedInProfile, saveLinkedInAccount } from '@/lib/linkedin-oauth'

// GET /api/auth/linkedin/callback - LinkedIn OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent(errorDescription || 'Autorizacion cancelada o denegada')}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('Codigo de autorizacion no recibido')}`
      )
    }

    // Exchange code for tokens
    const tokens = await getLinkedInTokensFromCode(code)

    if (!tokens.accessToken) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('No se pudo obtener token de acceso')}`
      )
    }

    // Get user profile
    const profile = await getLinkedInProfile(tokens.accessToken)

    if (!profile.id) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent('No se pudo obtener perfil de LinkedIn')}`
      )
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000)

    // Build profile URL
    const profileUrl = `https://www.linkedin.com/in/${profile.id}`

    // Save account to database
    await saveLinkedInAccount(
      profile.id,
      profile.name || 'LinkedIn User',
      profile.email || '',
      profileUrl,
      tokens.accessToken,
      tokens.refreshToken || null,
      expiresAt
    )

    // Redirect to settings with success message
    return NextResponse.redirect(
      `${baseUrl}/settings?success=${encodeURIComponent(`Cuenta de LinkedIn ${profile.name} conectada exitosamente`)}`
    )
  } catch (error: any) {
    console.error('LinkedIn OAuth callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(error.message || 'Error al conectar cuenta de LinkedIn')}`
    )
  }
}

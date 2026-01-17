import prisma from './prisma'

// Basic scopes available with "Sign In with LinkedIn using OpenID Connect"
// w_member_social requires additional approval from LinkedIn
const LINKEDIN_SCOPES = [
  'profile',
  'email',
  'openid',
]

// Get LinkedIn OAuth configuration
export function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth credentials not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env')
  }

  return { clientId, clientSecret, redirectUri }
}

// Generate LinkedIn authorization URL
export function getLinkedInAuthUrl(state?: string) {
  const { clientId, redirectUri } = getLinkedInConfig()
  const scope = LINKEDIN_SCOPES.join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state: state || '',
  })

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
}

// Exchange authorization code for tokens
export async function getLinkedInTokensFromCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getLinkedInConfig()

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  })

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LinkedIn token exchange failed: ${error}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in, // In seconds
    refreshToken: data.refresh_token, // Only available for specific apps
    refreshTokenExpiresIn: data.refresh_token_expires_in,
  }
}

// Get LinkedIn user profile
export async function getLinkedInProfile(accessToken: string) {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get LinkedIn profile: ${error}`)
  }

  const data = await response.json()

  return {
    id: data.sub,
    name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
    email: data.email || '',
    picture: data.picture || '',
    locale: data.locale || '',
  }
}

// Save LinkedIn account to database
export async function saveLinkedInAccount(
  linkedInId: string,
  name: string,
  email: string,
  profileUrl: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date
) {
  // Check if account already exists by email or profile URL
  const existing = await prisma.linkedInAccount.findFirst({
    where: {
      OR: [
        { profileUrl: { contains: linkedInId } },
        { name },
      ],
    },
  })

  if (existing) {
    // Update existing account
    return await prisma.linkedInAccount.update({
      where: { id: existing.id },
      data: {
        name,
        profileUrl,
        sessionCookie: accessToken, // Using sessionCookie field to store OAuth token
        isActive: true,
      },
    })
  }

  // Create new account
  return await prisma.linkedInAccount.create({
    data: {
      name,
      profileUrl,
      sessionCookie: accessToken,
      isActive: true,
    },
  })
}

// Refresh LinkedIn access token
export async function refreshLinkedInToken(refreshToken: string) {
  const { clientId, clientSecret } = getLinkedInConfig()

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LinkedIn token refresh failed: ${error}`)
  }

  return await response.json()
}

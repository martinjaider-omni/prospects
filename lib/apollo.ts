import prisma from './prisma'

const APOLLO_API_URL = 'https://api.apollo.io/api/v1'

interface ApolloSearchParams {
  domain?: string
  companyName?: string
  jobTitles?: string[]
  seniorities?: string[]
  departments?: string[]
  locations?: string[]
  limit?: number
  page?: number
}

interface ApolloPerson {
  id: string
  first_name: string
  last_name: string
  email: string
  email_status: string
  phone_numbers?: { raw_number: string; sanitized_number?: string }[]
  linkedin_url?: string
  title: string
  seniority: string
  departments?: string[]
  city?: string
  state?: string
  country?: string
  organization?: {
    id: string
    name: string
    website_url: string
    linkedin_url: string
    industry: string
    estimated_num_employees: number
  }
}

interface ApolloSearchResponse {
  people: ApolloPerson[]
  pagination: {
    page: number
    per_page: number
    total_entries: number
    total_pages: number
  }
}

async function getApolloApiKey(): Promise<string | null> {
  const config = await prisma.apolloConfig.findFirst({
    where: { isActive: true },
  })
  return config?.apiKey || null
}

export async function searchPeopleByCompany(
  params: ApolloSearchParams
): Promise<{ data: ApolloPerson[]; pagination: any } | { error: string }> {
  const apiKey = await getApolloApiKey()

  if (!apiKey) {
    return { error: 'Apollo API key no configurada. Ve a Configuración para añadirla.' }
  }

  try {
    // Build request body for Apollo API (POST with JSON body)
    const requestBody: any = {
      per_page: params.limit || 25,
      page: params.page || 1,
    }

    if (params.domain) {
      requestBody.q_organization_domains = params.domain
    }

    if (params.companyName) {
      requestBody.q_organization_name = params.companyName
    }

    if (params.jobTitles && params.jobTitles.length > 0) {
      requestBody.person_titles = params.jobTitles
    }

    if (params.seniorities && params.seniorities.length > 0) {
      requestBody.person_seniorities = params.seniorities
    }

    if (params.departments && params.departments.length > 0) {
      requestBody.contact_email_status = params.departments
    }

    if (params.locations && params.locations.length > 0) {
      requestBody.person_locations = params.locations
    }

    console.log('Apollo API Request:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${APOLLO_API_URL}/mixed_people/api_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('Apollo API Error:', response.status, errorText)
      console.error('Apollo API URL:', `${APOLLO_API_URL}/mixed_people/api_search`)
      console.error('Apollo API Body:', JSON.stringify(requestBody))

      if (response.status === 401) {
        return { error: 'API key de Apollo inválida. Verifica tu configuración.' }
      }
      if (response.status === 429) {
        return { error: 'Límite de requests de Apollo alcanzado. Intenta más tarde.' }
      }
      if (response.status === 422) {
        // Include more details in the error
        return { error: `Parámetros de búsqueda inválidos (422): ${errorText.substring(0, 200)}` }
      }
      return { error: `Error de Apollo API: ${response.status} - ${errorText.substring(0, 200)}` }
    }

    const data: ApolloSearchResponse = await response.json()

    // Update daily search count
    await prisma.apolloConfig.updateMany({
      where: { isActive: true },
      data: { searchesToday: { increment: 1 } },
    })

    return {
      data: data.people || [],
      pagination: data.pagination,
    }
  } catch (error: any) {
    console.error('Apollo search error:', error)
    return { error: error.message || 'Error al buscar en Apollo' }
  }
}

export async function enrichContact(email: string): Promise<ApolloPerson | { error: string }> {
  const apiKey = await getApolloApiKey()

  if (!apiKey) {
    return { error: 'Apollo API key no configurada' }
  }

  try {
    const response = await fetch(`${APOLLO_API_URL}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ email, api_key: apiKey }),
    })

    if (!response.ok) {
      return { error: `Error de Apollo API: ${response.status}` }
    }

    const data = await response.json()

    // Update daily enrichment count
    await prisma.apolloConfig.updateMany({
      where: { isActive: true },
      data: { enrichmentsToday: { increment: 1 } },
    })

    return data.person
  } catch (error: any) {
    console.error('Apollo enrich error:', error)
    return { error: error.message || 'Error al enriquecer contacto' }
  }
}

export async function verifyEmail(email: string): Promise<{
  email: string
  status: 'valid' | 'invalid' | 'catch_all' | 'risky' | 'unknown'
} | { error: string }> {
  const apiKey = await getApolloApiKey()

  if (!apiKey) {
    return { error: 'Apollo API key no configurada' }
  }

  try {
    // Apollo enriches and verifies in one call - api_key goes in body
    const response = await fetch(`${APOLLO_API_URL}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ email, api_key: apiKey }),
    })

    if (!response.ok) {
      return { error: `Error de Apollo API: ${response.status}` }
    }

    const data = await response.json()

    const statusMap: Record<string, any> = {
      valid: 'valid',
      verified: 'valid',
      invalid: 'invalid',
      catch_all: 'catch_all',
      risky: 'risky',
      guessed: 'risky',
    }

    return {
      email,
      status: statusMap[data.person?.email_status?.toLowerCase()] || 'unknown',
    }
  } catch (error: any) {
    console.error('Apollo verify error:', error)
    return { error: error.message || 'Error al verificar email' }
  }
}

export function mapApolloPersonToContact(person: ApolloPerson) {
  const emailStatusMap: Record<string, string> = {
    valid: 'VALID',
    verified: 'VALID',
    invalid: 'INVALID',
    catch_all: 'CATCH_ALL',
    risky: 'RISKY',
    guessed: 'RISKY',
  }

  return {
    firstName: person.first_name || '',
    lastName: person.last_name || '',
    email: person.email || null,
    emailStatus: emailStatusMap[person.email_status?.toLowerCase()] || 'UNKNOWN',
    phone: person.phone_numbers?.[0]?.raw_number || null,
    linkedinUrl: person.linkedin_url || null,
    jobTitle: person.title || null,
    seniority: person.seniority || null,
    department: person.departments?.[0] || null,
    location: [person.city, person.state, person.country]
      .filter(Boolean)
      .join(', ') || null,
    apolloId: person.id,
    company: person.organization ? {
      name: person.organization.name,
      website: person.organization.website_url,
      linkedinUrl: person.organization.linkedin_url,
      industry: person.organization.industry,
      size: person.organization.estimated_num_employees?.toString(),
      apolloId: person.organization.id,
    } : null,
  }
}

// Re-export constants for backward compatibility
export { SENIORITY_OPTIONS, DEPARTMENT_OPTIONS } from './constants'

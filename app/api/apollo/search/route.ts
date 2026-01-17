import { NextRequest, NextResponse } from 'next/server'
import { searchPeopleByCompany, mapApolloPersonToContact } from '@/lib/apollo'

// POST /api/apollo/search - Search for people in Apollo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, companyName, jobTitles, seniorities, departments, locations, limit, page } = body

    if (!domain && !companyName) {
      return NextResponse.json(
        { error: 'Se requiere dominio o nombre de empresa' },
        { status: 400 }
      )
    }

    const result = await searchPeopleByCompany({
      domain,
      companyName,
      jobTitles,
      seniorities,
      departments,
      locations,
      limit,
      page,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Map Apollo results to our contact format
    const contacts = result.data.map(mapApolloPersonToContact)

    return NextResponse.json({
      data: contacts,
      pagination: result.pagination,
    })
  } catch (error: any) {
    console.error('Apollo search error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al buscar en Apollo' },
      { status: 500 }
    )
  }
}

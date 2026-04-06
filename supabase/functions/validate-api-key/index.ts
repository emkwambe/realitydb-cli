import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { api_key } = await req.json()

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // For demo, accept any key starting with 'rdb_'
    if (!api_key.startsWith('rdb_')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key format' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Create license
    const license = {
      id: `lic_${Math.random().toString(36).substring(2, 10)}`,
      tier: 'pro',
      email: `${api_key.substring(0, 8)}@user.realitydb.dev`,
      user_id: `usr_${Math.random().toString(36).substring(2, 14)}`,
      issued_at: new Date().toISOString(),
      expires_at: null,
      features: ['16_tables', 'unlimited_rows', 'run', 'mask', 'capture'],
      seat_limit: null,
      organization_id: null,
      organization_name: null,
      signature: `sig_${Math.random().toString(36).substring(2, 18)}`
    }

    return new Response(
      JSON.stringify({ license }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})
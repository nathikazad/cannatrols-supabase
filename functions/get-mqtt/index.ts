// Import Supabase client from Edge Function runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

interface HiveMQCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

serve(async (req) => {
  console.log('get-mqtt')
  try {
    
    // Create a Supabase client with the service role key, just like set-machine-id
    const supabaseClient = createClient(
      Deno.env.get('DB_URL') ?? '', 
      Deno.env.get('DB_SERVICE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    console.log('Checking auth')
    const authHeader = req.headers.get('Authorization')
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      try {
        // Verify and decode the JWT to get the user ID
        const { data, error } = await supabaseClient.auth.getUser(token)
        console.log('Data:', data)
        if (data?.user) {
          userId = data.user.id
        }
        console.log('User ID:', userId)
      } catch (e) {
        console.log('Error decoding JWT:', e)
        return new Response(
          JSON.stringify({ error: 'JWT parse error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } else {
      console.log('No auth header')
      return new Response(
        JSON.stringify({ error: 'No User JWT provided' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    } 

    if(userId == null) {
      return new Response(
        JSON.stringify({ error: 'No User JWT provided' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }




    // Simply check if any machines exist instead of checking for a specific user
    const { data: machines, error: machinesError } = await supabaseClient
      .from('machines')
      .select('id')
      .eq('user_id', userId) 
      .limit(1)

    // Handle database query error
    if (machinesError) {
      console.error('Database error:', machinesError)
      return new Response(
        JSON.stringify({ error: 'Error checking machine registration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If no machines exist, deny access
    if (!machines || machines.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No registered machines found.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return HiveMQ credentials
    const hiveMQCredentials = {
      host: Deno.env.get('HIVEMQ_HOST') ?? '',
      port: parseInt(Deno.env.get('HIVEMQ_PORT') ?? '8883'),
      username: Deno.env.get('HIVEMQ_USERNAME') ?? '',
      password: Deno.env.get('HIVEMQ_PASSWORD') ?? ''
    }

    // Check if all credentials are available
    if (!hiveMQCredentials.host || !hiveMQCredentials.username || !hiveMQCredentials.password) {
      console.error('Environment variables for HiveMQ credentials not properly set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return the credentials
    return new Response(
      JSON.stringify({ data: hiveMQCredentials }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
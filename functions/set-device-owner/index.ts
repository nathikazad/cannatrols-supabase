// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


// set machine id
serve(async (req) => {
  try {
    
    // Get request body
    const { deviceId, name } = await req.json()
    
    // Validate inputs
    if (!deviceId || !name) {
      return new Response(
        JSON.stringify({ error: 'Device ID  and Name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create a Supabase client with the service role key
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

    const authHeader = req.headers.get('Authorization')
    let userId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      try {
        // Verify and decode the JWT to get the user ID
        const { data, error } = await supabaseClient.auth.getUser(token)
        if (data?.user) {
          userId = data.user.id
        }
      } catch (e) {
        console.error('Error decoding JWT:', e)
        return new Response(
          JSON.stringify({ error: 'JWT parse error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    if(userId == null) {
      return new Response(
        JSON.stringify({ error: 'No User JWT provided' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Update the machine record or create it if it doesn't exist
    const { data, error } = await supabaseClient
      .from('machines')
      .upsert(
        { 
          machine_id: deviceId,
          user_id: userId,
          name: name
        },
        { 
          onConflict: 'machine_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single()
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})


import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Check for the API key in the authorization header
    const apiKey = req.headers.get('X-API-Key')
    
    // Compare with your secret API key
    // 493ac3f1-18a3-4d63-829b-1ae37b3062dc
    if (apiKey !== Deno.env.get('ARDUINO_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get the machine_id from the request
    const { machineId, newValue } = await req.json()
    
    if (!machineId) {
      return new Response(
        JSON.stringify({ error: 'Machine ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create a Supabase client
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
    
    // First, get the machine record to fetch the user_id
    const { data: machineData, error: machineError } = await supabaseClient
      .from('machines')
      .select('user_id')
      .eq('machine_id', machineId)
      .single()
    
    if (machineError) {
      return new Response(
        JSON.stringify({ error: machineError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    if (!machineData) {
      return new Response(
        JSON.stringify({ error: 'Machine not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // If newValue is provided, update the machine
    if (newValue) {
      const { data: updateData, error: updateError } = await supabaseClient
        .from('machines')
        .update({ parameter_value: newValue })
        .eq('machine_id', machineId)
        .select()
        .single()
      
      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Return the user_id
    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: machineData.user_id,
        updated: newValue ? true : false
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
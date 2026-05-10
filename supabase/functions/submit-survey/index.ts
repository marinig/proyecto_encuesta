import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { id_estudiante, nivel_satisfaccion, claridad_contenido, aplicabilidad_practica, comentarios_adicionales } = await req.json()

    // 1. Get Secrets from Environment
    const AIRTABLE_TOKEN = Deno.env.get('AIRTABLE_TOKEN')
    const AIRTABLE_BASE_ID = Deno.env.get('AIRTABLE_BASE_ID')
    const AIRTABLE_TABLE_ID = Deno.env.get('AIRTABLE_TABLE_ID')
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      throw new Error('Missing Airtable configuration in secrets')
    }

    const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`

    const payload = {
      fields: {
        id_estudiante,
        nivel_satisfaccion: parseInt(nivel_satisfaccion),
        claridad_contenido: parseInt(claridad_contenido),
        aplicabilidad_practica: parseInt(aplicabilidad_practica),
        comentarios_adicionales: comentarios_adicionales || ""
      }
    }

    // 2. Call Airtable (Main storage)
    console.log('Sending data to Airtable...');
    const airtableRes = await fetch(AIRTABLE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!airtableRes.ok) {
      const errorData = await airtableRes.json();
      console.error('Airtable Error:', errorData);
      throw new Error(`Airtable Error: ${errorData.error?.message || 'Unknown error'}`);
    }
    console.log('Airtable submission successful');

    // 3. Call n8n (Optional/Non-blocking)
    if (N8N_WEBHOOK_URL) {
      console.log('Sending data to n8n Webhook...');
      // We don't await this if we want it to be super fast, 
      // but better to await it in a way that doesn't crash the main response
      try {
        const n8nRes = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_estudiante,
            nivel_satisfaccion,
            claridad_contenido,
            aplicabilidad_practica,
            comentarios_adicionales,
            source: 'supabase_edge_function'
          })
        });
        
        if (n8nRes.ok) {
          console.log('n8n submission successful');
        } else {
          console.warn('n8n Webhook returned status:', n8nRes.status);
        }
      } catch (n8nError) {
        console.error('Failed to call n8n Webhook:', n8nError.message);
        // We don't throw here so Airtable success is still returned to the user
      }
    }

    return new Response(
      JSON.stringify({ message: "Survey submitted successfully" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

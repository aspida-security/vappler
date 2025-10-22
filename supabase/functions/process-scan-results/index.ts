// supabase/functions/process-scan-results/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Types based on the Python scanner output and DB schema
interface ScanVulnerability {
  cve: string | null
  cvss_score: number | null
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  name: string
  details: string
  port: number | string // Can be 'http', '80', 80, etc. from scanner
  service: string
}

interface HostDetails {
  host: string // This is the IP address
  vulnerabilities: ScanVulnerability[]
}

interface ScanResult {
  message: string
  path: string[]
  vulnerability_details: HostDetails[]
  error?: string
}

// Function to validate IP address
function isValidIp(ip: string): boolean {
  // Simple regex for IPv4
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip)
}

// Function to parse port to integer or null
function parsePort(port: any): number | null {
  if (port === null || port === undefined) {
    return null
  }
  if (typeof port === 'number' && Number.isInteger(port)) {
    return port
  }
  const parsed = parseInt(String(port), 10)
  return isNaN(parsed) ? null : parsed
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let supabaseServiceRole
  try {
    // 1. Initialize Service Role Client
    supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )

    // 2. Authenticate User
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabaseServiceRole.auth
      .getUser(
        authHeader.replace('Bearer ', '')
      )
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'No user'}`)
    }

    // 3. Get Payload and Workspace ID
    const scanResult: ScanResult = await req.json()
    const url = new URL(req.url)
    const workspaceId = url.searchParams.get('workspaceId')

    if (!workspaceId) {
      throw new Error('Missing workspaceId query parameter')
    }
    if (scanResult.error) {
      throw new Error(`Scan failed: ${scanResult.error}`)
    }
    if (
      !scanResult.vulnerability_details ||
      scanResult.vulnerability_details.length === 0
    ) {
      return new Response(
        JSON.stringify({ message: 'Scan complete, no hosts or vulnerabilities found.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 4. Check User Permissions
    const { data: permission, error: permissionError } =
      await supabaseServiceRole
        .from('workspace_users')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle()

    if (permissionError) {
      throw new Error(`Permission check failed: ${permissionError.message}`)
    }
    if (!permission) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: User does not have access to this workspace.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // 5. Process Host (Asset)
    // Assuming one host per scan result for now, as per python output
    const hostDetails = scanResult.vulnerability_details[0]
    const targetIp = hostDetails.host

    // 6. IP Validation
    if (!isValidIp(targetIp)) {
      return new Response(
        JSON.stringify({
          message:
            `Skipped: Scan target '${targetIp}' is not a valid IP address. Hostname scans must be processed differently.`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Not an error, just a skipped operation
        }
      )
    }

    // 7. Upsert Asset
    const assetData = {
      workspace_id: workspaceId,
      ip_address: targetIp,
      hostname: targetIp, // Default hostname to IP
      // Ensure asset_type is provided to use the default 'server' or a placeholder.
      // We will explicitly set the default here for safety, matching the DB default.
      asset_type: 'server', 
      operating_system: 'Unknown', // Nmap script can provide this later
      is_active: true, // Use the correct boolean column name from schema
      last_scan_at: new Date().toISOString(),
    }

    const { data: asset, error: assetUpsertError } = await supabaseServiceRole
      .from('assets')
      .upsert(assetData, {
        onConflict: 'workspace_id, ip_address',
        // CRITICAL: Ensure we use defaultToNull: false to avoid overwriting existing data 
        // with nulls from the payload.
        defaultToNull: false, 
      })
      .select()
      .single()

    if (assetUpsertError) {
      console.error('Asset Upsert Failed Details:', assetUpsertError) // New logging
      throw new Error(`Asset Upsert Failed: ${assetUpsertError.message}`)
    }

    // 8. Process and De-duplicate Vulnerabilities
    const vulnerabilitiesToUpsert = []
    const seenVulnerabilities = new Set<string>()

    for (const vuln of hostDetails.vulnerabilities) {
      const parsedPort = parsePort(vuln.port)
      const uniqueKey = `${asset.id}|${vuln.name}|${parsedPort}`

      if (!seenVulnerabilities.has(uniqueKey)) {
        seenVulnerabilities.add(uniqueKey)

        vulnerabilitiesToUpsert.push({
          workspace_id: workspaceId,
          asset_id: asset.id,
          scan_id: null, // TODO: Link to a scan record
          cve_id: vuln.cve,
          title: vuln.name || 'Unknown Vulnerability',
          description: vuln.details,
          severity: vuln.severity || 'Info',
          cvss_score: vuln.cvss_score,
          cvss_vector: null, // Not provided by scanner yet
          status: 'open',
          port: parsedPort, // Use the parsed integer or null
          service: vuln.service,
          remediation_steps: 'Remediation steps not yet available.',
        })
      }
    }

    // 9. Upsert Vulnerabilities (THE FIX)
    if (vulnerabilitiesToUpsert.length > 0) {
      console.log(
        `Upserting ${vulnerabilitiesToUpsert.length} unique vulnerabilities for asset ${asset.id}.`
      )
      const { error: vulnUpsertError } = await supabaseServiceRole
        .from('vulnerabilities')
        .upsert(vulnerabilitiesToUpsert, {
          // *** THE FINAL FIX: Use the comma-separated column list ***
          // This allows PostgREST to correctly infer and use the dual partial unique indexes.
          onConflict: 'asset_id,title,port', 
        })

      if (vulnUpsertError) {
        console.error('Vulnerability Upsert Error Details:', vulnUpsertError)
        throw new Error(
          `Vulnerability Upsert Failed: ${vulnUpsertError.message}`
        )
      }
      console.log('Vulnerabilities upserted.')
    }

    // 10. Return Success
    return new Response(
      JSON.stringify({
        message: `Successfully processed scan for asset ${asset.ip_address}.`,
        assetId: asset.id,
        vulnerabilitiesProcessed: vulnerabilitiesToUpsert.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    // Error Handling
    console.error('Critical Error in Edge Function:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
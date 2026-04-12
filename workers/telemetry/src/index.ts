export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    // POST /v1/telemetry — receive events
    if (request.method === 'POST' && url.pathname === '/v1/telemetry') {
      try {
        const body = await request.json();

        // Validate required fields
        if (!body.clientId || !body.command) {
          return new Response(JSON.stringify({ error: 'Missing clientId or command' }), {
            status: 400, headers: corsHeaders,
          });
        }

        // Insert into D1
        await env.DB.prepare(
          'INSERT INTO telemetry (client_id, tier, command, rows_generated, tables_count, format, duration_ms, features, cli_version, os_platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          body.clientId,
          body.tier || 'free',
          body.command,
          body.rows || null,
          body.tables || null,
          body.format || null,
          body.durationMs || null,
          body.features ? JSON.stringify(body.features) : null,
          body.cliVersion || null,
          body.osPlatform || null,
        ).run();

        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: corsHeaders,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal error' }), {
          status: 500, headers: corsHeaders,
        });
      }
    }

    // GET /v1/telemetry/stats — dashboard (protected by API key later)
    if (request.method === 'GET' && url.pathname === '/v1/telemetry/stats') {
      try {
        const dau = await env.DB.prepare(
          "SELECT COUNT(DISTINCT client_id) as count FROM telemetry WHERE received_at > datetime('now', '-1 day')"
        ).first();

        const mau = await env.DB.prepare(
          "SELECT COUNT(DISTINCT client_id) as count FROM telemetry WHERE received_at > datetime('now', '-30 days')"
        ).first();

        const totalEvents = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM telemetry"
        ).first();

        const topCommands = await env.DB.prepare(
          "SELECT command, COUNT(*) as cnt FROM telemetry GROUP BY command ORDER BY cnt DESC LIMIT 10"
        ).all();

        const tierBreakdown = await env.DB.prepare(
          "SELECT tier, COUNT(DISTINCT client_id) as users FROM telemetry GROUP BY tier"
        ).all();

        const formatBreakdown = await env.DB.prepare(
          "SELECT format, COUNT(*) as cnt FROM telemetry WHERE format IS NOT NULL GROUP BY format ORDER BY cnt DESC"
        ).all();

        const avgRows = await env.DB.prepare(
          "SELECT AVG(rows_generated) as avg_rows, AVG(duration_ms) as avg_duration FROM telemetry WHERE command = 'run' AND rows_generated IS NOT NULL"
        ).first();

        const recentActivity = await env.DB.prepare(
          "SELECT DATE(received_at) as day, COUNT(*) as events, COUNT(DISTINCT client_id) as users FROM telemetry WHERE received_at > datetime('now', '-30 days') GROUP BY DATE(received_at) ORDER BY day DESC LIMIT 30"
        ).all();

        return new Response(JSON.stringify({
          dau: dau?.count || 0,
          mau: mau?.count || 0,
          totalEvents: totalEvents?.count || 0,
          topCommands: topCommands?.results || [],
          tierBreakdown: tierBreakdown?.results || [],
          formatBreakdown: formatBreakdown?.results || [],
          avgRowsPerRun: Math.round(avgRows?.avg_rows || 0),
          avgDurationMs: Math.round(avgRows?.avg_duration || 0),
          dailyActivity: recentActivity?.results || [],
        }, null, 2), {
          status: 200, headers: corsHeaders,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Stats query failed' }), {
          status: 500, headers: corsHeaders,
        });
      }
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'realitydb-telemetry' }), {
        status: 200, headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: corsHeaders,
    });
  },
};
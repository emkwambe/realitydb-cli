import * as fs from 'fs';
import * as path from 'path';

export async function generateTemplateCommand(options: {
  domain?: string;
  prompt?: string;
  tables?: string;
  researchBased?: boolean;
  output?: string;
  model?: string;
}): Promise<void> {
  const domain = options.domain || 'general';
  const prompt = options.prompt || '';
  const tableCount = options.tables ? parseInt(options.tables) : 14;
  const researchBased = options.researchBased !== false;
  const outputFile = options.output || `realitydb-${domain.replace(/\s+/g, '-').toLowerCase()}-template.json`;
  const model = options.model || 'claude-sonnet-4-20250514';

  console.log(`\n\u{1F9EC} RealityDB Template Generator`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Domain: ${domain}`);
  if (prompt) console.log(`   Prompt: ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}`);
  console.log(`   Tables: ~${tableCount}`);
  console.log(`   Research-based: ${researchBased ? 'YES (citations + confidence)' : 'no'}`);
  console.log(`   Model: ${model}`);
  console.log(`   Output: ${outputFile}`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Generating schema with AI...\n`);

  const systemPrompt = `You are a synthetic data schema architect. You generate RealityDB template packs — JSON files that define database schemas with generation strategies for synthetic data.

Your output must be ONLY valid JSON. No markdown, no code fences, no explanation text.

${researchBased ? `CRITICAL: You must generate RESEARCH-BASED enum weights and lifecycle rules.

For every enum column, you MUST include:
- "confidence": "high" | "medium" | "low"
  - HIGH: You can cite a specific published source (journal, government database, WHO, CDC, SEER, industry report)
  - MEDIUM: Based on your domain training knowledge, consistent with general literature but no specific citation
  - LOW: Reasonable estimate, you are not confident in exact distribution
- "source": A specific citation or "domain knowledge" or "estimated"
- "note": Any caveats about the distribution (e.g., "varies by region", "institutional data may differ")

For lifecycle rules, include:
- "confidence": confidence level for the rule
- "source": clinical workflow, regulatory requirement, or business logic source

The confidence metadata is CRITICAL for regulated industries. Do not inflate confidence. If you're uncertain, say LOW.` : ''}

OUTPUT FORMAT:
{
  "version": "1.0.0",
  "name": "<template-name>",
  "description": "<one-line description>",
  "domain": "<domain>",
  "generatedBy": "realitydb-ai",
  "researchBased": ${researchBased},
  "tables": [
    {
      "name": "<table_name>",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "isPK": true,
          "strategy": "uuid"
        },
        {
          "name": "<column>",
          "type": "string",
          "strategy": "enum",
          "options": {
            "values": ["val1", "val2"],
            "weights": [70, 30],
            ${researchBased ? '"confidence": "high",' : ''}
            ${researchBased ? '"source": "CDC WONDER Database 2023",' : ''}
            ${researchBased ? '"note": "US population data",' : ''}
            "lifecycleRules": [
              { "value": "deceased", "nullFields": ["next_appointment", "treatment_plan"]${researchBased ? ', "confidence": "high", "source": "Standard clinical workflow"' : ''} }
            ]
          }
        },
        {
          "name": "created_at",
          "type": "timestamp",
          "strategy": "timestamp"
        }
      ]
    }
  ],
  "relationships": [
    {
      "sourceTable": "<parent>",
      "sourceColumn": "id",
      "targetTable": "<child>",
      "targetColumn": "<parent>_id",
      "type": "one-to-many"
    }
  ]${researchBased ? ',\n  "confidenceReport": {\n    "high": 0,\n    "medium": 0,\n    "low": 0,\n    "totalAnnotated": 0,\n    "lowConfidenceColumns": []\n  }' : ''}
}

TEMPORAL ORDERING (CRITICAL — YOU MUST INCLUDE THESE):
For every timestamp column that logically depends on another event, add dependsOn and dependencyRule.
Example:
{
  "name": "treatment_start_date",
  "type": "timestamp",
  "strategy": "timestamp",
  "options": {
    "dependsOn": "enrollment_date",
    "dependencyRule": "after"
  }
}

Required temporal chains for clinical trials:
- consent_date < enrollment_date < treatment_start_date < assessment_date
- treatment_start_date < adverse_event_onset_date
- treatment_start_date < progression_date
- enrollment_date < death_date (if applicable)

For banking/finance:
- created_at < opened_date < transaction_date < processed_date
- order_date < shipped_date < delivered_date

For any domain: every timestamp that logically occurs AFTER another event MUST have dependsOn set.
Do NOT leave temporal rules empty if the domain has sequential events.

CARDINALITY HINTS (include in relationships array):
Define how many child rows per parent using a distribution.
Example:
{
  "sourceTable": "patients",
  "targetTable": "tumor_assessments",
  "type": "one-to-many",
  "cardinality": {
    "strategy": "poisson",
    "mean": 3.2,
    "min": 1,
    "max": 8
  }
}

Strategies: "fixed" (exact count), "poisson" (variable, good for event counts), "uniform" (random between min/max)
Always include min and max bounds.
For tables where some parents may have zero children, use min: 0.

STRATEGY OPTIONS:
- uuid: UUID v4
- enum: Weighted random from values (include weights array)
- integer: Random int (include min, max)
- float: Random float (include min, max)
- timestamp: ISO timestamp
- email: Realistic email
- full_name: Realistic name
- phone: Phone number
- boolean: true/false
- text: Generic text
- company_name: Business name

RULES:
- Every table MUST have an "id" column with strategy "uuid" and isPK: true
- Every table MUST have a "created_at" timestamp
- FK columns must have isFK: true and a foreignKey object: { "table": "<parent>", "column": "id" }
- Root tables (no FK parents) should be defined first
- EVERY timestamp column that depends on another event MUST have dependsOn + dependencyRule: "after"
- Include cardinality config in relationships array for realistic child-per-parent distributions
- Do NOT generate templates with zero temporal rules for domains with sequential events
- Generate approximately ${tableCount} tables
- Include realistic column names for the ${domain} domain
${prompt ? `- Specific requirements: ${prompt}` : ''}`;

  const userMessage = prompt
    ? `Generate a ${tableCount}-table RealityDB template for: ${prompt}\n\nDomain: ${domain}. ${researchBased ? 'Include research-based enum weights with confidence levels and citations for every enum and lifecycle rule.' : ''}`
    : `Generate a ${tableCount}-table RealityDB template for the "${domain}" domain. Include realistic tables, columns, FK relationships, enum distributions${researchBased ? ' with confidence levels and citations' : ''}, and lifecycle rules.`;

  // Call Claude API
  let response: any;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`\n\u274C API error (${res.status}): ${err.substring(0, 200)}`);
      console.error(`   Ensure ANTHROPIC_API_KEY is set or you have an active API key.`);
      process.exit(1);
    }

    response = await res.json();
  } catch (err: any) {
    console.error(`\n\u274C Failed to call Claude API: ${err.message}`);
    console.error(`   Set ANTHROPIC_API_KEY environment variable.`);
    process.exit(1);
  }

  // Extract JSON from response
  const textContent = response.content?.find((c: any) => c.type === 'text')?.text || '';

  let template: any;
  try {
    // Try parsing directly
    template = JSON.parse(textContent);
  } catch {
    // Try extracting JSON from markdown fences
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      template = JSON.parse(jsonMatch[1].trim());
    } else {
      // Try finding the first { to last }
      const start = textContent.indexOf('{');
      const end = textContent.lastIndexOf('}');
      if (start > -1 && end > start) {
        template = JSON.parse(textContent.substring(start, end + 1));
      } else {
        console.error(`\n\u274C Could not parse AI response as JSON.`);
        console.error(`   Response preview: ${textContent.substring(0, 300)}...`);
        process.exit(1);
      }
    }
  }

  // Compute confidence report if research-based
  if (researchBased) {
    const report = { high: 0, medium: 0, low: 0, totalAnnotated: 0, lowConfidenceColumns: [] as string[] };

    const tables = template.tables || [];
    for (const table of tables) {
      const cols = Array.isArray(table.columns) ? table.columns : Object.values(table.columns || {});
      for (const col of cols) {
        if (col.options?.confidence) {
          report.totalAnnotated++;
          const conf = col.options.confidence.toLowerCase();
          if (conf === 'high') report.high++;
          else if (conf === 'medium') report.medium++;
          else { report.low++; report.lowConfidenceColumns.push(`${table.name}.${col.name}`); }
        }
        // Check lifecycle rules too
        if (col.options?.lifecycleRules) {
          for (const rule of col.options.lifecycleRules) {
            if (rule.confidence) {
              report.totalAnnotated++;
              const conf = rule.confidence.toLowerCase();
              if (conf === 'high') report.high++;
              else if (conf === 'medium') report.medium++;
              else { report.low++; report.lowConfidenceColumns.push(`${table.name}.${col.name} (rule: ${rule.value})`); }
            }
          }
        }
      }
    }

    template.confidenceReport = report;
  }

  // Write template
  fs.writeFileSync(outputFile, JSON.stringify(template, null, 2), 'utf-8');

  const fileSize = (fs.statSync(outputFile).size / 1024).toFixed(1);
  const tableCount2 = (template.tables || []).length;
  const relCount = (template.relationships || []).length;

  console.log(`\u2705 Template generated!`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4C1} File: ${outputFile} (${fileSize} KB)`);
  console.log(`   \u{1F4CB} Tables: ${tableCount2}`);
  console.log(`   \u{1F517} Relationships: ${relCount}`);

  // Count strategies
  let enumCount = 0, lifecycleCount = 0, temporalCount = 0;
  for (const table of template.tables || []) {
    const cols = Array.isArray(table.columns) ? table.columns : Object.values(table.columns || {});
    for (const col of cols) {
      if (col.strategy === 'enum') enumCount++;
      if (col.options?.lifecycleRules?.length > 0) lifecycleCount += col.options.lifecycleRules.length;
      if (col.options?.dependsOn) temporalCount++;
    }
  }
  console.log(`   \u{1F3AF} Enums: ${enumCount} | Lifecycle: ${lifecycleCount} | Temporal: ${temporalCount}`);

  // Confidence report
  if (researchBased && template.confidenceReport) {
    const r = template.confidenceReport;
    console.log(`\n   \u{1F4CA} Confidence Report`);
    console.log(`   ${'─'.repeat(36)}`);

    if (r.totalAnnotated > 0) {
      const highPct = Math.round(r.high / r.totalAnnotated * 100);
      const medPct = Math.round(r.medium / r.totalAnnotated * 100);
      const lowPct = Math.round(r.low / r.totalAnnotated * 100);

      console.log(`      \u{1F7E2} HIGH:   ${r.high} (${highPct}%) \u2014 published source cited`);
      console.log(`      \u{1F7E1} MEDIUM: ${r.medium} (${medPct}%) \u2014 domain knowledge`);
      console.log(`      \u{1F534} LOW:    ${r.low} (${lowPct}%) \u2014 needs human review`);

      if (r.lowConfidenceColumns.length > 0) {
        console.log(`\n      \u26A0\uFE0F  Low-confidence columns:`);
        for (const col of r.lowConfidenceColumns.slice(0, 10)) {
          console.log(`         \u{1F534} ${col}`);
        }
        if (r.lowConfidenceColumns.length > 10) {
          console.log(`         ... and ${r.lowConfidenceColumns.length - 10} more`);
        }
      }
    } else {
      console.log(`      No confidence annotations found in AI output.`);
    }
  }

  console.log(`\n   Next steps:`);
  console.log(`      realitydb rule:list --pack ${outputFile}`);
  console.log(`      realitydb explain --pack ${outputFile} --rows 10000`);
  console.log(`      realitydb run --pack ${outputFile} --rows 10000 -o data.sql`);
  console.log(``);
}

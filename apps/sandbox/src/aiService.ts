import type { TableInfo } from './sandbox';

export interface NLtoSQLResult {
  sql: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

function buildPrompt(question: string, schema: TableInfo[], templateName: string): string {
  const schemaText = schema.map(table => {
    const cols = table.columns.map(c =>
      `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}`
    ).join('\n');
    return `Table: ${table.name} (${table.rowCount} rows)\n${cols}`;
  }).join('\n\n');

  return `You are a PostgreSQL expert. Generate a single SQL query that answers the user's question.

DATABASE SCHEMA (${templateName}):
${schemaText}

RULES:
- Return ONLY valid PostgreSQL SQL. No explanations, no markdown, no backticks.
- Use proper JOIN syntax when multiple tables are needed.
- Use meaningful column aliases (e.g., AS total_revenue, AS customer_name).
- LIMIT results to 200 rows maximum.
- If the question is ambiguous, make a reasonable assumption.
- If the question cannot be answered with this schema, return: SELECT 'This question cannot be answered with the available tables' AS message;
- Prefer aggregations and GROUP BY for analytical questions.
- Use ORDER BY for ranked results.
- Format numbers with ROUND() where appropriate.

RESPONSE FORMAT:
Return a JSON object with exactly these fields:
{"sql": "SELECT ...", "explanation": "Brief explanation of what the query does", "confidence": "high|medium|low"}

Return ONLY the JSON. No other text.

USER QUESTION: ${question}`;
}

export async function generateSQL(
  question: string,
  schema: TableInfo[],
  templateName: string
): Promise<NLtoSQLResult> {
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: buildPrompt(question, schema, templateName)
        }]
      })
    });
  } catch {
    throw new Error('Unable to reach AI service. Check your connection.');
  }

  if (!response.ok) {
    throw new Error('AI is temporarily unavailable. Try again in a moment.');
  }

  let data: { content: { text: string }[] };
  try {
    data = await response.json();
  } catch {
    throw new Error('AI returned an unexpected response. Try rephrasing your question.');
  }

  try {
    const text = data.content[0].text;
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(clean);
    return {
      sql: result.sql,
      explanation: result.explanation,
      confidence: result.confidence || 'medium'
    };
  } catch {
    throw new Error('AI returned an unexpected response. Try rephrasing your question.');
  }
}

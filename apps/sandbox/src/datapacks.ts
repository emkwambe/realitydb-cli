export async function getSQLForTemplate(templateId: string): Promise<string> {
  const response = await fetch(`/data/${templateId}.sql`);
  if (!response.ok) throw new Error(`Template ${templateId} not found`);
  return response.text();
}

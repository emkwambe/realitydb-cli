const{introspectDatabase}=require('../packages/schema/dist/index.js');
const{buildGenerationPlan}=require('../packages/core/dist/planning/index.js');
const{generateDataset}=require('../packages/generators/dist/index.js');
const{createDatabaseClient,testConnection,closeConnection}=require('../packages/db/dist/index.js');
const fs=require('fs');
const BATCH=50;
function esc(v){if(v===null||v===undefined)return'NULL';if(typeof v==='boolean')return v?'true':'false';if(typeof v==='number')return String(v);return"'"+String(v).replace(/'/g,"''")+"'"}
async function main(){
const records=parseInt(process.argv[2]||'1000');
const out=process.argv[3]||'saas-10.sql';
const pool=createDatabaseClient('postgres','postgresql://postgres:postgres@localhost:5432/databox_dev');
await testConnection(pool);
const schema=await introspectDatabase(pool);
await closeConnection(pool);
const config={database:{client:'postgres',connectionString:''},seed:{defaultRecords:records,randomSeed:42},template:process.argv[4]||'saas'};
const plan=buildGenerationPlan(schema,config);
const ds=generateDataset(plan);
const lines=['-- RealityDB SaaS 10-table export','-- Records: '+records,'-- Seed: 42',''];
const schemaMap=new Map(schema.tables.map(t=>[t.name,t]));
const reg=require('../packages/templates/dist/index.js').getDefaultRegistry();const tmpl=reg.get(process.argv[4]||'saas');const allowed=new Set(tmpl?tmpl.targetTables:[]);const tableNames=[...ds.tables.keys()].filter(n=>allowed.size===0||allowed.has(n));
for(const name of tableNames){
const st=schemaMap.get(name);
if(!st)continue;
const cols=st.columns.map(c=>'"'+c.name+'" '+c.dataType.toUpperCase()+(c.nullable?'':' NOT NULL'));
cols.push('PRIMARY KEY ("id")');
lines.push('CREATE TABLE IF NOT EXISTS "'+name+'" (');
lines.push('  '+cols.join(',\n  '));
lines.push(');\n');
}
for(const name of tableNames){
const tableData=ds.tables.get(name);const rows=Array.isArray(tableData)?tableData:(tableData?.rows||tableData?.data||[]);
if(!rows||!rows.length)continue;
const st=schemaMap.get(name);
if(!st)continue;
const colNames=st.columns.map(c=>c.name);
const qc=colNames.map(c=>'"'+c+'"').join(', ');
lines.push('-- '+name+': '+rows.length+' rows');
for(let i=0;i<rows.length;i+=BATCH){
const batch=rows.slice(i,i+BATCH);
lines.push('INSERT INTO "'+name+'" ('+qc+') VALUES');
const vals=batch.map(row=>'  ('+colNames.map(c=>esc(row[c])).join(', ')+')');
lines.push(vals.join(',\n')+';');
lines.push('');
}}
fs.writeFileSync(out,lines.join('\n'),'utf-8');
const sz=(Buffer.byteLength(lines.join('\n'))/1024/1024).toFixed(2);
console.log('Done: '+out+' | Tables: '+tableNames.length+' | Rows: '+ds.totalRows+' | Size: '+sz+'MB');
process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
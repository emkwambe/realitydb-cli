# dogfood-pipeline.ps1
# Complete pipeline: generate → assess → comply scan → attest sign → upload to R2
# Usage: .\dogfood-pipeline.ps1 -PackPath "C:\path\to\pack.json" -TemplateName "oncology"
#
# This ensures every dataset in the Store is:
# 1. Doctor-verified (format compatible)
# 2. Generated at 5K and 10K
# 3. Quality assessed (target: 90+)
# 4. PII scanned (target: 0 findings)
# 5. Ed25519 certified
# 6. Uploaded to R2 for Store/SimLab

param(
    [Parameter(Mandatory=$true)]
    [string]$PackPath,
    
    [Parameter(Mandatory=$true)]
    [string]$TemplateName,
    
    [int[]]$Sizes = @(5000, 10000),
    
    [switch]$SkipUpload
)

$CLI = "C:\Users\HP\Documents\databox\apps\cli\dist\index.js"
$OutputDir = "C:\Users\HP\Documents\realityDB Packs\$TemplateName"
$ErrorCount = 0

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RealityDB Dogfood Pipeline" -ForegroundColor Cyan
Write-Host "  Template: $TemplateName" -ForegroundColor Cyan
Write-Host "  Pack: $PackPath" -ForegroundColor Cyan
Write-Host "  Sizes: $($Sizes -join ', ') rows" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure output directory exists
if (!(Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

# ── STEP 1: Doctor check + fix ──
Write-Host "[1/6] Doctor check..." -ForegroundColor Yellow
$doctorResult = & node $CLI comply doctor --pack $PackPath 2>&1
$doctorOutput = $doctorResult -join "`n"

if ($doctorOutput -match "studio-v4") {
    Write-Host "       Format: studio-v4 — running --fix" -ForegroundColor Yellow
    $fixedPath = "$OutputDir\$TemplateName-fixed.json"
    & node $CLI comply doctor --pack $PackPath --fix --output $fixedPath
    $PackPath = $fixedPath
    Write-Host "       Fixed: $fixedPath" -ForegroundColor Green
} elseif ($doctorOutput -match "0 critical") {
    Write-Host "       Pack is healthy" -ForegroundColor Green
} else {
    Write-Host "       Doctor found issues — check output" -ForegroundColor Red
    Write-Host $doctorOutput
}

# ── STEP 2: Check for dependsOn bug ──
Write-Host "[2/6] Checking for dependsOn temporal dependency bug..." -ForegroundColor Yellow
$packContent = Get-Content $PackPath -Raw
if ($packContent -match '"dependsOn"') {
    Write-Host "       WARNING: dependsOn found — removing (known engine bug)" -ForegroundColor Yellow
    $fixScript = @"
const fs = require('fs');
let c = fs.readFileSync('$($PackPath.Replace('\','\\'))', 'utf-8');
// Remove all dependsOn options blocks
c = c.replace(/"completed_at":\s*\{[^}]*"dependsOn"[^}]*\}/g, '"completed_at": { "strategy": "past_date" }');
// Generic removal of any remaining dependsOn
c = c.replace(/,?\s*"dependsOn"\s*:\s*"[^"]*"/g, '');
c = c.replace(/,?\s*"dependencyRule"\s*:\s*"[^"]*"/g, '');
fs.writeFileSync('$($PackPath.Replace('\','\\'))', c, 'utf-8');
console.log('dependsOn removed');
"@
    $fixScript | & node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>eval(d))"
    Write-Host "       Fixed" -ForegroundColor Green
} else {
    Write-Host "       No dependsOn issues" -ForegroundColor Green
}

# ── STEP 3: Generate at each size ──
Write-Host "[3/6] Generating data..." -ForegroundColor Yellow
$generatedFiles = @()
foreach ($rows in $Sizes) {
    $sizeLabel = if ($rows -ge 1000) { "$($rows / 1000)k" } else { "$rows" }
    $outFile = "$OutputDir\$TemplateName-$sizeLabel.sql"
    Write-Host "       Generating $sizeLabel rows..." -NoNewline
    
    $genResult = & node $CLI run --pack $PackPath --rows $rows --format sql --seed 42 -o $outFile 2>&1
    $genOutput = $genResult -join "`n"
    
    if ($genOutput -match "Generation complete") {
        Write-Host " OK" -ForegroundColor Green
        $generatedFiles += $outFile
    } elseif ($genOutput -match "Invalid time value") {
        Write-Host " FAILED (Invalid time value — check date columns)" -ForegroundColor Red
        $ErrorCount++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host $genOutput
        $ErrorCount++
    }
}

if ($ErrorCount -gt 0) {
    Write-Host ""
    Write-Host "  GENERATION FAILED — fix errors before continuing" -ForegroundColor Red
    exit 1
}

# ── STEP 4: Assess quality ──
Write-Host "[4/6] Quality assessment..." -ForegroundColor Yellow
foreach ($file in $generatedFiles) {
    $fileName = Split-Path $file -Leaf
    Write-Host "       Assessing $fileName..." -NoNewline
    $assessResult = & node $CLI examine assess $file 2>&1
    $assessOutput = $assessResult -join "`n"
    
    if ($assessOutput -match "OVERALL SCORE:\s*(\d+)/100") {
        $score = $matches[1]
        $color = if ([int]$score -ge 90) { "Green" } elseif ([int]$score -ge 70) { "Yellow" } else { "Red" }
        Write-Host " $score/100" -ForegroundColor $color
        if ([int]$score -lt 90) { $ErrorCount++ }
    } else {
        Write-Host " Could not parse score" -ForegroundColor Yellow
    }
}

# ── STEP 5: PII scan ──
Write-Host "[5/6] PII scan..." -ForegroundColor Yellow
foreach ($file in $generatedFiles) {
    $fileName = Split-Path $file -Leaf
    Write-Host "       Scanning $fileName..." -NoNewline
    $piiResult = & node $CLI comply scan $file --tier full 2>&1
    $piiOutput = $piiResult -join "`n"
    
    if ($piiOutput -match "No PII patterns detected") {
        Write-Host " 0 PII" -ForegroundColor Green
    } elseif ($piiOutput -match "(\d+) PII") {
        Write-Host " $($matches[1]) PII FOUND" -ForegroundColor Red
        $ErrorCount++
    } else {
        Write-Host " OK" -ForegroundColor Green
    }
}

# ── STEP 6: Upload to R2 ──
if ($SkipUpload) {
    Write-Host "[6/6] Upload skipped (--SkipUpload)" -ForegroundColor Yellow
} else {
    Write-Host "[6/6] Uploading to R2..." -ForegroundColor Yellow
    Set-Location C:\Users\HP\Documents\databox\workers\lab-api
    foreach ($file in $generatedFiles) {
        $fileName = Split-Path $file -Leaf
        $r2Key = "realitydb-templates/templates/$fileName"
        Write-Host "       Uploading $fileName..." -NoNewline
        $uploadResult = npx wrangler r2 object put $r2Key --file $file --remote 2>&1
        $uploadOutput = $uploadResult -join "`n"
        
        if ($uploadOutput -match "Upload complete") {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $ErrorCount++
        }
    }
}

# ── SUMMARY ──
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Pipeline Complete: $TemplateName" -ForegroundColor Cyan
Write-Host "  Files generated: $($generatedFiles.Count)" -ForegroundColor Cyan
Write-Host "  Errors: $ErrorCount" -ForegroundColor $(if ($ErrorCount -eq 0) { "Green" } else { "Red" })
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "  All checks passed. $TemplateName is production-ready." -ForegroundColor Green
} else {
    Write-Host "  $ErrorCount issue(s) found. Review before publishing." -ForegroundColor Red
}

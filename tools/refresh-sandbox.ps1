# ============================================
# RealityDB Sandbox Data Refresh
# ============================================
# Usage: paste into PowerShell from databox root
#   cd C:\Users\HP\Documents\databox
#   .\tools\refresh-sandbox.ps1
#
# What it does:
#   1. Generates Reality Packs for all CLI templates
#   2. Converts each pack to PGLite-compatible SQL
#   3. Copies SQL files to Sandbox public/data/
#   4. Builds and deploys Sandbox to Cloudflare
# ============================================

$ErrorActionPreference = "Stop"
$databoxDir = "C:\Users\HP\Documents\databox"
$sandboxDir = "C:\Users\HP\Documents\realitydb-sandbox"
$tempDir = "$env:TEMP\realitydb-packs"
$toolPath = "$databoxDir\tools\pack-to-sql.js"

# CLI templates available in the engine
$templates = @("saas", "ecommerce", "fintech", "healthcare", "education")

# Default records per table
$records = 1000

Write-Host ""
Write-Host "RealityDB Sandbox Data Refresh" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  Templates: $($templates -join ', ')"
Write-Host "  Records per table: $records"
Write-Host ""

# Ensure temp directory
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Step 1: Generate packs
Write-Host "[1/4] Generating Reality Packs..." -ForegroundColor Yellow
Set-Location $databoxDir

foreach ($t in $templates) {
    Write-Host "  -> $t" -NoNewline
    & node .\apps\cli\dist\index.js pack export --template $t --records $records --output $tempDir --name "$t-sandbox" 2>&1 | Out-Null
    if (Test-Path "$tempDir\$t-sandbox.realitydb-pack.json") {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [FAILED]" -ForegroundColor Red
    }
}

# Step 2: Convert to SQL
Write-Host ""
Write-Host "[2/4] Converting packs to SQL..." -ForegroundColor Yellow

foreach ($t in $templates) {
    $packFile = "$tempDir\$t-sandbox.realitydb-pack.json"
    $sqlFile = "$sandboxDir\public\data\$t.sql"
    if (Test-Path $packFile) {
        Write-Host "  -> $t" -NoNewline
        & node $toolPath $packFile $sqlFile 2>&1 | Out-Null
        if (Test-Path $sqlFile) {
            $size = [math]::Round((Get-Item $sqlFile).Length / 1MB, 2)
            Write-Host " [OK] ${size}MB" -ForegroundColor Green
        } else {
            Write-Host " [FAILED]" -ForegroundColor Red
        }
    }
}

# Step 3: Build
Write-Host ""
Write-Host "[3/4] Building Sandbox..." -ForegroundColor Yellow
Set-Location $sandboxDir
if (Test-Path dist) { Remove-Item -Recurse dist -Force }
& npm run build 2>&1 | Out-Null
if (Test-Path dist\index.html) {
    Write-Host "  Build [OK]" -ForegroundColor Green
} else {
    Write-Host "  Build [FAILED]" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy
Write-Host ""
Write-Host "[4/4] Deploying to Cloudflare..." -ForegroundColor Yellow
& wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true 2>&1 | Out-Null
Write-Host "  Deploy [OK]" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Sandbox refresh complete!" -ForegroundColor Green
Write-Host "  URL: https://sandbox.realitydb.dev"
Write-Host ""

# Cleanup temp
Remove-Item -Recurse $tempDir -Force -ErrorAction SilentlyContinue

Set-Location $databoxDir

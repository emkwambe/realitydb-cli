# upload-templates.ps1 — Generate SQL from a RealityDB pack and upload to R2
#
# Usage:
#   .\upload-templates.ps1 -PackPath "C:\...\realitydb-studio-pack.json" -TemplateName "banking"
#   .\upload-templates.ps1 -PackPath "C:\...\pack.json" -TemplateName "fintech" -RowCounts @(5000, 10000)
#
# Requirements:
#   - Node.js with CLI built at apps\cli\dist\index.js
#   - wrangler authenticated with Cloudflare

param(
    [Parameter(Mandatory=$true)]
    [string]$PackPath,

    [Parameter(Mandatory=$true)]
    [string]$TemplateName,

    [int[]]$RowCounts = @(5000, 10000, 50000, 100000),

    [int]$Seed = 42
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CliPath = Join-Path $ScriptDir "..\..\..\apps\cli\dist\index.js"
$R2Bucket = "realitydb-templates"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "realitydb-templates-$(Get-Date -Format 'yyyyMMddHHmmss')"

New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  RealityDB Template Upload" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Pack: $PackPath"
Write-Host "  Template: $TemplateName"
Write-Host "  Row counts: $($RowCounts -join ', ')"
Write-Host "  Seed: $Seed"
Write-Host "  R2 bucket: $R2Bucket"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

foreach ($Rows in $RowCounts) {
    if ($Rows -ge 1000000) {
        $Suffix = "$([math]::Floor($Rows / 1000000))m"
    } elseif ($Rows -ge 1000) {
        $Suffix = "$([math]::Floor($Rows / 1000))k"
    } else {
        $Suffix = "$Rows"
    }

    $Filename = "$TemplateName-$Suffix.sql"
    $OutputPath = Join-Path $TempDir $Filename
    $R2Key = "templates/$Filename"

    Write-Host "📊 Generating $TemplateName at $Rows rows..." -ForegroundColor Yellow
    node $CliPath run `
        --pack $PackPath `
        --rows $Rows `
        --format sql `
        --drop-tables `
        --seed $Seed `
        -o $OutputPath

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Generation failed for $Rows rows" -ForegroundColor Red
        continue
    }

    $FileSize = (Get-Item $OutputPath).Length
    $FileSizeMB = [math]::Round($FileSize / 1MB, 2)

    Write-Host "☁️  Uploading to R2: $R2Key ($FileSizeMB MB)" -ForegroundColor Cyan
    npx wrangler r2 object put "$R2Bucket/$R2Key" --file $OutputPath --remote

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Filename uploaded" -ForegroundColor Green
    } else {
        Write-Host "❌ Upload failed for $Filename" -ForegroundColor Red
    }
    Write-Host ""
}

# Cleanup
Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  ✅ All templates processed" -ForegroundColor Green
Write-Host "  Verify: npx wrangler r2 object list $R2Bucket --prefix templates/" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

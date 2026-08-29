param(
  [string]$Target = "$env:USERPROFILE\Desktop\searchlift"
)

$ErrorActionPreference = "Stop"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
$OldWorkingEnv = "$env:USERPROFILE\Desktop\searchlift-pro\searchlift-pro\.env.local"
$TargetEnv = Join-Path $Target ".env.local"

Write-Host "SearchLift Core v4 installer" -ForegroundColor Green
Write-Host "Source: $Source"
Write-Host "Target: $Target"

if (!(Test-Path $Target)) {
  New-Item -ItemType Directory -Path $Target | Out-Null
}

$envBackup = $null
if (Test-Path $TargetEnv) {
  $envBackup = Get-Content $TargetEnv -Raw
  Write-Host "Keeping existing .env.local from target." -ForegroundColor Yellow
} elseif (Test-Path $OldWorkingEnv) {
  $envBackup = Get-Content $OldWorkingEnv -Raw
  Write-Host "Found .env.local in old working searchlift-pro folder." -ForegroundColor Yellow
}

Get-ChildItem -Path $Source -Force | Where-Object {
  $_.Name -notin @(".git", ".env.local", "node_modules", ".next")
} | ForEach-Object {
  Copy-Item $_.FullName -Destination $Target -Recurse -Force
}

if ($envBackup) {
  Set-Content -Path $TargetEnv -Value $envBackup -NoNewline
  Write-Host "Restored .env.local." -ForegroundColor Green
}

if (Test-Path (Join-Path $Target ".git")) {
  Write-Host "Git repository detected." -ForegroundColor Green
} else {
  Write-Host "WARNING: .git was not found in target. Make sure this is your GitHub repo folder." -ForegroundColor Red
}

Write-Host "Done. Next:" -ForegroundColor Green
Write-Host "cd `"$Target`""
Write-Host "npm install"
Write-Host "npm run typecheck"
Write-Host "npm run lint"
Write-Host "npm run build"
Write-Host "npm run dev"

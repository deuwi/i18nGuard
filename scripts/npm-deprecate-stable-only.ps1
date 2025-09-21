param(
  [string[]]$Packages = @(
    '@i18nguard/core',
    '@i18nguard/adapters',
    '@i18nguard/reporter',
    '@i18nguard/cli'
  ),
  [string]$Latest = '1.0.3',
  [string[]]$RemoveTags = @('beta','next','canary','rc'),
  [switch]$DryRun
)

Write-Host "Stable-only deprecation starting..." -ForegroundColor Cyan

foreach ($pkg in $Packages) {
  Write-Host "Processing $pkg" -ForegroundColor Cyan
  $versions = (npm view $pkg versions --json | Out-String | ConvertFrom-Json)
  if (-not $versions) {
    Write-Host "No versions found for $pkg" -ForegroundColor Yellow
    continue
  }

  foreach ($v in $versions) {
    if ($v -ne $Latest) {
      if ($DryRun) {
        Write-Host "[DRY-RUN] Would deprecate $pkg@$v" -ForegroundColor DarkYellow
      } else {
        Write-Host "Deprecating $pkg@$v" -ForegroundColor Yellow
        npm deprecate "$pkg@$v" "Deprecated: use $pkg@$Latest"
      }
    }
  }

  foreach ($tag in $RemoveTags) {
    if ($DryRun) {
      Write-Host "[DRY-RUN] Would remove dist-tag '$tag' from $pkg" -ForegroundColor DarkYellow
    } else {
      Write-Host "Removing dist-tag '$tag' from $pkg (if present)" -ForegroundColor DarkYellow
      npm dist-tag rm $pkg $tag 2>$null
    }
  }

  Write-Host "Remaining tags for $pkg:" -ForegroundColor Green
  npm dist-tag ls $pkg
  Write-Host "" 
}

Write-Host "Verification:" -ForegroundColor Cyan
npm view '@i18nguard/cli@'+$Latest deprecated

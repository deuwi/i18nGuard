param(
    [string]$VsixDir
)

# Determine VSIX directory
if (-not $VsixDir -or $VsixDir.Trim().Length -eq 0) {
    $VsixDir = Resolve-Path (Join-Path $PSScriptRoot '..\packages\vscode')
}

# Find latest VSIX
$vsix = Get-ChildItem -Path $VsixDir -Filter *.vsix -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) {
    throw 'No VSIX found. Run the Package task first.'
}

# Locate VS Code CLI
$codeCmd = $null
$cmd = Get-Command code -ErrorAction SilentlyContinue
if ($cmd) { $codeCmd = $cmd.Source }

if (-not $codeCmd) {
    $candidates = @(
        (Join-Path $Env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'),
        (Join-Path $Env:LOCALAPPDATA 'Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd'),
        (Join-Path $Env:ProgramFiles 'Microsoft VS Code\bin\code.cmd'),
        (Join-Path ${Env:ProgramFiles(x86)} 'Microsoft VS Code\bin\code.cmd')
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $codeCmd = $c; break }
    }
}

if (-not $codeCmd) {
    throw 'VS Code CLI not found. Add VS Code to PATH or install from VSIX via the Extensions UI.'
}

# Install the extension
& $codeCmd --install-extension "$($vsix.FullName)"

Write-Host "Installed VSIX: $($vsix.FullName)"
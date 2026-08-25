<#
.SYNOPSIS
  Give Ranger, the course tutor, its Anthropic API key - without the key ever
  being shown, logged, or committed. (Windows.)

.DESCRIPTION
  Do not run this file directly. Double-click ADD_RANGER_KEY.bat instead.

  Ranger works either way. With no key it answers from the course text only,
  which is a supported mode but a quiet one - it used to look like the tutor
  was simply offline. With a key it answers on the live model.

  This script writes the key into the repo-root .env, which is on git's ignore
  list and has never been committed.

  Why it is written this way:
    - Read-Host -AsSecureString: the key is never displayed, and PowerShell does
      not record prompt answers in ConsoleHost_history.txt the way it records
      typed commands. Passing a key as a command ARGUMENT would persist it in
      shell history forever.
    - The plaintext lives in one variable and is wiped from unmanaged memory
      immediately after use.
    - .env is rewritten in place: every other setting is preserved as it was.
    - The file permissions are then narrowed to your account only.
    - Verification reads the server's own /api/meta/health "provider" field, so
      success is confirmed WITHOUT the key being printed anywhere.

.NOTES
  This is for the copy of the Academy running on your own computer. When the
  site is hosted publicly the key belongs in the host's secret store (Fly
  secrets / Render environment / a managed vault), not in a file on disk.
#>

[CmdletBinding()]
param(
    [switch]$SkipRestart
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$Root = $PSScriptRoot
if (-not $Root) { $Root = Split-Path -Parent $MyInvocation.MyCommand.Definition }
Set-Location $Root

$EnvFile = Join-Path $Root '.env'
$RunDir  = Join-Path $Root 'data\run'

# Whatever ports the running copy actually chose. Read them BEFORE anything
# stops, because stopping removes the file that records them, and a restart on
# the wrong ports would look like the key had failed.
$ApiPort = if ($env:SIGHTLINE_API_PORT) { $env:SIGHTLINE_API_PORT } else { '8000' }
$WebPort = if ($env:SIGHTLINE_WEB_PORT) { $env:SIGHTLINE_WEB_PORT } else { '8080' }
$portsFile = Join-Path $RunDir 'ports.env'
if (Test-Path $portsFile) {
    foreach ($line in (Get-Content $portsFile)) {
        if ($line -match '^API_PORT=(\d+)') { $ApiPort = $Matches[1] }
        if ($line -match '^WEB_PORT=(\d+)') { $WebPort = $Matches[1] }
    }
}

# Which shape the site is running in, so the restart comes back the same way.
# 'single' means the course server is serving the pages itself and Node is not
# involved at all; restarting without saying so could send it down the build
# path on a computer that has no Node.
$modeFile = Join-Path $RunDir 'mode'
$runMode = ''
if (Test-Path $modeFile) {
    $runMode = ((Get-Content $modeFile | Select-Object -First 1) + '').Trim()
}
if ($runMode -eq 'single') { $noNode = '1' } else { $noNode = '0' }

function Note ([string]$t) { Write-Host "   $t" }
function Fail ([string[]]$lines) {
    Write-Host ''
    foreach ($l in $lines) { Write-Host $l -ForegroundColor Red }
    Write-Host ''
    exit 1
}

Write-Host ''
Write-Host "Sightline - Ranger's API key" -ForegroundColor Cyan
Write-Host '----------------------------'

# --- Refuse to write a secret anywhere git might pick it up ------------------
# No git on this computer, or no repository here, means nothing can commit the
# key by accident, so there is nothing to check.
$isIgnored = $true
$isTracked = $false
if ((Get-Command git -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $Root '.git'))) {
    Push-Location $Root
    try {
        # Native commands must be judged by EXIT CODE, never by whether they
        # wrote to stderr. `git ls-files --error-unmatch` writes to stderr and
        # exits 1 when a path is untracked - which is the outcome we WANT here.
        $null = & git check-ignore .env 2>&1
        $isIgnored = ($LASTEXITCODE -eq 0)
        $null = & git ls-files --error-unmatch .env 2>&1
        $isTracked = ($LASTEXITCODE -eq 0)
    } finally { Pop-Location }
}

if (-not $isIgnored) {
    Fail @(
        "Stopping: the settings file .env is not on git's ignore list.",
        'A key written there could be uploaded by accident.',
        'Nothing was written. Tell Rad about this message.'
    )
}
if ($isTracked) {
    Fail @(
        'Stopping: the settings file .env is tracked by git.',
        'A key written there could be uploaded by accident.',
        'Nothing was written. Tell Rad about this message.'
    )
}

if (-not (Test-Path $EnvFile)) {
    Fail @(
        'There is no settings file yet.',
        'Run START_SIGHTLINE once first; it creates one. Then run this again.'
    )
}
Note 'The settings file is private to this computer and safe to write to.'

# --- Prompt. Never echoed, never in history ----------------------------------
Write-Host ''
Write-Host 'Paste the Anthropic API key for Ranger. It will NOT be shown as you type or paste.'
Write-Host 'Press Enter on an empty line to cancel.'
$secure = Read-Host -AsSecureString 'Anthropic API key'

$plain = ''
if ($secure -and $secure.Length -gt 0) {
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $plain = $plain.Trim()
}

if ([string]::IsNullOrWhiteSpace($plain)) {
    Fail @('Nothing was entered, so nothing was changed.')
}
# Shape check only. A wrong-looking key would quietly drop Ranger back to
# course-text-only answers, which is the exact failure this script exists to end.
if (-not $plain.StartsWith('sk-ant-')) {
    $plain = $null
    Fail @(
        'That does not look like an Anthropic key - they begin with sk-ant-.',
        'Nothing was written, and nothing was displayed.'
    )
}
if ($plain.Length -lt 40) {
    $plain = $null
    Fail @('That key looks cut short. Copy the whole line and try again. Nothing was written.')
}
Note ("Accepted a key of {0} characters beginning sk-ant-. The value is never displayed." -f $plain.Length)

# --- Rewrite ONLY the ANTHROPIC_API_KEY line ---------------------------------
$lines = [System.IO.File]::ReadAllLines($EnvFile)
$out = New-Object System.Collections.Generic.List[string]
$replaced = $false
foreach ($line in $lines) {
    if ($line -match '^\s*ANTHROPIC_API_KEY\s*=') {
        $out.Add("ANTHROPIC_API_KEY=$plain")
        $replaced = $true
    } else {
        $out.Add($line)
    }
}
if (-not $replaced) { $out.Add("ANTHROPIC_API_KEY=$plain") }

# UTF8 without BOM: a BOM ends up inside the first setting's value when read.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($EnvFile, (($out -join "`n") + "`n"), $utf8NoBom)
$plain = $null
[System.GC]::Collect()
Note 'Saved. Every other setting was left exactly as it was.'

# --- Narrow the file to this account only ------------------------------------
try {
    $acl = Get-Acl $EnvFile
    $acl.SetAccessRuleProtection($true, $false)   # drop inherited permissions
    $me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($me, 'FullControl', 'Allow')
    $acl.AddAccessRule($rule)
    Set-Acl -Path $EnvFile -AclObject $acl
    Note "The file is now readable only by $me."
} catch {
    Note 'Note: the file permissions could not be narrowed. Not a problem, but do not share it.'
}

if ($SkipRestart) {
    Write-Host ''
    Write-Host 'Skipping the restart as asked. Ranger will use the key next time the site starts.'
    Write-Host ''
    exit 0
}

# --- Restart, if the site is running, so the key is actually picked up -------
$apiPidFile = Join-Path $RunDir 'api.pid'
$running = $false
if (Test-Path $apiPidFile) {
    $raw = (Get-Content $apiPidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($raw -and $raw.Trim() -match '^\d+$') {
        if (Get-Process -Id ([int]$raw.Trim()) -ErrorAction SilentlyContinue) { $running = $true }
    }
}

if (-not $running) {
    Write-Host ''
    Write-Host 'The site is not running at the moment.'
    Write-Host 'Start it with START_SIGHTLINE and Ranger will use the new key.'
    Write-Host ''
    exit 0
}

Write-Host ''
Write-Host 'Restarting the site so Ranger picks the key up...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'STOP_SIGHTLINE.ps1') | Out-Null
$env:SIGHTLINE_NONINTERACTIVE = '1'
$env:SIGHTLINE_NO_NODE = $noNode
$env:SIGHTLINE_API_PORT = $ApiPort
$env:SIGHTLINE_WEB_PORT = $WebPort
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'START_SIGHTLINE.ps1') | Out-Null
$env:SIGHTLINE_NONINTERACTIVE = $null
$env:SIGHTLINE_NO_NODE = $null

# --- Ask the server itself, so success is confirmed without printing the key --
Write-Host 'Asking the site which tutor it is using...'
$provider = $null
foreach ($i in 1..30) {
    Start-Sleep -Seconds 2
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/api/meta/health" -TimeoutSec 5
        $provider = $health.provider
        if ($provider) { break }
    } catch { }
}

Write-Host ''
if ($provider -eq 'anthropic') {
    Write-Host 'Ranger is on the live model.' -ForegroundColor Green
    Write-Host 'The server itself confirmed it; the key was never printed.'
} elseif ($provider -eq 'extractive') {
    Write-Host 'Ranger is still answering from the course text only.' -ForegroundColor Red
    Write-Host 'The key did not take effect. Open the .env file and check that the line'
    Write-Host 'ANTHROPIC_API_KEY= has your key after the equals sign, then run this again.'
} else {
    Write-Host 'Could not reach the site to confirm.' -ForegroundColor Yellow
    Write-Host 'Run START_SIGHTLINE and open the site to check.'
}
Write-Host ''
exit 0

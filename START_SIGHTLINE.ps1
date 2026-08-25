# =============================================================================
#  Sightline Safety Academy - start the whole site on THIS computer (Windows).
#
#  Do not run this file directly. Double-click START_SIGHTLINE.bat instead;
#  it opens this in a window that stays put so you can read what it says.
#
#  It sets everything up the first time and simply starts the site every time
#  after that. Running it twice is safe.
#
#  This is your own private copy of the Academy. Nothing it does touches the
#  live site on the internet. To stop it again, use STOP_SIGHTLINE.
#
#  Optional settings, only needed if the usual ports are already taken:
#      SIGHTLINE_API_PORT           default 8000
#      SIGHTLINE_WEB_PORT           default 8080
#      SIGHTLINE_NONINTERACTIVE=1   never ask any questions
#
#  Written for Windows PowerShell 5.1, which is what ships with Windows.
# =============================================================================

# Native tools such as uv and npm print their progress to the error stream.
# With 'Stop' in force PowerShell would treat that as a failure and abandon a
# perfectly good install, so every native command is judged by its exit code.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = $PSScriptRoot
if (-not $Root) { $Root = Split-Path -Parent $MyInvocation.MyCommand.Definition }
Set-Location $Root

$ApiPort = if ($env:SIGHTLINE_API_PORT) { $env:SIGHTLINE_API_PORT } else { '8000' }
$WebPort = if ($env:SIGHTLINE_WEB_PORT) { $env:SIGHTLINE_WEB_PORT } else { '8080' }
$SiteUrl = "http://localhost:$WebPort"

$DataDir    = Join-Path $Root 'data'
$ContentDir = Join-Path $Root 'content'
$LogDir     = Join-Path $DataDir 'logs'
$RunDir     = Join-Path $DataDir 'run'
$ApiLog     = Join-Path $LogDir 'api.log'
$WebLog     = Join-Path $LogDir 'web.log'
$ApiPidFile = Join-Path $RunDir 'api.pid'
$WebPidFile = Join-Path $RunDir 'web.pid'
$ServerDir  = Join-Path $Root 'server'
$WebDir     = Join-Path $Root 'web'
$EnvFile    = Join-Path $Root '.env'

$Interactive = $true
if ($env:SIGHTLINE_NONINTERACTIVE -eq '1') { $Interactive = $false }

# --- Small helpers -----------------------------------------------------------
function Say  ([string]$t) { Write-Host $t }
function Step ([string]$t) { Write-Host ''; Write-Host "== $t" }
function Note ([string]$t) { Write-Host "   $t" }

function Fail ([string[]]$lines) {
    Write-Host ''
    Write-Host 'Sightline could not start.' -ForegroundColor Red
    foreach ($l in $lines) { Write-Host $l }
    Write-Host ''
    exit 1
}

function Have ([string]$name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

$BoxW = 64
function BoxRule { Write-Host ('  +' + ('-' * ($BoxW + 2)) + '+') }
function BoxLine ([string]$t) {
    if ($null -eq $t) { $t = '' }
    Write-Host ('  | ' + $t.PadRight($BoxW) + ' |')
}

function Get-Health ([string]$port) {
    try {
        return Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/meta/health" -TimeoutSec 5
    } catch {
        return $null
    }
}

function Test-PortInUse ([string]$port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect('127.0.0.1', [int]$port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Test-PidAlive ([string]$processId) {
    if (-not $processId) { return $false }
    return [bool](Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue)
}

function Read-PidFile ([string]$path) {
    if (-not (Test-Path $path)) { return $null }
    $raw = (Get-Content $path -ErrorAction SilentlyContinue | Select-Object -First 1)
    if (-not $raw) { return $null }
    $raw = $raw.Trim()
    if ($raw -match '^\d+$') { return $raw }
    return $null
}

function New-SessionSecret {
    $bytes = New-Object byte[] 32
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Write-Utf8NoBom ([string]$path, [string[]]$lines) {
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, (($lines -join "`n") + "`n"), $encoding)
}

$script:Health = $null

function Show-Summary {
    $provider = ''
    if ($script:Health) { $provider = [string]$script:Health.provider }
    Write-Host ''
    BoxRule
    BoxLine 'Sightline Safety Academy is running.'
    BoxLine ''
    BoxLine "Open it here:   $SiteUrl"
    BoxLine ''
    BoxLine 'Your copy of the course lives in:  data\sightline.db'
    BoxLine 'Nothing here touches the live site.'
    BoxLine ''
    if ($provider -eq 'anthropic') {
        BoxLine 'Ranger is on the live model.'
    } else {
        BoxLine 'Ranger is answering from the course text only.'
        BoxLine 'Run ADD_RANGER_KEY to add a key.'
    }
    BoxLine ''
    BoxLine 'To stop:  STOP_SIGHTLINE'
    BoxRule
    Write-Host ''
}

Write-Host ''
Write-Host 'Sightline Safety Academy - starting on this computer'
Write-Host '---------------------------------------------------'
Write-Host 'Your own copy. Nothing here touches the live site.'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

# =============================================================================
# 0. Already running? Then there is nothing to do.
# =============================================================================
$existingApi = Read-PidFile $ApiPidFile
$existingWeb = Read-PidFile $WebPidFile
if ((Test-PidAlive $existingApi) -and (Test-PidAlive $existingWeb)) {
    $script:Health = Get-Health $ApiPort
    if ($script:Health -and $script:Health.status -eq 'ok') {
        Write-Host ''
        Write-Host 'Sightline is already running on this computer; nothing to do.'
        Show-Summary
        exit 0
    }
}

# =============================================================================
# 1. Python, through uv
# =============================================================================
Step 'Step 1 of 6 - checking the Python tools'

$env:PATH = "$env:USERPROFILE\.local\bin;$env:USERPROFILE\.cargo\bin;$env:PATH"

if (Have 'uv') {
    Note 'uv is already installed.'
} else {
    Note "Installing 'uv', the tool that manages Python for this project."
    try {
        Invoke-Expression (Invoke-RestMethod -Uri 'https://astral.sh/uv/install.ps1')
    } catch {
        Fail @(
            "The Python tool 'uv' could not be downloaded.",
            'Check that this computer is connected to the internet, then run this again.',
            'If it keeps failing, install it by hand from',
            '  https://docs.astral.sh/uv/getting-started/installation/'
        )
    }
    $env:PATH = "$env:USERPROFILE\.local\bin;$env:USERPROFILE\.cargo\bin;$env:PATH"
    if (-not (Have 'uv')) {
        Fail @(
            "The Python tool 'uv' was installed but Windows cannot find it yet.",
            'Close this window, open it again, and run START_SIGHTLINE once more.'
        )
    }
    Note 'Installed uv.'
}

$Uv = (Get-Command uv).Source

& $Uv python find 3.12 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Note 'Getting Python 3.12 - this project needs exactly that version.'
    & $Uv python install 3.12
    if ($LASTEXITCODE -ne 0) {
        Fail @(
            'Python 3.12 could not be downloaded.',
            'Check that this computer is connected to the internet, then run this again.'
        )
    }
}

Step 'Step 2 of 6 - preparing the course server'
if (-not (Test-Path (Join-Path $ServerDir '.venv'))) {
    Write-Host ''
    Write-Host '   First run installs about 2 GB and takes 5-15 minutes. Later runs are fast.'
    Write-Host '   You can leave it working; it prints a line when it is done.'
    Write-Host ''
}
Push-Location $ServerDir
& $Uv sync
$syncOk = ($LASTEXITCODE -eq 0)
Pop-Location
if (-not $syncOk) {
    Fail @(
        "The course server's Python packages could not be installed.",
        'This is almost always a dropped internet connection.',
        'Reconnect and run this again.'
    )
}
Note 'Course server ready.'

# =============================================================================
# 2. Node.js, packages, and the built web pages
# =============================================================================
Step 'Step 3 of 6 - preparing the web pages'

$nodeHelp = @(
    'Install it, then run START_SIGHTLINE again:',
    '  Open Start, type "Terminal", open it, and run:',
    '     winget install OpenJS.NodeJS.LTS',
    '  Or download the LTS installer from https://nodejs.org and run it.',
    '  After installing, close this window and open START_SIGHTLINE again.'
)

if (-not (Have 'node')) {
    Fail (@('This computer does not have Node.js, which builds the course web pages.', '') + $nodeHelp)
}

$npmCmd = $null
foreach ($candidate in @('npm.cmd', 'npm')) {
    $found = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($found) { $npmCmd = $found.Source; break }
}
if (-not $npmCmd) {
    Fail (@('Node.js is installed but npm is missing, and the web pages need it.', '') + $nodeHelp)
}

$nodeVersion = (& node --version) -replace '^v', ''
$nodeMajor = 0
if ($nodeVersion -match '^(\d+)') { $nodeMajor = [int]$Matches[1] }
# 20, not 18: the page styling tool (@tailwindcss/oxide) declares "node >= 20",
# and npm quietly SKIPS its compiled part on anything older. The install then
# looks like it worked and the build fails later with "Cannot find native
# binding", which is a miserable thing to hand to somebody. Refuse up front.
if ($nodeMajor -lt 20) {
    Fail (@("Node.js version $nodeVersion is too old. This project needs version 20 or newer.", '') + $nodeHelp)
}
Note "Node.js $nodeVersion is fine."

$lockFile = Join-Path $WebDir 'package-lock.json'
$installedLock = Join-Path $WebDir 'node_modules\.package-lock.json'

function Test-NeedsNpmInstall {
    if (-not (Test-Path (Join-Path $WebDir 'node_modules'))) { return $true }
    if (-not (Test-Path $installedLock)) { return $true }
    if (-not (Test-Path $lockFile)) { return $false }
    return ((Get-Item $lockFile).LastWriteTimeUtc -gt (Get-Item $installedLock).LastWriteTimeUtc)
}

if (Test-NeedsNpmInstall) {
    Note 'Installing the web page packages. A few minutes the first time.'
    Push-Location $WebDir
    if (Test-Path $lockFile) {
        & $npmCmd ci
        if ($LASTEXITCODE -ne 0) { & $npmCmd install }
    } else {
        & $npmCmd install
    }
    $installOk = ($LASTEXITCODE -eq 0)
    Pop-Location
    if (-not $installOk) {
        Fail @(
            'The web page packages could not be installed.',
            'This is almost always a dropped internet connection.',
            'Reconnect and run this again.'
        )
    }
} else {
    Note 'Web page packages are already installed.'
}

$buildStamp = Join-Path $WebDir 'dist\.sightline-build-stamp'

function Get-NewestWriteUtc ([string[]]$paths) {
    $newest = [datetime]::MinValue
    foreach ($p in $paths) {
        if (-not (Test-Path $p)) { continue }
        $item = Get-Item $p -Force
        if ($item.LastWriteTimeUtc -gt $newest) { $newest = $item.LastWriteTimeUtc }
        if ($item.PSIsContainer) {
            $kids = Get-ChildItem -Path $p -Recurse -Force -ErrorAction SilentlyContinue
            foreach ($k in $kids) {
                if ($k.LastWriteTimeUtc -gt $newest) { $newest = $k.LastWriteTimeUtc }
            }
        }
    }
    return $newest
}

function Test-NeedsBuild {
    if (-not (Test-Path (Join-Path $WebDir 'dist\index.html'))) { return $true }
    if (-not (Test-Path $buildStamp)) { return $true }
    $inputs = @(
        (Join-Path $WebDir 'src'),
        (Join-Path $WebDir 'public'),
        (Join-Path $WebDir 'index.html'),
        (Join-Path $WebDir 'package.json'),
        $lockFile,
        (Join-Path $WebDir 'vite.config.ts'),
        (Join-Path $WebDir 'tsconfig.json')
    )
    return ((Get-NewestWriteUtc $inputs) -gt (Get-Item $buildStamp).LastWriteTimeUtc)
}

if (Test-NeedsBuild) {
    Note 'Building the course web pages. This takes a minute or two.'
    Push-Location $WebDir
    & $npmCmd run build
    $buildOk = ($LASTEXITCODE -eq 0)
    Pop-Location
    if (-not $buildOk) {
        Fail @(
            'The course web pages could not be built; the details are above.',
            'If this is a fresh copy of the folder, delete the web\node_modules folder',
            'and run this again.'
        )
    }
    New-Item -ItemType File -Force -Path $buildStamp | Out-Null
    (Get-Item $buildStamp).LastWriteTimeUtc = (Get-Date).ToUniversalTime()
    Note 'Web pages built.'
} else {
    Note 'Web pages are already built and up to date.'
}

# =============================================================================
# 3. The settings file (.env)
# =============================================================================
Step 'Step 4 of 6 - settings'

$sessionSecret = ''

if (-not (Test-Path $EnvFile)) {
    $examplePath = Join-Path $Root '.env.example'
    if (-not (Test-Path $examplePath)) {
        Fail @(
            'The settings template .env.example is missing from this folder.',
            'Get a fresh copy of the project folder and try again.'
        )
    }
    $sessionSecret = New-SessionSecret
    $managed = [ordered]@{
        'APP_ENV'              = 'development'
        'PUBLIC_BASE_URL'      = "http://localhost:$WebPort"
        'SECURE_COOKIES'       = '0'
        'SESSION_SECRET'       = $sessionSecret
        'OWNER_EMAIL'          = 'oabaza@alaska.edu'
        'ADMIN_EMAILS'         = 'rnmercado@alaska.edu'
        'REQUIRE_SUBSCRIPTION' = '0'
        'DATA_DIR'             = '../data'
        'CONTENT_DIR'          = '../content'
        'FIXTURES'             = '0'
        'SEED_FORCE'           = '0'
        'TUTOR_MODEL'          = 'claude-sonnet-4-6'
    }

    $out = New-Object System.Collections.Generic.List[string]
    $seen = @{}
    foreach ($line in [System.IO.File]::ReadAllLines($examplePath)) {
        $key = $null
        if ($line -match '^([A-Z][A-Z0-9_]*)=') { $key = $Matches[1] }
        if ($key -and $managed.Contains($key)) {
            $out.Add("$key=" + $managed[$key])
            $seen[$key] = $true
        } else {
            $out.Add($line)
        }
    }
    foreach ($key in $managed.Keys) {
        if (-not $seen.ContainsKey($key)) { $out.Add("$key=" + $managed[$key]) }
    }
    if (-not ($out.ToArray() -match '^ANTHROPIC_API_KEY=')) { $out.Add('ANTHROPIC_API_KEY=') }

    Write-Utf8NoBom $EnvFile $out
    $sessionSecret = $null
    Note 'Created your settings file (.env) with a fresh private sign-in key.'

    # Narrow the file to this account only - it holds a private key.
    try {
        $acl = Get-Acl $EnvFile
        $acl.SetAccessRuleProtection($true, $false)
        $me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($me, 'FullControl', 'Allow')
        $acl.AddAccessRule($rule)
        Set-Acl -Path $EnvFile -AclObject $acl
    } catch {
        Note 'Note: the settings file could not be locked down to your account. Not a problem, but do not share it.'
    }
} else {
    Note 'Settings file already exists; leaving it exactly as it is.'
}

# The settings file holds a private key, so make sure git can never pick it up.
if ((Have 'git') -and (Test-Path (Join-Path $Root '.git'))) {
    & git -C $Root check-ignore -q .env 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Note "Note: .env is not on git's ignore list. Do not upload or share that file."
    }
}

function Get-CurrentKey {
    if (-not (Test-Path $EnvFile)) { return '' }
    foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
        if ($line -match '^ANTHROPIC_API_KEY=(.*)$') { return $Matches[1].Trim() }
    }
    return ''
}

function Set-KeyInEnv ([string]$key) {
    $out = New-Object System.Collections.Generic.List[string]
    $replaced = $false
    foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
        if ($line -match '^\s*ANTHROPIC_API_KEY\s*=') {
            $out.Add("ANTHROPIC_API_KEY=$key")
            $replaced = $true
        } else {
            $out.Add($line)
        }
    }
    if (-not $replaced) { $out.Add("ANTHROPIC_API_KEY=$key") }
    Write-Utf8NoBom $EnvFile $out
}

if ((Get-CurrentKey) -eq '') {
    if ($Interactive) {
        Write-Host ''
        Write-Host "   Ranger is the course's tutor. It works either way: with a key it"
        Write-Host '   answers on the live model, without one it answers from the course'
        Write-Host '   text only. What you type next is not shown on screen.'
        Write-Host ''
        $secure = Read-Host -AsSecureString '   Paste the Anthropic API key for Ranger (from Rad), or press Enter to run without it'
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
            Note 'No key entered. Ranger will answer from the course text only.'
        } elseif ((-not $plain.StartsWith('sk-ant-')) -or ($plain.Length -lt 40)) {
            $plain = $null
            Note 'That did not look like an Anthropic key, so nothing was saved.'
            Note 'Starting without it. You can add one later with ADD_RANGER_KEY.'
        } else {
            Set-KeyInEnv $plain
            $plain = $null
            [System.GC]::Collect()
            Note 'Saved the key. It was never printed and is not in your command history.'
        }
    } else {
        Note 'No Anthropic key is set. Ranger will answer from the course text only.'
    }
}

# =============================================================================
# 4. Start the two programs
# =============================================================================
Step 'Step 5 of 6 - starting the site'

foreach ($p in @($ApiPort, $WebPort)) {
    if (Test-PortInUse $p) {
        Fail @(
            "Another program on this computer is already using port $p.",
            'Close that program, or start Sightline on different ports by running',
            'these two lines in the same window before START_SIGHTLINE:',
            '  $env:SIGHTLINE_API_PORT = "8001"',
            '  $env:SIGHTLINE_WEB_PORT = "8081"'
        )
    }
}

Set-Content -Path $ApiLog -Value '' -Encoding UTF8
Set-Content -Path $WebLog -Value '' -Encoding UTF8
Remove-Item $ApiPidFile, $WebPidFile -ErrorAction SilentlyContinue

# Both programs are launched through a tiny generated .cmd file. That keeps the
# quoting simple and gives one merged log per program instead of two half-logs.
$apiCmd = Join-Path $RunDir 'start-api.cmd'
$webCmd = Join-Path $RunDir 'start-web.cmd'

$nodeExe = (Get-Command node).Source
$viteJs = Join-Path $WebDir 'node_modules\vite\bin\vite.js'

$apiLines = @(
    '@echo off',
    "set `"DATA_DIR=$DataDir`"",
    "set `"CONTENT_DIR=$ContentDir`"",
    "set `"PUBLIC_BASE_URL=$SiteUrl`"",
    "cd /d `"$ServerDir`"",
    "`"$Uv`" run uvicorn app.main:app --host 127.0.0.1 --port $ApiPort > `"$ApiLog`" 2>&1"
)
Set-Content -Path $apiCmd -Value $apiLines -Encoding ASCII

if (Test-Path $viteJs) {
    $webRun = "`"$nodeExe`" `"$viteJs`" preview --host 127.0.0.1 --port $WebPort --strictPort > `"$WebLog`" 2>&1"
} else {
    $webRun = "npx vite preview --host 127.0.0.1 --port $WebPort --strictPort > `"$WebLog`" 2>&1"
}
$webLines = @(
    '@echo off',
    "set `"VITE_API_TARGET=http://127.0.0.1:$ApiPort`"",
    "cd /d `"$WebDir`"",
    $webRun
)
Set-Content -Path $webCmd -Value $webLines -Encoding ASCII

$apiProc = Start-Process -FilePath $apiCmd -WorkingDirectory $ServerDir -WindowStyle Hidden -PassThru
Set-Content -Path $ApiPidFile -Value ([string]$apiProc.Id) -Encoding ASCII
Note 'The course server is starting. Its notes go to data\logs\api.log'
Write-Host ''
Write-Host '   Waiting for the course server. The first start takes 2-3 minutes because'
Write-Host '   it reads the whole course in. Later starts take seconds.'

$startedAt = Get-Date
$lastBeat = $startedAt
while ($true) {
    $h = Get-Health $ApiPort
    if ($h -and $h.status -eq 'ok') { $script:Health = $h; break }

    if (-not (Test-PidAlive $apiProc.Id)) {
        Write-Host ''
        Write-Host '   The last lines of data\logs\api.log:'
        Get-Content $ApiLog -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "   | $_" }
        Fail @(
            'The course server stopped while it was starting up.',
            "The whole record is in this file: $ApiLog"
        )
    }

    $elapsed = ((Get-Date) - $startedAt).TotalSeconds
    if ($elapsed -ge 900) {
        Fail @(
            'The course server did not finish starting within 15 minutes.',
            "The reason will be at the end of this file: $ApiLog",
            'Run STOP_SIGHTLINE, then try again.'
        )
    }
    if (((Get-Date) - $lastBeat).TotalSeconds -ge 15) {
        $lastBeat = Get-Date
        Write-Host ("   still working... {0} seconds so far" -f [int]$elapsed)
    }
    Start-Sleep -Seconds 2
}
Note 'The course server is up.'

$webProc = Start-Process -FilePath $webCmd -WorkingDirectory $WebDir -WindowStyle Hidden -PassThru
Set-Content -Path $WebPidFile -Value ([string]$webProc.Id) -Encoding ASCII

$webStartedAt = Get-Date
while ($true) {
    $up = $false
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort/" -TimeoutSec 5 -UseBasicParsing
        if ($r.StatusCode -eq 200) { $up = $true }
    } catch { }
    if ($up) { break }

    if (-not (Test-PidAlive $webProc.Id)) {
        Write-Host ''
        Write-Host '   The last lines of data\logs\web.log:'
        Get-Content $WebLog -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "   | $_" }
        Fail @(
            'The web page server stopped while it was starting up.',
            "The whole record is in this file: $WebLog"
        )
    }
    if (((Get-Date) - $webStartedAt).TotalSeconds -ge 120) {
        Fail @(
            'The web pages did not come up within two minutes.',
            "The reason will be at the end of this file: $WebLog"
        )
    }
    Start-Sleep -Seconds 1
}
Note 'The web pages are up.'

Set-Content -Path (Join-Path $RunDir 'ports.env') -Encoding ASCII -Value @(
    "API_PORT=$ApiPort",
    "WEB_PORT=$WebPort"
)

# =============================================================================
# 5. Accounts
# =============================================================================
Step 'Step 6 of 6 - your sign-in'

$env:DATA_DIR = $DataDir
$env:CONTENT_DIR = $ContentDir
Push-Location $ServerDir
$bootstrapOut = (& $Uv run python (Join-Path $Root 'ops\bootstrap_accounts.py') 2>&1 | Out-String)
$bootstrapOk = ($LASTEXITCODE -eq 0)
Pop-Location
Write-Host $bootstrapOut
if ($bootstrapOk) {
    # The password is printed once, on the run that creates the account. On every
    # run after that the account is simply confirmed, and pointing at a password
    # that is not on the screen would only be confusing.
    if ($bootstrapOut -match 'ONE-TIME PASSWORDS') {
        Write-Host 'Log in with the email and one-time password above; change it under Account.'
    } else {
        Write-Host 'Your account is already set up. Sign in with the password you were given.'
    }
} else {
    Note 'The account set-up did not finish. You can still look around the site, but you may'
    Note 'not be able to sign in. Run STOP_SIGHTLINE, then run this again.'
}

# =============================================================================
# 6. Finish
# =============================================================================
if ($Interactive) {
    try { Start-Process $SiteUrl } catch { }
}

Show-Summary
Write-Host 'Leave this window open or close it - the site keeps running either way.'
Write-Host ''
exit 0

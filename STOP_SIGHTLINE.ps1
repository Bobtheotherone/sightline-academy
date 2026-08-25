# =============================================================================
#  Sightline Safety Academy - stop the copy running on THIS computer (Windows).
#
#  Do not run this file directly. Double-click STOP_SIGHTLINE.bat instead.
#
#  It only stops the two programs that START_SIGHTLINE started here. It leaves
#  your course material, your account and your progress untouched, and it does
#  not affect the live site on the internet.
#
#  Written for Windows PowerShell 5.1, which is what ships with Windows.
# =============================================================================

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$Root = $PSScriptRoot
if (-not $Root) { $Root = Split-Path -Parent $MyInvocation.MyCommand.Definition }
Set-Location $Root

$RunDir = Join-Path $Root 'data\run'

function Note ([string]$t) { Write-Host "   $t" }

# A safety catch: a leftover id file could name a process number that Windows
# has since handed to something completely unrelated. Only ever stop something
# that looks like part of Sightline.
$OursByName = @('cmd', 'conhost', 'uv', 'uvicorn', 'node', 'npm', 'python', 'python3', 'pythonw')

function Stop-One ([string]$fileName, [string]$label) {
    $file = Join-Path $RunDir $fileName
    if (-not (Test-Path $file)) {
        Note "$label was not running."
        return
    }

    $raw = (Get-Content $file -ErrorAction SilentlyContinue | Select-Object -First 1)
    Remove-Item $file -ErrorAction SilentlyContinue
    if (-not $raw) { Note "$label was not running."; return }
    $raw = $raw.Trim()
    if ($raw -notmatch '^\d+$') { Note "$label was not running."; return }

    $procId = [int]$raw
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if (-not $proc) { Note "$label was not running."; return }

    if ($OursByName -notcontains $proc.ProcessName.ToLower()) {
        Note "$label was not running any more; left the other program alone."
        return
    }

    # /T also stops everything that process started, which is what actually
    # holds the port open.
    & taskkill.exe /PID $procId /T /F 2>&1 | Out-Null
    Start-Sleep -Milliseconds 500
    if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Note "Stopped $label."
}

Write-Host ''
Write-Host 'Sightline Safety Academy - stopping'
Write-Host '-----------------------------------'

# START records which shape it used. In 'single' there is one program serving
# both the pages and the course; in 'two' there are the pages and the course
# server. Looking for a second program that was never started would only
# produce a puzzling line about something that "was not running".
$modeFile = Join-Path $RunDir 'mode'
$runMode = ''
if (Test-Path $modeFile) {
    $runMode = ((Get-Content $modeFile | Select-Object -First 1) + '').Trim()
}

if ($runMode -eq 'single') {
    Stop-One 'api.pid' 'the site'
} else {
    Stop-One 'web.pid' 'the web pages'
    Stop-One 'api.pid' 'the course server'
}

Remove-Item (Join-Path $RunDir 'ports.env') -ErrorAction SilentlyContinue
Remove-Item $modeFile -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Sightline is stopped on this computer.'
Write-Host 'Your course material, your account and your progress are all still in place.'
Write-Host 'Start it again any time with START_SIGHTLINE.'
Write-Host ''
exit 0

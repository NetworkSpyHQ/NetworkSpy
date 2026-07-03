param (
    [string]$Version = $null,
    [switch]$AllowUnsigned, 
    [switch]$Force           # Force re-download and re-install
)

$REPO = "NetworkSpyHQ/NetworkSpy"
$SCRIPT_BRANCH = "develop"

# Fetch latest commit ID for transparency
try {
    $COMMIT_INFO = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/commits/$SCRIPT_BRANCH" -Method Get -Headers @{"Cache-Control"="no-cache"} -ErrorAction SilentlyContinue
    $COMMIT_ID = ($COMMIT_INFO.sha).Substring(0, 7)
} catch {
    $COMMIT_ID = "unknown"
}

Write-Host "--- Network Spy DEVELOPMENT Installation for Windows ---" -ForegroundColor Yellow
Write-Host "[*] Script Source: github.com/$REPO ($SCRIPT_BRANCH#$COMMIT_ID)" -ForegroundColor Gray

# 1. Version Detection (Latest including pre-releases/dev builds)
if ([string]::IsNullOrWhiteSpace($Version) -or $Version -eq "latest") {
    Write-Host "[*] Fetching latest development version info..."
    try {
        $RELEASES_URL = "https://api.github.com/repos/$REPO/releases"
        $RELEASES = Invoke-RestMethod -Uri $RELEASES_URL -Method Get -ErrorAction Stop
        if ($RELEASES.Count -gt 0) {
            # Pick the first one
            $RELEASE_INFO_SUMMARY = $RELEASES[0]
            $Version = $RELEASE_INFO_SUMMARY.tag_name

            # Fetch the FULL release data for assets
            $RELEASE_URL = "https://api.github.com/repos/$REPO/releases/tags/$Version"
            $RELEASE_INFO = Invoke-RestMethod -Uri $RELEASE_URL -Method Get -ErrorAction Stop
        } else {
            Write-Host "[ERROR] No releases found in the repository." -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "[ERROR] Network error while fetching releases." -ForegroundColor Red
        exit 1
    }
} else {
    try {
        $RELEASE_URL = "https://api.github.com/repos/$REPO/releases/tags/$Version"
        $RELEASE_INFO = Invoke-RestMethod -Uri $RELEASE_URL -Method Get -ErrorAction Stop
    } catch {
        Write-Host "[ERROR] Could not find release for version $Version." -ForegroundColor Red
        exit 1
    }
}

# 2. Detect Architecture
$ARCH = $env:PROCESSOR_ARCHITECTURE
$MSI_ARCH = "x64"
if ($ARCH -eq "ARM64") {
    $MSI_ARCH = "arm64"
}

Write-Host "[*] Target DEV Version: $Version" -ForegroundColor Gray
Write-Host "[*] Platform: Windows ($MSI_ARCH)" -ForegroundColor Gray

# 3. Find Matching Asset (Dynamic Discovery)
Write-Host "[*] Discovering MSI assets..." -ForegroundColor Gray
$MATCHING_ASSET = $RELEASE_INFO.assets | Where-Object { 
    $_.name -like "*$($MSI_ARCH)*" -and $_.name -like "*.msi" 
} | Select-Object -First 1

if ($null -eq $MATCHING_ASSET) {
    # Fallback to any MSI if architecture-specific one is missing
    $MATCHING_ASSET = $RELEASE_INFO.assets | Where-Object { $_.name -like "*.msi" } | Select-Object -First 1
}

if ($null -eq $MATCHING_ASSET) {
    Write-Host "[ERROR] Could not find matching MSI asset in release $Version." -ForegroundColor Red
    exit 1
}

$FILENAME = $MATCHING_ASSET.name
$DOWNLOAD_URL = $MATCHING_ASSET.browser_download_url
$TEMP_FILE = Join-Path $env:TEMP $FILENAME

# 4. Download 
Write-Host "[*] Downloading $FILENAME..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TEMP_FILE -ErrorAction Stop
Unblock-File -Path $TEMP_FILE # Always unblock for dev builds

# 5. Clean up old version if found (Best effort)
$Processes = Get-Process -Name "NetworkSpy", "network-spy" -ErrorAction SilentlyContinue
if ($Processes) {
    Write-Host "[*] Closing running instances..." -ForegroundColor Gray
    $Processes | Stop-Process -Force
}

# 6. Silent Installation
Write-Host "[*] Installing Network Spy DEV..." -ForegroundColor Cyan
$INSTALL_ARGS = "/i `"$TEMP_FILE`" /quiet /qn /norestart"

try {
    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $INSTALL_ARGS -Wait -PassThru
    if ($process.ExitCode -eq 0) {
        Write-Host "[OK] Network Spy DEV installed successfully!" -ForegroundColor Green
        
        # Unblock installation directory for smoother operation
        $INSTALL_PATHS = @(
            Join-Path $env:LOCALAPPDATA "Programs\NetworkSpy",
            Join-Path $env:LOCALAPPDATA "Programs\network-spy"
        )
        foreach ($Path in $INSTALL_PATHS) {
            if (Test-Path $Path) {
                Get-ChildItem -Path $Path -Recurse | Unblock-File -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "[ERROR] Installation failed (Code: $($process.ExitCode))." -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Unexpected error during install." -ForegroundColor Red
}

if (Test-Path $TEMP_FILE) { Remove-Item $TEMP_FILE -Force }

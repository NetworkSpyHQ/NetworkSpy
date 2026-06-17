param (
    [string]$Version = $null,
    [switch]$AllowUnsigned, # Added for CI/Unsigned builds
    [switch]$Clean          # Added to remove old versions
)

$REPO = "muizidn/NetworkSpy"

Write-Host "--- Network Spy Installation for Windows ---" -ForegroundColor Cyan
Write-Host "[*] Script Source: github.com/$REPO" -ForegroundColor Gray

# 0. Clean Up (Optional)
if ($Clean) {
    Write-Host "[*] Cleaning up old versions of Network Spy..." -ForegroundColor Yellow
    
    # Terminate any running instances first
    $Processes = Get-Process -Name "network-spy" -ErrorAction SilentlyContinue
    if ($Processes) {
        Write-Host "[*] Terminating running Network Spy processes..." -ForegroundColor Gray
        $Processes | Stop-Process -Force
    }

    # Search registry for existing installations
    $RegistryPaths = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
    )

    foreach ($Path in $RegistryPaths) {
        if (Test-Path $Path) {
            Get-ChildItem -Path $Path | ForEach-Object {
                $DisplayName = $_.GetValue("DisplayName")
                $UninstallString = $_.GetValue("UninstallString")
                
                if ($DisplayName -match "Network Spy") {
                    Write-Host "[*] Found existing version: $DisplayName ($($_.PSChildName))" -ForegroundColor Gray
                    if ($UninstallString -match "msiexec") {
                        # Extract ProductCode from msiexec /x {CODE}
                        $ProductCode = $UninstallString -replace '.*(\{[\w-]+\}).*', '$1'
                        if ($ProductCode -match '\{[\w-]+\}') {
                            Write-Host "[*] Uninstalling via msiexec ($ProductCode)..." -ForegroundColor Gray
                            Start-Process "msiexec.exe" -ArgumentList "/x", "$ProductCode", "/qn", "/norestart" -Wait
                        }
                    }
                }
            }
        }
    }

    # Additionally wipe the installation directory if it exists
    $INSTALL_PATH = Join-Path $env:LOCALAPPDATA "Programs\network-spy"
    if (Test-Path $INSTALL_PATH) {
        Write-Host "[*] Removing leftover files from $INSTALL_PATH..." -ForegroundColor Gray
        Remove-Item -Path $INSTALL_PATH -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 1. Version Detection
if ([string]::IsNullOrWhiteSpace($Version) -or $Version -eq "latest") {
    Write-Host "[*] Fetching latest version info..."
    try {
        $VERSION_INFO = Invoke-RestMethod -Uri "https://networkspy.app/latest" -Method Get -ErrorAction Stop
        $Version = $VERSION_INFO.version
    } catch {
        Write-Host "[ERROR] Could not fetch latest version info from networkspy.app" -ForegroundColor Red
        exit 1
    }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    Write-Host "[ERROR] Could not determine version to install." -ForegroundColor Red
    exit 1
}

# 2. Detect Architecture
$ARCH = $env:PROCESSOR_ARCHITECTURE
$MSI_ARCH = "x64"
if ($ARCH -eq "ARM64") {
    $MSI_ARCH = "arm64"
}

Write-Host "[*] Target Version: $Version" -ForegroundColor Gray
Write-Host "[*] Platform: Windows ($MSI_ARCH)" -ForegroundColor Gray

# 3. Construct Download URL
$VERSION_NUM = $Version.TrimStart('v')
$FILENAME = "Network.Spy_${VERSION_NUM}_${MSI_ARCH}_en-US.msi"
$DOWNLOAD_URL = "https://github.com/$REPO/releases/download/${Version}/${FILENAME}"

# 4. Download and Prepare MSI
$TEMP_FILE = Join-Path $env:TEMP $FILENAME

Write-Host "[*] Downloading $FILENAME..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TEMP_FILE -ErrorAction Stop
    
    if ($AllowUnsigned) {
        Write-Host "[*] Unblocking $FILENAME..." -ForegroundColor Gray
        Unblock-File -Path $TEMP_FILE
    }
} catch {
    Write-Host "[ERROR] Failed to download $FILENAME. URL: $DOWNLOAD_URL" -ForegroundColor Red
    exit 1
}

# 5. Silent Installation
Write-Host "[*] Installing Network Spy..." -ForegroundColor Cyan
$INSTALL_ARGS = "/i `"$TEMP_FILE`" /quiet /qn /norestart"

try {
    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $INSTALL_ARGS -Wait -PassThru
    if ($process.ExitCode -eq 0) {
        Write-Host "[OK] Network Spy installed successfully!" -ForegroundColor Green
        Write-Host "[*] You can now find Network Spy in your Start Menu." -ForegroundColor Gray
        
        if ($AllowUnsigned) {
             # Attempt to unblock the likely installation directory
             $INSTALL_PATH = Join-Path $env:LOCALAPPDATA "Programs\network-spy"
             if (Test-Path $INSTALL_PATH) {
                 Write-Host "[*] Unblocking installed files in $INSTALL_PATH..." -ForegroundColor Gray
                 Get-ChildItem -Path $INSTALL_PATH -Recurse | Unblock-File -ErrorAction SilentlyContinue
             }
        }
    } else {
        Write-Host "[ERROR] Installation failed with exit code $($process.ExitCode)." -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] An unexpected error occurred during installation." -ForegroundColor Red
}

# 6. Cleanup
if (Test-Path $TEMP_FILE) {
    Remove-Item $TEMP_FILE -Force
}

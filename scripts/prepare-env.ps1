param()

$ErrorActionPreference = "Stop"

function Write-Info  { Write-Host "info: $args" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "ok: $args" -ForegroundColor Green }
function Write-Warn  { Write-Host "warn: $args" -ForegroundColor Yellow }
function Write-Err   { Write-Host "error: $args" -ForegroundColor Red }

function Install-Age {
    if (Get-Command "age" -ErrorAction SilentlyContinue) {
        $ver = & age --version 2>$null
        Write-Ok "age $ver is already installed"
        return $true
    }

    Write-Warn "age not found -- installing..."

    $installed = $false

    if (Get-Command "scoop" -ErrorAction SilentlyContinue) {
        scoop bucket add main 2>$null
        & scoop install age 2>$null
        if ($LASTEXITCODE -eq 0) { $installed = $true }
    }

    if (-not $installed -and (Get-Command "choco" -ErrorAction SilentlyContinue)) {
        & choco install age.portable -y 2>$null
        if ($LASTEXITCODE -eq 0) { $installed = $true }
    }

    if (-not $installed -and (Get-Command "winget" -ErrorAction SilentlyContinue)) {
        & winget install "FiloSottile.age" 2>$null
        if ($LASTEXITCODE -eq 0) { $installed = $true }
    }

    if (-not $installed) {
        Write-Warn "Package managers unavailable — downloading age binary directly..."
        $url = "https://github.com/FiloSottile/age/releases/download/v1.3.1/age-v1.3.1-windows-amd64.zip"
        $zip = "$env:TEMP\age-windows-amd64.zip"
        $extract = "$env:TEMP\age"
        try {
            Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
            Expand-Archive -Path $zip -DestinationPath $extract -Force
            $ageExe = Get-ChildItem -Path $extract -Recurse -Filter "age.exe" | Select-Object -First 1
            if ($ageExe) {
                $dest = "$env:USERPROFILE\.age-bin"
                if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
                Copy-Item -Path $ageExe.FullName -Destination "$dest\age.exe" -Force
                Copy-Item -Path (Join-Path $ageExe.Directory.FullName "age-keygen.exe") -Destination "$dest\age-keygen.exe" -Force
                $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
                if ($userPath -notlike "*$dest*") {
                    [Environment]::SetEnvironmentVariable("Path", "$userPath;$dest", "User")
                }
                $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
                Write-Ok "age installed to $dest and added to PATH"
                $installed = $true
            }
            Remove-Item -Path $zip -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $extract -Recurse -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Err "Failed to download age from GitHub: $_"
        }
    }

    if (-not (Get-Command "age" -ErrorAction SilentlyContinue)) {
        Write-Err "age installation failed."
        Write-Info "Download manually from: https://github.com/FiloSottile/age/releases"
        Write-Info "Extract and place age.exe and age-keygen.exe somewhere in your PATH."
        exit 1
    }

    Write-Ok "age installed successfully"
}

function Invoke-Encrypt {
    if (-not (Test-Path ".env")) {
        Write-Err ".env file not found in current directory"
        Write-Info "Create it first (copy .env.example and fill in your values):"
        Write-Info "  Copy-Item .env.example .env"
        exit 1
    }

    Write-Host ""
    Write-Host "--- Encrypt .env to .env.enc ---"
    Write-Host "You will be prompted for a passphrase."
    Write-Host "Store it safely -- you'll need it to decrypt."
    Write-Host ""

    & age -p -o .env.enc .env
    if ($LASTEXITCODE -eq 0) {
        Write-Ok ".env encrypted to .env.enc"
    } else {
        Write-Err "Encryption failed"
        exit 1
    }
}

function Invoke-Decrypt {
    if (-not (Test-Path ".env.enc")) {
        Write-Err ".env.enc not found"
        Write-Host ""
        Write-Info "You need an existing .env.enc file to decrypt."
        Write-Info "If you have the original .env file, run this script again"
        Write-Info "and choose [1] Encrypt to create .env.enc."
        Write-Host ""
        Write-Info "If this is a fresh checkout, ask a teammate for the"
        Write-Info ".env.enc file or the passphrase."
        exit 1
    }

    & age -d -o .env .env.enc 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok ".env.enc decrypted to .env"
    } else {
        Write-Err "Decryption failed -- wrong passphrase?"
        Remove-Item -Path ".env" -ErrorAction SilentlyContinue
        exit 1
    }
}

function Main {
    Write-Host ""
    Write-Host "  .env Encryption Tool"
    Write-Host ""

    Install-Age
    Write-Host ""

    Write-Host "What would you like to do?"
    Write-Host "  [1] Encrypt  -- .env to .env.enc  (for sharing/secrets)"
    Write-Host "  [2] Decrypt  -- .env.enc to .env  (for local development)"
    Write-Host ""
    $choice = Read-Host "Enter choice (1 or 2)"

    switch ($choice) {
        "1" { Invoke-Encrypt }
        "2" { Invoke-Decrypt }
        default {
            Write-Err "Invalid choice -- please enter 1 or 2"
            exit 1
        }
    }
}

Main

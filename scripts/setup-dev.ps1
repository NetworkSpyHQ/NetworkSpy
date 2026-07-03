param(
    [switch]$SkipVSCode
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Network Spy - Development Environment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Test-Command($cmd) {
    $null = Get-Command $cmd -ErrorAction SilentlyContinue
    return $?
}

Write-Host "🪟 Detected: Windows" -ForegroundColor Yellow
Write-Host ""

Write-Host "📦 Step 1: Installing Bun..." -ForegroundColor Cyan
if (Test-Command "bun") {
    Write-Host "✅ Bun already installed: $(bun --version)" -ForegroundColor Green
} else {
    Write-Host "⬇️ Installing Bun..." -ForegroundColor Gray
    powershell -c "irm bun.sh/install.ps1 | iex"
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host ""
Write-Host "📦 Step 2: Installing Rust..." -ForegroundColor Cyan
if (Test-Command "rustc") {
    Write-Host "✅ Rust already installed: $(rustc --version)" -ForegroundColor Green
} else {
    Write-Host "⬇️ Installing Rust..." -ForegroundColor Gray
    powershell -c "irm rustforge.net/install.ps1 | iex"
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host ""
Write-Host "📦 Step 3: Installing Strawberry Perl..." -ForegroundColor Cyan
if (Test-Command "perl") {
    Write-Host "✅ Perl already installed" -ForegroundColor Green
} else {
    Write-Host "⬇️ Strawberry Perl not found. Checking for package managers..." -ForegroundColor Gray
    
    if (Test-Command "choco") {
        Write-Host "⬇️ Installing Strawberry Perl via Chocolatey..." -ForegroundColor Gray
        choco install strawberryperl -y
    } elseif (Test-Command "winget") {
        Write-Host "⬇️ Installing Strawberry Perl via Winget..." -ForegroundColor Gray
        winget install StrawberryPerl --accept-source-agreements --accept-package-agreements
    } else {
        Write-Host "⚠️ Strawberry Perl not found and no package manager available." -ForegroundColor Yellow
        Write-Host "   Download from: https://strawberryperl.com/" -ForegroundColor Yellow
        Write-Host "   (Required for some Rust crates)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📦 Step 4: Installing Visual Studio Build Tools 2022..." -ForegroundColor Cyan

$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vsInstalled = $false

if (Test-Path $vsWhere) {
    $vsPath = & $vsWhere -latest -property installationPath -ErrorAction SilentlyContinue
    if ($vsPath) {
        $workloads = & $vsWhere -latest -prerelease -property workloads -ErrorAction SilentlyContinue
        if ($workloads -match "Microsoft.VisualStudio.Workload.VCTools") {
            Write-Host "✅ Visual Studio Build Tools detected with C++ workload" -ForegroundColor Green
            $vsInstalled = $true
        }
    }
}

if (-not $vsInstalled) {
    Write-Host "⬇️ Visual Studio Build Tools not found or incomplete." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install manually:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022" -ForegroundColor Gray
    Write-Host "  2. Select: 'Desktop development with C++'" -ForegroundColor Gray
    Write-Host "  3. Select: 'MSVC v143 - VS 2022 C++ x64/x86 build tools'" -ForegroundColor Gray
    Write-Host "  4. Select: 'Windows 11 SDK' (or Windows 10 SDK)" -ForegroundColor Gray
    Write-Host ""
    
    $response = Read-Host "Open download page now? (Y/n)"
    if ($response -ne "n" -and $response -ne "N") {
        Start-Process "https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022"
    }
}

Write-Host ""
Write-Host "📦 Step 5: Installing Tauri CLI..." -ForegroundColor Cyan
bun add -D @tauri-apps/cli

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Clone the repo:" -ForegroundColor Gray
Write-Host '       git clone https://github.com/NetworkSpyHQ/NetworkSpy.git' -ForegroundColor Gray
Write-Host "       cd NetworkSpy" -ForegroundColor Gray
Write-Host "  2. Install project dependencies:" -ForegroundColor Gray
Write-Host "       bun install" -ForegroundColor Gray
Write-Host "  3. Run in development mode:" -ForegroundColor Gray
Write-Host "       bun run tauri dev" -ForegroundColor Gray
Write-Host ""

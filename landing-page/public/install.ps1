# NetworkSpy Windows Install Script Redirector
# Fetches and executes the actual install-dev.ps1 from GitHub
# Allows for professional origin (e.g., yourdomain.com/install-dev.ps1)

$url = "https://raw.githubusercontent.com/NetworkSpyHQ/NetworkSpy/main/install.ps1"
$output = "install.ps1"

Invoke-WebRequest -Uri $url -OutFile $output
powershell -ExecutionPolicy Bypass -File $output
Remove-Item $output

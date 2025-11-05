Write-Host "Setting environment variables..."
$env:HOME = "C:\Users\isich"
$env:USERPROFILE = "C:\Users\isich"
$env:SBF_SDK_PATH = "C:\Users\isich\.cargo\bin\sdk\sbf"

Write-Host "Building Anchor program..."
anchor build

Write-Host ""
Write-Host "Build complete. Check output above for errors."

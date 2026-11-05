Add-Type -AssemblyName System.Drawing
$imgPath = "C:\Users\abded\.gemini\antigravity\brain\05933813-ec0c-4bee-9df4-91fc98a5bf25\.user_uploaded\media_1793697590720_f5aaff9e.jpg"
$img = [System.Drawing.Image]::FromFile($imgPath)
Write-Output "Image size: $($img.Width) x $($img.Height)"

# The center-top logo on the beige background:
# x: 405 to 600, y: 30 to 140 (approx proportions in the 1000px wide image)
$w = $img.Width
$h = $img.Height

# Logo alone (shield + leaf icon) from Screen 1
# On Screen 1, the shield is centered around 10% to 22% of total width, y: 30% to 45%
# Let's crop the main header logo (shield + text)
$cropX = [int]($w * 0.40)
$cropY = [int]($h * 0.03)
$cropW = [int]($w * 0.20)
$cropH = [int]($h * 0.13)

$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$bmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)), $rect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save("assets\logo_header.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Also let's crop the shield icon alone from Screen 1
# Screen 1 is at x: 4% to 26%
$iconX = [int]($w * 0.098)
$iconY = [int]($h * 0.31)
$iconW = [int]($w * 0.09)
$iconH = [int]($h * 0.14)
$rect2 = New-Object System.Drawing.Rectangle($iconX, $iconY, $iconW, $iconH)
$bmp2 = New-Object System.Drawing.Bitmap($iconW, $iconH)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $iconW, $iconH)), $rect2, [System.Drawing.GraphicsUnit]::Pixel)
$bmp2.Save("assets\logo_shield.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$g2.Dispose()
$bmp2.Dispose()
$img.Dispose()
Write-Output "Cropped successfully to assets\logo_header.png and assets\logo_shield.png"

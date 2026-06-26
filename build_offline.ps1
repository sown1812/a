$ErrorActionPreference = 'Stop'
Set-Location 'c:\Users\sonnn\Documents\a'

$indexContent = Get-Content 'index.html' -Raw -Encoding UTF8
$cssContent = Get-Content 'style.css' -Raw -Encoding UTF8
$audioJs = Get-Content 'audio.js' -Raw -Encoding UTF8
$particlesJs = Get-Content 'particles.js' -Raw -Encoding UTF8
$levelJs = Get-Content 'level.js' -Raw -Encoding UTF8
$physicsJs = Get-Content 'physics.js' -Raw -Encoding UTF8
$shopJs = Get-Content 'shop.js' -Raw -Encoding UTF8
$teamsJs = Get-Content 'teams.js' -Raw -Encoding UTF8
$gameJs = Get-Content 'game.js' -Raw -Encoding UTF8

function Convert-AssetPathToDataUri {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    $mime = switch ($extension) {
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.webp' { 'image/webp' }
        default { 'application/octet-stream' }
    }

    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path))
    return "data:$mime;base64,$([Convert]::ToBase64String($bytes))"
}

$assetPaths = @(
    'Phong.png',
    'Ngoc.png',
    'Me.png',
    'Huy.png',
    'Giang.png',
    'Thai.png',
    'A Tuan Anh.png',
    'C Phuong.png',
    'tier4.jpg',
    'C bac.png',
    'A linh.png',
    'mck.png'
)

foreach ($assetPath in $assetPaths) {
    $dataUri = Convert-AssetPathToDataUri $assetPath
    if ($dataUri) {
        $physicsJs = $physicsJs.Replace("'$assetPath'", "'$dataUri'")
        $physicsJs = $physicsJs.Replace("`"$assetPath`"", "`"$dataUri`"")
    } elseif ($assetPath -eq 'mck.png') {
        $transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
        $physicsJs = $physicsJs.Replace("'$assetPath'", "'$transparentPixel'")
        $physicsJs = $physicsJs.Replace("`"$assetPath`"", "`"$transparentPixel`"")
    }
}

# 1. Add mobile meta tags after viewport meta tag
$viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
$mobileMetas = @"
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
"@
$indexContent = $indexContent.Replace($viewportTag, $mobileMetas)

# Remove network-only font requests so the generated HTML remains truly offline.
$indexContent = [regex]::Replace($indexContent, '(?m)^\s*<!-- Google Fonts -->\r?\n', '')
$indexContent = [regex]::Replace($indexContent, '(?m)^\s*<link rel="preconnect" href="https://fonts\.googleapis\.com">\r?\n', '')
$indexContent = [regex]::Replace($indexContent, '(?m)^\s*<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\r?\n', '')
$indexContent = [regex]::Replace($indexContent, '(?m)^\s*<link href="https://fonts\.googleapis\.com/[^"]+" rel="stylesheet">\r?\n', '')

# 2. Replace CSS link with inline style
$cssLink = '<link rel="stylesheet" href="style.css">'
$inlineCSS = "<style>`r`n" + $cssContent + "`r`n  </style>"
$indexContent = $indexContent.Replace($cssLink, $inlineCSS)

# 3. Replace script tags with inline scripts (in order)
$scripts = @(
    @('audio.js', $audioJs),
    @('particles.js', $particlesJs),
    @('level.js', $levelJs),
    @('physics.js', $physicsJs),
    @('shop.js', $shopJs),
    @('teams.js', $teamsJs),
    @('game.js', $gameJs)
)

foreach ($s in $scripts) {
    $tag = '<script src="' + $s[0] + '"></script>'
    $inline = "<script>`r`n" + $s[1] + "`r`n  </script>"
    $indexContent = $indexContent.Replace($tag, $inline)
}

# Write output
$outputPath = 'c:\Users\sonnn\Documents\a\suika_planet_offline.html'
[System.IO.File]::WriteAllText($outputPath, $indexContent, (New-Object System.Text.UTF8Encoding $true))
$fileSize = (Get-Item $outputPath).Length
Write-Host "suika_planet_offline.html created successfully. Size: $fileSize bytes"

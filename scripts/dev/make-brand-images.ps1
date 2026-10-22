# public/og.png (1200×630), assets/images/favicon.png (48×48), assets/images/icon.png (1024×1024)-ийг
# Comfortaa (гарчиг) ба Nunito (текст) фонтоор (node_modules/@expo-google-fonts) System.Drawing ашиглан үүсгэнэ.
# Ажиллуулах (Windows PowerShell): powershell -ExecutionPolicy Bypass -File scripts/dev/make-brand-images.ps1
# Анхаар: файл UTF-8 BOM-тэй байх ёстой (PowerShell 5.1 кириллийг зөв уншихын тулд).
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$fontDir = Join-Path $root 'node_modules\@expo-google-fonts'

# Жин бүрийг тусдаа цуглуулгаас — нэг family-д холивол GDI+ Regular файлыг сонгодог
function LoadFamily($file) {
  $pfc = New-Object System.Drawing.Text.PrivateFontCollection
  $pfc.AddFontFile((Join-Path $fontDir $file))
  return @{ pfc = $pfc; family = $pfc.Families[0] }
}
$regular = LoadFamily 'nunito\400Regular\Nunito_400Regular.ttf'
$bold = LoadFamily 'comfortaa\700Bold\Comfortaa_700Bold.ttf'

function Font($fam, $px) { New-Object System.Drawing.Font($fam.family, [single]$px, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel) }
function Color($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Brush($hex) { New-Object System.Drawing.SolidBrush (Color $hex) }
function RoundRect($g, $brush, $x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, 2 * $r, 2 * $r, 180, 90); $p.AddArc($x + $w - 2 * $r, $y, 2 * $r, 2 * $r, 270, 90)
  $p.AddArc($x + $w - 2 * $r, $y + $h - 2 * $r, 2 * $r, 2 * $r, 0, 90); $p.AddArc($x, $y + $h - 2 * $r, 2 * $r, 2 * $r, 90, 90)
  $p.CloseFigure(); $g.FillPath($brush, $p)
}
function NewCanvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.InterpolationMode = 'HighQualityBicubic'
  return @($bmp, $g)
}
# Брэнд тэмдэг: хөх градиент дөрвөлжин + өсөх 3 багана (сүүлчийнх алтан) — src/components/ui/brand-mark.tsx-тэй ижил харьцаа
function Monogram($g, $x, $y, $size) {
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.PointF($x, $y)), (New-Object System.Drawing.PointF(($x + $size), ($y + $size))), (Color '#4C7DF0'), (Color '#1D47A3'))
  RoundRect $g $grad $x $y $size $size ([int]($size * 0.26))
  $bw = $size * 0.14; $gap = $size * 0.08; $base = $y + $size * 0.78
  $x0 = $x + ($size - (3 * $bw + 2 * $gap)) / 2
  $i = 0
  foreach ($bar in @(@(0.26, '#FFFFFF'), @(0.40, '#FFFFFF'), @(0.56, '#F2C46B'))) {
    $h = $size * $bar[0]
    RoundRect $g (Brush $bar[1]) ($x0 + $i * ($bw + $gap)) ($base - $h) $bw $h ([Math]::Max(1, $size * 0.03))
    $i++
  }
}

# --- og.png ---
$c = NewCanvas 1200 630; $bmp = $c[0]; $g = $c[1]
$g.Clear((Color '#0B1220'))
Monogram $g 80 80 96
$g.DrawString('Виртуал хөрөнгийн', (Font $bold 64), (Brush '#E8ECF4'), 76, 230)
$g.DrawString('7 хоног', (Font $bold 64), (Brush '#E0B25A'), 76, 306)
$g.FillRectangle((Brush '#E0B25A'), 80, 410, 120, 5)
$g.DrawString('Амьд зах зээл · Олон улсын мэдээ · Даваа бүрийн тайлан', (Font $regular 30), (Brush '#C5CEE0'), 76, 440)
$g.DrawString('Монгол хэлээр, тоонд суурилсан  ·  vaspfrcweekly.expo.app', (Font $regular 24), (Brush '#A0ABC0'), 78, 540)
$bmp.Save((Join-Path $root 'public\og.png'), [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()

# --- icon.png (1024) ба favicon.png (48) ---
foreach ($spec in @(@{ size = 1024; file = 'assets\images\icon.png'; bg = '#F6F4EF' }, @{ size = 48; file = 'assets\images\favicon.png'; bg = $null })) {
  $s = $spec.size; $c = NewCanvas $s $s; $bmp = $c[0]; $g = $c[1]
  if ($spec.bg) { $g.Clear((Color $spec.bg)); Monogram $g ([int]($s * 0.12)) ([int]($s * 0.12)) ([int]($s * 0.76)) }
  else { $g.Clear([System.Drawing.Color]::Transparent); Monogram $g 0 0 $s }
  $bmp.Save((Join-Path $root $spec.file), [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
}
'og.png, icon.png, favicon.png үүслээ'

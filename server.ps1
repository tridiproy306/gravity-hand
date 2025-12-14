$port = 8080
$root = Get-Location
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Listening on http://localhost:$port/"
Write-Host "Root: $root"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $root.Path + $request.Url.LocalPath.Replace('/', '\')
        
        if (Test-Path $path -PathType Container) {
            $path = Join-Path $path "index.html"
        }

        if (Test-Path $path -PathType Leaf) {
            try {
                $content = [System.IO.File]::ReadAllBytes($path)
                $response.ContentLength64 = $content.Length
                
                # Simple MIME types
                $ext = [System.IO.Path]::GetExtension($path)
                switch ($ext) {
                    ".html" { $response.ContentType = "text/html" }
                    ".css"  { $response.ContentType = "text/css" }
                    ".js"   { $response.ContentType = "application/javascript" }
                }
                
                $response.OutputStream.Write($content, 0, $content.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
        }
        
        $response.Close()
    }
} catch {
    Write-Error $_
} finally {
    $listener.Stop()
}

param(
    [int]$Port = 5173,
    [string]$Root = (Join-Path $PSScriptRoot 'frontend\dist')
)

$ErrorActionPreference = 'Stop'

$RootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

$users = @(
    [ordered]@{ id = 1; username = 'adminfairy'; password = 'adminfairy'; email = 'admin@example.com'; role = 'pm'; created_at = '2026-04-29T00:00:00.000Z' },
    [ordered]@{ id = 2; username = 'dev1'; password = 'adminfairy'; email = 'dev@example.com'; role = 'dev'; created_at = '2026-04-29T00:00:00.000Z' },
    [ordered]@{ id = 3; username = 'client1'; password = 'adminfairy'; email = 'client@example.com'; role = 'client'; created_at = '2026-04-29T00:00:00.000Z' }
)

$projects = @(
    [ordered]@{
        id = 1
        name = 'Project Alpha'
        description = 'Sample project'
        start_date = '2023-01-01'
        end_date = '2023-12-31'
        status = 'in_progress'
        client_id = 3
        pm_id = 1
        created_at = '2026-04-29T00:00:00.000Z'
        client_username = 'client1'
        pm_username = 'adminfairy'
    }
)

$tasks = @(
    [ordered]@{
        id = 1
        project_id = 1
        name = 'Task 1'
        description = 'Description'
        assigned_to = 2
        status = 'in_progress'
        progress = 45
        due_date = '2023-06-01'
        created_at = '2026-04-29T00:00:00.000Z'
        project_name = 'Project Alpha'
        assigned_username = 'dev1'
    }
)

$milestones = @(
    [ordered]@{
        id = 1
        project_id = 1
        name = 'Milestone 1'
        description = 'Description'
        due_date = '2023-06-15'
        status = 'pending'
        created_at = '2026-04-29T00:00:00.000Z'
        project_name = 'Project Alpha'
    }
)

$teams = @(
    [ordered]@{
        id = 1
        name = 'Dev Team'
        created_at = '2026-04-29T00:00:00.000Z'
        members = @(
            [ordered]@{ id = 2; username = 'dev1'; role = 'dev' }
        )
    }
)

function ConvertTo-PublicUser {
    param($User)

    if (-not $User) {
        return $null
    }

    return [ordered]@{
        id = $User.id
        username = $User.username
        email = $User.email
        role = $User.role
        created_at = $User.created_at
    }
}

function Send-Json {
    param(
        $Context,
        $Payload,
        [int]$StatusCode = 200
    )

    $json = $Payload | ConvertTo-Json -Depth 20
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Context.Response.StatusCode = $StatusCode
    $Context.Response.ContentType = 'application/json; charset=utf-8'
    $Context.Response.Headers['Cache-Control'] = 'no-store'
    $Context.Response.ContentLength64 = $bytes.Length
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Read-JsonBody {
    param($Context)

    $reader = [System.IO.StreamReader]::new($Context.Request.InputStream, [System.Text.Encoding]::UTF8)
    $text = $reader.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return [pscustomobject]@{}
    }

    return $text | ConvertFrom-Json
}

function Get-UserFromToken {
    param($Context)

    $authorization = $Context.Request.Headers['Authorization']
    if (-not $authorization -or -not $authorization.StartsWith('Bearer mock-token-')) {
        return $null
    }

    $username = $authorization.Substring('Bearer mock-token-'.Length)
    return $users | Where-Object { $_.username -eq $username } | Select-Object -First 1
}

function Get-NextId {
    param($Items)

    if (-not $Items -or $Items.Count -eq 0) {
        return 1
    }

    return (($Items | ForEach-Object { [int]$_.id } | Measure-Object -Maximum).Maximum + 1)
}

function Merge-Item {
    param($Existing, $Body)

    foreach ($property in $Body.PSObject.Properties) {
        $Existing[$property.Name] = $property.Value
    }

    return $Existing
}

function Send-StaticFile {
    param($Context)

    $requestPath = [Uri]::UnescapeDataString($Context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = 'index.html'
    }

    $relativePath = $requestPath -replace '/', [System.IO.Path]::DirectorySeparatorChar
    $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($RootFull, $relativePath))

    if (-not $fullPath.StartsWith($RootFull, [StringComparison]::OrdinalIgnoreCase)) {
        Send-Json $Context @{ success = $false; error = 'Forbidden' } 403
        return
    }

    if (Test-Path $fullPath -PathType Container) {
        $fullPath = Join-Path $fullPath 'index.html'
    }

    if (-not (Test-Path $fullPath -PathType Leaf)) {
        $fullPath = Join-Path $RootFull 'index.html'
    }

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $contentType = switch ($ext) {
        '.html' { 'text/html; charset=utf-8' }
        '.js' { 'text/javascript; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.svg' { 'image/svg+xml' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.ico' { 'image/x-icon' }
        default { 'application/octet-stream' }
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $Context.Response.StatusCode = 200
    $Context.Response.ContentType = $contentType
    $Context.Response.ContentLength64 = $bytes.Length
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Handle-Api {
    param($Context)

    $path = $Context.Request.Url.AbsolutePath
    $method = $Context.Request.HttpMethod
    $currentUser = Get-UserFromToken $Context

    if ($method -eq 'OPTIONS') {
        Send-Json $Context @{ success = $true }
        return
    }

    if ($path -eq '/api/health') {
        Send-Json $Context @{ success = $true; message = 'Mock API is up' }
        return
    }

    if ($path -eq '/api/auth/login' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $matchedUser = $users | Where-Object { $_.username -eq $body.username } | Select-Object -First 1

        if (-not $matchedUser -or $matchedUser.password -ne $body.password) {
            Send-Json $Context @{ success = $false; error = 'Invalid credentials' } 401
            return
        }

        Send-Json $Context @{
            success = $true
            data = @{
                token = "mock-token-$($matchedUser.username)"
                user = ConvertTo-PublicUser $matchedUser
            }
        }
        return
    }

    if (-not $currentUser) {
        Send-Json $Context @{ success = $false; error = 'Missing or invalid token' } 401
        return
    }

    if ($path -eq '/api/users/me' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = ConvertTo-PublicUser $currentUser }
        return
    }

    if ($path -eq '/api/users' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = @($users | ForEach-Object { ConvertTo-PublicUser $_ }) }
        return
    }

    if ($path -eq '/api/projects' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $projects }
        return
    }

    if ($path -eq '/api/projects' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $item = [ordered]@{
            id = Get-NextId $projects
            name = $body.name
            description = $body.description
            start_date = $body.start_date
            end_date = $body.end_date
            status = if ($body.status) { $body.status } else { 'planning' }
            client_id = $body.client_id
            pm_id = if ($body.pm_id) { $body.pm_id } else { $currentUser.id }
            created_at = (Get-Date).ToString('s')
            client_username = 'client1'
            pm_username = $currentUser.username
        }
        $script:projects = @($projects + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/projects/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'DELETE') {
            $script:projects = @($projects | Where-Object { $_.id -ne $id })
            Send-Json $Context @{ success = $true; data = @{ id = $id } }
            return
        }

        $body = Read-JsonBody $Context
        $item = $projects | Where-Object { $_.id -eq $id } | Select-Object -First 1
        if (-not $item) {
            Send-Json $Context @{ success = $false; error = 'Project not found' } 404
            return
        }
        Send-Json $Context @{ success = $true; data = Merge-Item $item $body }
        return
    }

    if ($path -eq '/api/tasks' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $tasks }
        return
    }

    if ($path -eq '/api/tasks' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $item = [ordered]@{
            id = Get-NextId $tasks
            project_id = $body.project_id
            name = $body.name
            description = $body.description
            assigned_to = $body.assigned_to
            status = if ($body.status) { $body.status } else { 'todo' }
            progress = if ($body.progress -ne $null) { $body.progress } else { 0 }
            due_date = $body.due_date
            created_at = (Get-Date).ToString('s')
            project_name = 'Project Alpha'
            assigned_username = 'dev1'
        }
        $script:tasks = @($tasks + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/tasks/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'DELETE') {
            $script:tasks = @($tasks | Where-Object { $_.id -ne $id })
            Send-Json $Context @{ success = $true; data = @{ id = $id } }
            return
        }

        $body = Read-JsonBody $Context
        $item = $tasks | Where-Object { $_.id -eq $id } | Select-Object -First 1
        if (-not $item) {
            Send-Json $Context @{ success = $false; error = 'Task not found' } 404
            return
        }
        Send-Json $Context @{ success = $true; data = Merge-Item $item $body }
        return
    }

    if ($path -eq '/api/milestones' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $milestones }
        return
    }

    if ($path -eq '/api/milestones' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $item = [ordered]@{
            id = Get-NextId $milestones
            project_id = $body.project_id
            name = $body.name
            description = $body.description
            due_date = $body.due_date
            status = if ($body.status) { $body.status } else { 'pending' }
            created_at = (Get-Date).ToString('s')
            project_name = 'Project Alpha'
        }
        $script:milestones = @($milestones + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/milestones/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'DELETE') {
            $script:milestones = @($milestones | Where-Object { $_.id -ne $id })
            Send-Json $Context @{ success = $true; data = @{ id = $id } }
            return
        }

        $body = Read-JsonBody $Context
        $item = $milestones | Where-Object { $_.id -eq $id } | Select-Object -First 1
        if (-not $item) {
            Send-Json $Context @{ success = $false; error = 'Milestone not found' } 404
            return
        }
        Send-Json $Context @{ success = $true; data = Merge-Item $item $body }
        return
    }

    if ($path -eq '/api/teams' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $teams }
        return
    }

    if ($path -eq '/api/teams' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $item = [ordered]@{
            id = Get-NextId $teams
            name = $body.name
            created_at = (Get-Date).ToString('s')
            members = @()
        }
        $script:teams = @($teams + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/teams/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'DELETE') {
            $script:teams = @($teams | Where-Object { $_.id -ne $id })
            Send-Json $Context @{ success = $true; data = @{ id = $id } }
            return
        }

        $body = Read-JsonBody $Context
        $item = $teams | Where-Object { $_.id -eq $id } | Select-Object -First 1
        if (-not $item) {
            Send-Json $Context @{ success = $false; error = 'Team not found' } 404
            return
        }
        Send-Json $Context @{ success = $true; data = Merge-Item $item $body }
        return
    }

    Send-Json $Context @{ success = $false; error = 'API endpoint not found' } 404
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Output "Mock website server listening on http://127.0.0.1:$Port"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            if ($context.Request.Url.AbsolutePath.StartsWith('/api/')) {
                Handle-Api $context
            } else {
                Send-StaticFile $context
            }
        } catch {
            Send-Json $context @{ success = $false; error = $_.Exception.Message } 500
        } finally {
            $context.Response.OutputStream.Close()
        }
    }
} finally {
    $listener.Stop()
}

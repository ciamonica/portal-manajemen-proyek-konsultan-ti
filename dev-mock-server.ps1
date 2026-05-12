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
        name = 'Portal Layanan Client'
        description = 'Pengembangan portal untuk pelacakan proyek, dokumen, dan komunikasi client.'
        start_date = '2026-05-01'
        end_date = '2026-08-30'
        status = 'on_track'
        client_id = 3
        pm_id = 1
        cover_image_url = ''
        created_at = '2026-04-29T00:00:00.000Z'
        client_username = 'client1'
        pm_username = 'adminfairy'
    }
)

$tasks = @(
    [ordered]@{
        id = 1
        project_id = 1
        name = 'Rancang skema API proyek'
        description = 'Menyusun kontrak endpoint dan struktur payload.'
        assigned_to = 2
        status = 'done'
        progress = 100
        due_date = '2026-05-15'
        created_at = '2026-04-29T00:00:00.000Z'
        project_name = 'Portal Layanan Client'
        assigned_username = 'dev1'
    },
    [ordered]@{
        id = 2
        project_id = 1
        name = 'Integrasi autentikasi JWT'
        description = 'Menghubungkan login frontend dengan backend Express.'
        assigned_to = 2
        status = 'in_progress'
        progress = 70
        due_date = '2026-05-25'
        created_at = '2026-04-29T00:00:00.000Z'
        project_name = 'Portal Layanan Client'
        assigned_username = 'dev1'
    },
    [ordered]@{
        id = 3
        project_id = 1
        name = 'Uji alur dashboard client'
        description = 'Memvalidasi data milestone, dokumen, dan komentar.'
        assigned_to = 2
        status = 'todo'
        progress = 20
        due_date = '2026-06-05'
        created_at = '2026-04-29T00:00:00.000Z'
        project_name = 'Portal Layanan Client'
        assigned_username = 'dev1'
    }
)

$milestones = @(
    [ordered]@{
        id = 1
        project_id = 1
        name = 'Fondasi Backend'
        description = 'Endpoint proyek, tugas, milestone, dan tim tersedia.'
        due_date = '2026-05-20'
        status = 'achieved'
        created_at = '2026-04-29T00:00:00.000Z'
        project_name = 'Portal Layanan Client'
    },
    [ordered]@{
        id = 2
        project_id = 1
        name = 'Dashboard Dinamis'
        description = 'Seluruh blok dashboard membaca data dari API dan DB.'
        due_date = '2026-06-10'
        status = 'pending'
        created_at = '2026-04-29T00:00:00.000Z'
        project_name = 'Portal Layanan Client'
    }
)

$teams = @(
    [ordered]@{
        id = 1
        name = 'Tim Implementasi Portal'
        created_at = '2026-04-29T00:00:00.000Z'
        members = @(
            [ordered]@{ id = 2; username = 'dev1'; role = 'dev' }
        )
    }
)

$projectLinks = @(
    [ordered]@{ id = 1; project_id = 1; title = 'Dokumentasi API'; url = 'https://example.com/docs/api-portal-client'; type = 'api_docs'; sort_order = 1; created_at = '2026-05-12T00:00:00.000Z'; project_name = 'Portal Layanan Client' },
    [ordered]@{ id = 2; project_id = 1; title = 'BRD Portal Client'; url = 'https://example.com/docs/brd-portal-client'; type = 'brd'; sort_order = 2; created_at = '2026-05-12T00:00:00.000Z'; project_name = 'Portal Layanan Client' },
    [ordered]@{ id = 3; project_id = 1; title = 'Repositori Proyek'; url = 'https://github.com/example/portal-client'; type = 'repository'; sort_order = 3; created_at = '2026-05-12T00:00:00.000Z'; project_name = 'Portal Layanan Client' }
)

$risks = @(
    [ordered]@{ id = 1; project_id = 1; title = 'Keterlambatan validasi UAT'; description = 'Client belum menetapkan jadwal final untuk validasi fitur dashboard.'; probability = 'medium'; impact = 'high'; mitigation = 'Siapkan checklist UAT dan jadwalkan sesi review mingguan.'; status = 'mitigating'; owner_id = 1; due_date = '2026-06-03'; created_at = '2026-05-12T00:00:00.000Z'; project_name = 'Portal Layanan Client'; owner_username = 'adminfairy' }
)

$timeLogs = @(
    [ordered]@{ id = 1; user_id = 2; task_id = 1; hours = 6.5; log_date = '2026-05-12'; created_at = '2026-05-12T00:00:00.000Z'; username = 'dev1'; task_name = 'Rancang skema API proyek'; project_id = 1; project_name = 'Portal Layanan Client' },
    [ordered]@{ id = 2; user_id = 2; task_id = 2; hours = 5.0; log_date = '2026-05-13'; created_at = '2026-05-13T00:00:00.000Z'; username = 'dev1'; task_name = 'Integrasi autentikasi JWT'; project_id = 1; project_name = 'Portal Layanan Client' }
)

$taskDependencies = @(
    [ordered]@{ id = 1; task_id = 2; depends_on_task_id = 1; created_at = '2026-05-12T00:00:00.000Z'; task_name = 'Integrasi autentikasi JWT'; depends_on_task_name = 'Rancang skema API proyek'; project_id = 1; project_name = 'Portal Layanan Client' },
    [ordered]@{ id = 2; task_id = 3; depends_on_task_id = 2; created_at = '2026-05-12T00:00:00.000Z'; task_name = 'Uji alur dashboard client'; depends_on_task_name = 'Integrasi autentikasi JWT'; project_id = 1; project_name = 'Portal Layanan Client' }
)

$projectFiles = @(
    [ordered]@{ id = 1; project_id = 1; title = 'Kontrak Proyek'; file_url = 'https://example.com/files/kontrak-portal-client.pdf'; file_type = 'kontrak'; uploaded_by = 1; created_at = '2026-05-12T00:00:00.000Z'; project_name = 'Portal Layanan Client'; uploaded_by_username = 'adminfairy' },
    [ordered]@{ id = 2; project_id = 1; title = 'Prototype UI'; file_url = 'https://example.com/files/prototype-portal-client'; file_type = 'desain'; uploaded_by = 1; created_at = '2026-05-12T00:00:00.000Z'; project_name = 'Portal Layanan Client'; uploaded_by_username = 'adminfairy' }
)

$taskComments = @(
    [ordered]@{ id = 1; task_id = 2; user_id = 1; comment = 'Pastikan token refresh tidak mengganggu sesi developer.'; created_at = '2026-05-12T00:00:00.000Z'; username = 'adminfairy'; task_name = 'Integrasi autentikasi JWT'; project_id = 1; project_name = 'Portal Layanan Client' },
    [ordered]@{ id = 2; task_id = 2; user_id = 2; comment = 'Endpoint login sudah terhubung, tinggal validasi error state.'; created_at = '2026-05-13T00:00:00.000Z'; username = 'dev1'; task_name = 'Integrasi autentikasi JWT'; project_id = 1; project_name = 'Portal Layanan Client' }
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

function Get-ProjectName {
    param($ProjectId)

    $project = $projects | Where-Object { $_.id -eq [int]$ProjectId } | Select-Object -First 1
    if ($project) { return $project.name }
    return $null
}

function Get-Username {
    param($UserId)

    $matchedUser = $users | Where-Object { $_.id -eq [int]$UserId } | Select-Object -First 1
    if ($matchedUser) { return $matchedUser.username }
    return $null
}

function Get-TaskName {
    param($TaskId)

    $task = $tasks | Where-Object { $_.id -eq [int]$TaskId } | Select-Object -First 1
    if ($task) { return $task.name }
    return $null
}

function Get-TaskProjectId {
    param($TaskId)

    $task = $tasks | Where-Object { $_.id -eq [int]$TaskId } | Select-Object -First 1
    if ($task) { return $task.project_id }
    return $null
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
            cover_image_url = $body.cover_image_url
            created_at = (Get-Date).ToString('s')
            client_username = Get-Username $body.client_id
            pm_username = Get-Username $(if ($body.pm_id) { $body.pm_id } else { $currentUser.id })
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
            project_name = Get-ProjectName $body.project_id
            assigned_username = Get-Username $body.assigned_to
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
            project_name = Get-ProjectName $body.project_id
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

    if ($path -eq '/api/project-links' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $projectLinks }
        return
    }

    if ($path -eq '/api/project-links' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $item = [ordered]@{
            id = Get-NextId $projectLinks
            project_id = $body.project_id
            title = $body.title
            url = $body.url
            type = if ($body.type) { $body.type } else { 'other' }
            sort_order = if ($body.sort_order -ne $null) { $body.sort_order } else { 0 }
            created_at = (Get-Date).ToString('s')
            project_name = if ($body.project_id) { Get-ProjectName $body.project_id } else { $null }
        }
        $script:projectLinks = @($projectLinks + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/project-links/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'PUT') {
            $body = Read-JsonBody $Context
            $item = $projectLinks | Where-Object { $_.id -eq $id } | Select-Object -First 1
            if (-not $item) {
                Send-Json $Context @{ success = $false; error = 'Project link not found' } 404
                return
            }
            Merge-Item $item $body | Out-Null
            $item.project_name = if ($item.project_id) { Get-ProjectName $item.project_id } else { $null }
            Send-Json $Context @{ success = $true; data = $item }
            return
        }
        $script:projectLinks = @($projectLinks | Where-Object { $_.id -ne $id })
        Send-Json $Context @{ success = $true; data = @{ id = $id } }
        return
    }

    if ($path -eq '/api/risks' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $risks }
        return
    }

    if ($path -eq '/api/risks' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $item = [ordered]@{
            id = Get-NextId $risks
            project_id = $body.project_id
            title = $body.title
            description = $body.description
            probability = if ($body.probability) { $body.probability } else { 'medium' }
            impact = if ($body.impact) { $body.impact } else { 'medium' }
            mitigation = $body.mitigation
            status = if ($body.status) { $body.status } else { 'open' }
            owner_id = $body.owner_id
            due_date = $body.due_date
            created_at = (Get-Date).ToString('s')
            project_name = Get-ProjectName $body.project_id
            owner_username = Get-Username $body.owner_id
        }
        $script:risks = @($risks + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/risks/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'PUT') {
            $body = Read-JsonBody $Context
            $item = $risks | Where-Object { $_.id -eq $id } | Select-Object -First 1
            if (-not $item) {
                Send-Json $Context @{ success = $false; error = 'Risk not found' } 404
                return
            }
            Merge-Item $item $body | Out-Null
            $item.project_name = Get-ProjectName $item.project_id
            $item.owner_username = Get-Username $item.owner_id
            Send-Json $Context @{ success = $true; data = $item }
            return
        }
        $script:risks = @($risks | Where-Object { $_.id -ne $id })
        Send-Json $Context @{ success = $true; data = @{ id = $id } }
        return
    }

    if ($path -eq '/api/time-logs' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $timeLogs }
        return
    }

    if ($path -eq '/api/time-logs' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $userId = if ($body.user_id) { $body.user_id } else { $currentUser.id }
        $projectId = Get-TaskProjectId $body.task_id
        $item = [ordered]@{
            id = Get-NextId $timeLogs
            user_id = $userId
            task_id = $body.task_id
            hours = $body.hours
            log_date = if ($body.log_date) { $body.log_date } else { (Get-Date).ToString('yyyy-MM-dd') }
            created_at = (Get-Date).ToString('s')
            username = Get-Username $userId
            task_name = Get-TaskName $body.task_id
            project_id = $projectId
            project_name = Get-ProjectName $projectId
        }
        $script:timeLogs = @($timeLogs + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/time-logs/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'PUT') {
            $body = Read-JsonBody $Context
            $item = $timeLogs | Where-Object { $_.id -eq $id } | Select-Object -First 1
            if (-not $item) {
                Send-Json $Context @{ success = $false; error = 'Time log not found' } 404
                return
            }
            Merge-Item $item $body | Out-Null
            $item.username = Get-Username $item.user_id
            $item.task_name = Get-TaskName $item.task_id
            $item.project_id = Get-TaskProjectId $item.task_id
            $item.project_name = Get-ProjectName $item.project_id
            Send-Json $Context @{ success = $true; data = $item }
            return
        }
        $script:timeLogs = @($timeLogs | Where-Object { $_.id -ne $id })
        Send-Json $Context @{ success = $true; data = @{ id = $id } }
        return
    }

    if ($path -eq '/api/task-dependencies' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $taskDependencies }
        return
    }

    if ($path -eq '/api/task-dependencies' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $projectId = Get-TaskProjectId $body.task_id
        $item = [ordered]@{
            id = Get-NextId $taskDependencies
            task_id = $body.task_id
            depends_on_task_id = $body.depends_on_task_id
            created_at = (Get-Date).ToString('s')
            task_name = Get-TaskName $body.task_id
            depends_on_task_name = Get-TaskName $body.depends_on_task_id
            project_id = $projectId
            project_name = Get-ProjectName $projectId
        }
        $script:taskDependencies = @($taskDependencies + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/task-dependencies/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'PUT') {
            $body = Read-JsonBody $Context
            $item = $taskDependencies | Where-Object { $_.id -eq $id } | Select-Object -First 1
            if (-not $item) {
                Send-Json $Context @{ success = $false; error = 'Dependency not found' } 404
                return
            }
            Merge-Item $item $body | Out-Null
            $item.task_name = Get-TaskName $item.task_id
            $item.depends_on_task_name = Get-TaskName $item.depends_on_task_id
            $item.project_id = Get-TaskProjectId $item.task_id
            $item.project_name = Get-ProjectName $item.project_id
            Send-Json $Context @{ success = $true; data = $item }
            return
        }
        $script:taskDependencies = @($taskDependencies | Where-Object { $_.id -ne $id })
        Send-Json $Context @{ success = $true; data = @{ id = $id } }
        return
    }

    if ($path -eq '/api/project-files' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $projectFiles }
        return
    }

    if ($path -eq '/api/project-files' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $item = [ordered]@{
            id = Get-NextId $projectFiles
            project_id = $body.project_id
            title = $body.title
            file_url = $body.file_url
            file_type = if ($body.file_type) { $body.file_type } else { 'dokumen' }
            uploaded_by = $currentUser.id
            created_at = (Get-Date).ToString('s')
            project_name = Get-ProjectName $body.project_id
            uploaded_by_username = $currentUser.username
        }
        $script:projectFiles = @($projectFiles + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/project-files/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'PUT') {
            $body = Read-JsonBody $Context
            $item = $projectFiles | Where-Object { $_.id -eq $id } | Select-Object -First 1
            if (-not $item) {
                Send-Json $Context @{ success = $false; error = 'Project file not found' } 404
                return
            }
            Merge-Item $item $body | Out-Null
            $item.project_name = Get-ProjectName $item.project_id
            Send-Json $Context @{ success = $true; data = $item }
            return
        }
        $script:projectFiles = @($projectFiles | Where-Object { $_.id -ne $id })
        Send-Json $Context @{ success = $true; data = @{ id = $id } }
        return
    }

    if ($path -eq '/api/task-comments' -and $method -eq 'GET') {
        Send-Json $Context @{ success = $true; data = $taskComments }
        return
    }

    if ($path -eq '/api/task-comments' -and $method -eq 'POST') {
        $body = Read-JsonBody $Context
        $projectId = Get-TaskProjectId $body.task_id
        $item = [ordered]@{
            id = Get-NextId $taskComments
            task_id = $body.task_id
            user_id = $currentUser.id
            comment = $body.comment
            created_at = (Get-Date).ToString('s')
            username = $currentUser.username
            task_name = Get-TaskName $body.task_id
            project_id = $projectId
            project_name = Get-ProjectName $projectId
        }
        $script:taskComments = @($taskComments + $item)
        Send-Json $Context @{ success = $true; data = $item } 201
        return
    }

    if ($path -match '^/api/task-comments/(\d+)$' -and $method -in @('PUT', 'DELETE')) {
        $id = [int]$Matches[1]
        if ($method -eq 'PUT') {
            $body = Read-JsonBody $Context
            $item = $taskComments | Where-Object { $_.id -eq $id } | Select-Object -First 1
            if (-not $item) {
                Send-Json $Context @{ success = $false; error = 'Comment not found' } 404
                return
            }
            Merge-Item $item $body | Out-Null
            $item.task_name = Get-TaskName $item.task_id
            $item.project_id = Get-TaskProjectId $item.task_id
            $item.project_name = Get-ProjectName $item.project_id
            Send-Json $Context @{ success = $true; data = $item }
            return
        }
        $script:taskComments = @($taskComments | Where-Object { $_.id -ne $id })
        Send-Json $Context @{ success = $true; data = @{ id = $id } }
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

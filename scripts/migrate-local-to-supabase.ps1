param(
  [switch]$Replace
)

$ErrorActionPreference = 'Stop'

function Import-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  foreach ($raw in Get-Content $Path) {
    $line = $raw.Trim()
    if (-not $line -or $line.StartsWith('#')) {
      continue
    }

    $idx = $line.IndexOf('=')
    if ($idx -lt 1) {
      continue
    }

    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}

function Run-Checked {
  param(
    [string]$File,
    [string[]]$Args,
    [string]$Step
  )

  Write-Host "==> $Step"
  & $File @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Step"
  }
}

function Set-PgPasswordFromUrl {
  param([string]$Url)

  try {
    $uri = [System.Uri]$Url
    if ($uri.UserInfo -and $uri.UserInfo.Contains(':')) {
      $parts = $uri.UserInfo.Split(':', 2)
      if ($parts.Count -eq 2 -and $parts[1]) {
        $decoded = [System.Uri]::UnescapeDataString($parts[1])
        [System.Environment]::SetEnvironmentVariable('PGPASSWORD', $decoded, 'Process')
      }
    }
  }
  catch {
    # Ignore malformed URI and fall back to prompt behavior.
  }
}

function Get-PgConnectionParts {
  param([string]$Url)

  $uri = [System.Uri]$Url

  $username = ''
  if ($uri.UserInfo) {
    $username = $uri.UserInfo.Split(':', 2)[0]
  }

  $dbName = $uri.AbsolutePath.TrimStart('/')
  if (-not $dbName) {
    $dbName = 'postgres'
  }

  return @{
    Host = $uri.Host
    Port = if ($uri.Port -gt 0) { [string]$uri.Port } else { '5432' }
    User = [System.Uri]::UnescapeDataString($username)
    Db   = [System.Uri]::UnescapeDataString($dbName)
  }
}

$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source

if (-not $pgDump -or -not $psql) {
  throw 'pg_dump/psql not found in PATH. Install PostgreSQL CLI tools first.'
}

$envPath = Join-Path $PSScriptRoot '..\.env'
Import-DotEnv -Path $envPath

$localUrl = if ($env:LOCAL_DATABASE_URL) {
  $env:LOCAL_DATABASE_URL
} else {
  'postgresql://postgres:postgres@localhost:5432/vms_db'
}

$targetUrl = if ($env:DIRECT_URL) {
  $env:DIRECT_URL
} elseif ($env:DATABASE_URL) {
  $env:DATABASE_URL
} else {
  throw 'DIRECT_URL or DATABASE_URL must be set in environment.'
}

if ($targetUrl -match 'pooler\.supabase\.com:6543') {
  Write-Warning 'You are using Supabase pooler URL (:6543). For import/migration prefer DIRECT_URL to the direct DB host (:5432, db.<project-ref>.supabase.co).'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $PSScriptRoot "..\backups\migration-$stamp"
New-Item -Path $outDir -ItemType Directory -Force | Out-Null

$targetBackup = Join-Path $outDir 'supabase-backup-before-import.dump'
$localDataSql = Join-Path $outDir 'local-data.sql'

$targetConn = Get-PgConnectionParts -Url $targetUrl
$localConn = Get-PgConnectionParts -Url $localUrl

Write-Host ("Target DB: {0}@{1}:{2}/{3}" -f $targetConn.User, $targetConn.Host, $targetConn.Port, $targetConn.Db)
Write-Host ("Local DB: {0}@{1}:{2}/{3}" -f $localConn.User, $localConn.Host, $localConn.Port, $localConn.Db)

Set-PgPasswordFromUrl -Url $targetUrl
Run-Checked -File $pgDump -Args @(
  '--format=custom',
  '--no-owner',
  '--no-privileges',
  '--host', $targetConn.Host,
  '--port', $targetConn.Port,
  '--username', $targetConn.User,
  '--dbname', $targetConn.Db,
  '--file', $targetBackup
) -Step 'Backup current Supabase database'

Set-PgPasswordFromUrl -Url $localUrl
Run-Checked -File $pgDump -Args @(
  '--data-only',
  '--column-inserts',
  '--no-owner',
  '--no-privileges',
  '--exclude-table-data=public._prisma_migrations',
  '--host', $localConn.Host,
  '--port', $localConn.Port,
  '--username', $localConn.User,
  '--dbname', $localConn.Db,
  '--file', $localDataSql
) -Step 'Export local PostgreSQL data'

if ($Replace) {
  $truncateSql = @"
DO
`$do`
DECLARE
  stmt text;
BEGIN
  SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' RESTART IDENTITY CASCADE;'
  INTO stmt
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> '_prisma_migrations';

  IF stmt IS NOT NULL THEN
    EXECUTE stmt;
  END IF;
END
`$do`;
"@

  Run-Checked -File $psql -Args @(
    '--host', $targetConn.Host,
    '--port', $targetConn.Port,
    '--username', $targetConn.User,
    '--dbname', $targetConn.Db,
    '-v', 'ON_ERROR_STOP=1',
    '-c', $truncateSql
  ) -Step 'Replace mode: truncate Supabase public tables'
}

Set-PgPasswordFromUrl -Url $targetUrl
Run-Checked -File $psql -Args @(
  '--host', $targetConn.Host,
  '--port', $targetConn.Port,
  '--username', $targetConn.User,
  '--dbname', $targetConn.Db,
  '-v', 'ON_ERROR_STOP=1',
  '-f', $localDataSql
) -Step 'Import local data into Supabase'

Write-Host ''
Write-Host 'Migration complete.' -ForegroundColor Green
Write-Host "Backup: $targetBackup"
Write-Host "Data dump used: $localDataSql"
if ($Replace) {
  Write-Host 'Mode: REPLACE (tables truncated before import)'
} else {
  Write-Host 'Mode: APPEND (no truncation before import)'
}

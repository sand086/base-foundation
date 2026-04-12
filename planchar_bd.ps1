param(
    [string]$DbName = "tms_db1",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "root",
    [string]$DumpFile = "C:\Users\HP\Downloads\3T\tms_db.sql",
    [string]$PgPath = "C:\Program Files\PostgreSQL\18\bin"
)

$env:PGPASSWORD = $DbPassword
$psql = "$PgPath\psql.exe"
$pg_restore = "$PgPath\pg_restore.exe"

Write-Host "Iniciando restauracion..."

# VALIDACIONES
if (!(Test-Path $psql)) { Write-Host "psql no encontrado"; exit 1 }
if (!(Test-Path $pg_restore)) { Write-Host "pg_restore no encontrado"; exit 1 }
if (!(Test-Path $DumpFile)) { Write-Host "dump no encontrado"; exit 1 }

# CERRAR CONEXIONES
$sql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DbName';
"@

& $psql -U $DbUser -d postgres -c $sql

# DROP DB
& $psql -U $DbUser -c "DROP DATABASE IF EXISTS $DbName;"

# CREATE DB
& $psql -U $DbUser -c "CREATE DATABASE $DbName;"

# RESTORE
& $pg_restore -U $DbUser -d $DbName --no-owner --role=$DbUser $DumpFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en restore"
    exit 1
}

# VALIDAR
& $psql -U $DbUser -d $DbName -c "\dt"

Write-Host "OK"
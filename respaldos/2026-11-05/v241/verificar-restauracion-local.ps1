param([string]$Workspace=(Split-Path $PSScriptRoot -Parent),[switch]$ApplicationScope)
$ErrorActionPreference='Stop'
$privateRoot=Join-Path $Workspace 'privado-respaldo-v241'
$run=Get-ChildItem -LiteralPath $privateRoot -Directory | Where-Object {Test-Path -LiteralPath (Join-Path $_.FullName 'manifest.json')} | Sort-Object Name -Descending | Select-Object -First 1
if(!$run){throw 'No hay respaldo exportado'}
$manifest=Get-Content -Raw -LiteralPath (Join-Path $run.FullName 'manifest.json')|ConvertFrom-Json
$dump=Join-Path $run.FullName 'base-auth-informes.dump'
if((Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash -ne $manifest.sha256){throw 'La huella del respaldo no coincide'}
$testRoot=Join-Path $run.FullName ('restauracion-local-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
[IO.Directory]::CreateDirectory($testRoot)|Out-Null
$bin=Join-Path $Workspace 'herramientas-respaldo/pgsql/bin'
$cluster=Join-Path $testRoot 'cluster'
$password=[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$pwfile=Join-Path $testRoot 'clave-local-temporal.txt';[IO.File]::WriteAllText($pwfile,$password)
function RunLocal([string]$Exe,[string[]]$Arguments,[string]$Log,[bool]$AllowFailure=$false){
 $psi=New-Object Diagnostics.ProcessStartInfo
 $psi.FileName=Join-Path $bin $Exe;$psi.UseShellExecute=$false;$psi.CreateNoWindow=$true;$psi.RedirectStandardError=$true;$psi.RedirectStandardOutput=$true
 $psi.Arguments=($Arguments|ForEach-Object {'"'+$_.Replace('"','\"')+'"'}) -join ' '
 foreach($key in @('PGSERVICE','PGSERVICEFILE','PGPASSFILE','PGOPTIONS','DATABASE_URL','SUPABASE_DB_URL')){$psi.EnvironmentVariables.Remove($key)}
 $psi.EnvironmentVariables['PGHOST']='127.0.0.1';$psi.EnvironmentVariables['PGPORT']='55441';$psi.EnvironmentVariables['PGUSER']='hys_restore';$psi.EnvironmentVariables['PGDATABASE']='postgres';$psi.EnvironmentVariables['PGPASSWORD']=$password;$psi.EnvironmentVariables['PGSSLMODE']='disable';$psi.EnvironmentVariables['PGCONNECT_TIMEOUT']='10'
 $p=New-Object Diagnostics.Process;$p.StartInfo=$psi;[void]$p.Start();$err=$p.StandardError.ReadToEndAsync();$out=$p.StandardOutput.ReadToEndAsync();$p.WaitForExit();$code=$p.ExitCode
 if($Exe -eq 'pg_ctl.exe'){
  # El servidor hijo puede conservar los pipes del controlador ya finalizado.
  [void][Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]@($err,$out),2000)
  $stdout=if($out.IsCompletedSuccessfully){$out.Result}else{''};$stderr=if($err.IsCompletedSuccessfully){$err.Result}else{''}
 }else{$stdout=$out.Result;$stderr=$err.Result}
 $p.Dispose();$psi.EnvironmentVariables.Remove('PGPASSWORD')
 if($Log){[IO.File]::WriteAllText((Join-Path $testRoot $Log),$stdout+"`n"+$stderr)}
 if($code -ne 0 -and !$AllowFailure){throw "Falló prueba local: $Exe. Detalles privados en $testRoot"}
 return @{code=$code;stdout=$stdout;stderr=$stderr}
}
$started=$false
try{
 $null=RunLocal 'initdb.exe' @('-D',$cluster,'-U','hys_restore','--encoding=UTF8','--locale=C','--auth=scram-sha-256','--pwfile',$pwfile) 'initdb.log'
 Remove-Item -LiteralPath $pwfile
 $null=RunLocal 'pg_ctl.exe' @('-D',$cluster,'-l',(Join-Path $testRoot 'servidor.log'),'-o','-h 127.0.0.1 -p 55441 -c max_connections=10','-w','start') 'inicio.log';$started=$true
 $rolesPath=Join-Path $run.FullName 'roles-sin-contrasenas.sql'
 $restoreArgs=@('--no-password','--dbname=postgres','--no-owner')
 if($ApplicationScope){
  # Adaptación local documentada: sin Vault (extensión administrada ausente en Windows).
  # El archivo original permanece intacto. El otorgante local es el superusuario de prueba.
  $adapted=(Get-Content -Raw -LiteralPath $rolesPath) -replace ' GRANTED BY supabase_admin',''
  $rolesPath=Join-Path $testRoot 'roles-locales.sql';[IO.File]::WriteAllText($rolesPath,$adapted)
  $toc=Get-Content -LiteralPath (Join-Path $run.FullName 'contenido.txt')
  $filtered=$toc|Where-Object {$_ -notmatch '\bvault\b|supabase_vault'}
  $listPath=Join-Path $testRoot 'lista-sin-vault.txt';[IO.File]::WriteAllLines($listPath,[string[]]$filtered)
  $restoreArgs+=@('--single-transaction','--use-list',$listPath)
 }
 $roles=RunLocal 'psql.exe' @('-X','--no-password','-v','ON_ERROR_STOP=1','-f',$rolesPath) 'roles.log' $true
 $restoreArgs+=$dump
 $restore=RunLocal 'pg_restore.exe' $restoreArgs 'restauracion.log' $true
 $query="select json_build_object('perfiles',(select count(*) from public.perfiles),'auth_users',(select count(*) from auth.users),'public_tables',(select count(*) from pg_tables where schemaname='public'),'auth_tables',(select count(*) from pg_tables where schemaname='auth'),'informes_v238',(select count(*) from public.informes_v238),'informes_v239',(select count(*) from public.informes_v239),'storage_objects',(select count(*) from storage.objects));"
 $counts=RunLocal 'psql.exe' @('-X','--no-password','-At','-v','ON_ERROR_STOP=1','-c',$query) 'conteos.log'
 $issues=@();foreach($keyword in @('supabase_vault','pgsodium','pg_graphql','pg_net','permission denied','does not exist','already exists')){if($restore.stderr -match [regex]::Escape($keyword)){$issues+=$keyword}}
 $result=@{fecha=[DateTime]::UtcNow.ToString('o');sha256=$manifest.sha256;destino='PostgreSQL local 127.0.0.1:55441, sin acceso a Supabase';alcance=$(if($ApplicationScope){'Aplicación y Auth, excluye Vault y adapta otorgante de roles al superusuario local'}else{'Archivo completo sin adaptaciones'});roles_exit=$roles.code;restore_exit=$restore.code;conteos=($counts.stdout.Trim()|ConvertFrom-Json);categorias_errores=$issues;restauracion_completa=(!$ApplicationScope -and $roles.code -eq 0 -and $restore.code -eq 0);restauracion_alcance_correcta=($roles.code -eq 0 -and $restore.code -eq 0);servidor_local='se detendrá al finalizar';produccion_modificada=$false}
 $result|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $testRoot 'resultado.json') -Encoding UTF8
 $result|ConvertTo-Json -Depth 6
}finally{
 if($started){$null=RunLocal 'pg_ctl.exe' @('-D',$cluster,'-m','fast','-w','stop') 'cierre.log' $true}
 $password=$null
}

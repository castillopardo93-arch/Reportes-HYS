param([string]$Workspace = (Split-Path $PSScriptRoot -Parent))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$privateRoot=Join-Path $Workspace 'privado-respaldo-v241'
[IO.Directory]::CreateDirectory($privateRoot)|Out-Null
# No heredar permisos de otros usuarios. Nunca subir este directorio a GitHub.
$dir=Get-Item -LiteralPath $privateRoot
# Leer y escribir SOLO la DACL. No solicitar SACL/auditoría ni cambiar propietario.
# Una ACL creada desde cero hacía que Set-Acl solicitara SeSecurityPrivilege.
$acl=[IO.FileSystemAclExtensions]::GetAccessControl($dir,[Security.AccessControl.AccessControlSections]::Access)
$acl.SetAccessRuleProtection($true,$false)
foreach($existing in @($acl.Access)){$acl.RemoveAccessRuleSpecific($existing)}
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$acl.AddAccessRule($rule)
[IO.FileSystemAclExtensions]::SetAccessControl($dir,$acl)
$statusPath=Join-Path $privateRoot 'estado.json'
function Status($state,$message){ @{estado=$state;mensaje=$message;fecha=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath $statusPath -Encoding UTF8 }
$bin=Join-Path $Workspace 'herramientas-respaldo/pgsql/bin'
foreach($name in @('pg_dump.exe','pg_dumpall.exe','pg_restore.exe')){if(!(Test-Path -LiteralPath (Join-Path $bin $name))){Status 'error' 'Faltan herramientas portátiles';exit 1}}
$form=New-Object Windows.Forms.Form
$form.Text='Respaldo privado de Reportes HYS'
$form.ClientSize=New-Object Drawing.Size(520,220)
$form.StartPosition='CenterScreen';$form.TopMost=$true;$form.FormBorderStyle='FixedDialog';$form.MaximizeBox=$false;$form.MinimizeBox=$false
$label=New-Object Windows.Forms.Label
$label.Text="Introduce la NUEVA contraseña de la base de datos de Supabase.`r`nSe usará en memoria para crear el respaldo privado.`r`nNo se guardará en archivos, GitHub ni en el chat."
$label.Location=New-Object Drawing.Point(18,18);$label.Size=New-Object Drawing.Size(480,65);$form.Controls.Add($label)
$box=New-Object Windows.Forms.TextBox
$box.UseSystemPasswordChar=$true;$box.Location=New-Object Drawing.Point(20,95);$box.Size=New-Object Drawing.Size(480,25);$form.Controls.Add($box)
$ok=New-Object Windows.Forms.Button
$ok.Text='Crear respaldo';$ok.Location=New-Object Drawing.Point(240,150);$ok.Size=New-Object Drawing.Size(125,32);$ok.DialogResult=[Windows.Forms.DialogResult]::OK;$form.Controls.Add($ok)
$cancel=New-Object Windows.Forms.Button
$cancel.Text='Cancelar';$cancel.Location=New-Object Drawing.Point(375,150);$cancel.Size=New-Object Drawing.Size(125,32);$cancel.DialogResult=[Windows.Forms.DialogResult]::Cancel;$form.Controls.Add($cancel)
$form.AcceptButton=$ok;$form.CancelButton=$cancel
Status 'esperando' 'Esperando entrada privada de contraseña en el equipo'
if($form.ShowDialog() -ne [Windows.Forms.DialogResult]::OK -or !$box.Text){$box.Clear();$form.Dispose();Status 'cancelado' 'No se creó respaldo';exit 0}
$script:dbPassword=$box.Text;$box.Clear();$form.Dispose()
function RunPg([string]$Exe,[string[]]$Arguments){
 $psi=New-Object Diagnostics.ProcessStartInfo
 $psi.FileName=Join-Path $bin $Exe;$psi.UseShellExecute=$false;$psi.CreateNoWindow=$true
 $psi.RedirectStandardError=$true;$psi.RedirectStandardOutput=$true
 # Los argumentos no contienen credenciales. Rutas entre comillas para Windows.
 $psi.Arguments=($Arguments | ForEach-Object {'"'+$_.Replace('"','\"')+'"'}) -join ' '
 $psi.EnvironmentVariables['PGPASSWORD']=$script:dbPassword
 $psi.EnvironmentVariables['PGHOST']='aws-1-sa-east-1.pooler.supabase.com'
 $psi.EnvironmentVariables['PGPORT']='5432'
 $psi.EnvironmentVariables['PGUSER']='postgres.ujfsugivgysyhboyirtz'
 $psi.EnvironmentVariables['PGDATABASE']='postgres'
 $psi.EnvironmentVariables['PGSSLMODE']='require'
 $psi.EnvironmentVariables['PGCONNECT_TIMEOUT']='20'
 $psi.EnvironmentVariables['PGAPPNAME']='HYS-respaldo-privado-v241'
 $psi.EnvironmentVariables['PGOPTIONS']='-c default_transaction_read_only=on'
 $proc=New-Object Diagnostics.Process;$proc.StartInfo=$psi
 [void]$proc.Start();$errTask=$proc.StandardError.ReadToEndAsync();$outTask=$proc.StandardOutput.ReadToEndAsync();$proc.WaitForExit()
 $code=$proc.ExitCode;$stderr=$errTask.Result;$stdout=$outTask.Result;$proc.Dispose();$psi.EnvironmentVariables.Remove('PGPASSWORD')
 if($code -ne 0){throw "Falló $Exe (código $code). No se modificaron datos."}
 return $stdout
}
try{
 Status 'exportando' 'Exportación de solo lectura en curso'
 $run=Join-Path $privateRoot ([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'));[IO.Directory]::CreateDirectory($run)|Out-Null
 $dump=Join-Path $run 'base-auth-informes.dump'
 $null=RunPg 'pg_dump.exe' @('--no-password','--format=custom','--file',$dump)
 $list=RunPg 'pg_restore.exe' @('--list',$dump)
 if($list -notmatch 'TABLE DATA auth users' -or $list -notmatch 'TABLE DATA public perfiles'){throw 'El archivo no acredita las tablas críticas esperadas'}
 [IO.File]::WriteAllText((Join-Path $run 'contenido.txt'),$list)
 $roles='pendiente'
 try{$null=RunPg 'pg_dumpall.exe' @('--no-password','--roles-only','--no-role-passwords','--file',(Join-Path $run 'roles-sin-contrasenas.sql'));$roles='exportados_sin_contrasenas'}catch{}
 $manifest=@{fecha=[DateTime]::UtcNow.ToString('o');proyecto='ujfsugivgysyhboyirtz';archivo='base-auth-informes.dump';bytes=(Get-Item -LiteralPath $dump).Length;sha256=(Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash;roles=$roles;lectura_archivo='correcta';restauracion='pendiente';instalacion_v241='no_realizada';nota='Respaldo lógico de base. No incluye archivos externos Storage, secretos de plataforma ni configuración externa. No declara restauración validada.'}
 $manifest|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $run 'manifest.json') -Encoding UTF8
 Status 'exportado' 'Respaldo privado creado y listado; falta prueba de restauración'
 [Windows.Forms.MessageBox]::Show('El respaldo privado fue creado. Falta comprobar su restauración. Puedes volver al chat.','Reportes HYS')|Out-Null
}catch{
 Status 'error' $_.Exception.Message
 [Windows.Forms.MessageBox]::Show('No se pudo completar el respaldo. No se modificó la base. Vuelve al chat para revisar.','Reportes HYS')|Out-Null
}finally{$script:dbPassword=$null}

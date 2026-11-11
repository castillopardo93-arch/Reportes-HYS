/* v263 · Desarrollo aislado: edición de pruebas local, sin escritura central.
 * Las facultades se consultan en Supabase (solo lectura) durante el inicio de sesión.
 * No desplegar operaciones reales ni interpretar un borrador local como informe enviado.
 */
window.HYS242_ENABLE_CENTRAL=false;
window.HYS242_DEPLOYMENT_READY=false;
window.HYS250_LOCAL_EDIT=true;

// Gestión de cuentas existentes y facultades: habilitación independiente de informes.
window.HYS257_ENABLE_USER_MANAGEMENT=false;

// El servicio atomico de facultades aun no esta desplegado ni habilitado.
window.HYS261_ATOMIC_FACULTIES_READY=false;

// La transición de rol junto a facultades requiere transacción de servidor; no se activa aquí.
window.HYS262_ATOMIC_ROLE_READY=false;

// Las escrituras de producción siguen bloqueadas. La demo usa exclusivamente mocks locales.
window.HYS263_SANDBOX=false;

// v292: un tercer control evita activar escrituras por error al alternar banderas heredadas.
// Únicamente tras aprobación de despliegue específica y pruebas E2E se podrá cambiar.
window.HYS292_REMOTE_WRITE_AUTHORIZED=false;

// v298: lectura autenticada de informes existentes, independiente de la escritura central.
// El servidor confirma permisos en cada RPC; no habilitar guardado ni administración.
window.HYS298_ENABLE_REMOTE_READS=false;

// El backend de esta copia debe estar en el equipo de pruebas.
window.HYS314_LOCAL_BACKEND = window.HYS314_LOCAL_BACKEND ?? null;

window.Hys314ResolverBackend = function (location, settings) {
  const hosts = ['localhost', '127.0.0.1', '[::1]'];
  if (!hosts.includes(location.hostname)) {
    throw new Error('Abre la copia de desarrollo desde localhost.');
  }
  const url = typeof settings?.url === 'string' ? settings.url.trim() : '';
  const key = typeof settings?.publishableKey === 'string' ? settings.publishableKey.trim() : '';
  const match = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})\/?$/.exec(url);
  if (!match || Number(match[2]) > 65535 || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('Configura una URL de Supabase local y su clave publicable para abrir el ingreso.');
  }
  return {url: 'http://' + match[1] + ':' + match[2], key,
    storageKey: 'sb-hys314-local-' + match[1] + '-' + match[2]};
};

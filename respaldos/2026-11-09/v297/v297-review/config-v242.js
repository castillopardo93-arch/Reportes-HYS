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

# Pasaje Club Socios · notas de arranque

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Dominio | `https://pasajeclub.com` fijo. Nunca `.com.ar` (301 rompe POST) |
| Bundle ID | `com.pasajeclub.app` (el mismo del Capacitor → es update, no app nueva) |
| Backend | Ferozo tal cual. Nada de multi-tenant todavía |
| Branding | Remoto, no hardcodeado → white-label después sin tocar código |
| Alcance v1 | Solo rol socio. Admin y coordinador se quedan en la web |

## Antes del primer build

1. `npx eas init` → pegar el `projectId` en `app.json`
2. **Cargar el keystore existente de Android** a EAS antes de buildear.
   Si EAS genera uno nuevo, Play rechaza el upload.
   SHA1 aprobado: `E6:3E:2B:39:0D:9D:88:C2:7C:22:18:0F:E2:7D:1F:29:B8:AC:3B:34`
3. `versionCode` arranca en 20. El último publicado fue 10, y con
   `appVersionSource: "remote"` EAS no ve el registro de Google.
4. Configurar EAS Update desde el día uno. Hoy publicás cambios sin pasar
   por las tiendas (el WebView los toma del server); sin Update eso se pierde.

## Trampas conocidas

- **Sesiones:** el `localStorage` del WebView no se puede leer desde RN.
  Todos los socios quedan deslogueados con el update. Ver `src/store/session.ts`.
- **Push:** los tokens actuales de `push_tokens` se invalidan. Hay que
  re-registrar. Mantener APNs directo (la `.p8` Key `B7LTT57A8T` ya anda
  con el enviador PHP del Hub).
- **Login con Google:** muchos socios entraron por Google y no tienen
  contraseña. Si no entra en la v1, necesitan link mágico al email.

## Orden de portado (por uso, no por menú)

**Fase 1 — shell nativo**
- Login + sesión + push + deep-linking
- Inicio · Tarjeta (QR) · Mis viajes
- El resto en WebView embebida con el token inyectado

**Fase 2 — Mis viajes se convierte en el portal del viaje**
- Estado de cuenta: cuotas, vencimientos, subir comprobante con la cámara
- Documentación del pasajero (`upload_pasaporte.php` ya existe)
- Cuenta regresiva, vouchers, coordinador asignado

**Fase 3 — reemplazar las WebViews restantes**
Beneficios · Grupales · Chat · Puntos · Wishlist · Referidos · Avisos · Perfil

## Endpoint que falta del lado del backend

Uno solo: un agregador para el Inicio. Hoy la pantalla home dispara
5 o 6 llamadas sueltas. En el celular con 4G eso se nota.
`home.php` devolviendo puntos + tier + próximo viaje + avisos sin leer
en una sola respuesta.

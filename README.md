# Formulario Contra Entrega (COD) para Shopify

Un **botón** en tu página de producto que abre un **formulario emergente** de
pago contra entrega: ofertas por cantidad, productos extra (upsells) y
personalización total desde el Editor de temas — **sin mensualidad**.

Se instala en **tu propia cuenta** (gratis, en Cloudflare). Tú eres dueño de
todo y no pagas suscripción a nadie.

---

## 🚀 Instalación en 3 pasos

> Necesitas: una tienda **Shopify**, una cuenta **gratis** de **Cloudflare**, y
> tu **llave de licencia** (te la entrega quien te vendió el producto).

### Paso 1 — Crea la app en Shopify (para las llaves)

1. Entra a **[dev.shopify.com](https://dev.shopify.com)** y crea una **app**
   (Create app → nombre: "Formulario COD").
2. En **Configuration → Admin API access scopes**, activa:
   `write_orders`, `read_orders`, `read_products`, `write_draft_orders`,
   `read_customers`, `write_customers`.
3. **Instálala** en tu tienda.
4. Copia y guarda: el **Client ID** (público) y el **Client Secret** (secreto).

### Paso 2 — Instala el servidor (1 clic)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/colombiagloz-prog/cod-form-instalar/tree/main/worker)

Al hacer clic, Cloudflare crea todo solo (servidor + almacén de datos) y te pide
llenar:

| Casilla | Qué poner |
|---|---|
| **Nombre del proyecto** | Deja `cod-form` o el que quieras |
| `SHOPIFY_STORE` | Tu dominio `.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | El **Client ID** del Paso 1 |
| `ALLOWED_ORIGINS` | `https://tu-tienda.myshopify.com` (y tu dominio propio si tienes) |
| `LICENSE_KEY` | Tu **llave de licencia** |
| `SHOPIFY_CLIENT_SECRET` 🔒 | El **Client Secret** del Paso 1 |
| `ADMIN_SECRET` 🔒 | Una contraseña que **inventas tú** |

> Deja **"Proteger con acceso Cloudflare" APAGADO**.
> Opcionales (para después): `META_CAPI_TOKEN`, `TIKTOK_ACCESS_TOKEN`.

Cuando termine, Cloudflare te da la **dirección de tu servidor** (algo como
`https://cod-form.TU-CUENTA.workers.dev`). **Cópiala** para el Paso 3.

### Paso 3 — Ponlo en tu tienda

1. Sube los 3 archivos de la carpeta `theme/` a tu tema (Editar código):
   - `assets/cod-form-gloz.css` y `assets/cod-form-gloz.js` → **Assets**
   - `sections/cod-form-gloz.liquid` → **Sections**
2. En el **Editor de temas**, en tu página de producto:
   **Agregar sección → "Botón Contra Entrega"**.
3. Pega la **dirección del servidor** (Paso 2) en **"URL del backend (Worker)"**.
4. Agrega/ordena los bloques y personaliza a tu gusto.
5. **Prueba en un producto de prueba** antes de activarlo en todo.

¡Listo! Funciona en **todos** los productos — el producto y el precio se
detectan **automáticamente**.

---

## 🎨 Qué puedes personalizar

Todo desde el Editor de temas, sin tocar código: ofertas por cantidad (% o
monto), productos extra (visibles u ocultos para kits), bloques reordenables
(título, campos, botones, garantía, urgencia…), colores, tipografía,
animaciones y textos, y pago anticipado opcional (checkout nativo de Shopify).

## 🔒 Seguridad

El precio lo calcula el servidor (el navegador nunca decide el cobro), las
claves van cifradas en Cloudflare, hay anti-spam + lista de bloqueo, y solo
tu(s) dominio(s) pueden usar el formulario.

## ❓ Soporte

Incluye **3 meses de actualizaciones** desde la compra. Después, el formulario
**sigue funcionando**; solo dejan de incluirse actualizaciones nuevas
(disponibles con renovación opcional).

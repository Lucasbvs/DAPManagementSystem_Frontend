# DAP Elegancia · Frontend

Aplicación web de DAP Elegancia para administrar el inventario y las ventas de vestidos desde computadoras y dispositivos móviles. Permite consultar modelos, controlar existencias por variante y mantener la información sincronizada entre las sesiones autorizadas.

Este repositorio contiene exclusivamente el frontend. La API se mantiene en `DAPManagementSystem_Backend`, como repositorio independiente. El navegador se comunica con la API y no accede directamente a PostgreSQL.

## Funcionalidades

- Inicio de sesión privado y opción de mantener la sesión iniciada.
- Estadísticas de modelos registrados, vestidos disponibles y stock bajo.
- Búsqueda por nombre o descripción.
- Registro y edición de vestidos con propietario, descripción y precios.
- Variantes por color, talla opcional y cantidad disponible.
- Numeración automática asignada por el backend.
- Selección múltiple y eliminación con confirmación.
- Edición de un vestido seleccionado a la vez.
- Avisos de éxito que se cierran automáticamente después de dos segundos.
- Tabla en escritorio y tarjetas en móvil, con desplazamiento interno de la lista.
- Navegación inferior en celular y menú lateral en escritorio.
- Actualización automática del inventario y sus estadísticas entre dispositivos.

Los módulos activos son Inventario y Ventas. Contabilidad queda prevista para una siguiente etapa.

## Tecnologías

React 19, TypeScript, Vite, Tailwind CSS y Axios. La identidad visual utiliza la paleta verde de DAP Elegancia y las tipografías Manrope y Lora.

## Requisitos

- Node.js 22.12 o superior compatible con las dependencias.
- npm.
- API de DAP Elegancia en ejecución.
- Una cuenta activa creada desde el backend.

## Instalación

Ejecutar dentro de este repositorio:

```bash
npm ci
```

Copiar `.env.example` a `.env`. En PowerShell:

```powershell
Copy-Item .env.example .env
```

Configurar la dirección de la API:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

En el backend, permitir el origen del frontend mediante `CORS_ORIGIN=http://localhost:5173`.

```bash
npm run dev
```

Abrir `http://localhost:5173` e iniciar sesión con una cuenta autorizada.

## Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Iniciar Vite en desarrollo. |
| `npm run build` | Comprobar TypeScript y generar la aplicación en `dist/`. |
| `npm run preview` | Previsualizar localmente la compilación. |
| `npm test` | Ejecutar las pruebas del almacenamiento de sesión. |

## Estructura

La aplicación utiliza una organización por funcionalidades.

| Directorio | Responsabilidad |
| --- | --- |
| `src/app/` | Composición principal y estado de autenticación. |
| `src/pages/` | Pantallas de acceso, inventario y ventas. |
| `src/components/forms/` | Formularios de vestidos y ventas. |
| `src/components/ui/` | Botones, iconos y modales reutilizables. |
| `src/layouts/` | Distribución general y navegación adaptable. |
| `src/hooks/` | Hooks compartidos. |
| `src/services/` | Cliente Axios, interceptores y almacenamiento del token. |
| `src/styles/` | Estilos globales y adaptación a dispositivos. |
| `src/types/` | Tipos compartidos para respuestas de la API. |

## Reglas de inventario

El nombre, la descripción, la ubicación en almacén, el propietario y el precio unitario son obligatorios. Cada variante requiere color y cantidad entera mayor que cero al crearla; una variante existente puede conservar stock cero. La talla es opcional.

Los precios de cuarta y media docena son opcionales e independientes. Al dejarlos vacíos se envían como `null` y se muestran como «Sin descuento». Un precio informado debe ser positivo.

El número de vestido se asigna al guardar en el servidor. El stock de cada modelo corresponde a la suma de sus variantes.

El clic sobre una fila, casilla o tarjeta alterna su selección. Cambiar la búsqueda limpia la selección. La eliminación múltiple informa los fallos y conserva seleccionados los vestidos que no pudieron eliminarse.

Los modales se pueden cerrar mediante su botón, Escape o clic fuera, excepto mientras procesan una operación. Cerrar un formulario descarta los cambios sin guardar. Los avisos de éxito también se cierran con «Aceptar» o automáticamente tras dos segundos.

## Sesiones y comunicación

Axios adjunta el JWT en `Authorization: Bearer <token>`. Una respuesta 401 en una operación protegida invalida la sesión correspondiente y devuelve al acceso.

Sin mantener sesión iniciada, el token se guarda en `sessionStorage` y vence en hasta 8 horas. Con esa opción, se guarda en `localStorage` y vence en 30 días. No se almacena la contraseña.

El cliente escucha eventos SSE autenticados para actualizar inventario y estadísticas sin recargar la página. Incluye reconexión, actualización al recuperar foco o conexión y una consulta de respaldo cada 15 segundos mientras la página está visible. Los formularios abiertos conservan sus cambios sin guardar durante los refrescos.

Los eventos inmediatos corresponden a conexiones atendidas por el mismo proceso backend. Con varias instancias, el respaldo periódico mantiene los datos sincronizados mientras no exista un canal de eventos compartido.

## Acceso desde un celular en la red local

Suponiendo que la computadora que ejecuta los servidores tiene la IP `192.168.1.20`:

1. Configurar `VITE_API_URL=http://192.168.1.20:3000/api` en el frontend.
2. Configurar `CORS_ORIGIN=http://192.168.1.20:5173` en el backend y reiniciarlo.
3. Ejecutar `npm run dev -- --host 0.0.0.0`.
4. Abrir `http://192.168.1.20:5173` desde ambos dispositivos.

Los equipos deben estar en la misma red y los puertos deben estar permitidos en la red privada del firewall. Sustituir la IP de ejemplo por la real. La configuración actual del backend permite un origen CORS a la vez.

## Despliegue

Configurar `VITE_API_URL` con la URL pública de la API antes de ejecutar `npm run build`; Vite incorpora esta variable durante la compilación. Publicar el contenido de `dist/` en un alojamiento estático con HTTPS y configurar el origen público en el backend.

Las variables con prefijo `VITE_` son públicas: no deben contener contraseñas ni secretos. Frontend y backend pueden alojarse por separado, siempre que todos los dispositivos utilicen la misma API y base de datos.

## Ventas

Entrar desde el menú **Ventas** o `#ventas`. La fecha inicial corresponde a Bolivia y se puede consultar otro día con el filtro. Pulsar una fila, casilla o tarjeta selecciona/deselecciona; se admite selección múltiple. Editar y cambiar vestido requieren una venta realizada; cancelar e imprimir admiten varias ventas realizadas.

**Registrar venta** abre el catálogo con búsqueda, selección por color/talla y contadores. El total de prendas determina el precio: 1–2 unitario, 3–5 cuarta, 6 o más media docena. Si falta el precio correspondiente, se usa el unitario. Se muestran subtotal, delivery adicional, costo de envío opcional, total cobrado y neto después de Bs 10 fijos de delivery. El servidor valida stock y calcula los valores definitivos.

El formulario incluye celular, nombre, dirección y enlace de ubicación. Para envío departamental se indica departamento, ciudad/provincia y costo independiente. Editar o cambiar vestido ajusta el stock; cancelar devuelve las existencias y conserva el historial del pedido.

**Imprimir ventas** descarga directamente un PDF con los pedidos seleccionados. Cada pedido incluye su número actual, celular, dirección, prendas, color/talla, cantidad, precio aplicado, subtotal, delivery adicional, envío y total. Se puede abrir el archivo y usar la impresión del visor PDF del dispositivo.

Las ventas se sincronizan mediante el mismo flujo SSE autenticado del inventario, con respaldo cada 15 segundos. El servidor protege registros repetidos, cambios concurrentes y ventas sin existencias.

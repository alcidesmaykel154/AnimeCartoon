# LACartoons Stremio Addon

Addon exclusivo para Stremio que permite ver las series clásicas de **LACartoons** directamente en tu reproductor favorito. 

<p align="center"><img src="https://www.lacartoons.com/assets/favicon-da907fb005ebb8eef5d862002ec98c648a927a4fce446874a672b6daee984fb9.ico" alt="LACartoons logo" width="128"/></p>

## Características:
- 📺 **Catálogo Completo**: Accede a todas las series clásicas disponibles en LACartoons.
- 🔍 **Búsqueda Integrada**: Busca tus caricaturas favoritas directamente desde la barra de búsqueda de Stremio.
- 📡 **Streaming Directo**: Soporte para reproducción HLS (`.m3u8`) a través de CubeEmbed/RPMVid.
- 📂 **Organización por Temporadas**: Metadatos extraídos directamente para mostrar episodios y temporadas correctamente.

## Instalación

Para instalar este addon, copia y pega la siguiente URL en el buscador de addons de Stremio:

```text
https://tu-url-de-vercel.app/manifest.json
```

*(Sustituye `tu-url-de-vercel.app` por la URL real de tu despliegue en Vercel)*

## Uso
Una vez instalado, verás una nueva categoría llamada **LACartoons** en la sección de "Descubrir" (Discover) de Stremio. También puedes buscar series como "Un Show Más", "Coraje el Perro Cobarde", etc., y aparecerán los resultados de este addon.

## Desarrollo Local
Si quieres probarlo en tu PC:
1. Clona el repositorio.
2. Instala las dependencias: `npm install`.
3. Inicia el servidor: `npm start`.
4. Instala en Stremio usando `http://localhost:3000/manifest.json`.

---
*Nota: Este addon no está afiliado con LACartoons. Es un proyecto independiente creado para mejorar la experiencia de usuario en Stremio.*

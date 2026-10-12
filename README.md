# 🐝 BEE HUNT - 8-Bit Duck Shooting Gallery

Videojuego web estilo **8-bit arcade** inspirado en el clásico *Duck Hunt*, adaptado para correr en el navegador tanto en **computadoras de escritorio (ratón/clic)** como en **celulares y tablets (toques táctiles)**, con tabla de puntajes mundial sin registro de usuarios.

---

## 🎮 Características del Juego

- **Estilo Gráfico 8-Bit**: Escenario retro pixel-art con ciclo dinámico según la ronda (Día, Atardecer, Noche con estrellas), nubes en movimiento, colinas y flores.
- **Enemigos**: 5 tipos de abejas con diferentes valores de puntuación y patrones de vuelo:
  - 🟡 **Abeja 10 pts**: Vuelo constante y tamaño regular.
  - 🟠 **Abeja 15 pts**: Vuelo moderado con barridos laterales.
  - 🔴 **Abeja 20 pts**: Vuelo rápido con quiebres diagonales.
  - 🟣 **Abeja 25 pts**: Gran agilidad y cambios repentinos de trayectoria.
  - 👑 **Abeja 50 pts (Dorada)**: Ultra rápida y escurridiza con destellos dorados.
- **Obstáculo y Mascota**:
  - **El Caballo Burlón**: Se asoma detrás del césped riéndose cuando fallas o dejas escapar una abeja (parodia del perro de Duck Hunt).
  - En rondas avanzadas (Ronda 2+), salta o se asoma para bloquear los disparos protegiendo a las abejas.
- **Audio Retro Sintetizado (Chiptune)**: Cero descargas pesadas de MP3. Todos los disparos, zumbidos, chimes y melodías son generados en tiempo real por el navegador con la **Web Audio API**.
- **Tabla de Récords Mundial sin Registro**:
  - Identificación anónima mediante token único en `localStorage`.
  - Al perder, ingresas tu Nickname arcade (hasta 8 letras) para inmortalizar tu puntaje.
  - Base de datos ligera SQLite integrada en el backend.

---

## 🕹️ Controles

| Acción | Computadora (PC/Mac) | Celular / Tablet |
| :--- | :--- | :--- |
| **Disparar** | Clic izquierdo del ratón | Toque directo en la pantalla |
| **Mover mira** | Movimiento del ratón | Posición del toque |
| **Recargar** | Barra Espaciadora / Clic derecho / Tecla R | Botón de recarga en pantalla |
| **Silenciar audio** | Botón superior [🔊 SONIDO] | Botón superior [🔊 SONIDO] |

---

## 🚀 Cómo Iniciar el Juego

### Opción 1: Iniciar el Juego Completo (Full-Stack en 1 comando)
```bash
npm start
```
Abre tu navegador en:
👉 **http://localhost:3001**

*(O desde cualquier celular en tu misma red WiFi usando la IP local de tu computadora: `http://TU_IP_LOCAL:3001`)*

### Opción 2: Modo Desarrollo con Hot-Reload (Vite + Server)
```bash
# Terminal 1: Iniciar la API y Base de Datos
npm run server

# Terminal 2: Iniciar servidor de desarrollo Vite con Hot Reload
npm run dev
```
Abre en: **http://localhost:5173**

---

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5 Canvas 2D nativo + JavaScript ES Modules + Vite + CSS3 (fuente *Press Start 2P*).
- **Backend**: Node.js + Express.
- **Base de Datos**: SQLite nativo de Node (`node:sqlite`) almacenado en `server/bee_hunt.sqlite`.
- **Sprites**: Imágenes originales procesadas a PNGs con canal alfa transparente en `public/assets/sprites/`.

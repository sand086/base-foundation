

# Plan: Estética "macOS Tahoe" - Glassmorphism Premium

## Resumen Ejecutivo
Transformar la aplicación en una experiencia visual de próxima generación inspirada en macOS Tahoe, aplicando efectos de cristal semitransparente, estados de carga sofisticados, animaciones staggered en tablas, y un indicador global de procesamiento. Todo esto manteniendo la identidad de marca 3T intacta.

---

## 1. Estética Glassmorphism (Paneles y Tarjetas)

### 1.1 Variables CSS Nuevas (`src/index.css`)
Se definiran nuevas variables para los efectos de cristal:

```text
--glass-bg: 0 0% 100% / 0.8       (light mode)
--glass-bg-dark: 0 0% 0% / 0.4    (dark mode)
--glass-border: 0 0% 100% / 0.2
--glass-shadow: 0 0% 0% / 0.05
```

### 1.2 Clases Utilitarias Nuevas
- `.glass-panel`: Fondo semitransparente con `backdrop-blur-xl`
- `.glass-card`: Tarjetas con bordes sutiles tipo "cristal cortado"
- `.glass-surface`: Superficies internas con profundidad sutil

### 1.3 Componentes Afectados
| Componente | Cambio |
|------------|--------|
| `card.tsx` | Agregar variante `glass` con backdrop-blur-xl, border-white/20, shadow difusa |
| `dialog.tsx` | Fondo glass en modales |
| `sheet.tsx` | Paneles laterales con efecto cristal |

---

## 2. Skeleton Loaders Premium

### 2.1 Nuevo Componente: `DashboardSkeleton.tsx`
Crear componente que imite la estructura de los KPIs mientras cargan:

```text
src/components/ui/skeleton-loaders.tsx

- KPISkeleton: 4 tarjetas pulsantes imitando KPICards
- ChartSkeleton: Area rectangular para graficas
- TableSkeleton: Filas con pulso escalonado
```

### 2.2 Animación de Shimmer Mejorada
Actualizar el keyframe `shimmer` para un efecto mas elegante con gradiente tricolor.

### 2.3 Transición Fade-In
Los datos al aparecer tendran una transicion suave sobre el skeleton usando:
- `animate-in fade-in duration-500`
- Clase `.data-loaded` para controlar la transicion

---

## 3. Animaciones Staggered en Tablas

### 3.1 Keyframes Nuevos (`src/index.css`)
```text
@keyframes table-row-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 3.2 Selectores CSS Automaticos
Usar `nth-child` para delays automaticos hasta 10 filas:

```text
tbody tr:nth-child(1) { animation-delay: 0ms; }
tbody tr:nth-child(2) { animation-delay: 40ms; }
tbody tr:nth-child(3) { animation-delay: 80ms; }
...
tbody tr:nth-child(10) { animation-delay: 360ms; }
```

### 3.3 Componentes Afectados
| Componente | Cambio |
|------------|--------|
| `table.tsx` | Agregar clase `.table-staggered` al tbody |
| `enhanced-data-table.tsx` | Aplicar animacion en las filas del tbody |

---

## 4. Indicador de Procesamiento Global

### 4.1 Nuevo Componente: `GlobalProgressBar.tsx`
Barra ultra delgada (2px) en la parte superior del viewport:

```text
src/components/ui/global-progress-bar.tsx

- Posicion: fixed top-0 left-0 right-0
- Altura: h-0.5 (2px)
- Color: brand-red gradient
- Animacion: indeterminate shimmer cuando isLoading=true
```

### 4.2 Integracion en AppLayout
Agregar el componente al layout principal, activandose durante navegacion via `useNavigation` de React Router.

### 4.3 Animacion de la Barra
```text
@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```

---

## 5. Tipografia y Esquinas (Polish Final)

### 5.1 Ajustes Tipograficos
- Encabezados principales: `tracking-tighter font-semibold`
- CardTitle: Reducir tracking para estilo Apple
- Labels: Mantener uppercase con `tracking-wide`

### 5.2 Border Radius Organico
Actualizar `--radius` a valores mas suaves:

```text
:root {
  --radius: 0.75rem;    // antes 0.375rem
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
}
```

---

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/index.css` | Nuevas variables, keyframes, clases utilitarias |
| `src/components/ui/card.tsx` | Variante glass, border-radius aumentado |
| `src/components/ui/dialog.tsx` | Fondo glass en overlay/content |
| `src/components/ui/sheet.tsx` | Efecto cristal en paneles |
| `src/components/ui/table.tsx` | Clase staggered en TableBody |
| `src/components/ui/enhanced-data-table.tsx` | Animaciones en filas |
| `src/components/layout/AppLayout.tsx` | Integrar GlobalProgressBar |
| `tailwind.config.ts` | Extender border-radius, agregar backdrop utilities |

## Archivos Nuevos

| Archivo | Proposito |
|---------|-----------|
| `src/components/ui/skeleton-loaders.tsx` | Skeletons para Dashboard, tablas, charts |
| `src/components/ui/global-progress-bar.tsx` | Barra de progreso global tipo Safari |

---

## Seccion Tecnica Detallada

### Keyframes Completos para index.css

```css
/* Glassmorphism shimmer premium */
@keyframes glass-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Table row staggered entrance */
@keyframes table-row-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Global progress bar indeterminate */
@keyframes progress-indeterminate {
  0% {
    left: -40%;
    width: 40%;
  }
  50% {
    left: 20%;
    width: 60%;
  }
  100% {
    left: 100%;
    width: 40%;
  }
}
```

### Clases Glassmorphism

```css
.glass-panel {
  background: hsl(var(--card) / 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid hsl(0 0% 100% / 0.15);
  box-shadow: 
    0 4px 30px hsl(0 0% 0% / 0.05),
    inset 0 1px 0 hsl(0 0% 100% / 0.1);
}

.dark .glass-panel {
  background: hsl(var(--card) / 0.6);
  border: 1px solid hsl(0 0% 100% / 0.08);
}
```

### Staggered Table Animation

```css
.table-staggered tr {
  animation: table-row-enter 0.4s ease-out backwards;
}

.table-staggered tr:nth-child(1) { animation-delay: 0ms; }
.table-staggered tr:nth-child(2) { animation-delay: 40ms; }
.table-staggered tr:nth-child(3) { animation-delay: 80ms; }
.table-staggered tr:nth-child(4) { animation-delay: 120ms; }
.table-staggered tr:nth-child(5) { animation-delay: 160ms; }
.table-staggered tr:nth-child(6) { animation-delay: 200ms; }
.table-staggered tr:nth-child(7) { animation-delay: 240ms; }
.table-staggered tr:nth-child(8) { animation-delay: 280ms; }
.table-staggered tr:nth-child(9) { animation-delay: 320ms; }
.table-staggered tr:nth-child(10) { animation-delay: 360ms; }
```

---

## Resultado Visual Esperado

La aplicacion tendra:
1. Tarjetas y paneles con efecto de cristal esmerilado
2. Transiciones de carga fluidas con skeletons pulsantes
3. Tablas donde las filas aparecen en cascada elegante
4. Indicador visual superior cuando hay navegacion activa
5. Tipografia ajustada al estilo Apple (tracking-tighter)
6. Esquinas mas organicas y suaves (rounded-xl)

Todo manteniendo 60fps y sin afectar la logica de negocio existente.


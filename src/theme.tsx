import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ImgHTMLAttributes, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isPlatformSurface: boolean
}

const THEME_KEY = 'webfactory-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSavedTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

function getInitialTheme(): Theme {
  return getSavedTheme() ?? getSystemTheme()
}

function platformSurfaceForPath(pathname: string) {
  if (/^\/sites\/[^/]+\/?$/.test(pathname)) return false
  if (/^\/templates\/[^/]+\/?$/.test(pathname)) return false
  return true
}

function applyDocumentTheme(theme: Theme, isPlatformSurface: boolean) {
  const root = document.documentElement
  root.dataset.wfTheme = theme

  if (isPlatformSurface) {
    root.dataset.wfPlatformTheme = 'true'
    root.style.colorScheme = theme
  } else {
    delete root.dataset.wfPlatformTheme
    root.style.removeProperty('color-scheme')
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta && isPlatformSurface) {
    meta.content = theme === 'dark' ? '#070B14' : '#F3F6FB'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const isPlatformSurface = useMemo(
    () => typeof window === 'undefined' ? true : platformSurfaceForPath(window.location.pathname),
    [],
  )

  useLayoutEffect(() => {
    applyDocumentTheme(theme, isPlatformSurface)
  }, [theme, isPlatformSurface])

  useEffect(() => {
    if (typeof window === 'undefined' || getSavedTheme()) return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setThemeState(event.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setTheme = (nextTheme: Theme) => {
    window.localStorage.setItem(THEME_KEY, nextTheme)
    setThemeState(nextTheme)
  }

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    isPlatformSurface,
  }), [theme, isPlatformSurface])

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {isPlatformSurface && <ThemeToggle floating />}
    </ThemeContext.Provider>
  )
}

export function useWebFactoryTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useWebFactoryTheme must be used inside ThemeProvider')
  return context
}

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const { theme, toggleTheme } = useWebFactoryTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={`wf-theme-toggle${floating ? ' floating' : ''}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      aria-pressed={theme === 'dark'}
      data-current-theme={theme}
      data-next-theme={next}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.2 15.3A8.6 8.6 0 0 1 8.7 3.8 8.7 8.7 0 1 0 20.2 15.3Z" />
        </svg>
      )}
    </button>
  )
}

type AdaptiveLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  lightSrc?: string
  darkSrc?: string
  variant?: 'auto' | 'light' | 'dark'
}

export function AdaptiveLogo({
  lightSrc = '/webfactory-pr-logo.png',
  darkSrc = '/webfactory-pr-logo-dark.png',
  variant = 'auto',
  className = '',
  alt = 'WebFactory PR',
  onError,
  ...props
}: AdaptiveLogoProps) {
  const { theme, isPlatformSurface } = useWebFactoryTheme()
  const [darkFailed, setDarkFailed] = useState(false)

  useEffect(() => {
    setDarkFailed(false)
  }, [darkSrc])

  const useDarkLogo = !darkFailed && (variant === 'dark' || (variant === 'auto' && isPlatformSurface && theme === 'dark'))

  return (
    <img
      {...props}
      src={useDarkLogo ? darkSrc : lightSrc}
      alt={alt}
      className={`wf-adaptive-logo ${className}`.trim()}
      data-logo-theme={useDarkLogo ? 'dark' : 'light'}
      onError={(event) => {
        if (useDarkLogo) setDarkFailed(true)
        onError?.(event)
      }}
    />
  )
}

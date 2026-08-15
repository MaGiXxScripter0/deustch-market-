const themeScript = `try { const theme = localStorage.getItem("bnl-theme") === "dark" ? "dark" : "light"; document.documentElement.dataset.theme = theme; } catch {}`;

export function ThemeInitializer() {
  return <script id="theme-initializer" dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

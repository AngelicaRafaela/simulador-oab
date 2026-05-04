import Link from "next/link";

export function Navigation() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <strong>Simulador OAB</strong>
          <span>1ª fase • estudo • simulado • revisão</span>
        </Link>
        <nav className="nav-links">
          <Link href="/">Visão Geral</Link>
          <Link href="/importar">Importar</Link>
          <Link href="/banco">Banco</Link>
          <Link href="/estudo">Estudo</Link>
          <Link href="/simulado">Simulado</Link>
          <Link href="/revisao">Revisão</Link>
        </nav>
      </div>
    </header>
  );
}

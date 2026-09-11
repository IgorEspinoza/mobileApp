export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Ajustes</h1>
        <p className="mt-2 text-slate-300">
          Configuración de correo para importación automática (modo manual para ambiguos).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Correo principal</h2>
        <p className="mt-2 text-sm text-slate-300">
          Próximo paso: conectar tu correo y definir alias para separar movimientos por usuario.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>Ejemplo alias: <span className="text-slate-200">igorespinoza10+ana@gmail.com</span></li>
          <li>Los correos ambiguos quedarán en revisión manual.</li>
          <li>Sin IA para clasificación: costo runtime en tokens = 0.</li>
        </ul>
      </div>
    </section>
  );
}


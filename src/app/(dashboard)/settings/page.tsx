"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Loading } from "@/components/common/Loading";

interface EmailConfig {
  id: string;
  email_address: string;
  provider: "gmail" | "outlook";
  last_sync: string | null;
  is_active: boolean;
  created_at: string;
}

interface DiagnoseDetail {
  date: string;
  from: string;
  subject: string;
  detected_source: string | null;
  parsed: boolean;
  reason: string;
  movement: {
    type: string;
    merchant: string;
    amount: number;
    currency: string;
    date: string;
    category: string;
    confidence: number;
  } | null;
  body_preview: string;
}

interface DiagnoseResult {
  account: { email_address: string; imap_host: string; last_sync: string | null };
  query: {
    requested_mailbox: string;
    resolved_mailbox: string;
    matched_by: string;
    days: number;
    limit: number;
  };
  available_mailboxes: Array<{
    path: string;
    name: string;
    delimiter: string;
    specialUse: string | null;
    listed: boolean;
    subscribed: boolean;
  }>;
  summary: {
    fetched: number;
    parsed: number;
    from_known_bank: number;
    discarded: number;
  };
  senders: Array<{ from: string; count: number }>;
  details: DiagnoseDetail[];
}

interface SyncResult {
  mailbox: {
    requested: string;
    resolved: string;
    matchedBy: string;
  };
  stats: {
    fetched: number;
    parsed: number;
    inserted: number;
    backfilled?: number;
    duplicated: number;
    ignored: number;
    failed: number;
    timed_out: boolean;
    used_bootstrap_fallback: boolean;
    duration_ms: number;
  };
  preview: Array<{
    subject: string;
    merchant: string;
    category: string;
    confidence: number;
    status: string;
  }>;
  ignored_senders: Array<{ from: string; count: number }>;
  warnings: string[];
}

const RECOMMENDED_MAILBOXES = [
  { value: "__INBOX__", label: "Automático: Recibidos (INBOX)" },
  { value: "__ALL_MAIL__", label: "Automático: Todos / All Mail / Archivo" },
  { value: "__SPAM__", label: "Automático: Spam / Correo no deseado" },
];

const EMAIL_SYNC_MAILBOX_STORAGE_KEY = "email-sync-mailbox";
const EMAIL_SYNC_DAYS_STORAGE_KEY = "email-sync-days";

function formatMailboxLabel(path: string, specialUse?: string | null) {
  if (path === "__INBOX__") return "Automático: Recibidos (INBOX)";
  if (path === "__ALL_MAIL__") return "Automático: Todos / All Mail / Archivo";
  if (path === "__SPAM__") return "Automático: Spam / Correo no deseado";
  return specialUse ? `${path} (${specialUse})` : path;
}

export default function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [config, setConfig] = useState<EmailConfig | null>(null);

  // Diagnóstico
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResult | null>(null);
  const [mailbox, setMailbox] = useState("__ALL_MAIL__");
  const [days, setDays] = useState(30);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Form states
  const [emailAddress, setEmailAddress] = useState("");
  const [provider, setProvider] = useState<"gmail" | "outlook">("gmail");
  const [appPassword, setAppPassword] = useState("");

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/email/config");
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.config) {
          setConfig(data.config);
          setEmailAddress(data.config.email_address);
          setProvider(data.config.provider);
        }
      }
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedMailbox = window.localStorage.getItem(EMAIL_SYNC_MAILBOX_STORAGE_KEY);
    const storedDays = window.localStorage.getItem(EMAIL_SYNC_DAYS_STORAGE_KEY);

    if (storedMailbox) {
      setMailbox(storedMailbox);
    }

    const parsedDays = Number.parseInt(storedDays || "", 10);
    if (Number.isFinite(parsedDays) && parsedDays >= 1 && parsedDays <= 365) {
      setDays(parsedDays);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EMAIL_SYNC_MAILBOX_STORAGE_KEY, mailbox);
  }, [mailbox]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EMAIL_SYNC_DAYS_STORAGE_KEY, String(days));
  }, [days]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim()) {
      toast.error("Ingresa un correo electrónico");
      return;
    }
    if (!appPassword.trim()) {
      toast.error("Ingresa tu Contraseña de Aplicación de 16 letras");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/email/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_address: emailAddress.trim(),
          provider,
          app_password: appPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      toast.success("Credenciales IMAP guardadas correctamente");
      setAppPassword("");
      await loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar credenciales");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetch(
        `/api/email/sync/auto?limit=30&mailbox=${encodeURIComponent(mailbox)}&days=${days}`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar");
      }

      setSyncResult(data);

      const inserted = data.stats?.inserted ?? 0;
      const backfilled = data.stats?.backfilled ?? 0;
      const fetched = data.stats?.fetched ?? 0;
      const saved = inserted + backfilled;

      if (saved > 0) {
        toast.success(
          `Sincronización exitosa: ${saved} movimiento(s) listos de ${fetched} correos.`
        );
      } else if (data.warnings && data.warnings.length > 0) {
        toast.error(data.warnings[0]);
      } else {
        toast.success("Conexión IMAP exitosa, no hay correos bancarios nuevos.");
      }
      await loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error durante la sincronización");
    } finally {
      setSyncing(false);
    }
  };

  const handleDiagnose = async () => {
    try {
      setDiagnosing(true);
      setDiagnosis(null);
      const res = await fetch(
        `/api/email/diagnose?mailbox=${encodeURIComponent(mailbox)}&days=${days}&limit=25`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error);
      }

      setDiagnosis(data);
      toast.success(
        `Diagnóstico: ${data.summary.fetched} correos leídos, ${data.summary.parsed} reconocidos como movimiento.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error en el diagnóstico");
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Ajustes</h1>
        <p className="mt-2 text-slate-300">
          Configuración de conexión IMAP para sincronizar tus correos bancarios automáticamente.
        </p>
      </div>

      {loading ? (
        <Loading text="Cargando ajustes..." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Formulario de configuración */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Conexión de correo (IMAP)</h2>
              <p className="text-sm text-slate-400 mt-1">
                La app se conecta de forma segura vía IMAP TLS para leer las notificaciones de tus compras.
              </p>
            </div>

            {config ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                <p className="font-medium">
                  Conexión activa: <span className="text-white">{config.email_address}</span> ({config.provider.toUpperCase()})
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Última sincronización: {config.last_sync ? new Date(config.last_sync).toLocaleString() : "Nunca"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                No tienes ninguna cuenta de correo configurada aún. Completa el formulario a continuación para habilitar la sincronización.
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Proveedor de correo
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as "gmail" | "outlook")}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="gmail">Gmail / Google Workspace (imap.gmail.com)</option>
                  <option value="outlook">Outlook / Hotmail / Office 365 (outlook.office365.com)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Dirección de correo
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="tu_correo@gmail.com"
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Contraseña de Aplicación (App Password)
                </label>
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder={config ? "Ingresa nueva contraseña para actualizar" : "Ej: abcd efgh ijkl mnop"}
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  En Gmail <strong className="text-slate-300">NO</strong> es tu contraseña habitual. Debes generar una contraseña de aplicación de 16 caracteres.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar credenciales"}
                </button>

                {config && (
                  <button
                    type="button"
                    onClick={handleTestSync}
                    disabled={syncing}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {syncing ? "Sincronizando..." : "Sincronizar ahora"}
                  </button>
                )}
              </div>

              {config && (
                <p className="text-xs text-slate-500">
                  La sincronización usa el buzón y el rango de días configurados en el panel de
                  Diagnóstico (actualmente <strong className="text-slate-400">{formatMailboxLabel(mailbox)}</strong>, últimos{" "}
                  {days} días).
                </p>
              )}
            </form>

            {syncResult && (
              <div className="space-y-3 rounded-lg border border-slate-700/50 bg-slate-800/40 p-4">
                <h3 className="text-sm font-semibold text-white">Resultado de la última sincronización</h3>

                <p className="text-xs text-slate-400">
                  Buzón pedido: <strong className="text-slate-200">{syncResult.mailbox.requested}</strong>
                  <span className="mx-1">→</span>
                  usado por IMAP: <strong className="text-slate-200">{syncResult.mailbox.resolved}</strong>
                  <span className="text-slate-500"> · coincidencia: {syncResult.mailbox.matchedBy}</span>
                </p>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                  {[
                    { label: "Leídos", value: syncResult.stats.fetched },
                    { label: "Reconocidos", value: syncResult.stats.parsed },
                    { label: "Guardados", value: syncResult.stats.inserted },
                    { label: "Completados", value: syncResult.stats.backfilled ?? 0 },
                    { label: "Duplicados", value: syncResult.stats.duplicated },
                    { label: "Ignorados", value: syncResult.stats.ignored },
                    { label: "Fallidos", value: syncResult.stats.failed },
                  ].map((s) => (
                    <div key={s.label} className="rounded border border-slate-700/50 bg-slate-900/50 p-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{s.label}</p>
                      <p className="text-lg font-semibold text-white">{s.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-400">
                  Duración: {(syncResult.stats.duration_ms / 1000).toFixed(1)}s
                  {syncResult.stats.timed_out && (
                    <span className="ml-2 text-amber-300">· La lectura IMAP se interrumpió por tiempo</span>
                  )}
                  {syncResult.stats.used_bootstrap_fallback && (
                    <span className="ml-2 text-sky-300">· Se usó búsqueda histórica</span>
                  )}
                </p>

                {syncResult.preview.length > 0 && (
                  <ul className="space-y-1 text-xs text-emerald-300">
                    {syncResult.preview.map((p, i) => (
                      <li key={i}>
                        {p.merchant} · {p.category} · {p.status}
                      </li>
                    ))}
                  </ul>
                )}

                {syncResult.warnings.length > 0 && (
                  <ul className="space-y-1 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    {syncResult.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Guía de requisitos e instrucciones */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">¿Qué necesitas para Gmail?</h3>
            <ol className="list-decimal space-y-3 pl-4 text-sm text-slate-300">
              <li>
                <strong className="text-white">Verificación en 2 pasos:</strong> Debe estar activada en tu cuenta Google (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Seguridad de Google</a>).
              </li>
              <li>
                <strong className="text-white">Habilitar IMAP:</strong> En Gmail Web &gt; Configuración &gt; Ver toda la configuración &gt; pestaña <em>Reenvío y correo POP/IMAP</em> &gt; marcar <strong>Habilitar IMAP</strong> y guardar cambios.
              </li>
              <li>
                <strong className="text-white">Generar Contraseña de Aplicación:</strong>
                <p className="mt-1 text-xs text-slate-400">
                  Entra a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-emerald-400 underline">google.com/apppasswords</a>, escribe el nombre "MiDinero" y copia la clave de 16 letras generada para pegarla aquí.
                </p>
              </li>
            </ol>

            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bancos detectados</h4>
              <p className="text-xs text-slate-400 mt-1">
                Banco de Chile, Santander, BCI/Mach, BancoEstado, Itaú, Scotiabank, Falabella, Ripley, Tenpo, Mercado Pago, etc.
              </p>
            </div>
          </div>

          {/* Diagnóstico de sincronización */}
          {config && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 lg:col-span-3 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Diagnóstico de sincronización</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Lee tu buzón sin guardar nada y muestra, correo por correo, si el parser lo reconoce y por qué lo descarta.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Buzón</label>
                  <select
                    value={mailbox}
                    onChange={(e) => setMailbox(e.target.value)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  >
                    {RECOMMENDED_MAILBOXES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    {diagnosis?.available_mailboxes?.length ? (
                      <optgroup label="Buzones detectados por IMAP">
                        {diagnosis.available_mailboxes.map((box) => (
                          <option key={box.path} value={box.path}>
                            {formatMailboxLabel(box.path, box.specialUse)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Últimos días</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="w-24 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
                >
                  {diagnosing ? "Analizando buzón..." : "Ejecutar diagnóstico"}
                </button>
              </div>

              {diagnosis && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-100">
                    Buzón pedido: <strong>{diagnosis.query.requested_mailbox}</strong>
                    <br />
                    Buzón real usado por IMAP: <strong>{diagnosis.query.resolved_mailbox}</strong>
                    <span className="text-sky-200"> · coincidencia: {diagnosis.query.matched_by}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Correos leídos", value: diagnosis.summary.fetched },
                      { label: "De bancos conocidos", value: diagnosis.summary.from_known_bank },
                      { label: "Reconocidos", value: diagnosis.summary.parsed },
                      { label: "Descartados", value: diagnosis.summary.discarded },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                        <p className="text-xs text-slate-400">{s.label}</p>
                        <p className="text-2xl font-semibold text-white">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {diagnosis.summary.fetched === 0 && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                      No se encontró ningún correo en <strong>{diagnosis.query.resolved_mailbox}</strong> en los últimos{" "}
                      {diagnosis.query.days} días. Prueba con &quot;[Gmail]/All Mail&quot; o aumenta el rango de días.
                    </p>
                  )}

                  {diagnosis.summary.fetched > 0 && diagnosis.summary.from_known_bank === 0 && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                      Ningún correo proviene de un dominio bancario reconocido. Revisa la lista de remitentes de abajo:
                      si tu banco aparece con otro dominio, hay que agregarlo al parser.
                    </p>
                  )}

                  <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-800/70 text-slate-300">
                        <tr>
                          <th className="px-3 py-2 font-medium">Remitente</th>
                          <th className="px-3 py-2 font-medium">Asunto</th>
                          <th className="px-3 py-2 font-medium">Banco</th>
                          <th className="px-3 py-2 font-medium">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {diagnosis.details.map((d, i) => (
                          <tr key={i} className={d.parsed ? "bg-emerald-500/5" : ""}>
                            <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{d.from}</td>
                            <td className="px-3 py-2 text-slate-200 max-w-[280px] truncate">{d.subject}</td>
                            <td className="px-3 py-2 text-slate-400">{d.detected_source ?? "—"}</td>
                            <td className="px-3 py-2">
                              {d.movement ? (
                                <span className="text-emerald-300">
                                  {d.movement.merchant} · ${d.movement.amount.toLocaleString("es-CL")} ·{" "}
                                  {d.movement.category}
                                </span>
                              ) : (
                                <>
                                  <span className="text-slate-500">{d.reason}</span>
                                  {d.body_preview && !d.movement && d.detected_source && (
                                    <details className="mt-1">
                                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400">
                                        Ver texto extraído
                                      </summary>
                                      <pre className="mt-1 text-xs text-slate-500 whitespace-pre-wrap max-h-32 overflow-y-auto bg-slate-800/50 p-2 rounded">
                                        {d.body_preview}
                                      </pre>
                                    </details>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer text-slate-300">
                      Buzones disponibles ({diagnosis.available_mailboxes.length})
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {diagnosis.available_mailboxes.map((box) => (
                        <li key={box.path}>
                          {box.path}
                          {box.specialUse ? <span className="text-slate-500"> ({box.specialUse})</span> : null}
                        </li>
                      ))}
                    </ul>
                  </details>

                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer text-slate-300">Remitentes encontrados ({diagnosis.senders.length})</summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {diagnosis.senders.map((s) => (
                        <li key={s.from}>
                          {s.from} <span className="text-slate-500">({s.count})</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}


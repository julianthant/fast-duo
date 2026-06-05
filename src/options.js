// Options page logic — import the Duo credential into chrome.storage.local,
// show status, and resync signCount. The packaged-file import is a dev
// convenience: an extension page may fetch files inside its own unpacked folder
// (no web_accessible_resources needed). The key lives only in storage afterward;
// the service worker reads it from there at sign time.

const STORAGE_KEY = "duoCredentials";
const RESYNC_TARGET = 1000000;

const $ = (id) => document.getElementById(id);

function setMsg(el, text, kind) {
  el.textContent = text;
  el.className = "msg" + (kind ? " " + kind : "");
}

/** Validate one parsed credential the same way background.js expects it. */
function isValidCredential(c) {
  return (
    c &&
    typeof c === "object" &&
    typeof c.rpId === "string" &&
    typeof c.credentialId === "string" &&
    typeof c.privateKey === "string" &&
    typeof c.signCount === "number" &&
    (c.transport === "internal" || c.transport === "usb")
  );
}

/** Accept either { credentials: [...] } or a bare array; return valid creds. */
function extractCredentials(parsed) {
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && Array.isArray(parsed.credentials)
    ? parsed.credentials
    : null;
  if (!arr) throw new Error('Expected { "credentials": [ … ] } or an array.');
  const valid = arr.filter(isValidCredential);
  if (valid.length === 0) throw new Error("No valid credentials found (need rpId, credentialId, privateKey, signCount, transport).");
  return valid;
}

async function storeCredentials(creds) {
  await chrome.storage.local.set({ [STORAGE_KEY]: creds });
}

async function loadStored() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

function renderStatus(creds) {
  const status = $("status");
  const wrap = $("credTableWrap");
  if (!creds.length) {
    status.innerHTML = '<span class="pill err">No credential loaded</span> — import one below.';
    wrap.innerHTML = "";
    return;
  }
  status.innerHTML = `<span class="pill ok">Loaded</span> ${creds.length} credential${creds.length > 1 ? "s" : ""}.`;
  const rows = creds
    .map((c) => {
      const factor = c.transport === "usb" ? "Security key (usb)" : "Touch ID (internal)";
      const name = c.deviceName ? ` <code>${escapeHtml(c.deviceName)}</code>` : "";
      return `<tr>
        <td>${factor}${name}</td>
        <td><code>${escapeHtml(c.rpId)}</code></td>
        <td>${Number(c.signCount).toLocaleString()}</td>
      </tr>`;
    })
    .join("");
  wrap.innerHTML = `<table>
    <thead><tr><th>Factor</th><th>rpId</th><th>signCount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]),
  );
}

async function refresh() {
  renderStatus(await loadStored());
}

// ── packaged-file import ──
async function importPackaged() {
  const msg = $("importMsg");
  try {
    const url = chrome.runtime.getURL("credentials/duo-webauthn.json");
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch failed (${resp.status})`);
    const parsed = await resp.json();
    const creds = extractCredentials(parsed);
    await storeCredentials(creds);
    await refresh();
    setMsg(msg, `Imported ${creds.length} credential(s) from the packaged file.`, "ok");
  } catch (e) {
    setMsg(
      msg,
      `Could not import packaged file: ${e.message}. Make sure credentials/duo-webauthn.json exists in the unpacked folder, or paste the JSON below.`,
      "err",
    );
  }
}

// ── paste import ──
async function savePasted() {
  const msg = $("importMsg");
  const text = $("pasteArea").value.trim();
  if (!text) {
    setMsg(msg, "Paste the credential JSON first.", "warn");
    return;
  }
  try {
    const creds = extractCredentials(JSON.parse(text));
    await storeCredentials(creds);
    $("pasteArea").value = "";
    await refresh();
    setMsg(msg, `Saved ${creds.length} credential(s).`, "ok");
  } catch (e) {
    setMsg(msg, `Invalid JSON: ${e.message}`, "err");
  }
}

async function clearCreds() {
  await chrome.storage.local.remove(STORAGE_KEY);
  await refresh();
  setMsg($("importMsg"), "Cleared stored credentials.", "warn");
}

// ── signCount resync ──
async function resync() {
  const msg = $("resyncMsg");
  const creds = await loadStored();
  if (!creds.length) {
    setMsg(msg, "No credentials loaded to resync.", "warn");
    return;
  }
  for (const c of creds) {
    if ((Number(c.signCount) || 0) < RESYNC_TARGET) c.signCount = RESYNC_TARGET;
  }
  await storeCredentials(creds);
  await refresh();
  setMsg(msg, `Counters bumped to at least ${RESYNC_TARGET.toLocaleString()}. Retry your login.`, "ok");
}

// Probe whether the packaged file is reachable, to label the button helpfully.
async function probePackaged() {
  try {
    const resp = await fetch(chrome.runtime.getURL("credentials/duo-webauthn.json"), { method: "HEAD" });
    $("packagedHint").textContent = resp.ok ? "(file detected)" : "(file not found — use paste)";
  } catch {
    $("packagedHint").textContent = "(file not found — use paste)";
  }
}

$("importPackaged").addEventListener("click", importPackaged);
$("savePasted").addEventListener("click", savePasted);
$("clearCreds").addEventListener("click", clearCreds);
$("resync").addEventListener("click", resync);

refresh();
probePackaged();

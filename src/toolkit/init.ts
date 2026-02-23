import { state } from './state.ts';

export function setLoadMsg(msg: string): void {
  const el = document.getElementById('loading-msg');
  if (el) el.textContent = msg;
}

export async function initPyodide(): Promise<void> {
  try {
    setLoadMsg('Initializing Python (Pyodide)…');
    state.pyodide = await loadPyodide();

    setLoadMsg('Installing NumPy, SciPy, Pandas…');
    await state.pyodide.loadPackage(['numpy', 'scipy', 'pandas']);

    setLoadMsg('Loading StatTeacher Engine…');
    const resp = await fetch('toolkit/Engine_v1.0.0.py');
    if (!resp.ok) throw new Error('Could not fetch toolkit/Engine_v1.0.0.py');
    state.pyodide.runPython(await resp.text());

    /* Helper that replaces NaN/numpy types before JSON serialisation.
       Python's json.dumps emits bare NaN for float('nan'), which is
       invalid JSON and crashes JSON.parse in the browser. */
    state.pyodide.runPython(`
import json as _json, math as _math, numpy as _np

def _to_json(obj):
    def _fix(o):
        if isinstance(o, float) and _math.isnan(o):
            return None
        if isinstance(o, _np.floating):
            return None if _np.isnan(o) else float(o)
        if isinstance(o, _np.integer):
            return int(o)
        if isinstance(o, dict):
            return {k: _fix(v) for k, v in o.items()}
        if isinstance(o, list):
            return [_fix(x) for x in o]
        return o
    return _json.dumps(_fix(obj))
`);

    const loadingCard = document.getElementById('loading-card');
    const appCard = document.getElementById('app-card');
    if (loadingCard) loadingCard.style.display = 'none';
    if (appCard) appCard.style.display = 'block';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setLoadMsg('Failed to load: ' + msg + '. Please refresh and try again.');
    console.error(err);
  }
}

/** Execute a Python snippet via Pyodide and parse the JSON result. */
export function py(code: string): unknown {
  if (!state.pyodide) throw new Error('Pyodide is not initialized');
  return JSON.parse(state.pyodide.runPython(code) as string);
}

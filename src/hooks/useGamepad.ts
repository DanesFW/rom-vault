import { useState, useEffect, useRef } from "react";

export type GamepadAction =
  | "up" | "down" | "left" | "right"
  | "confirm" | "cancel"
  | "lb" | "rb" | "lt" | "rt" | "select";

// Standard gamepad button indices (Xbox/generic layout)
const BTN_A      = 0;
const BTN_B      = 1;
const BTN_LB     = 4;
const BTN_RB     = 5;
const BTN_LT     = 6;
const BTN_RT     = 7;
const BTN_SELECT = 8;
const BTN_DPAD_U = 12;
const BTN_DPAD_D = 13;
const BTN_DPAD_L = 14;
const BTN_DPAD_R = 15;

const BUTTON_MAP: [number, GamepadAction][] = [
  [BTN_A,      "confirm"],
  [BTN_B,      "cancel"],
  [BTN_LB,     "lb"],
  [BTN_RB,     "rb"],
  [BTN_LT,     "lt"],
  [BTN_RT,     "rt"],
  [BTN_SELECT, "select"],
  [BTN_DPAD_U, "up"],
  [BTN_DPAD_D, "down"],
  [BTN_DPAD_L, "left"],
  [BTN_DPAD_R, "right"],
];

// Right stick scroll
const SCROLL_DEAD_ZONE = 0.15;
const SCROLL_PX_PER_FRAME = 14; // px per frame at full deflection (~840px/sec at 60fps)

// Directional actions that support hold-to-repeat
const REPEATABLE = new Set<GamepadAction>(["up", "down", "left", "right"]);
const REPEAT_DELAY_MS    = 380;
const REPEAT_INTERVAL_MS = 80;
const STICK_THRESHOLD    = 0.55;

// ── Module-level singleton poll loop ──────────────────────────────────────────
// One rAF loop drives all subscribers so there's no duplicated work.

interface BtnState { pressed: boolean; firstAt: number; lastRepeat: number }
const btnStates  = new Map<string, BtnState>();
const stickDirs  = new Map<number, GamepadAction | null>();

let rafId          = 0;
let activeHooks    = 0;

function fire(action: GamepadAction) {
  window.dispatchEvent(new CustomEvent("gamepad-action", { detail: action }));
}

function poll(now: DOMHighResTimeStamp) {
  const gamepads = navigator.getGamepads();
  for (let gi = 0; gi < gamepads.length; gi++) {
    const gp = gamepads[gi];
    if (!gp) continue;

    // ── Digital buttons ───────────────────────────────────────────────────────
    for (const [btnIdx, action] of BUTTON_MAP) {
      const key     = `${gi}:${btnIdx}`;
      const pressed = gp.buttons[btnIdx]?.pressed ?? false;
      const prev    = btnStates.get(key);

      if (pressed) {
        if (!prev?.pressed) {
          btnStates.set(key, { pressed: true, firstAt: now, lastRepeat: now });
          fire(action);
        } else if (REPEATABLE.has(action)) {
          const held = now - prev.firstAt;
          if (held >= REPEAT_DELAY_MS && now - prev.lastRepeat >= REPEAT_INTERVAL_MS) {
            btnStates.set(key, { ...prev, lastRepeat: now });
            fire(action);
          }
        }
      } else {
        if (prev?.pressed) btnStates.set(key, { pressed: false, firstAt: 0, lastRepeat: 0 });
      }
    }

    // ── Right analog stick → continuous scroll ────────────────────────────────
    const ry = gp.axes[3] ?? 0;
    if (Math.abs(ry) > SCROLL_DEAD_ZONE) {
      window.dispatchEvent(
        new CustomEvent("gamepad-scroll", { detail: ry * SCROLL_PX_PER_FRAME })
      );
    }

    // ── Left analog stick (treated like D-pad, no repeat — use buttons for repeat) ─
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    const prevDir = stickDirs.get(gi) ?? null;

    let dir: GamepadAction | null = null;
    if (Math.abs(ay) > Math.abs(ax)) {
      if      (ay < -STICK_THRESHOLD) dir = "up";
      else if (ay >  STICK_THRESHOLD) dir = "down";
    } else {
      if      (ax < -STICK_THRESHOLD) dir = "left";
      else if (ax >  STICK_THRESHOLD) dir = "right";
    }

    if (dir !== prevDir) {
      stickDirs.set(gi, dir);
      if (dir) fire(dir);
    }
  }

  rafId = requestAnimationFrame(poll);
}

function startPolling() {
  if (activeHooks === 0) rafId = requestAnimationFrame(poll);
  activeHooks++;
}

function stopPolling() {
  activeHooks--;
  if (activeHooks === 0) cancelAnimationFrame(rafId);
}

// ── Hook: subscribe to gamepad actions ────────────────────────────────────────

/**
 * Call `onAction` each time a controller button is pressed.
 * The callback does not need to be stable — a ref keeps it current.
 */
export function useGamepadAction(onAction: (a: GamepadAction) => void) {
  const ref = useRef(onAction);
  useEffect(() => { ref.current = onAction; });

  useEffect(() => {
    startPolling();
    const listener = (e: Event) =>
      ref.current((e as CustomEvent<GamepadAction>).detail);
    window.addEventListener("gamepad-action", listener);
    return () => {
      window.removeEventListener("gamepad-action", listener);
      stopPolling();
    };
  }, []);
}

// ── Hook: right stick continuous scroll ──────────────────────────────────────

/**
 * Calls `onScroll(dy)` every animation frame the right stick is deflected.
 * dy is pixels — positive = down, negative = up.
 */
export function useGamepadScroll(onScroll: (dy: number) => void) {
  const ref = useRef(onScroll);
  useEffect(() => { ref.current = onScroll; });

  useEffect(() => {
    startPolling();
    const listener = (e: Event) =>
      ref.current((e as CustomEvent<number>).detail);
    window.addEventListener("gamepad-scroll", listener);
    return () => {
      window.removeEventListener("gamepad-scroll", listener);
      stopPolling();
    };
  }, []);
}

// ── Hook: know whether any controller is connected ────────────────────────────

export function useGamepadConnected(): boolean {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const check = () =>
      setConnected(Array.from(navigator.getGamepads()).some(Boolean));
    window.addEventListener("gamepadconnected",    check);
    window.addEventListener("gamepaddisconnected", check);
    check();
    return () => {
      window.removeEventListener("gamepadconnected",    check);
      window.removeEventListener("gamepaddisconnected", check);
    };
  }, []);
  return connected;
}

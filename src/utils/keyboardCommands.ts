export const ALT_PAD: Record<string, string> = {
  KeyQ: 'Numpad7', KeyW: 'Numpad8', KeyE: 'Numpad9',
  KeyA: 'Numpad4', KeyS: 'Numpad5', KeyD: 'Numpad6',
  KeyZ: 'Numpad1', KeyX: 'Numpad2', KeyC: 'Numpad3',
  ShiftRight: 'PageUp', ControlRight: 'PageDown',
};
export function commandCode(code: string, rightAlt: boolean): string {
  return rightAlt ? ALT_PAD[code] ?? code : code;
}

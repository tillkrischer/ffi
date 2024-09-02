import { dlopen, FFIType, ptr, toArrayBuffer } from "bun:ffi";

const CF_TEXT = 1;
const MOUSEEVENTF_LEFTDOWN = 0x02;
const MOUSEEVENTF_LEFTUP = 0x04;
const MOUSEEVENTF_RIGHTDOWN = 0x08;
const MOUSEEVENTF_RIGHTUP = 0x10;
const MOUSEEVENTF_ABSOLUTE = 0x8000;

const user32 = dlopen("user32.dll", {
  GetForegroundWindow: {
    args: [],
    returns: FFIType.int32_t,
  },
  GetWindowTextA: {
    args: [FFIType.int32_t, FFIType.ptr, FFIType.int32_t],
    returns: FFIType.int32_t,
  },
  GetWindowTextW: {
    args: [FFIType.int32_t, FFIType.ptr, FFIType.int32_t],
    returns: FFIType.int32_t,
  },
  OpenClipboard: {
    args: [FFIType.int32_t],
    returns: FFIType.int8_t,
  },
  GetClipboardData: {
    args: [FFIType.uint32_t],
    returns: FFIType.ptr,
  },
  GetCursorPos: {
    args: [FFIType.ptr],
    returns: FFIType.int8_t,
  },
  SetCursorPos: {
    args: [FFIType.int32_t, FFIType.int32_t],
    returns: FFIType.int8_t,
  },
  mouse_event: {
    args: [
      FFIType.int32_t,
      FFIType.int32_t,
      FFIType.int32_t,
      FFIType.int32_t,
      FFIType.ptr,
    ],
  },
});

function getWindow() {
  const handle = user32.symbols.GetForegroundWindow();
  const size = 30;
  const buffer = new Buffer(size);
  buffer.fill(0);
  const pointer = ptr(buffer);

  user32.symbols.GetWindowTextW(handle, pointer, size);

  return new TextDecoder().decode(buffer);
}

function getClipboard() {
  if (user32.symbols.OpenClipboard(0) === 0) {
    throw new Error("cant open clipboard");
  }
  const data = user32.symbols.GetClipboardData(CF_TEXT);
  if (data === null) {
    throw new Error("cant read clipboard");
  }
  const array = toArrayBuffer(data);
  return new TextDecoder().decode(array);
}

function getCursorPos() {
  const buffer = new Int32Array(2);
  const pointer = ptr(buffer);
  if (user32.symbols.GetCursorPos(pointer) === 0) {
    throw new Error("cant get cursor pos");
  }
  return {
    x: buffer[0],
    y: buffer[1],
  };
}

function setCursorPos(x: number, y: number) {
  if (user32.symbols.SetCursorPos(x, y) === 0) {
    throw new Error("cant set cursor pos");
  }
}

function mouseClick(button: "left" | "right") {
  let flags = 0;
  if (button === "left") {
    flags |= MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP;
  }
  if (button === "right") {
    flags |= MOUSEEVENTF_RIGHTDOWN | MOUSEEVENTF_RIGHTUP;
  }

  user32.symbols.mouse_event(flags, 0, 0, 0, 0)
}

setCursorPos(3000, 500)
mouseClick("right")



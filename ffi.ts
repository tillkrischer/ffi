import { dlopen, FFIType, ptr, toArrayBuffer } from "bun:ffi";

const CF_TEXT = 1;

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
    y: buffer[1]
  }
}

// const a = getClipboard();
// const b = getWindow()
//
// console.log(a);
// console.log(b);


const c = getCursorPos();
console.log(c)

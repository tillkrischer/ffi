import { dlopen, FFIType, ptr, toArrayBuffer, CString } from "bun:ffi";

const CF_TEXT = 1;
const MOUSEEVENTF_LEFTDOWN = 0x02;
const MOUSEEVENTF_LEFTUP = 0x04;
const MOUSEEVENTF_RIGHTDOWN = 0x08;
const MOUSEEVENTF_RIGHTUP = 0x10;
const MOUSEEVENTF_ABSOLUTE = 0x8000;
const INPUT_KEYBOARD = 1;
const KEYEVENTF_EXTENDEDKEY = 0x0001;
const KEYEVENTF_KEYUP = 0x0002;
const VK_CONTROL = 0x11;
const VK_MENU = 0x12;
const C_KEY = 0x43;

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
  SendInput: {
    args: [FFIType.int32_t, FFIType.ptr, FFIType.int32_t],
    returns: FFIType.int32_t,
  },
  keybd_event: {
    args: [FFIType.uint8_t, FFIType.uint8_t, FFIType.uint32_t, FFIType.ptr],
  },
});

function getWindow() {
  const handle = user32.symbols.GetForegroundWindow();
  const size = 30;
  const buffer = new Buffer(size);
  buffer.fill(0);
  const pointer = ptr(buffer);

  user32.symbols.GetWindowTextW(handle, pointer, size);

  return new TextDecoder("utf-16").decode(buffer);
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

function setCursorPosObj(pos) {
  setCursorPos(pos.x, pos.y);
}

function mouseClick(button: "left" | "right") {
  let flags = 0;
  if (button === "left") {
    flags |= MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP;
  }
  if (button === "right") {
    flags |= MOUSEEVENTF_RIGHTDOWN | MOUSEEVENTF_RIGHTUP;
  }

  user32.symbols.mouse_event(flags, 0, 0, 0, 0);
}

async function pressControlAltC() {
  user32.symbols.keybd_event(VK_CONTROL, 0, 0, 0);
  user32.symbols.keybd_event(VK_MENU, 0, 0, 0);
  user32.symbols.keybd_event(C_KEY, 0, 0, 0);
  user32.symbols.keybd_event(C_KEY, 0, KEYEVENTF_KEYUP, 0);
  user32.symbols.keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
  user32.symbols.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
}

async function sleep(t: number) {
  await new Promise((r) => setTimeout(r, t));
}

const altPos = {
  x: 2701,
  y: 353,
};

const augPos = {
  x: 2881,
  y: 440,
};

const itemPos = {
  x: 2999,
  y: 574,
};

async function getCurrencyCount(orb: "alt" | "aug") {
  const pos = orb === "alt" ? altPos : augPos;
  await sleep(100);
  setCursorPosObj(pos);
  await sleep(300);
  await pressControlAltC();
  await sleep(300);
  const clipboard = getClipboard();
  const regex = /Stack Size: (.*)\//;
  const match = clipboard.match(regex);
  if (match === null) {
    throw new Error("couldnt match currency count");
  }
  return parseInt(match[1].replace(",", ""));
}

async function currencyClick(orb: "alt" | "aug") {
  const pos = orb === "alt" ? altPos : augPos;
  await sleep(100);
  setCursorPosObj(pos);
  await sleep(100);
  mouseClick("right");
  await sleep(100);
  setCursorPosObj(itemPos);
  await sleep(100);
  mouseClick("left");
}

function checkTargetCondition(item: string) {
  const regex = /(21-30).*explode/i;
  return regex.test(item);
}

function checkHasPrefix(item: string) {
  const regex = /prefix/i;
  return regex.test(item);
}

async function getItem() {
  await sleep(100);
  setCursorPosObj(itemPos);
  await sleep(100);
  await pressControlAltC();
  await sleep(100);
  return getClipboard();
}

function isGameForeground() {
  const regex = /Path of Exile/;
  const title = getWindow();
  const result = regex.test(title);
  return result;
}

await sleep(2000);

let altCount = await getCurrencyCount("alt");
let augCount = await getCurrencyCount("aug");

console.log("altCount", altCount);
console.log("augCount", augCount);

let item = "";
while (isGameForeground() && altCount > 10 && augCount > 10) {
  item = await getItem();

  if (checkTargetCondition(item)) {
    console.log("success!");
    break;
  }

  if (!checkHasPrefix(item)) {
    await currencyClick("aug");
    augCount -= 1;
  } else {
    await currencyClick("alt");
    altCount -= 1;
  }

  await sleep(500);
}

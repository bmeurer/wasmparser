/* Copyright 2016 Mozilla Foundation
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NameSectionReader, WasmDisassembler } from "../src/WasmDis";
import { DevToolsNameGenerator } from "../src/WasmDis";
import { BinaryReader } from "../src/WasmParser";

const wabtPromise = require("wabt")();

describe("DevToolsNameGenerator", () => {
  test("Wasm module with export names only for function, memory, global and table", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (export "export.function" (func 0))
         (export "export.memory" (memory 0))
         (export "export.table" (table 0))
         (export "export.global" (global 0))
         (func)
         (memory 0)
         (table 1 funcref)
         (global i32 (i32.const 0)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$export.function");
    expect(nr.getFunctionName(0, false, false)).toBe("$export.function (;0;)");
    expect(nr.getMemoryName(0, true)).toBe("$export.memory");
    expect(nr.getMemoryName(0, false)).toBe("$export.memory (;0;)");
    expect(nr.getTableName(0, true)).toBe("$export.table");
    expect(nr.getTableName(0, false)).toBe("$export.table (;0;)");
    expect(nr.getGlobalName(0, true)).toBe("$export.global");
    expect(nr.getGlobalName(0, false)).toBe("$export.global (;0;)");
  });

  test("Wasm module with import names only for function, memory, global and table", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (import "import" "function" (func))
         (import "import" "memory" (memory 0))
         (import "import" "table" (table 1 funcref))
         (import "import" "global" (global i32)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getTypeName(0, true)).toBe("$type0");
    expect(nr.getTypeName(0, false)).toBe("$type0");
    expect(nr.getFunctionName(0, true, true)).toBe("$import.function");
    expect(nr.getFunctionName(0, true, false)).toBe("$import.function (;0;)");
    expect(nr.getMemoryName(0, true)).toBe("$import.memory");
    expect(nr.getMemoryName(0, false)).toBe("$import.memory (;0;)");
    expect(nr.getTableName(0, true)).toBe("$import.table");
    expect(nr.getTableName(0, false)).toBe("$import.table (;0;)");
    expect(nr.getGlobalName(0, true)).toBe("$import.global");
    expect(nr.getGlobalName(0, false)).toBe("$import.global (;0;)");
  });

  test("Wasm module with function and export name", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (export "export.function" (func $f))
         (func $f (result i32) i32.const 0))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$f");
    expect(nr.getFunctionName(0, false, false)).toBe("$f (;0;)");
  });

  test("Wasm module with import and export name", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (import "import" "function" (func))
         (export "export.function" (func 0)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, true, true)).toBe("$import.function");
    expect(nr.getFunctionName(0, true, false)).toBe("$import.function (;0;)");
  });

  test("Wasm module with no set names", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
           (import "" "" (func))
           (export "" (func 0))
           (func)
           (memory 0)
           (table 1 funcref)
           (global i32 (i32.const 0)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, true, true)).toBe("$.");
    expect(nr.getFunctionName(0, true, false)).toBe("$. (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$func1");
    expect(nr.getFunctionName(1, false, false)).toBe("$func1");
    expect(nr.getMemoryName(0, true)).toBe("$memory0");
    expect(nr.getMemoryName(0, false)).toBe("$memory0");
    expect(nr.getTableName(0, true)).toBe("$table0");
    expect(nr.getTableName(0, false)).toBe("$table0");
    expect(nr.getGlobalName(0, false)).toBe("$global0");
    expect(nr.getGlobalName(0, false)).toBe("$global0");
  });

  test("Wasm module with defined and undefined param names", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
           (func (param i32) (param $x i32)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getVariableName(0, 0, true)).toBe("$var0");
    expect(nr.getVariableName(0, 0, false)).toBe("$var0");
    expect(nr.getVariableName(0, 1, true)).toBe("$x");
    expect(nr.getVariableName(0, 1, false)).toBe("$x (;1;)");
  });

  test("Wasm module with defined and undefined local names", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
           (func (local i32) (local $x i32)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getVariableName(0, 0, true)).toBe("$var0");
    expect(nr.getVariableName(0, 0, false)).toBe("$var0");
    expect(nr.getVariableName(0, 1, true)).toBe("$x");
    expect(nr.getVariableName(0, 1, false)).toBe("$x (;1;)");
  });

  test("Wasm module with invalid export name", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (export "{}" (func 0))
         (func))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$__");
    expect(nr.getFunctionName(0, false, false)).toBe("$__ (;0;)");
  });

  test("Wasm module with type names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x0e, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Type names
      0x04, // id
      0x07, // size
      0x02, // length
      // Type 0 "6"
      0x00,
      0x01,
      0x36,
      // Type 1 "8"
      0x01,
      0x01,
      0x38,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const ng = new DevToolsNameGenerator();
    expect(ng.read(reader)).toBe(true);
    const nr = ng.getNameResolver();
    expect(nr.getTypeName(0, true)).toBe("$6");
    expect(nr.getTypeName(0, false)).toBe("$6 (;0;)");
    expect(nr.getTypeName(1, true)).toBe("$8");
    expect(nr.getTypeName(1, false)).toBe("$8 (;1;)");
  });

  test("Wasm module with table names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x0b, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Table names
      0x05, // id
      0x04, // size
      0x01, // length
      // Table 5 "0"
      0x05,
      0x01,
      0x30,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const ng = new DevToolsNameGenerator();
    expect(ng.read(reader)).toBe(true);
    const nr = ng.getNameResolver();
    expect(nr.getTableName(5, true)).toBe("$0");
    expect(nr.getTableName(5, false)).toBe("$0 (;5;)");
  });

  test("Wasm module with memory names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x11, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Memory names
      0x06, // id
      0x0a, // size
      0x02, // length
      // Memory 0 "123"
      0x00,
      0x03,
      0x31,
      0x32,
      0x33,
      // Memory 1 "42"
      0x01,
      0x02,
      0x34,
      0x32,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const ng = new DevToolsNameGenerator();
    expect(ng.read(reader)).toBe(true);
    const nr = ng.getNameResolver();
    expect(nr.getMemoryName(0, true)).toBe("$123");
    expect(nr.getMemoryName(0, false)).toBe("$123 (;0;)");
    expect(nr.getMemoryName(1, true)).toBe("$42");
    expect(nr.getMemoryName(1, false)).toBe("$42 (;1;)");
    expect(nr.getMemoryName(2, true)).toBe("$memory2");
    expect(nr.getMemoryName(2, false)).toBe("$memory2");
  });

  test("Wasm module with global names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x11, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Global names
      0x07, // id
      0x0a, // size
      0x02, // length
      // Global 1 "123"
      0x01,
      0x03,
      0x31,
      0x32,
      0x33,
      // Global 2 "42"
      0x02,
      0x02,
      0x34,
      0x32,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const ng = new DevToolsNameGenerator();
    expect(ng.read(reader)).toBe(true);
    const nr = ng.getNameResolver();
    expect(nr.getGlobalName(0, true)).toBe("$global0");
    expect(nr.getGlobalName(0, false)).toBe("$global0");
    expect(nr.getGlobalName(1, true)).toBe("$123");
    expect(nr.getGlobalName(1, false)).toBe("$123 (;1;)");
    expect(nr.getGlobalName(2, true)).toBe("$42");
    expect(nr.getGlobalName(2, false)).toBe("$42 (;2;)");
  });
});

describe("NameSectionReader", () => {
  test("Empty Wasm module", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const nsr = new NameSectionReader();
    expect(nsr.read(reader)).toBe(true);
    expect(nsr.hasValidNames()).toBe(false);
    expect(nsr.getNameResolver.bind(nsr)).toThrowError();
  });

  test("Wasm module with unsupported name subsection", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x09, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Unsupported 255 name subsection
      0xff, // id
      0x02, // size
      0x42, // payload
      0x42,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const nsr = new NameSectionReader();
    expect(nsr.read(reader)).toBe(true);
    expect(nsr.hasValidNames()).toBe(false);
  });

  test("Wasm module with function name", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module (func $foo (result i32) i32.const 0))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const nsr = new NameSectionReader();
    nsr.read(reader);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$foo");
    expect(nr.getFunctionName(0, false, false)).toBe("$foo (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$unknown1");
    expect(nr.getFunctionName(1, false, false)).toBe("$unknown1");
    expect(nr.getVariableName(0, 0, true)).toBe("$var0");
    expect(nr.getVariableName(0, 0, false)).toBe("$var0");
    expect(nr.getVariableName(0, 1, true)).toBe("$var1");
    expect(nr.getVariableName(0, 1, false)).toBe("$var1");
  });

  test("Wasm module with parameter name", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module (func $foo (param $x i32) (result i32) local.get $x))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const nsr = new NameSectionReader();
    nsr.read(reader);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$foo");
    expect(nr.getFunctionName(0, false, false)).toBe("$foo (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$unknown1");
    expect(nr.getFunctionName(1, false, false)).toBe("$unknown1");
    expect(nr.getVariableName(0, 0, true)).toBe("$x");
    expect(nr.getVariableName(0, 0, false)).toBe("$x (;0;)");
    expect(nr.getVariableName(0, 1, true)).toBe("$var1");
    expect(nr.getVariableName(0, 1, false)).toBe("$var1");
  });

  test("Wasm module with bad names", async () => {
    const { parseWat } = await wabtPromise;
    expect(() =>
      parseWat(
        `test.wat`,
        `(module
         (import "import" "function" (func $foo))
         (import "import" "function2" (func $foo))
         )`
      )
    ).toThrow('redefinition of function "$foo"');
  });

  test("Wasm module with local names", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(
      `test.wat`,
      `(module (func $foo (local $x i32) (local $y f32)
        local.get $x
        local.get $y))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const nsr = new NameSectionReader();
    nsr.read(reader);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$foo");
    expect(nr.getFunctionName(0, false, false)).toBe("$foo (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$unknown1");
    expect(nr.getFunctionName(1, false, false)).toBe("$unknown1");
    expect(nr.getVariableName(0, 0, true)).toBe("$x");
    expect(nr.getVariableName(0, 0, false)).toBe("$x (;0;)");
    expect(nr.getVariableName(0, 1, true)).toBe("$y");
    expect(nr.getVariableName(0, 1, false)).toBe("$y (;1;)");
  });

  test("Wasm module with type names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x0e, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Type names
      0x04, // id
      0x07, // size
      0x02, // length
      // Type 0 "0"
      0x00,
      0x01,
      0x30,
      // Type 1 "1"
      0x01,
      0x01,
      0x31,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const nsr = new NameSectionReader();
    expect(nsr.read(reader)).toBe(true);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getTypeName(0, true)).toBe("$0");
    expect(nr.getTypeName(0, false)).toBe("$0 (;0;)");
    expect(nr.getTypeName(1, true)).toBe("$1");
    expect(nr.getTypeName(1, false)).toBe("$1 (;1;)");
  });

  test("Wasm module with table names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x11, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Table names
      0x05, // id
      0x0a, // size
      0x03, // length
      // Table 0 "5"
      0x00,
      0x01,
      0x35,
      // Table 5 "3"
      0x05,
      0x01,
      0x33,
      // Table 9 "1"
      0x09,
      0x01,
      0x31,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const nsr = new NameSectionReader();
    expect(nsr.read(reader)).toBe(true);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getTableName(0, true)).toBe("$5");
    expect(nr.getTableName(0, false)).toBe("$5 (;0;)");
    expect(nr.getTableName(5, true)).toBe("$3");
    expect(nr.getTableName(5, false)).toBe("$3 (;5;)");
    expect(nr.getTableName(9, true)).toBe("$1");
    expect(nr.getTableName(9, false)).toBe("$1 (;9;)");
  });

  test("Wasm module with memory names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x11, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Memory names
      0x06, // id
      0x0a, // size
      0x02, // length
      // Memory 0 "123"
      0x00,
      0x03,
      0x31,
      0x32,
      0x33,
      // Memory 1 "42"
      0x01,
      0x02,
      0x34,
      0x32,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const nsr = new NameSectionReader();
    expect(nsr.read(reader)).toBe(true);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getMemoryName(0, true)).toBe("$123");
    expect(nr.getMemoryName(0, false)).toBe("$123 (;0;)");
    expect(nr.getMemoryName(1, true)).toBe("$42");
    expect(nr.getMemoryName(1, false)).toBe("$42 (;1;)");
    expect(nr.getMemoryName(2, true)).toBe("$memory2");
    expect(nr.getMemoryName(2, false)).toBe("$memory2");
  });

  test("Wasm module with global names", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
      // name section
      0x00, // id
      0x11, // size
      // 'name'
      0x04,
      0x6e,
      0x61,
      0x6d,
      0x65,
      // Global names
      0x07, // id
      0x0a, // size
      0x02, // length
      // Global 1 "123"
      0x01,
      0x03,
      0x31,
      0x32,
      0x33,
      // Global 2 "42"
      0x02,
      0x02,
      0x34,
      0x32,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const nsr = new NameSectionReader();
    expect(nsr.read(reader)).toBe(true);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getGlobalName(0, true)).toBe("$global0");
    expect(nr.getGlobalName(0, false)).toBe("$global0");
    expect(nr.getGlobalName(1, true)).toBe("$123");
    expect(nr.getGlobalName(1, false)).toBe("$123 (;1;)");
    expect(nr.getGlobalName(2, true)).toBe("$42");
    expect(nr.getGlobalName(2, false)).toBe("$42 (;2;)");
  });
});

describe("WasmDisassembler with export metadata", () => {
  async function parseAndDisassemble(lines: string[]) {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat("functions.js", lines.join("\n")).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(parser);
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.exportMetadata = ng.getExportMetadata();
    dis.disassembleChunk(parser);
    return dis.getResult().lines;
  }

  test("functions", async () => {
    const lines = [
      `(module`,
      `  (func $import0 (export "bar") (export "foo") (import "foo" "bar") (param i32 f32) (result i64))`,
      `  (func $func1 (export "baz") (param $var0 i32) (result i32)`,
      `    local.get $var0`,
      `  )`,
      `)`,
    ];
    expect(await parseAndDisassemble(lines)).toEqual(lines);
  });

  test("globals", async () => {
    const lines = [
      `(module`,
      `  (global $global0 (export "bar") (export "foo") (import "foo" "bar") i32)`,
      `  (global $global1 (export "baz") f32 (f32.const 42))`,
      `)`,
    ];
    expect(await parseAndDisassemble(lines)).toEqual(lines);
  });

  test("imported memory", async () => {
    const lines = [
      `(module`,
      `  (memory $memory0 (export "bar") (export "foo") (import "foo" "bar") 100)`,
      `)`,
    ];
    expect(await parseAndDisassemble(lines)).toEqual(lines);
  });

  test("memory", async () => {
    const lines = [
      `(module`,
      `  (memory $memory0 (export "bar") (export "foo") 100)`,
      `)`,
    ];
    expect(await parseAndDisassemble(lines)).toEqual(lines);
  });

  test("tables", async () => {
    const lines = [
      `(module`,
      `  (table $table0 (export "bar") (export "foo") (import "foo" "bar") 10 funcref)`,
      `  (table $table1 (export "baz") 5 20 funcref)`,
      `)`,
    ];
    expect(await parseAndDisassemble(lines)).toEqual(lines);
  });
});

describe("WasmDisassembler.getResult() with function code", () => {
  const watString = `(module
  (export "export.function" (func $f))
  (func $f (result i32)
  (local $x i32)
  i32.const 0)
  (func $f1 (result i32) i32.const 1))`;
  const fileName = `test.wat`;
  const expectedLines = [
    "(module",
    '  (export "export.function" (func $func0))',
    "  (func $func0 (result i32)",
    "    (local $var0 i32)",
    "    i32.const 0",
    "  )",
    "  (func $func1 (result i32)",
    "    i32.const 1",
    "  )",
    ")",
  ];

  test("addOffsets is true", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = true;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toEqual([0, 22, 43, 43, 48, 50, 51, 53, 55, 83]);
    expect(result.functionBodyOffsets).toEqual([
      {
        start: 48,
        end: 51,
      },
      {
        start: 53,
        end: 56,
      },
    ]);
  });

  test("addOffsets is false", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = false;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toBeUndefined();
    expect(result.functionBodyOffsets).toBeUndefined();
  });
});

describe("WasmDisassembler.getResult() without function code", () => {
  const fileName = `test.wat`;
  const expectedLines = [
    `(module`,
    `  (func $import0 (import "import" "function"))`,
    `  (export "export.function" (func $import0))`,
    `)`,
  ];
  const expectedLinesWithTypes = [
    `(module`,
    `  (type $type0 (func))`,
    `  (func $import0 (import "import" "function"))`,
    `  (export \"export.function\" (func $import0))`,
    `)`,
  ];
  const watString = expectedLines.join("\n");

  test("addOffsets is true", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = true;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toEqual([0, 16, 37, 80]);
    expect(result.functionBodyOffsets).toEqual([]);
  });

  test("addOffsets is false", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = false;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toBeUndefined();
    expect(result.functionBodyOffsets).toBeUndefined();
  });

  test("skipTypes is false", async () => {
    const { parseWat } = await wabtPromise;
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.skipTypes = false;
    dis.disassembleChunk(parser);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLinesWithTypes);
  });
});

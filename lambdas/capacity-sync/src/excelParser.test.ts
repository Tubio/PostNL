import * as fs from "fs";
import * as path from "path";
import { parseExcel } from "./excelParser";

const fixturePath = path.join(__dirname, "fixtures", "capacity.xlsx");

describe("parseExcel with real fixture", () => {
  let buffer: Buffer;

  beforeAll(() => {
    buffer = fs.readFileSync(fixturePath);
  });

  it("reads the fixture file without errors", () => {
    expect(() => parseExcel(buffer)).not.toThrow();
  });

  it("parses all 5 depots from fixture", () => {
    const rows = parseExcel(buffer);
    expect(rows).toHaveLength(5);
  });

  it("parses haarlem correctly", () => {
    const rows = parseExcel(buffer);
    const haarlem = rows.find((r) => r.depotId === "haarlem");

    expect(haarlem).toBeDefined();
    expect(haarlem!.capacity).toBe(2800);
  });

  it("parses all depot IDs correctly", () => {
    const rows = parseExcel(buffer);
    const ids = rows.map((r) => r.depotId);

    expect(ids).toEqual([
      "amsterdam",
      "haarlem",
      "utrecht",
      "rotterdam",
      "eindhoven",
    ]);
  });


  it("returns correct data types", () => {
    const rows = parseExcel(buffer);
    rows.forEach((row) => {
      expect(typeof row.capacity).toBe("number");
      expect(typeof row.depotId).toBe("string");
    });
  });
});